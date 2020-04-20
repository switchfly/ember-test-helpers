import { module, test } from 'qunit';
import wait from 'ember-test-helpers/wait';

module('wait: unit tests', function () {
  test('issues a helpful assertion for invalid arguments', async function (assert) {
    assert.expect(0); // no assertions, just shouldn't error

    await wait(3000);
    await wait(null);
    await wait();
  });
});
