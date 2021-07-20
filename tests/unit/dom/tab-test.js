import { module, test } from 'qunit';
import { tab, setupContext, teardownContext, settled } from '@ember/test-helpers';
import { buildInstrumentedElement, insertElement } from '../../helpers/events';
import { isIE11, isEdge } from '../../helpers/browser-detect';
import hasEmberVersion from '@ember/test-helpers/has-ember-version';

let _focusSteps = isIE11 ? ['focusin', 'focus'] : ['focus', 'focusin'];
let _blurSteps = isIE11 || isEdge ? ['focusout', 'blur'] : ['blur', 'focusout'];

function focusSteps(name) {
  return [`${_focusSteps[0]} ${name}`, `${_focusSteps[1]} ${name}`];
}

function blurSteps(name) {
  return [`${_blurSteps[0]} ${name}`, `${_blurSteps[1]} ${name}`];
}

function moveFocus(from, to) {
  if (isIE11) {
    return [
      `keydown ${from}`,
      `focusout ${from}`,
      `focusin ${to}`,
      `blur ${from}`,
      `focus ${to}`,
      `keyup ${to}`,
    ];
  }
  return [`keydown ${from}`, ...blurSteps(from), ...focusSteps(to), `keyup ${to}`];
}

module('DOM Helper: tab', function(hooks) {
  if (!hasEmberVersion(2, 4)) {
    return;
  }

  let context, element, elements;

  hooks.beforeEach(function() {
    // used to simulate how `setupRenderingTest` (and soon `setupApplicationTest`)
    // set context.element to the rootElement
    context = {
      element: document.querySelector('#qunit-fixture'),
    };
  });

  hooks.afterEach(async function() {
    if (elements) {
      elements.forEach(element => {
        element.setAttribute('data-skip-steps', true);
      });
      elements.forEach(element => {
        element.parentNode.removeChild(element);
      });
      elements = undefined;
    }

    if (element) {
      element.setAttribute('data-skip-steps', true);
      element.parentNode.removeChild(element);
      element = undefined;
    }

    // only teardown if setupContext was called
    if (context.owner) {
      await teardownContext(context);
    }
    document.getElementById('ember-testing').innerHTML = '';
  });

  test('tabs to focusable element', async function(assert) {
    elements = [buildInstrumentedElement('input', ['target.id'])];

    await setupContext(context);
    await tab();

    assert.verifySteps([...focusSteps(elements[0].id), `keyup ${elements[0].id}`]);
  });

  test('tabs backwards to focusable element', async function(assert) {
    elements = [buildInstrumentedElement('input', ['target.id'])];

    await setupContext(context);
    await tab({ backwards: true });

    assert.verifySteps([...focusSteps(elements[0].id), `keyup ${elements[0].id}`]);
  });

  test('blurs target when tabs through the last target', async function(assert) {
    elements = [buildInstrumentedElement('input', ['target.id'])];

    await setupContext(context);
    await tab();
    await tab();

    assert.verifySteps([
      ...focusSteps(elements[0].id),
      `keyup ${elements[0].id}`,

      `keydown ${elements[0].id}`,
      ...blurSteps(elements[0].id),
    ]);
  });

  test('tabs between foucsable elements', async function(assert) {
    elements = [
      buildInstrumentedElement('input', ['target.className']),
      buildInstrumentedElement('input', ['target.className']),
    ];

    elements[0].className = 'a';
    elements[1].className = 'b';

    await setupContext(context);

    await tab();
    await tab();

    assert.verifySteps([...focusSteps('a'), `keyup a`, ...moveFocus('a', 'b')]);
  });

  test('ignores focusable elements with tab index = -1', async function(assert) {
    elements = [
      buildInstrumentedElement('input', ['target.id']),
      buildInstrumentedElement('input', ['target.id']),
    ];

    elements[0].tabIndex = -1;

    await setupContext(context);

    await tab();

    assert.verifySteps([...focusSteps(elements[1].id), `keyup ${elements[1].id}`]);
  });

  test('ignores focusable elements with tab index = -1', async function(assert) {
    elements = [
      buildInstrumentedElement('input', ['target.id']),
      buildInstrumentedElement('input', ['target.id']),
    ];

    elements[1].tabIndex = -1;

    await setupContext(context);

    await tab({ backwards: true });

    assert.verifySteps([...focusSteps(elements[0].id), `keyup ${elements[0].id}`]);
  });

  test('supports tabbing without any focusable areas', async function(assert) {
    elements = [];
    await setupContext(context);

    await tab();

    assert.ok(true);
  });

  test('tabs an input that prevents defaults', async function(assert) {
    elements = [
      buildInstrumentedElement('input', ['target.id']),
      buildInstrumentedElement('input', ['target.id']),
    ];

    elements[0].addEventListener('keydown', event => {
      event.preventDefault();
    });

    await setupContext(context);

    await tab();
    await tab();

    assert.verifySteps([
      ...focusSteps(elements[0].id),
      `keyup ${elements[0].id}`,
      `keydown ${elements[0].id}`,
      `keyup ${elements[0].id}`,
    ]);
  });

  test('tabs an input that moves focus during an event', async function(assert) {
    elements = [
      document.createElement('input'),
      document.createElement('input'),
      document.createElement('input'),
    ];

    elements.forEach(element => {
      insertElement(element);
    });

    elements[0].addEventListener('keydown', () => {
      elements[1].focus();
    });

    await setupContext(context);

    elements[0].focus();
    await settled();
    await tab();

    assert.equal(document.activeElement, elements[2]);
  });

  test('sorts focusable elements by their tab index', async function(assert) {
    elements = [
      buildInstrumentedElement('input', ['target.className']),
      buildInstrumentedElement('div', ['target.className']),
      buildInstrumentedElement('input', ['target.className']),
      buildInstrumentedElement('input', ['target.className']),
    ];

    elements[0].className = 'b';
    elements[1].className = 'c';
    elements[2].className = 'd';
    elements[3].className = 'a';

    elements[0].tabIndex = 4;
    elements[1].tabIndex = 4;
    elements[2].tabIndex = 0;
    elements[3].tabIndex = 1;

    await setupContext(context);

    await tab();
    await tab();
    await tab();
    await tab();

    assert.verifySteps([
      ...focusSteps('a'),
      'keyup a',
      ...moveFocus('a', 'b'),
      ...moveFocus('b', 'c'),
      ...moveFocus('c', 'd'),
    ]);
  });

  module('programmatically focusable elements', function(hooks) {
    hooks.beforeEach(async function() {
      elements = [
        buildInstrumentedElement('input', ['target.id']),
        buildInstrumentedElement('input', ['target.id']),
        buildInstrumentedElement('input', ['target.id']),
      ];

      elements[0].className = 'c';
      elements[1].className = 'a';
      elements[2].className = 'b';

      elements[0].tabIndex = 1;
      elements[1].tabIndex = -1;
      elements[2].tabIndex = 2;

      await setupContext(context);

      elements[1].focus();
    });

    test('tabs backwards focuses previous node', async function(assert) {
      await tab({ backwards: true });
      assert.verifySteps([
        ...focusSteps(elements[1].id),
        ...moveFocus(elements[1].id, elements[0].id),
      ]);
    });

    test('tabs focuses next focus area', async function(assert) {
      await tab();
      assert.verifySteps([
        ...focusSteps(elements[1].id),
        ...moveFocus(elements[1].id, elements[2].id),
      ]);
    });
  });

  module('invalid elements', function(hooks) {
    hooks.beforeEach(async function() {
      elements = [
        buildInstrumentedElement('input', ['target.id']),
        buildInstrumentedElement('input', ['target.id']),
      ];
    });

    test('ignores disabled input elements', async function(assert) {
      elements[0].disabled = true;

      await setupContext(context);
      await tab();

      assert.verifySteps([...focusSteps(elements[1].id), `keyup ${elements[1].id}`]);
    });

    test('ignores invisible elements', async function(assert) {
      elements[0].style.display = 'none';

      await setupContext(context);
      await tab();

      assert.verifySteps([...focusSteps(elements[1].id), `keyup ${elements[1].id}`]);
    });
  });

  test('ignores hidden parents', async function(assert) {
    elements = [
      buildInstrumentedElement('input', ['target.id']),
      buildInstrumentedElement('input', ['target.id']),
    ];

    let container = document.createElement('div');
    container.style.display = 'none';
    insertElement(container);
    container.appendChild(elements[0]);

    await setupContext(context);
    await tab();

    assert.verifySteps([...focusSteps(elements[1].id), `keyup ${elements[1].id}`]);
  });

  test('ignores children of disabled fieldset', async function(assert) {
    elements = [
      buildInstrumentedElement('input', ['target.id']),
      buildInstrumentedElement('input', ['target.id']),
    ];

    let container = document.createElement('fieldset');
    container.disabled = true;
    insertElement(container);
    container.appendChild(elements[0]);

    await setupContext(context);
    await tab();

    assert.verifySteps([...focusSteps(elements[1].id), `keyup ${elements[1].id}`]);
  });

  // IE11 doesn’t support the summary and detail and will fail this check
  if (isIE11 === false) {
    test('first summary element of a details should be focusable', async function(assert) {
      elements = [
        buildInstrumentedElement('summary', ['target.id']),
        buildInstrumentedElement('summary', ['target.id']),
      ];

      let container = document.createElement('details');
      insertElement(container);
      container.appendChild(elements[0]);
      container.appendChild(elements[1]);

      await setupContext(context);

      await tab();
      await tab();

      assert.verifySteps([
        ...focusSteps(elements[0].id),
        `keyup ${elements[0].id}`,
        `keydown ${elements[0].id}`,
        ...blurSteps(elements[0].id),
      ]);
    });
  }
});
