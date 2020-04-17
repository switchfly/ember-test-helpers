import { module, test } from 'qunit';
import {
  setupContext,
  setupRenderingContext,
  teardownContext,
  teardownRenderingContext,
  render,
} from '@ember/test-helpers';
import engineResolverFor from 'ember-engines/test-support/engine-resolver-for';

import hbs from 'htmlbars-inline-precompile';

const modulePrefix = 'lazy-engine';
const resolver = engineResolverFor(modulePrefix);

module('setupRenderingContext "ember-engines"', function(hooks) {
  hooks.beforeEach(async function() {
    await setupContext(this);
    await setupRenderingContext(this, { resolver });
  });

  hooks.afterEach(async function() {
    await teardownRenderingContext(this);
    await teardownContext(this);
  });

  test('should change colors', async function(assert) {
    assert.expect(2);

    // set the outer context to red
    this.set('colorValue', 'red');

    await render(hbs`{{#pretty-color name=colorValue}}{{/pretty-color}}`);

    assert.equal(
      this.element.querySelector('div').getAttribute('style'),
      'color: red',
      'starts as red'
    );

    this.set('colorValue', 'blue');

    assert.equal(
      this.element.querySelector('div').getAttribute('style'),
      'color: blue',
      'updates to blue'
    );
  });
});
