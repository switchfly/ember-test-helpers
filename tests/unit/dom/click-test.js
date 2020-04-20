import { module, test } from 'qunit';
import { click, setupContext, teardownContext } from '@ember/test-helpers';
import { buildInstrumentedElement, instrumentElement, insertElement } from '../../helpers/events';
import { isIE11 } from '../../helpers/browser-detect';
import hasEmberVersion from '@ember/test-helpers/has-ember-version';

module('DOM Helper: click', function (hooks) {
  if (!hasEmberVersion(2, 4)) {
    return;
  }

  let context, element;

  hooks.beforeEach(function () {
    context = {};
  });

  hooks.afterEach(async function () {
    element.setAttribute('data-skip-steps', true);

    if (element) {
      element.parentNode.removeChild(element);
    }
    if (context.owner) {
      await teardownContext(context);
    }

    document.getElementById('ember-testing').innerHTML = '';
  });

  module('non-focusable element types', function () {
    test('clicking a div via selector with context set', async function (assert) {
      element = buildInstrumentedElement('div');

      await setupContext(context);
      await click(`#${element.id}`);

      assert.verifySteps(['mousedown', 'mouseup', 'click']);
    });

    test('clicking a div via element with context set', async function (assert) {
      element = buildInstrumentedElement('div');

      await setupContext(context);
      await click(element);

      assert.verifySteps(['mousedown', 'mouseup', 'click']);
    });

    test('clicking a div via element without context set', async function (assert) {
      element = buildInstrumentedElement('div');

      await click(element);

      assert.verifySteps(['mousedown', 'mouseup', 'click']);
    });

    test('does not run sync', async function (assert) {
      element = buildInstrumentedElement('div');

      let promise = click(element);

      assert.verifySteps([]);

      await promise;

      assert.verifySteps(['mousedown', 'mouseup', 'click']);
    });

    test('rejects if selector is not found', async function (assert) {
      element = buildInstrumentedElement('div');

      await setupContext(context);

      assert.rejects(
        click(`#foo-bar-baz-not-here-ever-bye-bye`),
        /Element not found when calling `click\('#foo-bar-baz-not-here-ever-bye-bye'\)`/
      );
    });

    test('clicking a div via selector without context set', function (assert) {
      element = buildInstrumentedElement('div');

      assert.rejects(
        click(`#${element.id}`),
        /Must setup rendering context before attempting to interact with elements/
      );
    });

    test('clicking a disabled div still clicks', async function (assert) {
      element = buildInstrumentedElement('div');
      element.setAttribute('disabled', true);

      await click(element);

      assert.verifySteps(['mousedown', 'mouseup', 'click']);
    });

    test('clicking passes options through to mouse events', async function (assert) {
      element = buildInstrumentedElement('div', ['clientX', 'clientY', 'button']);

      await click(element, { clientX: 13, clientY: 17, button: 2 });

      assert.verifySteps(['mousedown 13 17 2', 'mouseup 13 17 2', 'click 13 17 2']);
    });

    test('clicking accepts modifiers', async function (assert) {
      element = buildInstrumentedElement('div', ['clientX', 'clientY', 'button']);
      let handler = e => {
        assert.equal(e.altKey, true);
      };
      element.addEventListener('click', handler);
      await click(element, { clientX: 13, clientY: 17, altKey: true });
      assert.verifySteps(['mousedown 13 17 0', 'mouseup 13 17 0', 'click 13 17 0']);
      element.removeEventListener('click', handler);
    });

    test('clicking a div has window set as view by default', async function (assert) {
      element = buildInstrumentedElement('div', ['view']);

      await setupContext(context);
      await click(element);

      assert.verifySteps([
        'mousedown [object Window]',
        'mouseup [object Window]',
        'click [object Window]',
      ]);
    });
  });

  module('focusable element types', function () {
    let clickSteps = ['mousedown', 'focus', 'focusin', 'mouseup', 'click'];

    if (isIE11) {
      clickSteps = ['mousedown', 'focusin', 'mouseup', 'click', 'focus'];
    }

    test('clicking a input via selector with context set', async function (assert) {
      element = buildInstrumentedElement('input');

      await setupContext(context);
      await click(`#${element.id}`);

      assert.verifySteps(clickSteps);
      assert.strictEqual(document.activeElement, element, 'activeElement updated');
    });

    test('clicking a input via element with context set', async function (assert) {
      element = buildInstrumentedElement('input');

      await setupContext(context);
      await click(element);

      assert.verifySteps(clickSteps);
      assert.strictEqual(document.activeElement, element, 'activeElement updated');
    });

    test('clicking a input via element without context set', async function (assert) {
      element = buildInstrumentedElement('input');

      await click(element);

      assert.verifySteps(clickSteps);
      assert.strictEqual(document.activeElement, element, 'activeElement updated');
    });

    test('clicking a input via selector without context set', function (assert) {
      element = buildInstrumentedElement('input');

      assert.rejects(
        click(`#${element.id}`),
        /Must setup rendering context before attempting to interact with elements/
      );
    });

    test('clicking a disabled input does nothing', async function (assert) {
      element = buildInstrumentedElement('input');
      element.setAttribute('disabled', true);

      await click(element);

      assert.verifySteps([]);
      assert.notStrictEqual(document.activeElement, element, 'activeElement not updated');
    });
  });

  module('elements in different realms', function () {
    test('clicking an element in a different realm', async function (assert) {
      element = document.createElement('iframe');

      insertElement(element);

      let iframeDocument = element.contentDocument;
      let iframeElement = iframeDocument.createElement('div');

      instrumentElement(iframeElement);

      await click(iframeElement);

      assert.verifySteps(['mousedown', 'mouseup', 'click']);
    });
  });
});
