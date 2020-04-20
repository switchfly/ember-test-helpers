import { module, test } from 'qunit';
import { tap, setupContext, teardownContext } from '@ember/test-helpers';
import { buildInstrumentedElement } from '../../helpers/events';
import { isIE11 } from '../../helpers/browser-detect';
import hasEmberVersion from '@ember/test-helpers/has-ember-version';

module('DOM Helper: tap', function (hooks) {
  if (!hasEmberVersion(2, 4)) {
    return;
  }

  let context, element;

  hooks.beforeEach(function () {
    // used to simulate how `setupRenderingTest` (and soon `setupApplicationTest`)
    // set context.element to the rootElement
    context = {
      element: document.querySelector('#qunit-fixture'),
    };
  });

  hooks.afterEach(async function () {
    element.setAttribute('data-skip-steps', true);

    if (element) {
      element.parentNode.removeChild(element);
    }
    // only teardown if setupContext was called
    if (context.owner) {
      await teardownContext(context);
    }
    document.getElementById('ember-testing').innerHTML = '';
  });

  module('non-focusable element types', function () {
    test('taping a div via selector with context set', async function (assert) {
      element = buildInstrumentedElement('div');

      await setupContext(context);
      await tap(`#${element.id}`);

      assert.verifySteps(['touchstart', 'touchend', 'mousedown', 'mouseup', 'click']);
    });

    test('tapping a div via element with context set', async function (assert) {
      element = buildInstrumentedElement('div');

      await setupContext(context);
      await tap(element);

      assert.verifySteps(['touchstart', 'touchend', 'mousedown', 'mouseup', 'click']);
    });

    test('tapping a div via element without context set', async function (assert) {
      element = buildInstrumentedElement('div');

      await tap(element);

      assert.verifySteps(['touchstart', 'touchend', 'mousedown', 'mouseup', 'click']);
    });

    test('tapping passes options through to mouse events', async function (assert) {
      element = buildInstrumentedElement('div', ['clientX', 'clientY', 'button']);

      await tap(element, { clientX: 13, clientY: 17, button: 1 });

      assert.verifySteps([
        'touchstart 13 17 1',
        'touchend 13 17 1',
        'mousedown 13 17 1',
        'mouseup 13 17 1',
        'click 13 17 1',
      ]);
    });

    test('does not run sync', async function (assert) {
      element = buildInstrumentedElement('div');

      let promise = tap(element);

      assert.verifySteps([]);

      await promise;

      assert.verifySteps(['touchstart', 'touchend', 'mousedown', 'mouseup', 'click']);
    });

    test('rejects if selector is not found', async function (assert) {
      element = buildInstrumentedElement('div');

      await setupContext(context);

      assert.rejects(
        tap(`#foo-bar-baz-not-here-ever-bye-bye`),
        /Element not found when calling `tap\('#foo-bar-baz-not-here-ever-bye-bye'\)`/
      );
    });

    test('tapping a div via selector without context set', async function (assert) {
      element = buildInstrumentedElement('div');

      assert.rejects(
        tap(`#${element.id}`),
        /Must setup rendering context before attempting to interact with elements/
      );
    });
  });

  module('focusable element types', function () {
    let tapSteps = ['touchstart', 'touchend', 'mousedown', 'focus', 'focusin', 'mouseup', 'click'];

    if (isIE11) {
      tapSteps = ['touchstart', 'touchend', 'mousedown', 'focusin', 'mouseup', 'click', 'focus'];
    }
    test('tapping a input via selector with context set', async function (assert) {
      element = buildInstrumentedElement('input');

      await setupContext(context);
      await tap(`#${element.id}`);

      assert.verifySteps(tapSteps);
      assert.strictEqual(document.activeElement, element, 'activeElement updated');
    });

    test('tapping a input via element with context set', async function (assert) {
      element = buildInstrumentedElement('input');

      await setupContext(context);
      await tap(element);

      assert.verifySteps(tapSteps);
      assert.strictEqual(document.activeElement, element, 'activeElement updated');
    });

    test('tapping a input via element without context set', async function (assert) {
      element = buildInstrumentedElement('input');

      await tap(element);

      assert.verifySteps(tapSteps);
      assert.strictEqual(document.activeElement, element, 'activeElement updated');
    });

    test('tapping a input via selector without context set', function (assert) {
      element = buildInstrumentedElement('input');

      assert.rejects(
        tap(`#${element.id}`),
        /Must setup rendering context before attempting to interact with elements/
      );
    });
  });
});
