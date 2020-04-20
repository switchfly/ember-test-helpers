import QUnit, { module, test } from 'qunit';
import { resolve } from 'rsvp';
import TextField from '@ember/component/text-field';
import { on } from '@ember/object/evented';
import { run, schedule } from '@ember/runloop';
import { computed } from '@ember/object';
import Controller from '@ember/controller';
import Component from '@ember/component';
import EmberObject from '@ember/object';
import EmberService, { inject as service } from '@ember/service';
import Ember from 'ember';
import { TestModuleForComponent } from 'ember-test-helpers';
import hasEmberVersion from 'ember-test-helpers/has-ember-version';
import { setResolverRegistry } from '../../helpers/resolver';
import wait from 'ember-test-helpers/wait';
import qunitModuleFor from '../../helpers/qunit-module-for';
import hasjQuery from '../../helpers/has-jquery';
import hbs from 'htmlbars-inline-precompile';
import { triggerEvent, focus, blur } from '@ember/test-helpers';
import { htmlSafe } from '@ember/string';

var Service = EmberService || EmberObject;

function moduleForComponent(name, description, callbacks) {
  var module = new TestModuleForComponent(name, description, callbacks);
  if (module.isIntegration) {
    module.name += ' [INTEGRATION]';
  } else {
    module.name += ' [UNIT]';
  }
  qunitModuleFor(module);
}

var PrettyColor = Component.extend({
  classNames: ['pretty-color'],
  attributeBindings: ['style'],
  style: computed('name', function () {
    return htmlSafe('color: ' + this.get('name') + ';');
  }),

  click() {
    QUnit.config.current.assert.ok(true, 'pretty-color was clicked');
  },
});

var ColorController = Controller.extend({
  hexa: computed('model', function () {
    switch (this.get('model')) {
      case 'red':
        return '0xFF0000';
      case 'green':
        return '0x00FF00';
      case 'blue':
        return '0x0000FF';
    }
  }),
});

var BoringColor = Component.extend({
  willDestroyElement() {
    var stateIndicatesInDOM = this._state === 'inDOM';
    var actuallyInDOM = document.contains(this.element);

    QUnit.config.current.assert.ok(
      actuallyInDOM === true && actuallyInDOM === stateIndicatesInDOM,
      'component should still be in the DOM'
    );
  },
});

var ChangingColor = Component.extend({
  didInsertElement() {
    this.attrs.change('foo');
  },
});

function setupRegistry() {
  setResolverRegistry({
    'component:x-foo': Component.extend(),
    'component:pretty-color': PrettyColor,
    'component:boring-color': BoringColor,
    'component:changing-color': ChangingColor,
    'template:components/pretty-color': hbs`Pretty Color: <span class="color-name">{{name}}</span>`,
    'controller:color': ColorController,
  });
}

///////////////////////////////////////////////////////////////////////////////

moduleForComponent('x-foo', {
  needs: ['controller:color'],

  beforeSetup() {
    setupRegistry();
  },
});

test('renders', function (assert) {
  assert.expect(2);
  var component = this.subject();
  assert.equal(component._state, 'preRender');
  this.render();
  assert.equal(component._state, 'inDOM');
});

if (hasjQuery()) {
  test('append', function (assert) {
    assert.expect(4);

    var $el;
    var component;

    component = this.subject();
    assert.equal(component._state, 'preRender');
    $el = this.append();
    assert.equal(component._state, 'inDOM');
    assert.ok($el && $el.length, 'append returns $el');

    assert.deprecationsInclude(
      'this.append() is deprecated. Please use this.render() or this.$() instead.'
    );
  });
}

test('yields', function (assert) {
  assert.expect(2);
  var component = this.subject({
    layout: hbs`yield me`,
  });
  assert.equal(component._state, 'preRender');
  this.render();
  assert.equal(component._state, 'inDOM');
});

test('can lookup components in its layout', function (assert) {
  assert.expect(1);
  var component = this.subject({
    layout: hbs`{{x-foo id='yodawg-i-heard-you-liked-x-foo-in-ur-x-foo'}}`,
  });
  this.render();
  assert.equal(component._state, 'inDOM');
});

if (hasEmberVersion(1, 11)) {
  test('can use the component keyword in its layout', function (assert) {
    assert.expect(1);
    var component = this.subject({
      colors: ['red', 'green', 'blue'],
      layout: hbs`{{component 'x-foo'}}`,
    });
    this.render();
    assert.equal(component._state, 'inDOM');
  });
}

