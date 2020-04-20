import { module, test } from 'qunit';
import { triggerEvent, setupContext, teardownContext } from '@ember/test-helpers';
import { buildInstrumentedElement } from '../../helpers/events';
import hasEmberVersion from '@ember/test-helpers/has-ember-version';

module('DOM Helper: selectFiles', function (hooks) {
  if (!hasEmberVersion(2, 4)) {
    return;
  }

  let context, element;

  const textFile = new Blob(['Hello World'], { type: 'text/plain' });
  textFile.name = 'text-file.txt';

  const imageFile = new Blob([], { type: 'text/png' });
  imageFile.name = 'image-file.png';

  hooks.beforeEach(function () {
    // used to simulate how `setupRenderingTest` (and soon `setupApplicationTest`)
    // set context.element to the rootElement
    context = {
      element: document.querySelector('#qunit-fixture'),
    };
  });

  hooks.afterEach(async function () {
    if (element) {
      element.parentNode.removeChild(element);
    }

    // only teardown if setupContext was called
    if (context.owner) {
      await teardownContext(context);
    }
    document.getElementById('ember-testing').innerHTML = '';
  });

  test('it can trigger a file selection event more than once', async function (assert) {
    element = buildInstrumentedElement('input');
    element.setAttribute('type', 'file');

    element.addEventListener('change', e => {
      assert.step(e.target.files[0].name);
    });

    await setupContext(context);
    await triggerEvent(element, 'change', { files: [textFile] });
    await triggerEvent(element, 'change', { files: [imageFile] });

    assert.verifySteps(['change', 'text-file.txt', 'change', 'image-file.png']);
  });

  test('it can trigger a file selection event with files passed in options as an object', async function (assert) {
    element = buildInstrumentedElement('input');
    element.setAttribute('type', 'file');

    element.addEventListener('change', e => {
      assert.step(e.target.files[0].name);
    });

    await setupContext(context);
    await triggerEvent(element, 'change', { files: [textFile] });

    assert.verifySteps(['change', 'text-file.txt']);
  });

  test('it can trigger a file selection event with files passed in options as an array but raises a deprecation warning', async function (assert) {
    element = buildInstrumentedElement('input');
    element.setAttribute('type', 'file');

    element.addEventListener('change', e => {
      assert.step(e.target.files[0].name);
    });

    await setupContext(context);
    await triggerEvent(element, 'change', [textFile]);

    assert.verifySteps(['change', 'text-file.txt']);
    assert.deprecationsInclude(
      'Passing the `options` param as an array to `triggerEvent` for file inputs is deprecated. Please pass an object with a key `files` containing the array instead.'
    );
  });

  test('it can trigger a file selection event with an empty files array', async function (assert) {
    element = buildInstrumentedElement('input');
    element.setAttribute('type', 'file');

    element.addEventListener('change', e => {
      assert.equal(e.target.files.length, 0, 'Files should be empty');
      assert.step('empty');
    });

    await setupContext(context);
    await triggerEvent(element, 'change', { files: [] });

    assert.verifySteps(['change', 'empty']);
  });
});
