import { module, test } from 'qunit';
import { doubleClick, setupContext, teardownContext } from '@ember/test-helpers';
import { buildInstrumentedElement, instrumentElement, insertElement } from '../../helpers/events';
import { isIE11 } from '../../helpers/browser-detect';
import hasEmberVersion from '@ember/test-helpers/has-ember-version';

module('DOM Helper: doubleClick', function (hooks) {
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
    test('double-clicking a div via selector with context set', async function (assert) {
      element = buildInstrumentedElement('div');

      await setupContext(context);
      await doubleClick(`#${element.id}`);

      assert.verifySteps([
        'mousedown',
        'mouseup',
        'click',
        'mousedown',
        'mouseup',
        'click',
        'dblclick',
      ]);
    });

    test('double-clicking a div via element with context set', async function (assert) {
      element = buildInstrumentedElement('div');

      await setupContext(context);
      await doubleClick(element);

      assert.verifySteps([
        'mousedown',
        'mouseup',
        'click',
        'mousedown',
        'mouseup',
        'click',
        'dblclick',
      ]);
    });

    test('double-clicking a div via element without context set', async function (assert) {
      element = buildInstrumentedElement('div');

      await doubleClick(element);

      assert.verifySteps([
        'mousedown',
        'mouseup',
        'click',
        'mousedown',
        'mouseup',
        'click',
        'dblclick',
      ]);
    });

    test('does not run sync', async function (assert) {
      element = buildInstrumentedElement('div');

      let promise = doubleClick(element);

      assert.verifySteps([]);

      await promise;

      assert.verifySteps([
        'mousedown',
        'mouseup',
        'click',
        'mousedown',
        'mouseup',
        'click',
        'dblclick',
      ]);
    });

    test('rejects if selector is not found', async function (assert) {
      element = buildInstrumentedElement('div');

      await setupContext(context);

      assert.rejects(
        doubleClick(`#foo-bar-baz-not-here-ever-bye-bye`),
        /Element not found when calling `doubleClick\('#foo-bar-baz-not-here-ever-bye-bye'\)`/
      );
    });

    test('rejects for disabled form control', async function (assert) {
      element = buildInstrumentedElement('select');
      element.setAttribute('disabled', true);

      await setupContext(context);
      assert.rejects(
        doubleClick(element),
        new Error('Can not `doubleClick` disabled [object HTMLSelectElement]')
      );
    });

    test('double-clicking a div via selector without context set', function (assert) {
      element = buildInstrumentedElement('div');

      assert.rejects(
        doubleClick(`#${element.id}`),
        /Must setup rendering context before attempting to interact with elements/
      );
    });

    test('double-clicking passes options through to mouse events', async function (assert) {
      element = buildInstrumentedElement('div', ['clientX', 'clientY', 'button']);

      await doubleClick(element, { clientX: 13, clientY: 17, button: 1 });

      assert.verifySteps([
        'mousedown 13 17 1',
        'mouseup 13 17 1',
        'click 13 17 1',
        'mousedown 13 17 1',
        'mouseup 13 17 1',
        'click 13 17 1',
        'dblclick 13 17 1',
      ]);
    });
  });

  module('focusable element types', function () {
    let clickSteps = [
      'mousedown',
      'focus',
      'focusin',
      'mouseup',
      'click',
      'mousedown',
      'mouseup',
      'click',
      'dblclick',
    ];

    if (isIE11) {
      clickSteps = [
        'mousedown',
        'focusin',
        'mouseup',
        'click',
        'focus',
        'mousedown',
        'mouseup',
        'click',
        'dblclick',
      ];
    }

    test('double-clicking a input via selector with context set', async function (assert) {
      element = buildInstrumentedElement('input');

      await setupContext(context);
      await doubleClick(`#${element.id}`);

      assert.verifySteps(clickSteps);
      assert.strictEqual(document.activeElement, element, 'activeElement updated');
    });

    test('double-clicking a input via element with context set', async function (assert) {
      element = buildInstrumentedElement('input');

      await setupContext(context);
      await doubleClick(element);

      assert.verifySteps(clickSteps);
      assert.strictEqual(document.activeElement, element, 'activeElement updated');
    });

    test('double-clicking a input via element without context set', async function (assert) {
      element = buildInstrumentedElement('input');

      await doubleClick(element);

      assert.verifySteps(clickSteps);
      assert.strictEqual(document.activeElement, element, 'activeElement updated');
    });

    test('double-clicking a input via selector without context set', function (assert) {
      element = buildInstrumentedElement('input');

      assert.rejects(
        doubleClick(`#${element.id}`),
        /Must setup rendering context before attempting to interact with elements/
      );
    });
  });

  module('elements in different realms', function () {
    test('double-clicking an element in a different realm', async function (assert) {
      element = document.createElement('iframe');

      insertElement(element);

      let iframeDocument = element.contentDocument;
      let iframeElement = iframeDocument.createElement('div');

      instrumentElement(iframeElement);

      await doubleClick(iframeElement);

      assert.verifySteps([
        'mousedown',
        'mouseup',
        'click',
        'mousedown',
        'mouseup',
        'click',
        'dblclick',
      ]);
    });
  });
});
