import { module, test } from 'qunit';
import { waitUntil } from '@ember/test-helpers';

module('DOM helper: waitUntil', function () {
  test('waits until the provided function returns true', async function (assert) {
    let current = false;
    assert.step('before invocation');
    let waiter = waitUntil(() => current).then(() => {
      assert.step('after resolved');

      assert.verifySteps(['before invocation', 'after invocation', 'after resolved']);
    });
    assert.step('after invocation');

    setTimeout(() => (current = true));

    return waiter;
  });

  test('waits until timeout expires', function (assert) {
    assert.step('before invocation');
    let waiter = waitUntil(() => {}, { timeout: 20 });
    assert.step('after invocation');

    setTimeout(() => assert.step('waiting'), 10);

    return waiter
      .catch(reason => {
        assert.step(`catch handler: ${reason.message}`);
      })
      .finally(() => {
        assert.verifySteps([
          'before invocation',
          'after invocation',
          'waiting',
          'catch handler: waitUntil timed out',
        ]);
      });
  });

  test('waits until timeout expires with custom error message', function (assert) {
    assert.step('before invocation');
    let waiter = waitUntil(() => {}, {
      timeout: 20,
      timeoutMessage: 'Oh no, a nasty error occurred',
    });
    assert.step('after invocation');

    setTimeout(() => assert.step('waiting'), 10);

    return waiter
      .catch(reason => {
        assert.step(`catch handler: ${reason.message}`);
      })
      .finally(() => {
        assert.verifySteps([
          'before invocation',
          'after invocation',
          'waiting',
          'catch handler: Oh no, a nasty error occurred',
        ]);
      });
  });

  test('rejects when callback throws', function (assert) {
    return waitUntil(() => {
      throw new Error('error goes here');
    }).catch(reason => {
      assert.equal(reason.message, 'error goes here', 'valid error was thrown');
    });
  });
});
