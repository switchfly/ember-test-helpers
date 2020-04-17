# Ember CLI Version Checker

[![npm version](https://badge.fury.io/js/ember-cli-version-checker.svg)](https://badge.fury.io/js/ember-cli-version-checker)
[![Build Status](https://travis-ci.org/ember-cli/ember-cli-version-checker.svg?branch=master)](https://travis-ci.org/ember-cli/ember-cli-version-checker)

Makes it easier to determine if a compatible version of a given NPM or Bower package is present.

## Usage

Example:

You want to provide two different sets of templates, based on the currently running Ember version.

```javascript
let path = require('path');
let VersionChecker = require('ember-cli-version-checker');

module.exports = {
  name: 'awesome-addon',
  treeForAddonTemplates(tree) {
    let checker = new VersionChecker(this.project);
    let dep = checker.for('ember', 'bower');

    let baseTemplatesPath = path.join(this.root, 'addon/templates');

    if (dep.satisfies('>= 1.13.0')) {
      return this.treeGenerator(path.join(baseTemplatesPath, 'current'));
    } else {
      return this.treeGenerator(path.join(baseTemplatesPath, 'legacy'));
    }
  }
};
```

## API

### Semver Methods (gt, lt, gte, lte, eq, neq, satisfies)

See https://github.com/npm/node-semver#comparison and https://github.com/npm/node-semver#ranges-1 for more info

```js
let VersionChecker = require('ember-cli-version-checker');

module.exports = {
  name: 'awesome-addon',
  init() {
    this._super.init.apply(this, arguments);

    let checker = new VersionChecker(this.project);
    let dep = checker.for('ember-cli');

    if (dep.gte('2.0.0')) {
      /* deal with 2.0.0+ stuff */
    } else {
      /* provide backwards compat */
    };
  }
};
```

### assertAbove

Throws an error with the given message if a minimum version isn't met.

```javascript
let VersionChecker = require('ember-cli-version-checker');

module.exports = {
  name: 'awesome-addon',
  init() {
    this._super.init.apply(this, arguments);

    let checker = new VersionChecker(this.project);

    checker.for('ember-cli').assertAbove('2.0.0');
  }
};
```

You can also provide a specific message as the third argument to `assertAbove` if you'd like to customize the output.

```javascript
let VersionChecker = require('ember-cli-version-checker');

module.exports = {
  name: 'awesome-addon',
  init() {
    this._super.init.apply(this, arguments);

    let checker = new VersionChecker(this.project);

    checker.for('ember-cli').assertAbove('2.0.0', 'To use awesome-addon you must have ember-cli 2.0.0');
  }
};
```

### isAbove

Returns `true` if the packages version is above the specified comparison range.

```javascript
let VersionChecker = require('ember-cli-version-checker');

module.exports = {
  name: 'awesome-addon',
  init() {
    this._super.init.apply(this, arguments);

    let checker = new VersionChecker(this.project);
    let dep = checker.for('ember-cli');

    if (dep.isAbove('2.0.0')) {
      /* deal with 2.0.0 stuff */
    } else {
      /* provide backwards compat */
    };
  }
};
```

### forEmber

Since ember introduced the `ember-source` from NPM, ember has two ways to be
shipped. One from bower `ember` and other from NPM `ember-source`. The
function `forEmber` will look for `ember-source` from NPM, if it doesn't
find it, it will look for `ember` in bower.

```javascript
let VersionChecker = require('ember-cli-version-checker');

module.exports = {
  name: 'awesome-addon',
  init() {
    this._super.init.apply(this, arguments);

    let checker = new VersionChecker(this.project);
    let ember = checker.forEmber();

    if (ember.isAbove('2.10.0')) {
      /* deal with 2.10.0 stuff */
    };
  }
};
```

### exists

Returns `true` or `false` indicating if the dependency exists (at any version).

```js
let VersionChecker = require('ember-cli-version-checker');

module.exports = {
  name: 'awesome-addon',
  init() {
    this._super.init.apply(this, arguments);

    let checker = new VersionChecker(this.project);
    let dep = checker.for('ember-cli-qunit');

    if (dep.exists()) {
      /* do things when present */
    };
  }
};
```

### version

A property that returns the version for the dependency, if the dependency is not found
`undefined` will be returned.

```js
let VersionChecker = require('ember-cli-version-checker');

module.exports = {
  name: 'awesome-addon',
  init() {
    this._super.init.apply(this, arguments);

    let checker = new VersionChecker(this.project);
    let dep = checker.for('ember-cli-qunit');

    // do something with dep.version
  }
};
```

### hasSingleImplementation

Returns `true` if there is only single implementation in node_modules of the
addon. It can either be at app top-level or as a nested dependency. This API
does not work with non-addon npm dependency.

A unique addon can still be included multiple times if it's a nested
dependency, but they are guaranteed to be resolved to same version in
node_modules. This happens when the dependency in problem specifies a valid
version range or the app uses [yarn
  resolutions](https://yarnpkg.com/lang/en/docs/selective-version-resolutions/).

This is useful if the app wants to make sure there's no unexpected assets from
the addon on being included but still alow the addon being included in the
hierarchy's build process.

```js
const VersionChecker = require('ember-cli-version-checker');

module.exports = {
  name: 'awesome-addon',
  included() {
    this._super.included.apply(this, arguments);

    let checker = VersionChecker.forProject(this.project);

    if (checker.hasSingleImplementation('<my-addon>')) {
      /* do things when <my-addon> is unique */
    }
  }
};
```

### assertSingleImplementation

Throws an error if the addon isn't unique, and receives an optional message
param to customize the error message.

```js
const VersionChecker = require('ember-cli-version-checker');

module.exports = {
  name: 'awesome-addon',
  included() {
    this._super.included.apply(this, arguments);

    let checker = VersionChecker.forProject(this.project);

    checker.assertSingleImplementation('<my-addon>', 'Please make sure <my-addon> has only one implementation, please correct and here is a helpful message!');
  }
};
```

### filterAddonsByName

Find all addon instances with the same name

```js
const VersionChecker = require('ember-cli-version-checker');

module.exports = {
  name: 'awesome-addon',
  included() {
    this._super.included.apply(this, arguments);

    let checker = VersionChecker.forProject(this.project);

    checker.filterAddonsByName('<my-addon>'); // => an array of addon instances who have the name `<my-addon>`
  }
};
```


### allAddons

An iterator which gives acccess to all addon instances

```js
const VersionChecker = require('ember-cli-version-checker');

module.exports = {
  name: 'awesome-addon',
  included() {
    this._super.included.apply(this, arguments);

    let checker = VersionChecker.forProject(this.project);

    for (let { name, root } = checker.allAddons()) {
      // access to the add-on, in this case root + name
    }
  }
};
```

## Note

### How does the version resolution works?

When creating `VersionChecker(addonOrAppOrProject)`, the param needs to have a `root`
property for the VersionChecker to perform node's
[module resolution](https://nodejs.org/api/modules.html#modules_all_together).

### Should I use project or parent?

The two primary options that are valid are:

- `new VersionChecker(this.project)`
- `new VersionChecker(this.parent)`

Which one to use depends on if the addon is trying to find a known top-level library or its parent's.

For example, you may want to check `this.project` root path to find `ember-cli` or `ember-source`,
which are expected to be top-level.
Or you may want to check your parent's specific dependency that affects your addon's behavior, you should create
from `this.parent`.

If you create via `new VersionChecker(this)` in an addon, it will resolve from your addon's path and have your
own dependency's version instead of top-level dependency's if exists. This will result in unreliable result.
