import { test } from 'qunit';
import { run } from '@ember/runloop';
import EmberRouter from '@ember/routing/router';
import Component from '@ember/component';
import { click } from '@ember/test-helpers';
import hasEmberVersion from '@ember/test-helpers/has-ember-version';

import { hbs } from 'ember-cli-htmlbars';
import ajax from '../helpers/ajax';
import Pretender from 'pretender';
import moduleForAcceptance from '../helpers/module-for-acceptance';

const TestComponent3 = Component.extend({
  layout: hbs`{{internalValue}}`,

  internalValue: '',

  click() {
    ajax('/whazzits').then(data => {
      let value = this.get('internalValue');

      run(this, 'set', 'internalValue', value + data);
    });
  },
});

const Router = EmberRouter.extend({ location: 'none' });
Router.map(function () {
  this.route('ajax-request');
});

moduleForAcceptance('Classic "moduleForAcceptance" | using settled', {
  registry: {
    'router:main': Router,
    'component:x-test-3': TestComponent3,
    'template:ajax-request': hbs`{{x-test-3 class="special-thing"}}`,
  },

  beforeEach() {
    this.server = new Pretender(function () {
      this.get(
        '/whazzits',
        function () {
          return [200, { 'Content-Type': 'text/plain' }, 'Remote Data!'];
        },
        25
      );
    });
  },

  afterEach() {
    this.server.shutdown();
  },
});

// this requires Ember 2.8 or higher due to a refactor that exposed the
// internal mechanism that tracks pending requests in legacy acceptance tests,
// in older versions of ember legacy acceptance tests using `settled` from
// `ember-test-helpers` will **not** wait on pending requests.
if (hasEmberVersion(2, 8)) {
  test('Basic acceptance test using instance test helpers', function (assert) {
    return this.application.testHelpers
      .visit('/ajax-request')
      .then(() => {
        // returning `click` here is going to trigger the `click` event
        // then `return settled()` (which is how we are testing the underlying
        // settled interop).
        return click(document.querySelector('.special-thing'));
      })
      .then(() => {
        let testingElement = document.getElementById('ember-testing');
        assert.equal(testingElement.textContent, 'Remote Data!');
      });
  });
}
