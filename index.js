'use strict';

const BroccoliDebug = require('broccoli-debug');
const debugTree = BroccoliDebug.buildDebugCallback('ember-test-helpers');

module.exports = {
  name: require('./package').name,

  included() {
    this._super.included.apply(this, arguments);

    this.import('vendor/monkey-patches.js', { type: 'test' });
  },

  treeForAddonTestSupport(tree) {
    // intentionally not calling _super here
    // so that can have our `import`'s be
    // import { ... } from 'ember-test-helpers';

    let input = debugTree(tree, 'addon-test-support:input');

    let compiler = this.project._incrementalTsCompiler;
    if (this.isDevelopingAddon() && compiler) {
      // eslint-disable-next-line node/no-unpublished-require
      let TypescriptOutput = require('ember-cli-typescript/js/lib/incremental-typescript-compiler/typescript-output-plugin');
      // eslint-disable-next-line node/no-unpublished-require
      let MergeTrees = require('broccoli-merge-trees');

      let tsTree = debugTree(
        new TypescriptOutput(compiler, {
          'addon-test-support/@ember/test-helpers': '@ember/test-helpers',
        }),
        'addon-test-support:ts'
      );

      input = debugTree(new MergeTrees([input, tsTree]), 'addon-test-support:merged');
    }

    let output = this.preprocessJs(input, '/', this.name, {
      registry: this.registry,
    });

    return debugTree(output, 'addon-test-support:output');
  },

  treeForVendor(rawVendorTree) {
    let babelAddon = this.addons.find(addon => addon.name === 'ember-cli-babel');

    let transpiledVendorTree = babelAddon.transpileTree(rawVendorTree, {
      'ember-cli-babel': {
        compileModules: false,
      },
    });

    return transpiledVendorTree;
  },
};
