import { module, test } from 'qunit';
import {
  setupContext,
  setupRenderingContext,
  teardownContext,
  teardownRenderingContext,
  render,
} from '@ember/test-helpers';
import RSVP from 'rsvp';

import hbs from 'htmlbars-inline-precompile';
import Component from '@ember/component';

async function setupEngineTest(context) {
  let engineLoadPromise;
  let engineInstance = context.owner.buildChildEngineInstance('eager-engine', {
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

module('setupRenderingContext for "ember-engines"', function(hooks) {
  hooks.beforeEach(async function() {
    await setupContext(this);
    await setupEngineTest(this);
    await setupRenderingContext(this);
  });

  hooks.afterEach(async function() {
    delete this.engine;
    await teardownRenderingContext(this);
    await teardownContext(this);
  });

  test('should change colors', async function(assert) {
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
