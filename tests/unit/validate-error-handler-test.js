import { module, test } from 'qunit';
import Ember from 'ember';

import { validateErrorHandler } from '@ember/test-helpers';

module('validateErrorHandler', function (hooks) {
  hooks.beforeEach(function (assert) {
    assert.valid = result => {
      assert.deepEqual(result, {
        isValid: true,
        message: null,
      });
    };

    assert.invalid = result => {
      assert.deepEqual(result, {
        isValid: false,
        message: 'error handler should have re-thrown the provided error',
      });
    };
  });

  module('with a passed in callback', function () {
    test('invokes the provided callback', function (assert) {
      assert.expect(1);

      validateErrorHandler(function () {
        assert.ok(true, 'error handler was invoked');
      });
    });

    test('considers handler missing to be a valid handler', function (assert) {
      let result = validateErrorHandler(null);

      assert.valid(result);
    });

    test('when the provided function does _not_ rethrow it is invalid', function (assert) {
      let result = validateErrorHandler(function () {});

      assert.invalid(result);
    });

    test('when the provided function does rethrow it is valid', function (assert) {
      let result = validateErrorHandler(function (error) {
        throw error;
      });

      assert.valid(result);
    });
  });

  module('without a passed in callback', function (hooks) {
    hooks.beforeEach(function () {
      this.originalOnerror = Ember.onerror;
    });

    hooks.afterEach(function () {
      Ember.onerror = this.originalOnerror;
    });

    test('invokes the provided callback', function (assert) {
      assert.expect(1);

      Ember.onerror = function () {
        assert.ok(true, 'error handler was invoked');
      };

      validateErrorHandler();
    });

    test('considers handler missing to be a valid handler', function (assert) {
      Ember.onerror = undefined;
      let result = validateErrorHandler();

      assert.valid(result);
    });

    test('when the provided function does _not_ rethrow it is invalid', function (assert) {
      Ember.onerror = function () {};
      let result = validateErrorHandler();

      assert.invalid(result);
    });

    test('when the provided function does rethrow it is valid', function (assert) {
      Ember.onerror = function (error) {
        throw error;
      };

      let result = validateErrorHandler();

      assert.valid(result);
    });
  });
});
