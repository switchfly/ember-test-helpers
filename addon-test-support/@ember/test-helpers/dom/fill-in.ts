import getElement from './-get-element';
import isFormControl from './-is-form-control';
import { __focus__ } from './focus';
import settled from '../settled';
import fireEvent from './fire-event';
import { nextTickPromise } from '../-utils';
import Target, { isContentEditable } from './-target';
import { log } from '@ember/test-helpers/dom/-logging';

/**
  Fill the provided text into the `value` property (or set `.innerHTML` when
  the target is a content editable element) then trigger `change` and `input`
  events on the specified target.

  @public
  @param {string|Element} target the element or selector to enter text into
  @param {string} text the text to fill into the target element
  @return {Promise<void>} resolves when the application is settled

  @example
  <caption>
    Emulating filling an input with text using `fillIn`
  </caption>

  fillIn('input', 'hello world');
*/
export default function fillIn(target: Target, text: string): Promise<void> {
  log('fillIn', target, text);

  return nextTickPromise().then(() => {
    if (!target) {
      throw new Error('Must pass an element or selector to `fillIn`.');
    }

    let element = getElement(target) as Element | HTMLElement;
    if (!element) {
      throw new Error(`Element not found when calling \`fillIn('${target}')\`.`);
    }

    if (typeof text === 'undefined' || text === null) {
      throw new Error('Must provide `text` when calling `fillIn`.');
    }

    if (isFormControl(element)) {
      if (element.disabled) {
        throw new Error(`Can not \`fillIn\` disabled '${target}'.`);
      }

      if ('readOnly' in element && element.readOnly) {
        throw new Error(`Can not \`fillIn\` readonly '${target}'.`);
      }

      __focus__(element);

      element.value = text;
    } else if (isContentEditable(element)) {
      __focus__(element);

      element.innerHTML = text;
    } else {
      throw new Error('`fillIn` is only usable on form controls or contenteditable elements.');
    }

    fireEvent(element, 'input');
    fireEvent(element, 'change');

    return settled();
  });
}
