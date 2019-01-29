import {
  run,
  DebugInfo as BackburnerDebugInfo,
  QueueItem,
  DeferredActionQueues,
} from '@ember/runloop';
import { assign } from '@ember/polyfills';

const PENDING_AJAX_REQUESTS = 'Pending AJAX requests';
const PENDING_TEST_WAITERS = 'Pending test waiters';
const SCHEDULED_ASYNC = 'Scheduled async';
const SCHEDULED_AUTORUN = 'Scheduled autorun';

type MaybeDebugInfo = BackburnerDebugInfo | null;

interface ISettledState {
  hasPendingTimers: boolean;
  hasRunLoop: boolean;
  hasPendingWaiters: boolean;
  hasPendingRequests: boolean;
}

interface ISummaryInfo {
  hasPendingRequests: boolean;
  hasPendingWaiters: boolean;
  autorunStackTrace: string | undefined | null;
  pendingTimersCount: number;
  hasPendingTimers: boolean;
  pendingTimersStackTraces: (string | undefined)[];
  pendingScheduledQueueItemCount: Number;
  pendingScheduledQueueItemStackTraces: (string | undefined)[];
  hasRunLoop: boolean;
}

/**
 * Retrieves debug information from backburner's current deferred actions queue (runloop instance).
 * If the `getDebugInfo` method isn't available, it returns `null`.
 *
 * @public
 * @returns {MaybeDebugInfo | null} Backburner debugInfo or, if the getDebugInfo method is not present, null
 */
export function getDebugInfo(): MaybeDebugInfo {
  let debugEnabled = run.backburner.DEBUG === true;
  let getDebugInfoAvailable = typeof run.backburner.getDebugInfo === 'function';

  return debugEnabled && getDebugInfoAvailable
    ? <BackburnerDebugInfo>run.backburner.getDebugInfo()
    : null;
}

/**
 * Encapsulates debug information for an individual test. Aggregates information
 * from:
 * - info provided by getSettledState
 *    - hasPendingTimers
 *    - hasRunLoop
 *    - hasPendingWaiters
 *    - hasPendingRequests
 * - info provided by backburner's getDebugInfo method (timers, schedules, and stack trace info)
 *
 */
export default class DebugInfo {
  private _settledState: ISettledState;
  private _debugInfo: MaybeDebugInfo;
  private _summaryInfo: ISummaryInfo | undefined = undefined;

  constructor(
    hasPendingTimers: boolean,
    hasRunLoop: boolean,
    hasPendingWaiters: boolean,
    hasPendingRequests: boolean,
    debugInfo: MaybeDebugInfo = getDebugInfo()
  ) {
    this._settledState = {
      hasPendingTimers,
      hasRunLoop,
      hasPendingWaiters,
      hasPendingRequests,
    };

    this._debugInfo = debugInfo;
  }

  get summary(): ISummaryInfo {
    if (!this._summaryInfo) {
      this._summaryInfo = assign(<ISummaryInfo>{}, this._settledState);

      if (this._debugInfo) {
        this._summaryInfo.autorunStackTrace =
          this._debugInfo.autorun && this._debugInfo.autorun.stack;
        this._summaryInfo.pendingTimersCount = this._debugInfo.timers.length;
        this._summaryInfo.hasPendingTimers =
          this._settledState.hasPendingTimers && this._summaryInfo.pendingTimersCount > 0;
        this._summaryInfo.pendingTimersStackTraces = this._debugInfo.timers.map(
          timer => timer.stack
        );

        this._summaryInfo.pendingScheduledQueueItemCount = this._debugInfo.instanceStack
          .filter(q => q)
          .reduce((total: Number, item) => {
            Object.keys(item).forEach((queueName: string) => {
              total += item[queueName].length;
            });

            return total;
          }, 0);
        this._summaryInfo.pendingScheduledQueueItemStackTraces = this._debugInfo.instanceStack
          .filter(q => q)
          .reduce((stacks: string[], deferredActionQueues: DeferredActionQueues) => {
            Object.keys(deferredActionQueues).forEach(queue => {
              deferredActionQueues[queue].forEach(
                (queueItem: QueueItem) => queueItem.stack && stacks.push(queueItem.stack)
              );
            });
            return stacks;
          }, []);
      }
    }

    return this._summaryInfo;
  }

  get message(): string {
    return `Test is not isolated (async execution is extending beyond the duration of the test).\n
    More information has been printed to the console. Please use that information to help in debugging.\n\n`;
  }

  toConsole(_console = console): void {
    let summary = this.summary;

    if (summary.hasPendingRequests) {
      _console.log(PENDING_AJAX_REQUESTS);
    }

    if (summary.hasPendingWaiters) {
      _console.log(PENDING_TEST_WAITERS);
    }

    if (summary.hasPendingTimers || summary.pendingScheduledQueueItemCount > 0) {
      _console.group(SCHEDULED_ASYNC);

      summary.pendingTimersStackTraces.forEach(timerStack => {
        _console.log(timerStack);
      });

      summary.pendingScheduledQueueItemStackTraces.forEach(scheduleQueueItemStack => {
        _console.log(scheduleQueueItemStack);
      });

      _console.groupEnd();
    }

    if (
      summary.hasRunLoop &&
      summary.pendingTimersCount === 0 &&
      summary.pendingScheduledQueueItemCount === 0
    ) {
      _console.log(SCHEDULED_AUTORUN);

      if (summary.autorunStackTrace) {
        _console.log(summary.autorunStackTrace);
      }
    }
  }

  _formatCount(title: string, count: Number): string {
    return `${title}: ${count}`;
  }
}