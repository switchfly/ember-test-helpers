import { module, test } from 'qunit';
import hbs from 'htmlbars-inline-precompile';
import {
  render,
  scrollTo,
  setupContext,
  setupRenderingContext,
  teardownContext,
} from '@ember/test-helpers';
import hasEmberVersion from '@ember/test-helpers/has-ember-version';

module('DOM Helper: scroll-to', function (hooks) {
  if (!hasEmberVersion(2, 4)) {
    return;
  }

  hooks.beforeEach(async function () {
    await setupContext(this);
    await setupRenderingContext(this);
  });

  hooks.afterEach(async function () {
    await teardownContext(this);
  });

  test('Scroll in vertical direction', async function (assert) {
    assert.expect(1);

    let currentScrollPosition = 0;
    let scrollAmount = 50;
    this.callback = e => {
      currentScrollPosition = e.target.scrollTop;
    };

    await render(hbs`
      <div
        style="height: 200px; overflow-y: auto;"
        class="container"
        onscroll={{action callback}}
      >
        <ul>
        <li class="item" style="height: 100px;">A</li>
        <li class="item" style="height: 100px;">B</li>
        <li class="item" style="height: 100px;">C</li>
        <li class="item" style="height: 100px;">D</li>
        <li class="item" style="height: 100px;">E</li>
        </ul>
      </div>
      `);

    await scrollTo('.container', 0, scrollAmount);

    assert.equal(
      currentScrollPosition,
      scrollAmount,
      'After use of the `scrollTop` a paint cycle is triggered and the callback is called'
    );
  });

  test('Scroll in horizontal direction', async function (assert) {
    let currentScrollPosition = 0;
    let scrollAmount = 50;
    this.callback = e => {
      currentScrollPosition = e.target.scrollLeft;
    };

    await render(hbs`
      <div
        style="width: 200px; overflow-x: auto; white-space: nowrap;"
        class="container"
        onscroll={{action callback}}
      >
        <div class="item" style="width: 100px; height: 100px; display: inline-block">A</div>
        <div class="item" style="width: 100px; height: 100px; display: inline-block">B</div>
        <div class="item" style="width: 100px; height: 100px; display: inline-block">C</div>
        <div class="item" style="width: 100px; height: 100px; display: inline-block">D</div>
        <div class="item" style="width: 100px; height: 100px; display: inline-block">E</div>
      </div>
      `);

    await scrollTo('.container', scrollAmount, 0);

    assert.equal(
      currentScrollPosition,
      scrollAmount,
      'After use of the `scrollLeft` a paint cycle is triggered and the callback is called'
    );
  });

  test('It throws an error if a target is not supplied', async function (assert) {
    assert.rejects(
      scrollTo('', 0, 0),
      new Error('Must pass an element or selector to `scrollTo`.')
    );
  });

  test('It throws an error if all coordinates are not supplied', async function (assert) {
    await render(hbs`<div class="container"></div>`);

    assert.rejects(scrollTo('.container', 0), /Must pass both x and y coordinates/);
    assert.rejects(scrollTo('.container', undefined, 0), /Must pass both x and y coordinates/);
  });

  test('It throws an error if the target is not found', async function (assert) {
    await render(hbs`<div class="container"></div>`);

    assert.rejects(scrollTo('.container2', 0, 0), /Element not found when calling/);
  });

  test('It throws an error if the target is not an element', async function (assert) {
    assert.rejects(scrollTo(document, 0, 0), /"target" must be an element/);
    assert.rejects(scrollTo(window, 0, 0), /"target" must be an element/);
  });
});