test('clears out views from test to test', function (assert) {
  assert.expect(1);
  this.subject({
    layout: hbs`{{x-foo id='yodawg-i-heard-you-liked-x-foo-in-ur-x-foo'}}`,
  });
  this.render();
  assert.ok(true, 'rendered without id already being used from another test');
});

///////////////////////////////////////////////////////////////////////////////

moduleForComponent('pretty-color', {
  unit: true,
  beforeSetup() {
    setupRegistry();
  },
});

test('className', function (assert) {
  this.render();
  assert.ok(this._element.classList.contains('pretty-color'));
});

test('template', function (assert) {
  var component = this.subject();

  this.render();
  assert.equal(this._element.textContent, 'Pretty Color: ');

  run(function () {
    component.set('name', 'green');
  });

  assert.equal(this._element.textContent, 'Pretty Color: green');
});

test('it can access the element', function (assert) {
  this.subject({ name: 'green' });
  this.render();

  assert.equal(this._element.textContent, 'Pretty Color: green');
});

if (hasjQuery()) {
  test('$', function (assert) {
    this.subject({ name: 'green' });

    assert.equal(this.$('.color-name').text(), 'green');
    assert.equal(this.$().text(), 'Pretty Color: green');
  });
}

moduleForComponent('pretty-color', 'component:pretty-color -- this.render in setup', {
  unit: true,
  beforeSetup() {
    setupRegistry();
  },

  setup() {
    this.subject({
      name: 'red',
    });

    this.render();
  },
});

test('className', function (assert) {
  // calling `this.$` or `this.subject.$` would
  // force it to `render` initially, so we access the `ember-testing`
  // div contents directly
  let testingElement = document.getElementById('ember-testing');
  assert.equal(testingElement.textContent, 'Pretty Color: red');
});

test('`toString` returns the test subject', function (assert) {
  assert.equal(
    this.toString(),
    'test context for: component:pretty-color',
    'toString returns `test context for: subjectName`'
  );
});

moduleForComponent('boring-color', 'component:boring-color -- still in DOM in willDestroyElement', {
  unit: true,
  beforeSetup() {
    setupRegistry();
  },

  setup() {
    this.render();
  },
});

QUnit.skip('className', function (assert) {
  assert.expect(1);
  // the assertion is in the willDestroyElement() hook of the component
});

moduleForComponent(
  'pretty-color',
  'component:pretty-color - event dispatching works in unit tests',
  {
    unit: true,
    beforeSetup() {
      setupRegistry();
    },
  }
);

test('can handle click', function (assert) {
  assert.expect(1); // assert in pretty-color `click` handler above

  var component = this.subject();

  this.render();

  run(function () {
    component.element.click();
  });
});

moduleForComponent('changing-color', 'component:changing-color -- handles closure actions', {
  integration: true,

  beforeSetup() {
    setupRegistry();
  },
});

if (hasEmberVersion(1, 13)) {
  test('handles a closure actions', function (assert) {
    assert.expect(1);
    this.on('colorChange', function (arg) {
      assert.equal(arg, 'foo');
    });
    this.render(hbs`{{changing-color change=(action 'colorChange')}}`);
  });

  test('handles a closure actions when set on the test context', function (assert) {
    assert.expect(1);
    this.set('colorChange', function (arg) {
      assert.equal(arg, 'foo');
    });
    this.render(hbs`{{changing-color change=(action colorChange)}}`);
  });
}

var testModule;
QUnit.module('moduleForComponent: can be invoked with only the component name', {
  beforeEach(assert) {
    var done = assert.async();
    setupRegistry();
    testModule = new TestModuleForComponent('pretty-color', { unit: true });
    testModule.setup()['finally'](done);
  },

  afterEach(assert) {
    var done = assert.async();
    testModule.teardown()['finally'](done);
  },
});

test('it allows missing callbacks', function (assert) {
  assert.ok(true, 'no errors are thrown');
});

module('moduleForComponent: will not raise deprecation if needs is specified');

test('deprecation is not raised', function (assert) {
  setupRegistry();
  assert.noDeprecations(() => {
    testModule = new TestModuleForComponent('pretty-color', {
      needs: ['x:foo'],
    });
  });
  assert.ok(testModule.isUnitTest);
});

module('moduleForComponent: can be invoked with the component name and description', {
  beforeEach(assert) {
    var done = assert.async();
    setupRegistry();
    testModule = new TestModuleForComponent('pretty-color', 'PrettyColor', {
      unit: true,
    });
    testModule.setup()['finally'](done);
  },

  afterEach(assert) {
    var done = assert.async();
    testModule.teardown()['finally'](done);
  },
});

