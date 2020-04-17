# @ember/edition-utils

This package is the officially supported mechanism for declaring and detecting
the specific edition that a given application is using.

## Usage

### Declaring Edition

In order to declare which edition of Ember your application (or addon) is compatible with
you would call `setEdition` from within your `.ember-cli.js` file. This might look something like:

```js
const { setEdition } = require('@ember/edition-utils');

setEdition('octane');

module.exports = {
  // other configuration here
}
```

### Detecting Edition

In order to detect if the currently running application is using _at least_ a
specific edition, you would call `has`. This will most commonly be used from
within various addon's to determine which blueprint code to run. For example:

```js
const { has } = require('@ember/edition-utils');

if (has('octane')) {
  // do octane stuff
} else {
  // do classic mode stuff
}
```

## License

This project is licensed under the [MIT License](LICENSE.md).
