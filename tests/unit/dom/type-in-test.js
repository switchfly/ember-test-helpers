import { module, test } from 'qunit';
import { typeIn, setupContext, teardownContext } from '@ember/test-helpers';
import { buildInstrumentedElement } from '../../helpers/events';
import { isIE11 } from '../../helpers/browser-detect';
import { debounce } from '@ember/runloop';
import { Promise } from 'rsvp';
import hasEmberVersion from '@ember/test-helpers/has-ember-version';

/*
 * Event order based on https://jsbin.com/zitazuxabe/edit?html,js,console,output
 */

let expectedEvents = [
  'focus',
  'focusin',
  'keydown',
  'keypress',
  'input',
  'keyup',
  'keydown',
  'keypress',
  'input',
  'keyup',
  'keydown',
  'keypress',
  'input',
  'keyup',
  'change',
];

if (isIE11) {
  expectedEvents = [
    'focusin',
    'keydown',
    'keypress',
    'keyup',
    'keydown',
    'keypress',
    'keyup',
    'keydown',
    'keypress',
    'keyup',
    'input',
    'change',
    'focus',
  ];
}

module('DOM Helper: typeIn', function (hooks) {
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

  test('typing in an input', async function (assert) {
    element = buildInstrumentedElement('input');
    await typeIn(element, 'foo');

    assert.verifySteps(expectedEvents);
    assert.strictEqual(document.activeElement, element, 'activeElement updated');
    assert.equal(element.value, 'foo');
  });

  test('it triggers key events with correct arguments', async function (assert) {
    element = buildInstrumentedElement('input', ['key', 'shiftKey']);
    await typeIn(element, 'F o');

    let chars = ['F', ' ', 'o'];
    let shiftKeys = [true, false, false];
    let expectedEventsWithArguments = expectedEvents.map(eventName => {
      // Only key events get the key arguments
      if (!['keydown', 'keypress', 'keyup'].includes(eventName)) {
        return `${eventName} undefined undefined`;
      }
      // After each keyup, the next character comes up
      let char = eventName === 'keyup' ? chars.shift() : chars[0];
      let shiftKey = eventName === 'keyup' ? shiftKeys.shift() : shiftKeys[0];

      return `${eventName} ${char.toUpperCase()} ${shiftKey}`;
    });

    assert.verifySteps(expectedEventsWithArguments);
  });

  test('typing in an input with a delay', async function (assert) {
    element = buildInstrumentedElement('input');
    await typeIn(element, 'foo', { delay: 150 });

    assert.verifySteps(expectedEvents);
    assert.strictEqual(document.activeElement, element, 'activeElement updated');
    assert.equal(element.value, 'foo');
  });

  test('typing in a textarea', async function (assert) {
    element = buildInstrumentedElement('textarea');
    await typeIn(element, 'foo');

    assert.verifySteps(expectedEvents);
    assert.strictEqual(document.activeElement, element, 'activeElement updated');
    assert.equal(element.value, 'foo');
  });

  test('typing in not a form control', async function (assert) {
    element = buildInstrumentedElement('div');

    await setupContext(context);
    assert.rejects(typeIn(`#${element.id}`, 'foo'), /`typeIn` is only usable on form controls/);
  });

  test('typing in a disabled element', async function (assert) {
    element = buildInstrumentedElement('input');
    element.dataset.testDisabled = '';
    element.setAttribute('disabled', '');

    await setupContext(context);
    assert.rejects(
      typeIn(`[data-test-disabled]`, 'foo'),
      new Error("Can not `typeIn` disabled '[data-test-disabled]'.")
    );

    assert.rejects(
      typeIn(element, 'foo'),
      new Error("Can not `typeIn` disabled '[object HTMLInputElement]'.")
    );
  });

  test('typing in a readonly element', async function (assert) {
    element = buildInstrumentedElement('input');
    element.dataset.testDisabled = '';
    element.setAttribute('readonly', '');

    await setupContext(context);
    assert.rejects(
      typeIn(`[data-test-disabled]`, 'foo'),
      new Error("Can not `typeIn` readonly '[data-test-disabled]'.")
    );

    assert.rejects(
      typeIn(element, 'foo'),
      new Error("Can not `typeIn` readonly '[object HTMLInputElement]'.")
    );
  });

  test('rejects if selector is not found', async function (assert) {
    element = buildInstrumentedElement('div');

    await setupContext(context);

    assert.rejects(
      typeIn(`#foo-bar-baz-not-here-ever-bye-bye`, 'foo'),
      /Element not found when calling `typeIn\('#foo-bar-baz-not-here-ever-bye-bye'\)`/
    );
  });

  test('rejects if text to fill in is not provided', async function (assert) {
    element = buildInstrumentedElement('input');

    assert.rejects(typeIn(element), /Must provide `text` when calling `typeIn`/);
  });

  test('does not run sync', async function (assert) {
    element = buildInstrumentedElement('input');

    let promise = typeIn(element, 'foo');

    assert.verifySteps([]);

    await promise;

    assert.verifySteps(expectedEvents);
    assert.strictEqual(document.activeElement, element, 'activeElement updated');
    assert.equal(element.value, 'foo');
  });

  test('does not wait for other promises to settle', async function (assert) {
    element = buildInstrumentedElement('input');

    let runcount = 0;
    let onInput = function () {
      return Promise.resolve().then(() => runcount++);
    };

    element.oninput = function () {
      // debounce 2 seconds for easy visualization in test
      debounce(onInput, 2000);
    };

    await typeIn(element, 'foo');

    assert.verifySteps(expectedEvents);
    assert.equal(runcount, 1, 'debounced function only called once');
  });
});