test('it allows missing callbacks', function (assert) {
  assert.ok(true, 'no errors are thrown');
});

QUnit.module('moduleForComponent: handles errors thrown during setup', {
  beforeEach(assert) {
    var done = assert.async();
    testModule = new TestModuleForComponent('x-bad', {
      needs: ['mis:sing'],

      beforeEach(assert) {
        // won't be called because of setup error
        var done = assert.async();
        assert.ok(true);
        done();
      },
    });

    testModule
      .setup()
      .catch(function (error) {
        assert.ok(
          error.message.indexOf('mis:sing') > -1,
          'correct error was thrown from module setup'
        );
      })
      .finally(() => {
        done();
        Ember.testing = false;
      });
  },
});

test('it happens', function (assert) {
  assert.ok(true, 'errors are properly thrown/handled');
});

moduleForComponent('Component Integration Tests', {
  integration: true,
  beforeSetup() {
    setResolverRegistry({
      'template:components/my-component': hbs`<span>{{name}}</span>`,
    });
  },
});

test('it can render a template', function (assert) {
  this.render(hbs`<span>Hello</span>`);
  let actual = this._element.querySelector('span').textContent;
  assert.equal(actual, 'Hello');
});

test('it can access the element', function (assert) {
  this.render(hbs`<span>Hello</span>`);
  assert.equal(this._element.textContent, 'Hello');
});

if (hasEmberVersion(1, 11)) {
  test('it can render a link-to', function (assert) {
    this.render(hbs`{{link-to 'Hi' 'index'}}`);
    assert.ok(true, 'it renders without fail');
  });
}

test('it complains if you try to use bare render', function (assert) {
  var self = this;
  assert.throws(function () {
    self.render();
  }, /in a component integration test you must pass a template to `render\(\)`/);
});

test('it complains if you try to use subject()', function (assert) {
  var self = this;
  assert.throws(function () {
    self.subject();
  }, /component integration tests do not support `subject\(\)`\./);
});

test('it can access the full container', function (assert) {
  this.set('myColor', 'red');
  this.render(hbs`{{my-component name=myColor}}`);

  assert.equal(this._element.querySelector('span').textContent, 'red');
  this.set('myColor', 'blue');
  assert.equal(this._element.querySelector('span').textContent, 'blue');
});

test('it can handle actions', function (assert) {
  var handlerArg;
  this.render(hbs`<button {{action "didFoo" 42}} />`);
  this.on('didFoo', function (thing) {
    handlerArg = thing;
  });
  this._element.querySelector('button').click();
  assert.equal(handlerArg, 42);
});

test('it accepts precompiled templates', function (assert) {
  this.render(hbs`<span>Hello</span>`);
  assert.equal(this._element.querySelector('span').textContent, 'Hello');
});

test('it supports DOM events', function (assert) {
  setResolverRegistry({
    'component:my-component': Component.extend({
      value: 0,
      layout: hbs`<span class='target'>Click to increment!</span><span class='value'>{{value}}</span>`,
      incrementOnClick: on('click', function () {
        this.incrementProperty('value');
      }),
    }),
  });
  this.render(hbs`{{my-component}}`);
  this._element.querySelector('.target').click();
  assert.equal(this._element.querySelector('.value').textContent, '1');
});

test('it supports updating an input', function (assert) {
  assert.expect(1);

  setResolverRegistry({
    'component:my-input': TextField.extend({
      value: null,
    }),
  });
  this.render(hbs`{{my-input value=value}}`);
  let input = this._element.querySelector('input');
  input.value = '1';

  return triggerEvent(input, 'change').then(() => {
    assert.equal(this.get('value'), '1');
  });
});

test('it supports dom triggered focus events', function (assert) {
  setResolverRegistry({
    'component:my-input': TextField.extend({
      _onInit: on('init', function () {
        this.set('value', 'init');
      }),
      focusIn() {
        this.set('value', 'focusin');
      },
      focusOut() {
        this.set('value', 'focusout');
      },
    }),
  });
  this.render(hbs`{{my-input}}`);

  let input = this._element.querySelector('input');
  assert.equal(input.value, 'init');

  return focus(input)
    .then(() => {
      assert.equal(input.value, 'focusin');
      return blur(input);
    })
    .then(() => {
      assert.equal(input.value, 'focusout');
    });
});

