import { resolve } from 'rsvp';
import { module } from 'qunit';
import startApp from '../helpers/start-app';
import destroyApp from '../helpers/destroy-app';
import { setResolverRegistry } from './resolver';
import QUnitTestAdapter from './qunit-test-adapter';
import Ember from 'ember';

export default function (name, options = {}) {
  module(name, {
    beforeEach() {
      Ember.Test.adapter = QUnitTestAdapter.create();

      if (options.registry) {
        setResolverRegistry(options.registry);
      }

      let testElementContainer = document.querySelector('#ember-testing-container');
      this.fixtureResetValue = testElementContainer.innerHTML;

      Ember.testing = true;
      this.application = startApp();

      if (options.beforeEach) {
        return options.beforeEach.apply(this, arguments);
      }
    },

    afterEach() {
      let afterEach = options.afterEach && options.afterEach.apply(this, arguments);
      return resolve(afterEach)
        .then(() => destroyApp(this.application))
        .finally(() => {
          Ember.testing = false;

          document.getElementById('ember-testing-container').innerHTML = this.fixtureResetValue;
        });
    },
  });
}
