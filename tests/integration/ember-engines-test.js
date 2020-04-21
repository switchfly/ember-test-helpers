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

const modulePrefix = 'eager-engine';
const resolver = engineResolverFor(modulePrefix);

module('setupRenderingContext for "ember-engines"', function (hooks) {
  hooks.beforeEach(async function () {
    await setupContext(this, { resolver });
    // this.owner now is an engine.
    this.engine = this.owner;
    await setupRenderingContext(this);
  });

  hooks.afterEach(async function () {
    await teardownRenderingContext(this);
    this.engine = undefined;
    await teardownContext(this);
  });

  test('render components from engines', async function (assert) {
    assert.expect(2);

    this.set('colorValue', 'red');

    await render(hbs`{{pretty-color name=colorValue}}`);

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
