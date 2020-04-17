# babel-plugin-htmlbars-inline-precompile

<a href="https://github.com/ember-cli/babel-plugin-htmlbars-inline-precompile"><img alt="Build Status" src="https://github.com/ember-cli/babel-plugin-htmlbars-inline-precompile/workflows/CI/badge.svg"></a>

Babel plugin to replace tagged `.hbs` formatted strings with a precompiled version.

## Requirements

* Node 8+
* Ember 2.10+
* Babel 7

## Usage

Can be used as either a normal function invocation or a tagged template string:

```js
import hbs from 'htmlbars-inline-precompile';

hbs`some {{handlebarsthingy}}`;
hbs('some {{handlebarsthingy}}');
```

When used as a normal function invocation, you can pass additional options (e.g. to configure the resulting template's `moduleName` metadata):

```js
import hbs from 'htmlbars-inline-precompile';

hbs('some {{handlebarsthingy}}', { moduleName: 'some/path/to/file.hbs' });
```

## Babel Plugin Usage

``` js
var HTMLBarsCompiler = require('./bower_components/ember/ember-template-compiler');
var HTMLBarsInlinePrecompile = require('babel-plugin-htmlbars-inline-precompile');

require('babel').transform("code", {
  plugins: [
    [HTMLBarsInlinePrecompile, {precompile: HTMLBarsCompiler.precompile}],
  ],
});
```

### Example

``` js
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';

module("my component", function(hooks) {
  setupRenderingTest(hooks);

  test('inline templates ftw', async function(assert) {
    await render(hbs`hello!`);

    assert.dom().hasText('hello!');
  });
});
```

results in

``` js
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';

module("my component", function(hooks) {
  setupRenderingTest(hooks);

  test('inline templates ftw', async function(assert) {
    await render(Ember.HTMLBars.template(function() {
      /* crazy HTMLBars template function stuff */
    }));

    assert.dom().hasText('hello!');
  });
});
```
