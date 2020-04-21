/* globals EmberENV */
import { guidFor } from '@ember/object/internals';
import { run } from '@ember/runloop';
import Ember from 'ember';
import global from './global';
import { BaseContext, TestContext, isTestContext, getContext } from './setup-context';
import { nextTickPromise } from './-utils';
import settled from './settled';
import { hbs, TemplateFactory } from 'ember-cli-htmlbars';
import getRootElement from './dom/get-root-element';
import { Owner } from './build-owner';
import { deprecate } from '@ember/application/deprecations';
import getTestMetadata, { ITestMetadata } from './test-metadata';

export const RENDERING_CLEANUP = Object.create(null);
const OUTLET_TEMPLATE = hbs`{{outlet}}`;
const EMPTY_TEMPLATE = hbs``;

export interface RenderingTestContext extends TestContext {
  render(template: TemplateFactory): Promise<void>;
  clearRender(): Promise<void>;

  $?(selector: string): any;

  element: Element | Document;
}

// eslint-disable-next-line require-jsdoc
export function isRenderingTestContext(context: BaseContext): context is RenderingTestContext {
  return (
    isTestContext(context) &&
    typeof context.render === 'function' &&
    typeof context.clearRender === 'function'
  );
}

/**
  @private
  @param {Ember.ApplicationInstance} owner the current owner instance
  @param {string} templateFullName the fill template name
  @returns {Template} the template representing `templateFullName`
*/
function lookupTemplate(owner: Owner, templateFullName: string) {
  let template = owner.lookup(templateFullName);
  if (typeof template === 'function') return template(owner);
  return template;
}

/**
  @private
  @param {Ember.ApplicationInstance} owner the current owner instance
  @returns {Template} a template representing {{outlet}}
*/
function lookupOutletTemplate(owner: Owner): any {
  let OutletTemplate = lookupTemplate(owner, 'template:-outlet');
  if (!OutletTemplate) {
    owner.register('template:-outlet', OUTLET_TEMPLATE);
    OutletTemplate = lookupTemplate(owner, 'template:-outlet');
  }

  return OutletTemplate;
}

/**
  @private
  @param {string} [selector] the selector to search for relative to element
  @returns {jQuery} a jQuery object representing the selector (or element itself if no selector)
*/
function jQuerySelector(selector: string): any {
  deprecate(
    'Using this.$() in a rendering test has been deprecated, consider using this.element instead.',
    false,
    {
      id: 'ember-test-helpers.rendering-context.jquery-element',
      until: '2.0.0',
      // @ts-ignore
      url: 'https://emberjs.com/deprecations/v3.x#toc_jquery-apis',
    }
  );

  let { element } = getContext() as RenderingTestContext;

  // emulates Ember internal behavor of `this.$` in a component
  // https://github.com/emberjs/ember.js/blob/v2.5.1/packages/ember-views/lib/views/states/has_element.js#L18
  return selector ? global.jQuery(selector, element) : global.jQuery(element);
}

let templateId = 0;
/**
  Renders the provided template and appends it to the DOM.

  @public
  @param {CompiledTemplate} template the template to render
  @returns {Promise<void>} resolves when settled
*/
export function render(template: TemplateFactory): Promise<void> {
  let context = getContext();

  if (!template) {
    throw new Error('you must pass a template to `render()`');
  }

  return nextTickPromise().then(() => {
    if (!context || !isRenderingTestContext(context)) {
      throw new Error('Cannot call `render` without having first called `setupRenderingContext`.');
    }

    let { owner, engine } = context;
    let testMetadata = getTestMetadata(context);
    testMetadata.usedHelpers.push('render');

    let toplevelView = owner.lookup('-top-level-view:main');
    let OutletTemplate = lookupOutletTemplate(owner);
    let ownerToRenderFrom = engine || owner;

    templateId += 1;
    let templateFullName = `template:-undertest-${templateId}`;
    ownerToRenderFrom.register(templateFullName, template);

    let outletState = {
      render: {
        owner, // always use the host app owner for application outlet
        into: undefined,
        outlet: 'main',
        name: 'application',
        controller: undefined,
        ViewClass: undefined,
        template: OutletTemplate,
      },

      outlets: {
        main: {
          render: {
            owner: ownerToRenderFrom, // the actual owner to be used for any lookups
            into: undefined,
            outlet: 'main',
            name: 'index',
            controller: context,
            ViewClass: undefined,
            template: lookupTemplate(ownerToRenderFrom, templateFullName),
            outlets: {},
          },
          outlets: {},
        },
      },
    };
    toplevelView.setOutletState(outletState);

    // returning settled here because the actual rendering does not happen until
    // the renderer detects it is dirty (which happens on backburner's end
    // hook), see the following implementation details:
    //
    // * [view:outlet](https://github.com/emberjs/ember.js/blob/f94a4b6aef5b41b96ef2e481f35e07608df01440/packages/ember-glimmer/lib/views/outlet.js#L129-L145) manually dirties its own tag upon `setOutletState`
    // * [backburner's custom end hook](https://github.com/emberjs/ember.js/blob/f94a4b6aef5b41b96ef2e481f35e07608df01440/packages/ember-glimmer/lib/renderer.js#L145-L159) detects that the current revision of the root is no longer the latest, and triggers a new rendering transaction
    return settled();
  });
}

