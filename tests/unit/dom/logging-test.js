import { module, test } from 'qunit';
import {
  render,
  settled,
  setupContext,
  setupRenderingContext,
  teardownContext,
  teardownRenderingContext,
} from '@ember/test-helpers';
import hasEmberVersion from '@ember/test-helpers/has-ember-version';
import { elementToString } from '@ember/test-helpers/dom/-logging';
import hbs from 'htmlbars-inline-precompile';

module('elementToString()', function (hooks) {
  if (!hasEmberVersion(2, 4)) {
    return;
  }

  hooks.beforeEach(async function () {
    await setupContext(this);
    await setupRenderingContext(this);
  });

  hooks.afterEach(async function () {
    await settled();
    await teardownRenderingContext(this);
    await teardownContext(this);
  });

  module('NodeLists', function () {
    test('empty NodeList', async function (assert) {
      await render(hbs``);
      assert.equal(elementToString(this.element.querySelectorAll('h1')), 'empty NodeList');
    });

    test('with single element', async function (assert) {
      await render(hbs`<h1></h1>`);
      assert.equal(elementToString(this.element.querySelectorAll('h1')), 'h1');
    });

    test('with three elements', async function (assert) {
      await render(hbs`<h1></h1><h1></h1><h1 class="foo"></h1>`);
      assert.equal(elementToString(this.element.querySelectorAll('h1')), 'h1, h1, h1.foo');
    });

    test('with five elements', async function (assert) {
      await render(hbs`<h1></h1><h1></h1><h1 class="foo"></h1><h1></h1><h1></h1>`);
      assert.equal(elementToString(this.element.querySelectorAll('h1')), 'h1, h1, h1.foo, h1, h1');
    });

    test('with six elements', async function (assert) {
      await render(hbs`<h1></h1><h1></h1><h1 class="foo"></h1><h1></h1><h1></h1><h1></h1>`);
      assert.equal(
        elementToString(this.element.querySelectorAll('h1')),
        'h1, h1, h1.foo, h1, h1... (+1 more)'
      );
    });

    test('with ten elements', async function (assert) {
      await render(
        hbs`<h1></h1><h1></h1><h1 class="foo"></h1><h1></h1><h1></h1><h1></h1><h1></h1><h1></h1><h1></h1><h1></h1>`
      );
      assert.equal(
        elementToString(this.element.querySelectorAll('h1')),
        'h1, h1, h1.foo, h1, h1... (+5 more)'
      );
    });
  });

  test('strings', async function (assert) {
    assert.equal(elementToString('h1'), 'h1');
    assert.equal(elementToString('[data-test-foo]'), '[data-test-foo]');
  });

  module('HTMLElements', function () {
    test('IDs', async function (assert) {
      await render(hbs`<div id="map"></div>`);
      assert.equal(elementToString(this.element.querySelector('div')), 'div#map');
    });

    test('CSS classes', async function (assert) {
      await render(hbs`<div class="foo bar"></div>`);
      assert.equal(elementToString(this.element.querySelector('div')), 'div.foo.bar');
    });

    test('attributes', async function (assert) {
      await render(hbs`<input type="password">`);
      assert.equal(elementToString(this.element.querySelector('input')), 'input[type="password"]');

      await render(hbs`<input data-test-username>`);
      assert.equal(
        elementToString(this.element.querySelector('input')),
        'input[data-test-username]'
      );
    });
  });
});