moduleForComponent('Component Integration Tests: render during setup', {
  integration: true,
  beforeSetup() {
    setResolverRegistry({
      'component:my-component': Component.extend({
        value: 0,
        layout: hbs`<span class='target'>Click to increment!</span><span class='value'>{{value}}</span>`,
        incrementOnClick: on('click', function () {
          this.incrementProperty('value');
        }),
      }),
    });
  },
  setup() {
    this.render(hbs`{{my-component}}`);
  },
});

test('it has working events', function (assert) {
  this._element.querySelector('.target').click();
  assert.equal(this._element.querySelector('.value').textContent, '1');
});

moduleForComponent('Component Integration Tests: context', {
  integration: true,
  beforeSetup() {
    setResolverRegistry({
      'component:my-component': Component.extend({
        layout: hbs`<span class="foo">{{foo}}</span><span class="bar">{{bar}}</span>`,
      }),
    });
  },
});

test('it can set and get properties', function (assert) {
  var setResult = this.set('foo', 1);

  if (hasEmberVersion(2, 0)) {
    assert.equal(setResult, '1');
  } else {
    assert.equal(setResult, undefined);
  }

  this.render(hbs`{{my-component foo=foo}}`);
  assert.equal(this.get('foo'), '1');
  assert.equal(this._element.querySelector('.foo').textContent, '1');
});

test('it can setProperties and getProperties', function (assert) {
  var hash = {
    foo: 1,
    bar: 2,
  };
  var setResult = this.setProperties(hash);

  if (hasEmberVersion(2, 0)) {
    assert.deepEqual(setResult, hash);
  } else {
    assert.equal(setResult, undefined);
  }

  this.render(hbs`{{my-component foo=foo bar=bar}}`);
  var properties = this.getProperties('foo', 'bar');
  assert.equal(properties.foo, '1');
  assert.equal(properties.bar, '2');
  let element = this._element;
  assert.equal(element.querySelector('.foo').textContent, '1');
  assert.equal(element.querySelector('.bar').textContent, '2');
});

test('two way bound arguments are updated', function (assert) {
  var instance;
  setResolverRegistry({
    'component:my-component': Component.extend({
      init() {
        this._super();
        instance = this;
      },
      didInsertElement() {
        schedule('afterRender', () => {
          this.set('foo', 'updated!');
        });
      },
    }),
  });

  this.set('foo', 'original');
  this.render(hbs`{{my-component foo=foo}}`);

  assert.equal(instance.get('foo'), 'updated!');
  assert.equal(this.get('foo'), 'updated!');
});

test('two way bound arguments are available after clearRender is called', function (assert) {
  setResolverRegistry({
    'component:my-component': Component.extend({
      didInsertElement() {
        schedule('afterRender', () => {
          this.set('foo', 'updated!');
          this.set('bar', 'updated bar!');
        });
      },
    }),
  });

  this.set('foo', 'original');
  this.render(hbs`{{my-component foo=foo bar=bar}}`);
  this.clearRender();

  assert.equal(this.get('foo'), 'updated!');
  assert.equal(this.get('bar'), 'updated bar!');
});

test('rendering after calling clearRender', function (assert) {
  setResolverRegistry({
    'component:my-component': Component.extend({
      didInsertElement() {
        schedule('afterRender', () => {
          let currentFoo = this.get('foo') || '';
          this.set('foo', currentFoo + 'more foo ');
        });
      },
    }),
  });

  this.render(hbs`{{my-component foo=foo}}`);
  assert.equal(this.get('foo'), 'more foo ', 'precond - renders initially');
  this.clearRender();

  this.render(hbs`{{my-component foo=foo}}`);
  assert.equal(this.get('foo'), 'more foo more foo ', 'uses the previously rendered value');
  this.clearRender();
});

moduleForComponent('Component Integration Tests: register and inject', {
  integration: true,
});

test('can register a component', function (assert) {
  this.register(
    'component:x-foo',
    Component.extend({
      classNames: ['i-am-x-foo'],
    })
  );
  this.render(hbs`{{x-foo}}`);
  assert.equal(this._element.querySelectorAll('.i-am-x-foo').length, 1, 'found i-am-x-foo');
});

test('can register a service', function (assert) {
  this.register(
    'component:x-foo',
    Component.extend({
      unicorn: service(),
      layout: hbs`<span class="x-foo">{{unicorn.sparkliness}}</span>`,
    })
  );
  this.register(
    'service:unicorn',
    Service.extend({
      sparkliness: 'extreme',
    })
  );
  this.render(hbs`{{x-foo}}`);
  assert.equal(this._element.querySelector('.x-foo').textContent, 'extreme');
});

