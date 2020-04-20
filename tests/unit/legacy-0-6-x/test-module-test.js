import QUnit, { test } from 'qunit';
import { getOwner } from '@ember/application';
import { inject as service } from '@ember/service';
import EmberObject, { get } from '@ember/object';
import Component from '@ember/component';
import { TestModule, getContext } from 'ember-test-helpers';
import hasEmberVersion from 'ember-test-helpers/has-ember-version';
import { setResolverRegistry, createCustomResolver } from '../../helpers/resolver';
import qunitModuleFor from '../../helpers/qunit-module-for';

function moduleFor(fullName, description, callbacks) {
  let module = new TestModule(fullName, description, callbacks);
  qunitModuleFor(module);
}

function setupRegistry() {
  setResolverRegistry({
    'component:x-foo': Component.extend(),
    'component:not-the-subject': Component.extend(),
    'foo:thing': EmberObject.extend({
      fromDefaultRegistry: true,
    }),
    'service:other-thing': EmberObject.extend({
      fromDefaultRegistry: true,
    }),
  });
}

var callbackOrder, setupContext, teardownContext, beforeSetupContext, afterTeardownContext;

moduleFor('component:x-foo', 'TestModule callbacks', {
  beforeSetup() {
    beforeSetupContext = this;
    callbackOrder = ['beforeSetup'];

    setupRegistry();
  },

  setup(assert) {
    setupContext = this;
    callbackOrder.push('setup');

    assert.ok(setupContext !== beforeSetupContext);
  },

  teardown(assert) {
    teardownContext = this;
    callbackOrder.push('teardown');

    assert.deepEqual(callbackOrder, ['beforeSetup', 'setup', 'teardown']);
    assert.equal(setupContext, teardownContext);
  },

  afterTeardown() {
    afterTeardownContext = this;
    callbackOrder.push('afterTeardown');
    let assert = QUnit.config.current.assert;
    assert.equal(this.context, undefined, "don't leak the this.context");
    assert.equal(getContext(), undefined, "don't leak the internal context");
    assert.deepEqual(callbackOrder, ['beforeSetup', 'setup', 'teardown', 'afterTeardown']);
    assert.equal(afterTeardownContext, beforeSetupContext);
    assert.ok(afterTeardownContext !== teardownContext);
  },
});

test('setup callbacks called in the correct order', function (assert) {
  assert.deepEqual(callbackOrder, ['beforeSetup', 'setup']);
});

moduleFor('component:x-foo', 'component:x-foo -- setup context', {
  beforeSetup() {
    setupRegistry();
  },

  setup() {
    this.subject({
      name: 'Max',
    });

    this.register(
      'service:blah',
      EmberObject.extend({
        purpose: 'blabering',
      })
    );
  },
});

test('subject can be initialized in setup', function (assert) {
  assert.equal(this.subject().name, 'Max');
});

test('can lookup factory registered in setup', function (assert) {
  this.inject.service('blah');
  assert.equal(get(this, 'blah.purpose'), 'blabering');
});

test('overrides `toString` to return the test subject', function (assert) {
  assert.equal(
    this.toString(),
    'test context for: component:x-foo',
    'toString returns `test context for: subjectName`'
  );
});

moduleFor('component:x-foo', 'component:x-foo -- callback context', {
  beforeSetup() {
    setupRegistry();
  },

  getSubjectName() {
    return this.subjectName;
  },

  getFoo() {
    return this.foo;
  },
});

test('can access TestModule properties from a callback but raises a deprecation', function (assert) {
  assert.equal(this.getSubjectName(), 'component:x-foo');
  assert.deprecationsInclude(
    'Accessing the test module property "subjectName" from a callback is deprecated.'
  );
});

test("can access test context properties from a callback's 'this' and not raise a deprecation", function (assert) {
  assert.noDeprecations(() => {
    this.foo = 'bar';

    assert.equal(this.getFoo(), 'bar');
  });
});

moduleFor('component:x-foo', 'component:x-foo -- created subjects are cleaned up', {
  beforeSetup() {
    setupRegistry();
  },

  afterTeardown() {
    var subject = this.cache.subject;

    QUnit.config.current.assert.ok(subject.isDestroyed);
  },
});

test("subject's created in a test are destroyed", function () {
  this.subject();
});

moduleFor('component:x-foo', 'component:x-foo -- uncreated subjects do not error', {
  beforeSetup() {
    setupRegistry();
  },
});

test("subject's created in a test are destroyed", function (assert) {
  assert.expect(0);
});

moduleFor('component:x-foo', 'component:x-foo -- without needs or `integration: true`', {
  beforeSetup: () => setupRegistry(),
});

test('knows nothing about our non-subject component', function (assert) {
  var otherComponent = this.container.lookup('component:not-the-subject');
  assert.equal(null, otherComponent, "We shouldn't know about a non-subject component");
});

moduleFor('component:x-foo', 'component:x-foo -- when needing another component', {
  beforeSetup: () => setupRegistry(),
  needs: ['component:not-the-subject'],
});

test('needs gets us the component we need', function (assert) {
  var otherComponent = this.container.lookup('component:not-the-subject');
  assert.ok(otherComponent, "another component can be resolved when it's in our needs array");
});

moduleFor('component:x-foo', 'component:x-foo -- `integration`', {
  beforeSetup() {
    setupRegistry();
    QUnit.config.current.assert.ok(
      !this.callbacks.integration,
      'integration property should be removed from callbacks'
    );
    QUnit.config.current.assert.ok(
      this.isIntegration,
      'isIntegration should be set when we set `integration: true` in callbacks'
    );
  },
  integration: true,
});

