import { futureTick, _Promise as Promise } from './-utils';

const TIMEOUTS = [0, 1, 2, 5, 7];
const MAX_TIMEOUT = 10;

type Falsy = false | 0 | '' | null | undefined;

export interface Options {
  timeout?: number;
  timeoutMessage?: string;
}

/**
  Wait for the provided callback to return a truthy value.

  This does not leverage `settled()`, and as such can be used to manage async
  while _not_ settled (e.g. "loading" or "pending" states).

  @public
  @param {Function} callback the callback to use for testing when waiting should stop
  @param {Object} [options] options used to override defaults
  @param {number} [options.timeout=1000] the maximum amount of time to wait
  @param {string} [options.timeoutMessage='waitUntil timed out'] the message to use in the reject on timeout
  @returns {Promise} resolves with the callback value when it returns a truthy value

  @example
  <caption>
    Waiting until a selected element displays text:
  </caption>
  await waitUntil(function() {
    return find('.my-selector').textContent.includes('something')
  }, { timeout: 2000 })
*/
export default function waitUntil<T>(
  callback: () => T | void | Falsy,
  options: Options = {}
): Promise<T> {
  let timeout = 'timeout' in options ? (options.timeout as number) : 1000;
  let timeoutMessage = 'timeoutMessage' in options ? options.timeoutMessage : 'waitUntil timed out';

  // creating this error eagerly so it has the proper invocation stack
  let waitUntilTimedOut = new Error(timeoutMessage);

  return new Promise(function (resolve, reject) {
    let time = 0;

    // eslint-disable-next-line require-jsdoc
    function scheduleCheck(timeoutsIndex: number) {
      let interval = TIMEOUTS[timeoutsIndex];
      if (interval === undefined) {
        interval = MAX_TIMEOUT;
      }

      futureTick(function () {
        time += interval;

        let value: T | void | Falsy;
        try {
          value = callback();
        } catch (error) {
          reject(error);
        }

        if (value) {
          resolve(value);
        } else if (time < timeout) {
          scheduleCheck(timeoutsIndex + 1);
        } else {
          reject(waitUntilTimedOut);
        }
      }, interval);
    }

    scheduleCheck(0);
  });
}