test('can inject a service directly into test context', function (assert) {
  this.register(
    'component:x-foo',
    Component.extend({
      unicorn: service(),
      layout: hbs`<span class="x-foo">{{unicorn.sparkliness}}</span>`,
    })
  );

  this.register(
    'service:unicorn',
    Service.extend({
      sparkliness: 'extreme',
    })
  );

  this.inject.service('unicorn');
  this.render(hbs`{{x-foo}}`);

  assert.equal(this._element.querySelector('.x-foo').textContent, 'extreme');
  this.set('unicorn.sparkliness', 'amazing');
  assert.equal(this._element.querySelector('.x-foo').textContent, 'amazing');
});

test('can inject a service directly into test context, with aliased name', function (assert) {
  this.register(
    'component:x-foo',
    Component.extend({
      unicorn: service(),
      layout: hbs`<span class="x-foo">{{unicorn.sparkliness}}</span>`,
    })
  );
  this.register(
    'service:unicorn',
    Service.extend({
      sparkliness: 'extreme',
    })
  );
  this.inject.service('unicorn', { as: 'hornedBeast' });
  this.render(hbs`{{x-foo}}`);

  assert.equal(this._element.querySelector('.x-foo').textContent, 'extreme');
  this.set('hornedBeast.sparkliness', 'amazing');
  assert.equal(this._element.querySelector('.x-foo').textContent, 'amazing');
});

moduleForComponent('Component Integration Tests: willDestoryElement', {
  integration: true,
  beforeSetup() {
    setResolverRegistry({
      'component:my-component': Component.extend({
        willDestroyElement() {
          let { assert } = QUnit.config.current;

          assert.equal(this._state, 'inDOM', 'still in dom during willDestroyElement');
          assert.ok(
            document.body.contains(this.element),
            'component element still contained within `document`'
          );
        },
      }),
    });
  },
});

test('still in DOM in willDestroyElement', function (assert) {
  assert.expect(2);
  this.render(hbs`{{my-component}}`);
});

test('is destroyed when rendered twice', function (assert) {
  assert.expect(4);
  this.render(hbs`{{my-component}}`);
  this.render(hbs`{{my-component}}`);
});

moduleForComponent('Component Integration Tests: force willDestroyElement via clearRender', {
  integration: true,
  beforeSetup() {
    setResolverRegistry({});
  },
});

test('still in DOM in willDestroyElement', function (assert) {
  assert.expect(1);

  let willDestroyCalled = false;
  this.register(
    'component:x-button',
    Component.extend({
      willDestroyElement() {
        willDestroyCalled = true;
      },
    })
  );

  this.render(hbs`{{x-button}}`);
  this.clearRender();

  assert.ok(willDestroyCalled, 'can add assertions after willDestroyElement is called');
});

moduleForComponent('Component Integration Tests: DOM', {
  integration: true,
  beforeSetup() {},
});

test('it can set and get properties', function (assert) {
  let instance;

  setResolverRegistry({
    'component:my-component': Component.extend({
      init() {
        this._super(...arguments);
        instance = this;
      },
      layout: hbs`<span class="foo"></span>`,
    }),
  });
  this.render(hbs`{{my-component}}`);

  let testElement = this._element;
  let instanceElement = instance.element;

  assert.ok(
    testElement.children[0] === instanceElement,
    'the first child of the test harness is whatever is rendered'
  );
});

if (!hasEmberVersion(2, 0)) {
  moduleForComponent('my-component', 'Component Integration Tests', {
    integration: 'legacy',
    beforeSetup() {
      setResolverRegistry({
        'component:my-component': Component.extend(),
        'template:components/my-component': hbs`<span>{{name}}</span>`,
      });
    },
  });

  test('it can render components semantically equivalent to v0.4.3', function (assert) {
    this.subject({
      name: 'Charles XII',
    });
    this.render();

    assert.equal(this.$('span').text(), 'Charles XII');
  });
}

moduleForComponent('RSVP integration', {
  integration: true,
});

test('does not require manual run wrapping', function (assert) {
  let instance;
  this.register(
    'component:x-test-1',
    Component.extend({
      internalValue: 'initial value',

      init() {
        this._super.apply(this, arguments);
        instance = this;
      },
    })
  );

  this.register('template:components/x-test-1', hbs`{{internalValue}}`);

  this.render(hbs`{{x-test-1}}`);

  return new resolve()
    .then(() => {
      instance.set('internalValue', 'async value');
      return wait();
    })
    .then(() => {
      assert.equal(this._element.textContent, 'async value');
    });
});