test('needs is not needed (pun intended) when integration is true', function (assert) {
  var otherComponent = this.container.lookup('component:not-the-subject');
  assert.ok(otherComponent, 'another component can be resolved when integration is true');
});

test('throws an error when declaring integration: true and needs in the same module', function (assert) {
  assert.expect(3);

  var result = false;

  try {
    moduleFor('component:x-foo', {
      integration: true,
      needs: ['component:x-bar'],
    });
  } catch (err) {
    result = true;
  }

  assert.ok(result, 'should throw an Error when integration: true and needs are provided');
});

test("throws an error when declaring integration: 'legacy' in `moduleFor` test", function (assert) {
  assert.expect(3);

  var result = false;

  try {
    moduleFor('component:x-foo', {
      integration: 'legacy',
    });
  } catch (err) {
    result = true;
  }

  assert.ok(
    result,
    "should throw an Error when integration: 'legacy' outside of a component integration test"
  );
});

if (hasEmberVersion(1, 11)) {
  moduleFor('component:x-foo', 'should be able to override factories in integration mode', {
    beforeSetup() {
      setupRegistry();
    },

    integration: true,
  });

  test('gets the default by default', function (assert) {
    var thing = this.container.lookup('foo:thing');

    assert.ok(thing.fromDefaultRegistry, 'found from the default registry');
  });

  test('can override the default', function (assert) {
    this.register(
      'foo:thing',
      EmberObject.extend({
        notTheDefault: true,
      })
    );
    var thing = this.container.lookup('foo:thing');

    assert.ok(!thing.fromDefaultRegistry, 'should not be found from the default registry');
    assert.ok(thing.notTheDefault, 'found from the overridden factory');
  });

  test('gets the default with fullName normalization by default', function (assert) {
    this.register(
      'foo:needs-service',
      EmberObject.extend({
        otherThing: service(),
      })
    );

    var foo = this.container.lookup('foo:needs-service');
    var thing = foo.get('otherThing');

    assert.ok(thing.fromDefaultRegistry, 'found from the default registry');
  });

  test('can override the default with fullName normalization', function (assert) {
    this.register(
      'service:other-thing',
      EmberObject.extend({
        notTheDefault: true,
      })
    );

    this.register(
      'foo:needs-service',
      EmberObject.extend({
        otherThing: service(),
      })
    );

    var foo = this.container.lookup('foo:needs-service');
    var thing = foo.get('otherThing');

    assert.ok(!thing.fromDefaultRegistry, 'should not be found from the default registry');
    assert.ok(thing.notTheDefault, 'found from the overridden factory');
  });
}

if (hasEmberVersion(2, 3)) {
  moduleFor('foo:thing', 'should be able to use `getOwner` on instances', {
    beforeSetup() {
      setupRegistry();
    },

    integration: true,
  });

  test('instances get an owner', function (assert) {
    var subject = this.subject();
    var owner = getOwner(subject);

    var otherThing = owner.lookup('service:other-thing');
    assert.ok(
      otherThing.fromDefaultRegistry,
      'was able to use `getOwner` on an instance and lookup an instance'
    );
  });

  test('test context gets an owner', function (assert) {
    var owner = getOwner(this);

    var otherThing = owner.lookup('service:other-thing');
    assert.ok(
      otherThing.fromDefaultRegistry,
      'was able to use `getOwner` on test context and lookup an instance'
    );
  });
}

var contexts, testModule;
QUnit.module('context can be provided to TestModule', {
  beforeEach() {
    contexts = [this];
    setupRegistry();
    testModule = new TestModule('component:x-foo', 'Foo', {
      setup() {
        contexts.push(this);
      },
      teardown() {
        contexts.push(this);
      },
    });

    testModule.setContext(this);
    return testModule.setup(...arguments);
  },

  afterEach(assert) {
    return testModule.teardown(...arguments).then(() => {
      contexts.forEach(context => {
        assert.ok(context === this, 'contexts should equal');
      });
    });
  },
});

test('noop', function () {
  contexts.push(this);
});

moduleFor('component:y-foo', 'Custom resolver', {
  resolver: createCustomResolver({
    'component:y-foo': Component.extend({
      name: 'Y u no foo?!',
    }),
  }),
});

test('subject created using custom resolver', function (assert) {
  assert.equal(this.subject().name, 'Y u no foo?!');
});

test('`toString` returns the test subject', function (assert) {
  assert.equal(
    this.toString(),
    'test context for: component:y-foo',
    'toString returns `test context for: subjectName`'
  );
});

moduleFor('component:x-foo', 'ember-testing resets to empty value', {
  beforeSetup: setupRegistry,
});

test('sets ember-testing content to "foobar"', function (assert) {
  assert.expect(0);
  document.getElementById('ember-testing').innerHTML = 'foobar';
});

test('ember-testing content should be reset to ""', function (assert) {
  assert.expect(1);
  assert.equal(document.getElementById('ember-testing').innerHTML, '');
});

QUnit.module('ember-testing resets to non-empty value');

test('sets ember-testing content to "<div>foobar</div>"', function (assert) {
  assert.expect(1);
  document.getElementById('ember-testing').innerHTML = '<div>foobar</div>';

  testModule = new TestModule('component:x-foo', 'Foo', { beforeSetup: setupRegistry });
  testModule.setContext(this);
  return testModule
    .setup(...arguments)
    .then(() => {
      document.getElementById('ember-testing').innerHTML = '';

      return testModule.teardown(...arguments);
    })
    .then(() => {
      assert.equal(document.getElementById('ember-testing').innerHTML, '<div>foobar</div>');
      document.getElementById('ember-testing').innerHTML = '';
    });
});
