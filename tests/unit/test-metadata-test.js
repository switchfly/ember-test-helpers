import QUnit, { module, test } from 'qunit';
import { getTestMetadata } from '@ember/test-helpers';
import { TestMetadata } from '@ember/test-helpers/test-metadata';

module('Test Metadata', function () {
  test('getTestMetadata returns default test metadata', function (assert) {
    let test = QUnit.config.current;
    let testMetadata = getTestMetadata(test);

    assert.ok(testMetadata instanceof TestMetadata);
    assert.deepEqual(testMetadata.setupTypes, []);
  });

  module('Annotated Test Metadata', function (hooks) {
    hooks.beforeEach(function () {
      let context = this;
      let testMetadata = getTestMetadata(context);

      testMetadata.testName = context.testName;
      testMetadata.testId = context.testId;
    });

    test('getTestMetadata returns populated test metadata', function (assert) {
      let context = this;
      let testMetadata = getTestMetadata(context);

      assert.equal(testMetadata.testName, context.testName);
      assert.equal(testMetadata.testId, context.testId);
    });
  });
});
