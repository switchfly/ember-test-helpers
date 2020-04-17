'use strict';
const {
  hasSingleImplementation,
  allAddons,
} = require('./utils/single-implementation');
const SilentError = require('silent-error');

/* global Set */

module.exports = class ProjectWideDependencyChecker {
  constructor(project) {
    if (
      !project ||
      typeof project !== 'object' ||
      typeof project.isEmberCLIProject !== 'function'
    ) {
      throw new TypeError(
        `[ember-cli-version-checker]'s forProject must be provided an ember-cli project class`
      );
    }

    if (project._addonsInitialized !== true) {
      throw new TypeError(
        `[ember-cli-version-checker]'s forProject must be provided an project instance whos addons have been initialized. This is typically outside the addon's init`
      );
    }

    this._project = project;
  }

  hasSingleImplementation(name) {
    return hasSingleImplementation(name, this._project);
  }

  *allAddons() {
    yield* allAddons(this._project);
  }

  filterAddonsByName(name) {
    const addons = [];

    for (let addon of this.allAddons()) {
      if (addon.name === name) {
        addons.push(addon);
      }
    }

    return addons;
  }

  assertSingleImplementation(name, customMessage) {
    const uniqueImplementations = new Set();

    for (let addon of this.allAddons()) {
      if (addon.name === name) {
        uniqueImplementations.add(addon.root);
      }
    }

    if (uniqueImplementations.size === 1) {
      return true;
    }

    let message =
      customMessage ||
      `[ember-cli-version-checker] This project requires a single implementation version of the npm package \`${name}\`, but there're multiple. Please resolve \`${name}\` to same version:`;

    for (let root of uniqueImplementations) {
      message += `\n - ${name} @ ${root}`;
    }

    throw new SilentError(message);
  }
};
