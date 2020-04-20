import getElement from './-get-element';
import fireEvent from './fire-event';
import settled from '../settled';
import { nextTickPromise } from '../-utils';
import { isElement } from './-target';

/**
  Scrolls DOM element or selector to the given coordinates.
  @public
  @param {string|HTMLElement} target the element or selector to trigger scroll on
  @param {Number} x x-coordinate
  @param {Number} y y-coordinate
  @return {Promise<void>} resolves when settled

  @example
  <caption>
    Scroll DOM element to specific coordinates
  </caption>

  scrollTo('#my-long-div', 0, 0); // scroll to top
  scrollTo('#my-long-div', 0, 100); // scroll down
*/
export default function scrollTo(
  target: string | HTMLElement,
  x: number,
  y: number
): Promise<void> {
  return nextTickPromise().then(() => {
    if (!target) {
      throw new Error('Must pass an element or selector to `scrollTo`.');
    }

    if (x === undefined || y === undefined) {
      throw new Error('Must pass both x and y coordinates to `scrollTo`.');
    }

    let element = getElement(target);
    if (!element) {
      throw new Error(`Element not found when calling \`scrollTo('${target}')\`.`);
    }

    if (!isElement(element)) {
      throw new Error(
        `"target" must be an element, but was a ${element.nodeType} when calling \`scrollTo('${target}')\`.`
      );
    }

    element.scrollTop = y;
    element.scrollLeft = x;

    fireEvent(element, 'scroll');

    return settled();
  });
}
