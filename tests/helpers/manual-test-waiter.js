import { registerWaiter, unregisterWaiter } from '@ember/test';

export default function setupManualTestWaiter(hooks) {
  hooks.beforeEach(function () {
    this.shouldWait = false;
    this._waiter = () => !this.shouldWait;
    registerWaiter(this._waiter);
  });

  hooks.afterEach(function () {
    unregisterWaiter(this._waiter);
  });
}
