import Ember from 'ember';
import { module, test } from 'qunit';
import hasEmberVersion from '@ember/test-helpers/has-ember-version';
import { setupOnerror, resetOnerror } from '@ember/test-helpers';

module('setupOnerror', function (hooks) {
  hooks.afterEach(function () {
    resetOnerror();
  });

  if (hasEmberVersion(2, 4)) {
    test('Ember.onerror is undefined by default', function (assert) {
      assert.expect(1);

      assert.equal(Ember.onerror, undefined);
    });

    test('Ember.onerror is setup correctly', async function (assert) {
      assert.expect(2);

      let onerror = err => err;

      assert.equal(Ember.onerror, undefined);

      setupOnerror(onerror);

      assert.equal(Ember.onerror, onerror);
    });

    test('Ember.onerror is reset correctly', async function (assert) {
      assert.expect(3);

      let onerror = err => err;

      assert.equal(Ember.onerror, undefined);

      setupOnerror(onerror);

      assert.equal(Ember.onerror, onerror);

      resetOnerror();

      assert.equal(Ember.onerror, undefined);
    });
  }
});
