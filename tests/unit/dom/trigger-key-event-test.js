import { module, test } from 'qunit';
import { triggerKeyEvent, setupContext, teardownContext } from '@ember/test-helpers';
import { buildInstrumentedElement, insertElement } from '../../helpers/events';
import hasEmberVersion from '@ember/test-helpers/has-ember-version';

module('DOM Helper: triggerKeyEvent', function (hooks) {
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

  test('rejects if event type is missing', async function (assert) {
    element = buildInstrumentedElement('div');

    await setupContext(context);

    assert.rejects(triggerKeyEvent(element), /Must provide an `eventType` to `triggerKeyEvent`/);
  });

  test('rejects if event type is invalid', async function (assert) {
    element = buildInstrumentedElement('div');

    await setupContext(context);

    assert.rejects(
      triggerKeyEvent(element, 'mouseenter'),
      /Must provide an `eventType` of keydown, keypress, keyup to `triggerKeyEvent` but you passed `mouseenter`./
    );
  });

  test('rejects if key code is missing', async function (assert) {
    element = buildInstrumentedElement('div');

    await setupContext(context);

    assert.rejects(
      triggerKeyEvent(element, 'keypress'),
      /Must provide a `key` or `keyCode` to `triggerKeyEvent`/
    );
  });

  test('rejects if empty string is passed in', async function (assert) {
    element = buildInstrumentedElement('div');

    await setupContext(context);

    assert.rejects(
      triggerKeyEvent(element, 'keypress', ''),
      /Must provide a `key` or `keyCode` to `triggerKeyEvent`/
    );
  });

  test('rejects if lower case key is passed in', async function (assert) {
    element = buildInstrumentedElement('div');

    await setupContext(context);

    assert.rejects(
      triggerKeyEvent(element, 'keypress', 'enter'),
      /Must provide a `key` to `triggerKeyEvent` that starts with an uppercase character but you passed `enter`./
    );
  });

  test('rejects if keyCode is passed as a string', async function (assert) {
    element = buildInstrumentedElement('div');

    await setupContext(context);

    assert.rejects(
      triggerKeyEvent(element, 'keypress', '13'),
      /Must provide a numeric `keyCode` to `triggerKeyEvent` but you passed `13` as a string./
    );
  });

  test('triggering via selector with context set', async function (assert) {
    element = buildInstrumentedElement('div');

    await setupContext(context);
    await triggerKeyEvent(`#${element.id}`, 'keydown', 13);

    assert.verifySteps(['keydown']);
  });

  test('triggering via element with context set', async function (assert) {
    element = buildInstrumentedElement('div');

    await setupContext(context);
    await triggerKeyEvent(element, 'keydown', 13);

    assert.verifySteps(['keydown']);
  });

  test('triggering via element without context set', async function (assert) {
    element = buildInstrumentedElement('div');

    await triggerKeyEvent(element, 'keydown', 13);

    assert.verifySteps(['keydown']);
  });

  test('triggering via selector without context set', function (assert) {
    element = buildInstrumentedElement('div');

    assert.rejects(
      triggerKeyEvent(`#${element.id}`, 'keydown', 13),
      /Must setup rendering context before attempting to interact with elements/
    );
  });

  ['ctrl', 'shift', 'alt', 'meta'].forEach(function (modifierType) {
    test(`triggering passing with ${modifierType} pressed`, async function (assert) {
      element = buildInstrumentedElement('div');
      element.addEventListener('keypress', e => {
        assert.ok(e[`${modifierType}Key`], `has ${modifierType} indicated`);
      });

      await setupContext(context);
      await triggerKeyEvent(element, 'keypress', 13, { [`${modifierType}Key`]: true });

      assert.verifySteps(['keypress']);
    });
  });

  test(`can combine modifier keys`, async function (assert) {
    element = buildInstrumentedElement('div');
    element.addEventListener('keypress', e => {
      assert.ok(e.ctrlKey, `has ctrlKey indicated`);
      assert.ok(e.altKey, `has altKey indicated`);
    });

    await setupContext(context);
    await triggerKeyEvent(element, 'keypress', 13, { altKey: true, ctrlKey: true });

    assert.verifySteps(['keypress']);
  });

  test('The value of the `event.key` is properly inferred from the given keycode and modifiers', async function (assert) {
    element = document.createElement('div');
    insertElement(element);
    async function checkKey(keyCode, key, modifiers) {
      let handler = e => {
        assert.equal(e.key, key);
      };
      element.addEventListener('keydown', handler);
      await triggerKeyEvent(element, 'keydown', keyCode, modifiers);
      element.removeEventListener('keydown', handler);
    }
    await checkKey(8, 'Backspace');
    await checkKey(9, 'Tab');
    await checkKey(13, 'Enter');
    await checkKey(16, 'Shift');
    await checkKey(17, 'Control');
    await checkKey(18, 'Alt');
    await checkKey(20, 'CapsLock');
    await checkKey(27, 'Escape');
    await checkKey(32, ' ');
    await checkKey(37, 'ArrowLeft');
    await checkKey(38, 'ArrowUp');
    await checkKey(39, 'ArrowRight');
    await checkKey(40, 'ArrowDown');
    await checkKey(48, '0');
    await checkKey(57, '9');
    await checkKey(91, 'Meta');
    await checkKey(93, 'Meta');
    await checkKey(187, '=');
    await checkKey(189, '-');
    await checkKey(65, 'a');
    await checkKey(90, 'z');
    await checkKey(65, 'A', { shiftKey: true });
    await checkKey(90, 'Z', { shiftKey: true });
  });

  test('The value of the `event.keyCode` is properly inferred from the given key', async function (assert) {
    element = document.createElement('div');
    insertElement(element);
    async function checkKeyCode(key, keyCode) {
      let handler = e => {
        assert.equal(e.keyCode, keyCode);
      };
      element.addEventListener('keydown', handler);
      await triggerKeyEvent(element, 'keydown', key);
      element.removeEventListener('keydown', handler);
    }
    await checkKeyCode('Backspace', 8);
    await checkKeyCode('Tab', 9);
    await checkKeyCode('Enter', 13);
    await checkKeyCode('Shift', 16);
    await checkKeyCode('Control', 17);
    await checkKeyCode('Alt', 18);
    await checkKeyCode('CapsLock', 20);
    await checkKeyCode('Escape', 27);
    await checkKeyCode(' ', 32);
    await checkKeyCode('ArrowLeft', 37);
    await checkKeyCode('ArrowUp', 38);
    await checkKeyCode('ArrowRight', 39);
    await checkKeyCode('ArrowDown', 40);
    await checkKeyCode('Meta', 91);
    await checkKeyCode('=', 187);
    await checkKeyCode('-', 189);
    await checkKeyCode('0', 48);
    await checkKeyCode('9', 57);
    await checkKeyCode('A', 65);
    await checkKeyCode('Z', 90);
  });
});
