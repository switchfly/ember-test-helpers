// Using the same "brand" as the types for `htmlbars-inline-precompile` for
// backwards compatibility. The actual value of the brand doesn't matter; it is
// only important that it (a) is distinct and (b) interoperates with existing
// uses of the `hbs` export from `htmlbars-inline-precompile` [1].
//
// [1]: https://github.com/DefinitelyTyped/DefinitelyTyped/blob/24a21e0b8ec7eccdec781d7513bfa5947f1c6e20/types/ember/index.d.ts#L540:L542
//
// Note that we *intentionally* do not export this; the details are irrelevant
// to consumers. The point is simply to have a *distinct* type that is therefore
// not substitutable for just any other type.
interface TemplateFactory {
  __htmlbars_inline_precompile_template_factory: any;
}

export interface PrecompileOptions {
  moduleName?: string;
  parseOptions?: {
    srcName?: string;
  };
}

/**
 * A helper for rendering components.
 *
 * @param tagged The template to render.
 *
 * ## Usage
 *
 * ### With tagged template
 *
 * ```ts
 * import { module, test } from 'qunit';
 * import { setupRenderingTest } from 'ember-qunit';
 * import { render } from '@ember/test-helpers';
 * import { hbs } from 'ember-cli-htmlbars';
 *
 * module('demonstrate hbs usage', function(hooks) {
 *   setupRenderingTest(hooks);
 *
 *   test('you can render things', function(assert) {
 *     await render(hbs`<TestingComponents @isCool={{true}} />`);
 *     assert.ok(true);
 *   });
 * });
 * ```
 *
 * ## With string and options
 *
 * ```ts
 * import Component from '@glimmer/component';
 * import { setComponentTemplate } from '@ember/component';
 * import { hbs } from 'ember-cli-htmlbars';
 *
 * class Hello extends Component {
 *   greeting = 'hello world';
 * }
 *
 * setComponentTemplate(
 *   hbs('<p>{{this.greeting}}</p>', { moduleName: 'hello.hbs' }),
 *   MyComponent
 * );
 * ```
 */
export function hbs(template: string, options?: PrecompileOptions): TemplateFactory;
export function hbs(tagged: TemplateStringsArray): TemplateFactory;
