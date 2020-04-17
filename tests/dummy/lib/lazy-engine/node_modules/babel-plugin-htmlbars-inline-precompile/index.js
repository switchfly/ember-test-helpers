'use strict';

module.exports = function(babel) {
  let t = babel.types;

  function buildExpression(value) {
    switch (typeof value) {
      case 'string':
        return t.stringLiteral(value);
      case 'number':
        return t.numberLiteral(value);
      case 'boolean':
        return t.booleanLiteral(value);
      case 'object': {
        if (Array.isArray(value)) {
          return buildArrayExpression(value);
        } else {
          return buildObjectExpression(value);
        }
      }
      default:
        throw new Error(
          `hbs compilation error; unexpected type from precompiler: ${typeof value} for ${JSON.stringify(
            value
          )}`
        );
    }
  }

  function buildObjectExpression(object) {
    let properties = [];
    for (let key in object) {
      let value = object[key];

      properties.push(t.objectProperty(t.identifier(key), buildExpression(value)));
    }

    return t.objectExpression(properties);
  }

  function buildArrayExpression(array) {
    return t.arrayExpression(array.map(i => buildExpression(i)));
  }

  function parseExpression(buildError, node) {
    switch (node.type) {
      case 'ObjectExpression':
        return parseObjectExpression(buildError, node);
      case 'ArrayExpression': {
        return parseArrayExpression(buildError, node);
      }
      case 'StringLiteral':
      case 'BooleanLiteral':
      case 'NumericLiteral':
        return node.value;
      default:
        throw buildError(
          `hbs can only accept static options but you passed ${JSON.stringify(node)}`
        );
    }
  }

  function parseArrayExpression(buildError, node) {
    let result = node.elements.map(element => parseExpression(buildError, element));

    return result;
  }

  function parseObjectExpression(buildError, node) {
    let result = {};

    node.properties.forEach(property => {
      if (property.computed || !['Identifier', 'StringLiteral'].includes(property.key.type)) {
        throw buildError('hbs can only accept static options');
      }

      let propertyName =
        property.key.type === 'Identifier' ? property.key.name : property.key.value;

      let value = parseExpression(buildError, property.value);

      result[propertyName] = value;
    });

    return result;
  }

  function compileTemplate(precompile, template, _options) {
    let options = Object.assign({ contents: template }, _options);

    let precompileResult = precompile(template, options);
    let precompiled = JSON.parse(precompileResult);

    let templateExpression = buildExpression(precompiled);

    t.addComment(
      templateExpression,
      'leading',
      `\n  ${template.replace(/\*\//g, '*\\/')}\n`,
      /* line comment? */ false
    );

    return t.callExpression(
      t.memberExpression(
        t.memberExpression(t.identifier('Ember'), t.identifier('HTMLBars')),
        t.identifier('template')
      ),
      [templateExpression]
    );
  }

  return {
    visitor: {
      ImportDeclaration(path, state) {
        let node = path.node;

        let modules = state.opts.modules || {
          'htmlbars-inline-precompile': 'default',
        };

        if (state.opts.modulePaths) {
          let modulePaths = state.opts.modulePaths;

          modulePaths.forEach(path => (modules[path] = 'default'));
        }

        let modulePaths = Object.keys(modules);
        let matchingModulePath = modulePaths.find(value => t.isLiteral(node.source, { value }));
        let modulePathExport = modules[matchingModulePath];

        if (matchingModulePath) {
          let first = node.specifiers && node.specifiers[0];
          let localName = first.local.name;

          if (modulePathExport === 'default') {
            if (!t.isImportDefaultSpecifier(first)) {
              let input = state.file.code;
              let usedImportStatement = input.slice(node.start, node.end);
              let msg = `Only \`import hbs from '${matchingModulePath}'\` is supported. You used: \`${usedImportStatement}\``;
              throw path.buildCodeFrameError(msg);
            }
          } else {
            if (!t.isImportSpecifier(first) || modulePathExport !== first.imported.name) {
              let input = state.file.code;
              let usedImportStatement = input.slice(node.start, node.end);
              let msg = `Only \`import { ${modulePathExport} } from '${matchingModulePath}'\` is supported. You used: \`${usedImportStatement}\``;

              throw path.buildCodeFrameError(msg);
            }
          }

          state.importId =
            state.importId || path.scope.generateUidIdentifierBasedOnNode(path.node.id);

          path.scope.rename(localName, state.importId.name);

          path.remove();
        }
      },

      TaggedTemplateExpression(path, state) {
        if (!state.importId) {
          return;
        }

        let tagPath = path.get('tag');
        if (tagPath.node.name !== state.importId.name) {
          return;
        }

        if (path.node.quasi.expressions.length) {
          throw path.buildCodeFrameError(
            'placeholders inside a tagged template string are not supported'
          );
        }

        let template = path.node.quasi.quasis.map(quasi => quasi.value.cooked).join('');

        path.replaceWith(compileTemplate(state.opts.precompile, template));
      },

      CallExpression(path, state) {
        if (!state.importId) {
          return;
        }

        let calleePath = path.get('callee');
        if (calleePath.node.name !== state.importId.name) {
          return;
        }

        let options;

        let template = path.node.arguments[0];
        if (template === undefined || typeof template.value !== 'string') {
          throw path.buildCodeFrameError(
            'hbs should be invoked with at least a single argument: the template string'
          );
        }

        switch (path.node.arguments.length) {
          case 0:
            throw path.buildCodeFrameError(
              'hbs should be invoked with at least a single argument: the template string'
            );
          case 1:
            break;
          case 2: {
            let astOptions = path.node.arguments[1];
            if (astOptions.type !== 'ObjectExpression') {
              throw path.buildCodeFrameError(
                'hbs can only be invoked with 2 arguments: the template string, and any static options'
              );
            }

            options = parseObjectExpression(path.buildCodeFrameError.bind(path), astOptions);

            break;
          }
          default:
            throw path.buildCodeFrameError(
              'hbs can only be invoked with 2 arguments: the template string, and any static options'
            );
        }

        let { precompile } = state.opts;

        path.replaceWith(compileTemplate(precompile, template.value, options));
      },
    },
  };
};

module.exports._parallelBabel = {
  requireFile: __filename,
};

module.exports.baseDir = function() {
  return __dirname;
};
