import { test } from 'qunit';
import EmberRouter from '@ember/routing/router';
import EmberApplication from '@ember/application';
import { TestModuleForAcceptance, getContext } from 'ember-test-helpers';

import { hbs } from 'ember-cli-htmlbars';
import Resolver, { setResolverRegistry } from '../../helpers/resolver';
import qunitModuleFor from '../../helpers/qunit-module-for';

function moduleForAcceptance(description, callbacks) {
  qunitModuleFor(new TestModuleForAcceptance(description, callbacks));
}

let Application = EmberApplication.extend({
  rootElement: '#ember-testing',
  Resolver,
});

moduleForAcceptance('TestModuleForAcceptance | Lifecycle', {
  Application,

  beforeSetup(assert) {
    assert.expect(6);
    assert.ok(getContext() === undefined, 'precond - getContext() was reset');

    setResolverRegistry({
      'router:main': EmberRouter.extend({ location: 'none' }),
    });
  },

  setup(assert) {
    assert.ok(getContext().application instanceof Application);
  },

  teardown(assert) {
    assert.ok(getContext().application instanceof Application);
  },

  afterTeardown(assert) {
    assert.strictEqual(getContext(), undefined);
    let testingElement = document.getElementById('ember-testing');
    assert.strictEqual(testingElement.children.length, 0);
  },
});

test('Lifecycle is correct', function (assert) {
  assert.ok(true);
});

moduleForAcceptance('TestModuleForAcceptance | Basic acceptance tests', {
  Application,

  beforeSetup() {
    setResolverRegistry({
      'router:main': EmberRouter.extend({ location: 'none' }),
      'template:index': hbs`This is the index page.`,
    });
  },
});

test('Basic acceptance test using instance test helpers', function (assert) {
  this.application.testHelpers.visit('/');

  this.application.testHelpers.andThen(function () {
    let testingElement = document.getElementById('ember-testing');
    assert.equal(testingElement.textContent, 'This is the index page.');
  });
});

test('Basic acceptance test using global test helpers', function (assert) {
  window.visit('/');

  window.andThen(function () {
    let testingElement = document.getElementById('ember-testing');
    assert.equal(testingElement.textContent, 'This is the index page.');
  });
});

test('`toString` returns the test name', function (assert) {
  assert.equal(
    this.toString(),
    'test context for: TestModuleForAcceptance | Basic acceptance tests',
    'toString returns `test context for: name`'
  );
});
