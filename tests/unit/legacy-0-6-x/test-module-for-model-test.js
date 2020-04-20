/* global Pretender */

import { test } from 'qunit';
import { run } from '@ember/runloop';
import { TestModuleForModel } from 'ember-test-helpers';
import { setResolverRegistry } from '../../helpers/resolver';
import DS from 'ember-data';
import qunitModuleFor from '../../helpers/qunit-module-for';
import require from 'require';

function moduleForModel(name, description, callbacks) {
  var module = new TestModuleForModel(name, description, callbacks);
  qunitModuleFor(module);
}

var server;

var Adapter = DS.JSONAPIAdapter || DS.FixtureAdapter;
var ApplicationAdapter = (() => {
  if (require.has('ember-fetch/mixins/adapter-fetch')) {
    const AdapterFetch = require('ember-fetch/mixins/adapter-fetch').default;
    return Adapter.extend(AdapterFetch);
  } else {
    return Adapter.extend();
  }
})();

var Whazzit = DS.Model.extend({ gear: DS.attr('string') });

var whazzitAdapterFindAllCalled = false;
var WhazzitAdapter = ApplicationAdapter.extend({
  findAll() {
    whazzitAdapterFindAllCalled = true;
    return this._super.apply(this, arguments);
  },
});

function setupRegistry() {
  setResolverRegistry({
    'model:whazzit': Whazzit,
    'adapter:whazzit': WhazzitAdapter,
    'adapter:application': ApplicationAdapter,
  });
}

///////////////////////////////////////////////////////////////////////////////

var store1, store2;
moduleForModel('whazzit', 'model:whazzit without adapter', {
  beforeSetup() {
    setupRegistry();
  },

  setup() {
    Whazzit.FIXTURES = [];
  },

  teardown(assert) {
    if (store1 && store2) {
      assert.notEqual(store1, store2, 'store should be separate between tests');
    }
  },
});

test('store exists: 1', function (assert) {
  store1 = this.store();

  assert.ok(store1 instanceof DS.Store);
});

test('store exists: 2', function (assert) {
  store2 = this.store();

  assert.ok(store2 instanceof DS.Store);
});

test('model exists as subject', function (assert) {
  var model = this.subject();

  assert.ok(model);
  assert.ok(model instanceof DS.Model);
  assert.ok(model instanceof Whazzit);
});

test('JSONAPIAdapter (ED >= 2) or FixtureAdapter (ED < 2) is registered for model', function (assert) {
  var model = this.subject(),
    store = this.store();

  assert.ok(store.adapterFor(model.constructor.modelName) instanceof Adapter);
  assert.ok(!(store.adapterFor(model.constructor.modelName) instanceof WhazzitAdapter));
});

test('`toString` returns the test subject', function (assert) {
  assert.equal(
    this.toString(),
    'test context for: model:whazzit',
    'toString returns `test context for: subjectName`'
  );
});

moduleForModel('whazzit', 'subject does not share the store', {
  beforeSetup() {
    setupRegistry();
  },

  teardown(assert) {
    var model = this.subject();
    var store = this.store();

    assert.equal(model.store, store, 'is created from the correct store instance');
  },
});

test('first subject test', function () {});
test('second subject test', function () {});

///////////////////////////////////////////////////////////////////////////////

moduleForModel('whazzit', 'model:whazzit with custom adapter', {
  needs: ['adapter:whazzit'],

  beforeSetup() {
    setupRegistry();
  },

  setup() {
    Whazzit.FIXTURES = [];

    if (DS.JSONAPIAdapter && Adapter === DS.JSONAPIAdapter) {
      server = new Pretender(function () {
        this.get('/whazzits', function () {
          return [
            200,
            { 'Content-Type': 'application/json' },
            JSON.stringify({ data: Whazzit.FIXTURES }),
          ];
        });
      });
    }

    whazzitAdapterFindAllCalled = false;
  },

  teardown() {
    if (DS.JSONAPIAdapter && Adapter === DS.JSONAPIAdapter) {
      server.shutdown();
    }
  },
});

test('WhazzitAdapter is registered for model', function (assert) {
  var model = this.subject(),
    store = this.store();

  assert.ok(store.adapterFor(model.constructor.modelName) instanceof WhazzitAdapter);
});

test('WhazzitAdapter is used for `findAll`', function (assert) {
  assert.expect(2);
  assert.ok(!whazzitAdapterFindAllCalled, 'precond - custom adapter has not yet been called');

  var store = this.store();

  return run(function () {
    return store.findAll('whazzit', { reload: true }).then(function () {
      assert.ok(whazzitAdapterFindAllCalled, 'uses the custom adapter');
    });
  });
});

///////////////////////////////////////////////////////////////////////////////

moduleForModel('whazzit', 'model:whazzit with application adapter', {
  needs: ['adapter:application'],

  beforeSetup() {
    setupRegistry();
  },

  setup() {
    Whazzit.FIXTURES = [];
  },
});

test('ApplicationAdapter is registered for model', function (assert) {
  var model = this.subject(),
    store = this.store();

  assert.ok(store.adapterFor(model.constructor.modelName) instanceof ApplicationAdapter);
  assert.ok(!(store.adapterFor(model.constructor.modelName) instanceof WhazzitAdapter));
});

///////////////////////////////////////////////////////////////////////////////

moduleForModel('whazzit', 'model:whazzit when using integration:true', {
  integration: true,

  beforeSetup() {
    setupRegistry();
  },
});

test('the store still exists', function (assert) {
  var store = this.store();

  assert.ok(store instanceof DS.Store);
});
