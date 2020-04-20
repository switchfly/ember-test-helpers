import { module, test } from 'qunit';
import { run } from '@ember/runloop';
import {
  TestDebugInfo,
  backburnerDebugInfoAvailable,
} from '@ember/test-helpers/-internal/debug-info';
import MockStableError, { overrideError, resetError } from './utils/mock-stable-error';
import { MockConsole, getRandomBoolean, getMockDebugInfo } from './utils/test-isolation-helpers';
import { registerDebugInfoHelper } from '@ember/test-helpers';
import { debugInfoHelpers } from '@ember/test-helpers/-internal/debug-info-helpers';
import { buildWaiter, _reset as resetWaiters } from 'ember-test-waiters';

module('TestDebugInfo', function (hooks) {
  hooks.beforeEach(function () {
    run.backburner.DEBUG = false;
  });

  hooks.afterEach(function () {
    run.backburner.DEBUG = true;
  });

  test('summary returns minimal information when debugInfo is not present', function (assert) {
    assert.expect(1);

    let hasPendingTimers = getRandomBoolean();
    let hasPendingLegacyWaiters = getRandomBoolean();
    let hasPendingTestWaiters = false;
    let hasRunLoop = getRandomBoolean();
    let hasPendingRequests = Boolean(Math.floor(Math.random(10)) > 0);
    let testDebugInfo = new TestDebugInfo({
      hasPendingTimers,
      hasRunLoop,
      hasPendingLegacyWaiters,
      hasPendingTestWaiters,
      hasPendingRequests,
    });

    assert.deepEqual(testDebugInfo.summary, {
      hasPendingRequests,
      hasPendingTimers,
      hasPendingLegacyWaiters,
      hasPendingTestWaiters,
      hasRunLoop,
    });
  });

  if (backburnerDebugInfoAvailable()) {
    module('when using backburner', function (hooks) {
      let cancelIds;

      hooks.beforeEach(function () {
        run.backburner.DEBUG = true;

        cancelIds = [];
        overrideError(MockStableError);
      });

      hooks.afterEach(function () {
        cancelIds.forEach(cancelId => run.cancel(cancelId));

        run.backburner.DEBUG = false;

        resetError();
      });

      test('summary returns full information when debugInfo is present', function (assert) {
        assert.expect(1);

        cancelIds.push(run.later(() => {}, 5000));
        cancelIds.push(run.later(() => {}, 10000));

        let testDebugInfo = new TestDebugInfo(
          {
            hasPendingTimers: false,
            hasRunLoop: false,
            hasPendingLegacyWaiters: false,
            hasPendingTestWaiters: false,
            hasPendingRequests: false,
          },
          run.backburner.getDebugInfo()
        );

        assert.deepEqual(testDebugInfo.summary, {
          autorunStackTrace: null,
          hasPendingRequests: false,
          hasPendingTimers: false,
          hasPendingLegacyWaiters: false,
          hasPendingTestWaiters: false,
          hasRunLoop: false,
          pendingScheduledQueueItemCount: 0,
          pendingScheduledQueueItemStackTraces: [],
          pendingTimersCount: 2,
          pendingTimersStackTraces: ['STACK', 'STACK'],
        });
      });
    });
  }

  test('toConsole correctly prints minimal information', function (assert) {
    assert.expect(1);

    let mockConsole = new MockConsole();

    let testDebugInfo = new TestDebugInfo({
      hasPendingTimers: false,
      hasRunLoop: false,
      hasPendingLegacyWaiters: false,
      hasPendingTestWaiters: false,
      hasPendingRequests: false,
    });

    testDebugInfo.toConsole(mockConsole);

    assert.deepEqual(mockConsole.toString(), '');
  });

  test('toConsole correctly prints Scheduled autorun information', function (assert) {
    assert.expect(1);

    let mockConsole = new MockConsole();

    let testDebugInfo = new TestDebugInfo(
      {
        hasPendingTimers: false,
        hasRunLoop: true,
        hasPendingLegacyWaiters: false,
        hasPendingTestWaiters: false,
        hasPendingRequests: false,
      },
      getMockDebugInfo(new MockStableError('STACK'), 0, null)
    );

    testDebugInfo.toConsole(mockConsole);

    assert.deepEqual(
      mockConsole.toString(),
      `Scheduled autorun
STACK`
    );
  });

  test('toConsole correctly prints AJAX information', function (assert) {
    assert.expect(1);

    let mockConsole = new MockConsole();

    let testDebugInfo = new TestDebugInfo({
      hasPendingTimers: false,
      hasRunLoop: false,
      hasPendingLegacyWaiters: false,
      hasPendingTestWaiters: false,
      hasPendingRequests: true,
    });

    testDebugInfo.toConsole(mockConsole);

    assert.deepEqual(mockConsole.toString(), `Pending AJAX requests`);
  });

  test('toConsole correctly prints pending legacy test waiter information', function (assert) {
    assert.expect(1);

    let mockConsole = new MockConsole();

    let testDebugInfo = new TestDebugInfo({
      hasPendingTimers: false,
      hasRunLoop: false,
      hasPendingLegacyWaiters: true,
      hasPendingTestWaiters: false,
      hasPendingRequests: false,
    });

    testDebugInfo.toConsole(mockConsole);

    assert.deepEqual(mockConsole.toString(), `Pending test waiters`);
  });

  test('toConsole correctly prints pending test waiter information', function (assert) {
    assert.expect(1);

    let waiterItem = {};
    let mockConsole = new MockConsole();
    let testWaiter = buildWaiter('custom-waiter');

    overrideError(MockStableError);

    testWaiter.beginAsync(waiterItem);

    let testDebugInfo = new TestDebugInfo({
      hasPendingTimers: false,
      hasRunLoop: false,
      hasPendingLegacyWaiters: false,
      hasPendingTestWaiters: true,
      hasPendingRequests: false,
    });

    testDebugInfo.toConsole(mockConsole);

    assert.deepEqual(
      mockConsole.toString(),
      `Pending test waiters
custom-waiter
stack: STACK`
    );

    resetError();
    resetWaiters();
  });

  test('toConsole correctly prints scheduled async information', function (assert) {
    assert.expect(1);

    let mockConsole = new MockConsole();

    let testDebugInfo = new TestDebugInfo(
      {
        hasPendingTimers: true,
        hasRunLoop: true,
        hasPendingLegacyWaiters: false,
        hasPendingTestWaiters: false,
        hasPendingRequests: false,
      },
      getMockDebugInfo(false, 2, [
        { name: 'one', count: 1 },
        { name: 'two', count: 1 },
      ])
    );

    testDebugInfo.toConsole(mockConsole);

    assert.deepEqual(
      mockConsole.toString(),
      `Scheduled async
STACK
STACK
STACK
STACK`
    );
  });

  test('toConsole correctly prints scheduled async information with only scheduled queue items', function (assert) {
    assert.expect(1);

    let mockConsole = new MockConsole();

    let testDebugInfo = new TestDebugInfo(
      {
        hasPendingTimers: false,
        hasRunLoop: false,
        hasPendingLegacyWaiters: false,
        hasPendingTestWaiters: false,
        hasPendingRequests: false,
      },
      getMockDebugInfo(false, 0, [
        { name: 'one', count: 1 },
        { name: 'two', count: 1 },
      ])
    );

    testDebugInfo.toConsole(mockConsole);

    assert.deepEqual(
      mockConsole.toString(),
      `Scheduled async
STACK
STACK`
    );
  });

  test('registerDebugInfoHelper registers a custom helper', function (assert) {
    assert.expect(1);

    let mockConsole = new MockConsole();

    let debugInfoHelper = {
      name: 'Date override info',

      hasDateOverride() {
        return true;
      },

      log() {
        mockConsole.log(this.name);

        if (this.hasDateOverride()) {
          mockConsole.log('Date is overridden');
        }
      },
    };

    registerDebugInfoHelper(debugInfoHelper);

    let testDebugInfo = new TestDebugInfo({
      hasPendingTimers: false,
      hasRunLoop: false,
      hasPendingLegacyWaiters: false,
      hasPendingTestWaiters: false,
      hasPendingRequests: false,
    });

    testDebugInfo.toConsole(mockConsole);

    assert.equal(
      mockConsole.toString(),
      `Date override info
Date is overridden`
    );

    debugInfoHelpers.clear();
  });
});
