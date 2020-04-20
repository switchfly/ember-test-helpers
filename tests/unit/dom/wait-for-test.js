import { module, test } from 'qunit';
import { waitFor, setupContext, teardownContext } from '@ember/test-helpers';
import hasEmberVersion from '@ember/test-helpers/has-ember-version';

module('DOM Helper: waitFor', function (hooks) {
  if (!hasEmberVersion(2, 4)) {
    return;
  }

  let context, rootElement;

  hooks.beforeEach(function () {
    context = {};
    rootElement = document.getElementById('ember-testing');
  });

  hooks.afterEach(async function () {
    // only teardown if setupContext was called
    if (context.owner) {
      await teardownContext(context);
    }
    document.getElementById('ember-testing').innerHTML = '';
  });

  test('wait for selector without context set', async function (assert) {
    assert.rejects(
      waitFor('.something'),
      /Must setup rendering context before attempting to interact with elements/
    );
  });

  test('wait for selector', async function (assert) {
    await setupContext(context);

    let waitPromise = waitFor('.something');

    setTimeout(() => {
      rootElement.innerHTML = `<div class="something">Hi!</div>`;
    }, 10);

    let element = await waitPromise;

    assert.equal(element.textContent, 'Hi!');
  });

  test('wait for count of selector', async function (assert) {
    await setupContext(context);

    let waitPromise = waitFor('.something', { count: 2 });

    setTimeout(() => {
      rootElement.innerHTML = `<div class="something">No!</div>`;
    }, 10);

    setTimeout(() => {
      rootElement.innerHTML = `
        <div class="something">Hi!</div>
        <div class="something">Bye!</div>
      `;
    }, 20);

    let elements = await waitPromise;

    assert.deepEqual(
      elements.map(e => e.textContent),
      ['Hi!', 'Bye!']
    );
  });

  test('wait for selector with timeout', async function (assert) {
    assert.expect(2);

    await setupContext(context);

    let start = Date.now();
    try {
      await waitFor('.something', { timeout: 100 });
    } catch (error) {
      let end = Date.now();
      assert.ok(end - start >= 100, 'timed out after correct time');
      assert.equal(error.message, 'waitFor timed out waiting for selector ".something"');
    }
  });

  test('wait for selector with timeoutMessage', async function (assert) {
    assert.expect(1);

    await setupContext(context);

    try {
      await waitFor('.something', { timeoutMessage: '.something timed out' });
    } catch (error) {
      assert.equal(error.message, '.something timed out');
    }
  });
});
