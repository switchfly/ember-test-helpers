import { module, test } from 'qunit';
import { getRootElement, setupContext, teardownContext } from '@ember/test-helpers';
import hasEmberVersion from '@ember/test-helpers/has-ember-version';

module('DOM Helper: getRootElement', function (hooks) {
  if (!hasEmberVersion(2, 4)) {
    return;
  }

  let context;

  hooks.beforeEach(function () {
    context = {};
  });

  hooks.afterEach(async function () {
    if (context.owner) {
      await teardownContext(context);
    }

    document.getElementById('ember-testing').innerHTML = '';
  });

  test('works with context set', async function (assert) {
    await setupContext(context);

    let fixture = document.querySelector('#ember-testing');
    assert.equal(getRootElement(), fixture);
  });

  test('throws without context set', function (assert) {
    assert.throws(() => {
      getRootElement();
    }, /Must setup rendering context before attempting to interact with elements/);
  });

  test('works when Application.rootElement is a string', async function (assert) {
    await setupContext(context);

    const existingRoot = getRootElement();
    const newRoot = document.createElement('div');
    newRoot.setAttribute('id', 'custom-root');
    existingRoot.appendChild(newRoot);
    context.owner.rootElement = '#custom-root';

    const fixture = document.querySelector('#custom-root');
    assert.equal(getRootElement(), fixture);
  });

  test('works when Application.rootElement is an element', async function (assert) {
    await setupContext(context);

    const existingRoot = getRootElement();
    const newRoot = document.createElement('div');
    newRoot.setAttribute('id', 'custom-root-2');
    existingRoot.appendChild(newRoot);
    context.owner.rootElement = newRoot;

    const fixture = document.querySelector('#custom-root-2');
    assert.equal(getRootElement(), fixture);
  });

  test('throws when Application.rootElement is neither string nor element', async function (assert) {
    await setupContext(context);

    context.owner.rootElement = { bad: 'value' };
    assert.throws(() => {
      getRootElement();
    }, /Application.rootElement must be an element or a selector string/);
  });
});
