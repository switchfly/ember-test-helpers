import { module, test } from 'qunit';
import {
  setupContext,
  setupRenderingContext,
  teardownContext,
  teardownRenderingContext,
  render,
} from '@ember/test-helpers';
import RSVP from 'rsvp';
import { run } from '@ember/runloop';

import hbs from 'htmlbars-inline-precompile';
import Component from '@ember/component';

let engineInstance;

async function setupEngineTest(context) {
  let engineLoadPromise;
  engineInstance = context.owner.buildChildEngineInstance('eager-engine', {
    routable: true,
    mountPoint: 'eager-engine',
  });
  engineLoadPromise = RSVP.Promise.resolve(engineInstance);
  await engineLoadPromise.then(engineInstance => {
    return engineInstance.boot().then(() => {
      context.engine = engineInstance;
    });
  });
}

module('setupRenderingContext for "ember-engines"', function (hooks) {
  hooks.beforeEach(async function () {
    await setupContext(this);
    await setupEngineTest(this);
    await setupRenderingContext(this);
  });

  hooks.afterEach(async function () {
    await run(engineInstance, 'destroy');
    await run(this.engine, 'destroy');
    await teardownRenderingContext(this);
    await teardownContext(this);
  });

  test('should change colors', async function (assert) {
    assert.expect(1);

    this.engine.register('component:x-foo', Component.extend({}));
    this.engine.register(
      'template:components/x-foo',
      hbs`<button {{action 'clicked'}}>Click me!</button>`
    );

    await render(hbs`{{#x-foo}}{{/x-foo}}`);

    assert.equal(this.element.textContent.trim(), 'Click me!');
  });
});
