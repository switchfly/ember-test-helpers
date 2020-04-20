/* eslint-env node */
'use strict';

const EmberAddon = require('ember-cli/lib/broccoli/ember-addon');
const VersionChecker = require('ember-cli-version-checker');

module.exports = function (defaults) {
  let project = defaults.project;
  let checker = new VersionChecker(defaults);
  let emberChecker = checker.forEmber();
  let options = {
    eslint: {
      testGenerator: 'qunit',
    },
    trees: {
      vendor: null,
    },
  };

  if (
    (project.findAddonByName('ember-native-dom-event-dispatcher') ||
      emberChecker.isAbove('3.0.0')) &&
    project.findAddonByName('ember-fetch')
  ) {
    options.vendorFiles = { 'jquery.js': null };
  }

  let app = new EmberAddon(defaults, options);

  /*
    This build file specifies the options for the dummy test app of this
    addon, located in `/tests/dummy`
    This build file does *not* influence how the addon or the app using it
    behave. You most likely want to be modifying `./index.js` or app's build file
  */

  app.import('node_modules/qunit/qunit/qunit.js', {
    type: 'test',
  });

  app.import('node_modules/qunit/qunit/qunit.css', {
    type: 'test',
  });

  app.import('vendor/shims/qunit.js', { type: 'test' });
  app.import('vendor/promise-polyfill.js', { type: 'test' });

  return app.toTree();
};
