import { module, test } from 'qunit';
import { triggerEvent, setupContext, teardownContext } from '@ember/test-helpers';
import { buildInstrumentedElement } from '../../helpers/events';
import hasEmberVersion from '@ember/test-helpers/has-ember-version';

module('DOM Helper: triggerEvent', function (hooks) {
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

  test('can trigger arbitrary event types', async function (assert) {
    element = buildInstrumentedElement('div');
    element.addEventListener('fliberty', e => {
      assert.step('fliberty');
      assert.ok(e instanceof Event, `fliberty listener receives a native event`);
    });

    await setupContext(context);
    await triggerEvent(`#${element.id}`, 'fliberty');

    assert.verifySteps(['fliberty']);
  });

  test('triggering event via selector with context set fires the given event type', async function (assert) {
    element = buildInstrumentedElement('div');

    await setupContext(context);
    await triggerEvent(`#${element.id}`, 'mouseenter');

    assert.verifySteps(['mouseenter']);
  });

  test('triggering event via element with context set fires the given event type', async function (assert) {
    element = buildInstrumentedElement('div');

    await setupContext(context);
    await triggerEvent(element, 'mouseenter');

    assert.verifySteps(['mouseenter']);
  });

  test('triggering event via element without context set fires the given event type', async function (assert) {
    element = buildInstrumentedElement('div');

    await triggerEvent(element, 'mouseenter');

    assert.verifySteps(['mouseenter']);
  });

  test('triggering event via selector without context set', function (assert) {
    element = buildInstrumentedElement('div');

    assert.rejects(
      triggerEvent(`#${element.id}`, 'mouseenter'),
      /Must setup rendering context before attempting to interact with elements/
    );
  });

  test('does not run sync', async function (assert) {
    element = buildInstrumentedElement('div');

    let promise = triggerEvent(element, 'mouseenter');

    assert.verifySteps([]);

    await promise;

    assert.verifySteps(['mouseenter']);
  });

  test('rejects if selector is not found', async function (assert) {
    element = buildInstrumentedElement('div');

    await setupContext(context);

    assert.rejects(
      triggerEvent(`#foo-bar-baz-not-here-ever-bye-bye`, 'mouseenter'),
      /Element not found when calling `triggerEvent\('#foo-bar-baz-not-here-ever-bye-bye'/
    );
  });

  test('rejects if event type is not passed', async function (assert) {
    element = buildInstrumentedElement('div');

    await setupContext(context);

    assert.rejects(triggerEvent(element), /Must provide an `eventType` to `triggerEvent`/);
  });

  test('rejects for disabled form control', async function (assert) {
    element = buildInstrumentedElement('textarea');
    element.setAttribute('disabled', true);

    await setupContext(context);
    assert.rejects(
      triggerEvent(element, 'mouseenter'),
      new Error('Can not `triggerEvent` on disabled [object HTMLTextAreaElement]')
    );
  });

  test('events properly bubble upwards', async function (assert) {
    await setupContext(context);
    element = buildInstrumentedElement('div');
    element.innerHTML = `
      <div id="outer">
        <div id="inner"></div>
      </div>
    `;

    let outer = element.querySelector('#outer');
    let inner = element.querySelector('#inner');

    outer.addEventListener('mouseenter', () => {
      assert.step('outer: mouseenter');
    });

    inner.addEventListener('mouseenter', () => {
      assert.step('inner: mouseenter');
    });

    await triggerEvent('#inner', 'mouseenter');

    assert.verifySteps(['inner: mouseenter', 'outer: mouseenter', 'mouseenter']);
  });
});
