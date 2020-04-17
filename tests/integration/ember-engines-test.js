/* globals EmberENV */
import Ember from 'ember';
import { module, test } from 'qunit';
import Component from '@ember/component';
import {
  setupContext,
  setupRenderingContext,
  teardownContext,
  teardownRenderingContext,
  waitFor,
  render,
  click,
} from '@ember/test-helpers';

import hasEmberVersion from '@ember/test-helpers/has-ember-version';
import { setResolverRegistry } from '../helpers/resolver';
import hbs from 'htmlbars-inline-precompile';
import { defer } from 'rsvp';

const PromiseWrapperTemplate = hbs`
{{~#if settled~}}
  {{fulfillmentValue}}
{{~else~}}
  <div class="loading">Please wait</div>
{{~/if}}
`;

const PromiseWrapper = Component.extend({
  init() {
    this._super(...arguments);

    this.promise
      .then(value => this.set('fulfillmentValue', value))
      .finally(() => this.set('settled', true));
  },
});

const ClickMeButtonTemplate = hbs`
{{~#if wasClicked~}}
  Clicked!
{{~else~}}
  Click Me!
{{~/if~}}
`;

const ClickMeButtonComponent = Component.extend({
  classNames: ['click-me-button'],
  init() {
    this._super(...arguments);
    this.wasClicked = false;
  },

  click() {
    this.set('wasClicked', true);
  },
});

module('setupRenderingContext "ember-engines"', function(hooks) {
  if (!hasEmberVersion(2, 4)) {
    return;
  }
  hooks.beforeEach(async function() {
    setResolverRegistry({
      'component:promise-wrapper': PromiseWrapper,
      'template:components/promise-wrapper': PromiseWrapperTemplate,

      'component:click-me-button': ClickMeButtonComponent,
      'template:components/click-me-button': ClickMeButtonTemplate,
    });

    await setupContext(this);
    await setupRenderingContext(this);

    this._waiter = () => {
      return !this.isWaiterPending;
    };

    // In Ember < 2.8 `registerWaiter` expected to be bound to
    // `Ember.Test` 😭
    //
    // Once we have dropped support for < 2.8 we should swap this to
    // use:
    //
    // import { registerWaiter } from '@ember/test';
    Ember.Test.registerWaiter(this._waiter);

    let engineInstance = this.owner.buildChildEngineInstance('lazy-engine');
    return engineInstance.boot().then(() => {
      this.engine = engineInstance;
    });
  });

  hooks.afterEach(async function() {
    Ember.Test.unregisterWaiter(this._waiter);
    await teardownRenderingContext(this);
    await teardownContext(this);
  });

  test('can check element while waiting for settled state', async function(assert) {
    let deferred = defer();
    this.set('promise', deferred.promise);

    // force the waiter to pause, emulating a pending AJAX or fetch request
    this.isWaiterPending = true;

    // Does not use `await` intentionally
    let renderPromise = render(hbs`{{promise-wrapper promise=promise }}`);

    await waitFor('.loading');

    assert.equal(this.element.textContent, 'Please wait', 'has pending content');

    deferred.resolve('Yippie!');

    // release the waiter, so `settled` from `render` will complete
    this.isWaiterPending = false;

    await renderPromise;

    assert.equal(this.element.textContent, 'Yippie!', 'has fulfillment value');
  });

  // uses `{{-in-element` which was only added in Ember 2.10
  if (hasEmberVersion(2, 10)) {
    if (EmberENV._APPLICATION_TEMPLATE_WRAPPER !== false) {
      test('can click on a sibling element of the application template wrapper', async function(assert) {
        let rootElement = document.getElementById('ember-testing');

        assert.notEqual(
          rootElement,
          this.element,
          'precond - confirm that the rootElement is different from this.element'
        );

        this.set('rootElement', rootElement);

        await render(hbs`{{#-in-element rootElement}}{{click-me-button}}{{/-in-element}}`);

        assert.equal(this.element.textContent, '', 'no content is contained _within_ this.element');
        assert.equal(
          rootElement.textContent,
          'Click Me!',
          'the rootElement has the correct content after initial render'
        );

        await click('.click-me-button');

        assert.equal(
          rootElement.textContent,
          'Clicked!',
          'the rootElement has the correct content after clicking'
        );
      });
    } else {
      test('can click on a sibling of the rendered content', async function(assert) {
        let rootElement = document.getElementById('ember-testing');
        this.set('rootElement', rootElement);

        assert.equal(rootElement.textContent, '', 'the rootElement is empty before rendering');

        await render(hbs`{{#-in-element rootElement}}{{click-me-button}}{{/-in-element}}`);

        assert.equal(
          rootElement.textContent,
          'Click Me!',
          'the rootElement has the correct content after initial render'
        );

        await click('.click-me-button');

        assert.equal(
          rootElement.textContent,
          'Clicked!',
          'the rootElement has the correct content after clicking'
        );
      });
    }
  }
});