/**
  Clears any templates previously rendered. This is commonly used for
  confirming behavior that is triggered by teardown (e.g.
  `willDestroyElement`).

  @public
  @returns {Promise<void>} resolves when settled
*/
export function clearRender(): Promise<void> {
  let context = getContext();

  if (!context || !isRenderingTestContext(context)) {
    throw new Error(
      'Cannot call `clearRender` without having first called `setupRenderingContext`.'
    );
  }

  return render(EMPTY_TEMPLATE);
}

/**
  Used by test framework addons to setup the provided context for rendering.

  `setupContext` must have been ran on the provided context
  prior to calling `setupRenderingContext`.

  Responsible for:

  - Setup the basic framework used for rendering by the
    `render` helper.
  - Ensuring the event dispatcher is properly setup.
  - Setting `this.element` to the root element of the testing
    container (things rendered via `render` will go _into_ this
    element).

  @public
  @param {Object} context the context to setup for rendering
  @returns {Promise<Object>} resolves with the context that was setup
*/
export default function setupRenderingContext(context: TestContext): Promise<RenderingTestContext> {
  let contextGuid = guidFor(context);
  RENDERING_CLEANUP[contextGuid] = [];

  let testMetadata: ITestMetadata = getTestMetadata(context);
  testMetadata.setupTypes.push('setupRenderingContext');

  return nextTickPromise()
    .then(() => {
      let { owner } = context;

      // these methods being placed on the context itself will be deprecated in
      // a future version (no giant rush) to remove some confusion about which
      // is the "right" way to things...
      Object.defineProperty(context, 'render', {
        configurable: true,
        enumerable: true,
        value: render,
        writable: false,
      });
      Object.defineProperty(context, 'clearRender', {
        configurable: true,
        enumerable: true,
        value: clearRender,
        writable: false,
      });

      if (global.jQuery) {
        Object.defineProperty(context, '$', {
          configurable: true,
          enumerable: true,
          value: jQuerySelector,
          writable: false,
        });
      }

      // When the host app uses `setApplication` (instead of `setResolver`) the event dispatcher has
      // already been setup via `applicationInstance.boot()` in `./build-owner`. If using
      // `setResolver` (instead of `setApplication`) a "mock owner" is created by extending
      // `Ember._ContainerProxyMixin` and `Ember._RegistryProxyMixin` in this scenario we need to
      // manually start the event dispatcher.
      if (owner._emberTestHelpersMockOwner) {
        let dispatcher =
          owner.lookup('event_dispatcher:main') || (Ember.EventDispatcher as any).create();
        dispatcher.setup({}, '#ember-testing');
      }

      let OutletView = owner.factoryFor
        ? owner.factoryFor('view:-outlet')
        : owner._lookupFactory!('view:-outlet');
      let toplevelView = OutletView.create();

      owner.register('-top-level-view:main', {
        create() {
          return toplevelView;
        },
      });

      // initially render a simple empty template
      return render(EMPTY_TEMPLATE).then(() => {
        (run as Function)(toplevelView, 'appendTo', getRootElement());

        return settled();
      });
    })
    .then(() => {
      Object.defineProperty(context, 'element', {
        configurable: true,
        enumerable: true,
        // ensure the element is based on the wrapping toplevel view
        // Ember still wraps the main application template with a
        // normal tagged view
        //
        // In older Ember versions (2.4) the element itself is not stable,
        // and therefore we cannot update the `this.element` until after the
        // rendering is completed
        value:
          global.EmberENV._APPLICATION_TEMPLATE_WRAPPER !== false
            ? getRootElement().querySelector('.ember-view')
            : getRootElement(),

        writable: false,
      });

      return context as RenderingTestContext;
    });
}
