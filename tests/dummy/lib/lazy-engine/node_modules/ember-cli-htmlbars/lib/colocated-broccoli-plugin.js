'use strict';

const fs = require('fs');
const path = require('path');
const walkSync = require('walk-sync');
const Plugin = require('broccoli-plugin');
const logger = require('heimdalljs-logger')('ember-cli-htmlbars:colocated-broccoli-plugin');
const FSTree = require('fs-tree-diff');

module.exports = class ColocatedTemplateProcessor extends Plugin {
  constructor(tree) {
    super([tree], {
      persistentOutput: true,
    });

    this._lastTree = FSTree.fromEntries([]);
  }

  calculatePatch() {
    let updatedEntries = walkSync.entries(this.inputPaths[0]);
    let currentTree = FSTree.fromEntries(updatedEntries);

    let patch = this._lastTree.calculatePatch(currentTree);

    this._lastTree = currentTree;

    return patch;
  }

  currentEntries() {
    return this._lastTree.entries;
  }

  inputHasFile(relativePath) {
    return !!this.currentEntries().find(e => e.relativePath === relativePath);
  }

  detectRootName() {
    let entries = this.currentEntries().filter(e => !e.isDirectory());

    let [first] = entries;
    let parts = first.relativePath.split('/');

    let root;
    if (parts[0].startsWith('@')) {
      root = parts.slice(0, 2).join('/');
    } else {
      root = parts[0];
    }

    if (!entries.every(e => e.relativePath.startsWith(root))) {
      root = null;
    }

    return root;
  }

  build() {
    let patch = this.calculatePatch();

    // We skip building if this is a rebuild with a zero-length patch
    if (patch.length === 0) {
      return;
    }

    let root = this.detectRootName();

    let processedColocatedFiles = new Set();

    for (let operation of patch) {
      let [method, relativePath] = operation;

      let filePathParts = path.parse(relativePath);

      let isOutsideComponentsFolder = !relativePath.startsWith(`${root}/components/`);
      let isPodsTemplate = filePathParts.name === 'template' && filePathParts.ext === '.hbs';
      let isNotColocationExtension = !['.hbs', '.js', '.ts', '.coffee'].includes(filePathParts.ext);
      let isDirectoryOperation = ['rmdir', 'mkdir'].includes(method);
      let basePath = path.posix.join(filePathParts.dir, filePathParts.name);
      let relativeTemplatePath = basePath + '.hbs';

      // if the change in question has nothing to do with colocated templates
      // just apply the patch to the outputPath
      if (
        isOutsideComponentsFolder ||
        isPodsTemplate ||
        isNotColocationExtension ||
        isDirectoryOperation
      ) {
        logger.debug(`default operation for non-colocation modification: ${relativePath}`);
        FSTree.applyPatch(this.inputPaths[0], this.outputPath, [operation]);
        continue;
      }

      // we have already processed this colocated file, carry on
      if (processedColocatedFiles.has(basePath)) {
        continue;
      }
      processedColocatedFiles.add(basePath);

      let hasBackingClass = false;
      let hasTemplate = this.inputHasFile(basePath + '.hbs');
      let backingClassPath = basePath;

      if (this.inputHasFile(basePath + '.js')) {
        backingClassPath += '.js';
        hasBackingClass = true;
      } else if (this.inputHasFile(basePath + '.ts')) {
        backingClassPath += '.ts';
        hasBackingClass = true;
      } else if (this.inputHasFile(basePath + '.coffee')) {
        backingClassPath += '.coffee';
        hasBackingClass = true;
      } else {
        backingClassPath += '.js';
        hasBackingClass = false;
      }

      let originalJsContents = null;
      let jsContents = null;
      let prefix = '';

      if (hasTemplate) {
        let templatePath = path.join(this.inputPaths[0], basePath + '.hbs');
        let templateContents = fs.readFileSync(templatePath, { encoding: 'utf8' });
        let hbsInvocationOptions = {
          contents: templateContents,
          moduleName: relativeTemplatePath,
          parseOptions: {
            srcName: relativeTemplatePath,
          },
        };
        let hbsInvocation = `hbs(${JSON.stringify(templateContents)}, ${JSON.stringify(
          hbsInvocationOptions
        )})`;

        prefix = `import { hbs } from 'ember-cli-htmlbars';\nconst __COLOCATED_TEMPLATE__ = ${hbsInvocation};\n`;
        if (backingClassPath.endsWith('.coffee')) {
          prefix = `import { hbs } from 'ember-cli-htmlbars'\n__COLOCATED_TEMPLATE__ = ${hbsInvocation}\n`;
        }
      }

      if (hasBackingClass) {
        // add the template, call setComponentTemplate

        jsContents = originalJsContents = fs.readFileSync(
          path.join(this.inputPaths[0], backingClassPath),
          {
            encoding: 'utf8',
          }
        );

        if (hasTemplate && !jsContents.includes('export default')) {
          let message = `\`${relativePath}\` does not contain a \`default export\`. Did you forget to export the component class?`;
          jsContents = `${jsContents}\nthrow new Error(${JSON.stringify(message)});`;
          prefix = '';
        }
      } else {
        // create JS file, use null component pattern

        jsContents = `import templateOnly from '@ember/component/template-only';\n\nexport default templateOnly();\n`;
      }

      jsContents = prefix + jsContents;

      let jsOutputPath = path.join(this.outputPath, backingClassPath);

      switch (method) {
        case 'unlink': {
          if (filePathParts.ext === '.hbs' && hasBackingClass) {
            fs.writeFileSync(jsOutputPath, originalJsContents, { encoding: 'utf8' });

            logger.debug(`removing colocated template for: ${basePath}`);
          } else if (filePathParts.ext !== '.hbs' && hasTemplate) {
            fs.writeFileSync(jsOutputPath, jsContents, { encoding: 'utf8' });
            logger.debug(
              `converting colocated template with backing class to template only: ${basePath}`
            );
          } else {
            // Copied from https://github.com/stefanpenner/fs-tree-diff/blob/v2.0.1/lib/index.ts#L38-L68
            try {
              fs.unlinkSync(jsOutputPath);
            } catch (e) {
              if (typeof e === 'object' && e !== null && e.code === 'ENOENT') {
                return;
              }
              throw e;
            }
          }
          break;
        }
        case 'change':
        case 'create': {
          fs.writeFileSync(jsOutputPath, jsContents, { encoding: 'utf8' });

          logger.debug(
            `writing colocated template: ${basePath} (template-only: ${!hasBackingClass})`
          );
          break;
        }
        default: {
          throw new Error(
            `ember-cli-htmlbars: Unexpected operation when patching files for colocation.\n\tOperation:\n${JSON.stringify(
              [method, relativePath]
            )}\n\tKnown files:\n${JSON.stringify(
              this.currentEntries().map(e => e.relativePath),
              null,
              2
            )}`
          );
        }
      }
    }
  }
};
