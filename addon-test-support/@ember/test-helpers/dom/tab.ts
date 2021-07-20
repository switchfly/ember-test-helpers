import getRootElement from './get-root-element';
import settled from '../settled';
import fireEvent, { buildKeyboardEvent } from './fire-event';
import { isDocument } from './-target';
import { __blur__ } from './blur';
import { nextTickPromise } from '../-utils';
import { createTreeWalker } from './-create-tree-walker';
import { __focus__ } from './focus';

const FORM_TAGS = ['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA', 'FIELDSET'];
const SUPPORTS_INHERT = Element.prototype.hasOwnProperty('inert');
const FALLBACK_ELEMENTS = ['CANVAS', 'VIDEO', 'PICTURE'];

/**
  Checks if an element is considered visible by the focus area spec.
  @private
  @param {Element} element the element to check
  @returns {boolean} `true` when the element is visible, `false` otherwise
*/
function isVisible(element: Element): boolean {
  let styles = window.getComputedStyle(element);
  return styles.display !== 'none' && styles.visibility !== 'hidden';
}

/**
  Checks if an element is disabled.
  @private
  @param {Element} element the element to check
  @returns {boolean} `true` when the element is disabled, `false` otherwise
*/
function isDisabled(element: HTMLElement): boolean {
  if (FORM_TAGS.indexOf(element.tagName) !== -1) {
    return (element as HTMLInputElement).disabled;
  }
  return false;
}

/**
  Gets the active element of a document. IE11 may return null instead of the body as
  other user-agents does when there isn’t an active element.
  @private
  @param {Document} ownerDocument the element to check
  @returns {HTMLElement} the active element of the document
*/
function getActiveElement(ownerDocument: Document): HTMLElement {
  return (ownerDocument.activeElement as HTMLElement) || ownerDocument.body;
}

interface InhertHTMLElement extends HTMLElement {
  inhert: boolean;
}

/**
  Compiles a list of nodes that can be focused. Walkes the tree, discardes hidden elements and a few edge cases. To calculate the right.
  @private
  @param {Element} root the root element to start traversing on
  @returns {Array} list of focusable nodes
*/
function compileFocusAreas(root: Element = document.body) {
  let activeElment = getActiveElement(root.ownerDocument!);
  let treeWalker = createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: (node: HTMLElement) => {
        /// Only visible nodes can be focused, with, at least, one exception; the "area" element.
        if (node.tagName !== 'AREA' && isVisible(node) === false) {
          return NodeFilter.FILTER_REJECT;
        }

        // Reject any fallback elements. Fallback elements’s children are only rendered if the UA
        // doesn’t support the element. We make an assumption that they are always supported, we
        // could consider feature detecting every node type, or making it configurable.
        let parentNode = node.parentNode as HTMLElement | null;
        if (parentNode && FALLBACK_ELEMENTS.indexOf(parentNode.tagName) !== -1) {
          return NodeFilter.FILTER_REJECT;
        }

        // Rejects inhert containers, if the user agent supports the feature (or if a polyfill is installed.)
        if (SUPPORTS_INHERT && (node as InhertHTMLElement).inhert) {
          return NodeFilter.FILTER_REJECT;
        }

        if (isDisabled(node)) {
          return NodeFilter.FILTER_REJECT;
        }

        // Always accept the 'activeElement' of the document, as it might fail the next check, elements with tabindex="-1"
        // can be focused programtically, we'll therefor ensure the current active element is in the list.
        if (node === activeElment) {
          return NodeFilter.FILTER_ACCEPT;
        }

        // UA parses the tabindex attribute and applies its default values, If the tabIndex is non negative, the UA can
        // foucs it.
        return node.tabIndex >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      },
    },
    false
  );

  let node: Node | null;
  let elements: HTMLElement[] = [];

  while ((node = treeWalker.nextNode())) {
    elements.push(node as HTMLElement);
  }

  return elements;
}

/**
  Sort elements by their tab indices.
  As older browsers doesn't necesarrly implement stabile sort, we'll have to
  manually compare with the index in the original array.
  @private
  @param {Array<HTMLElement>} elements to sort
  @returns {Array<HTMLElement>} list of sorted focusable nodes by their tab index
*/
function sortElementsByTabIndices(elements: HTMLElement[]): HTMLElement[] {
  return elements
    .map((element, index) => {
      return { index, element };
    })
    .sort((a, b) => {
      if (a.element.tabIndex === b.element.tabIndex) {
        return a.index - b.index;
      } else if (a.element.tabIndex === 0 || b.element.tabIndex === 0) {
        return b.element.tabIndex - a.element.tabIndex;
      }
      return a.element.tabIndex - b.element.tabIndex;
    })
    .map(entity => entity.element);
}

/**
  @private
  @param {Element} root The root element or node to start traversing on.
  @param {HTMLElement} activeElement The element to find the next and previous focus areas of
  @returns {object} The next and previous focus areas of the active element
 */
function findNextResponders(root: Element, activeElement: HTMLElement) {
  let focusAreas = compileFocusAreas(root);
  let sortedFocusAreas = sortElementsByTabIndices(focusAreas);
  let elements = activeElement.tabIndex === -1 ? focusAreas : sortedFocusAreas;

  let index = elements.indexOf(activeElement);
  if (index === -1) {
    return {
      next: sortedFocusAreas[0],
      previous: sortedFocusAreas[sortedFocusAreas.length - 1],
    };
  }

  return {
    next: elements[index + 1],
    previous: elements[index - 1],
  };
}

/**
  Emulates the user pressing the tab button.

  Sends a number of events intending to simulate a "real" user pressing tab on their
  keyboard.

  @public
  @param {Object} options {backwards: x} (default false) indicates if the the user navigates backwards
  @return {Promise<void>} resolves when settled

  @example
  tab();
  tab({backwards: true});
*/
export default function triggerTab(options?: { backwards: boolean }): Promise<void> {
  return nextTickPromise()
    .then(() => {
      let backwards = (options && options.backwards) || false;
      return triggerResponderChange(backwards);
    })
    .then(() => {
      return settled();
    });
}

/**
  @private
  @param {boolean} backwards when `true` it selects the previous foucs area
  @returns {Promise<void>} resolves when all events are fired
 */
function triggerResponderChange(backwards: boolean): Promise<void> {
  let root = getRootElement();
  let ownerDocument: Document;
  let rootElement: HTMLElement;
  if (isDocument(root)) {
    rootElement = root.body;
    ownerDocument = root;
  } else {
    rootElement = root as HTMLElement;
    ownerDocument = root.ownerDocument as Document;
  }

  let keyboardEventOptions = {
    keyCode: 9,
    which: 9,
    key: 'Tab',
    code: 'Tab',
    shiftKey: backwards,
  };

  return nextTickPromise()
    .then(() => {
      let activeElement = getActiveElement(ownerDocument);
      let event = buildKeyboardEvent('keydown', keyboardEventOptions);
      let defaultNotPrevented = activeElement.dispatchEvent(event);

      if (defaultNotPrevented) {
        // Query the active element again, as it might change during event phase
        activeElement = getActiveElement(ownerDocument);
        let target = findNextResponders(rootElement, activeElement);
        if (target) {
          if (backwards && target.previous) {
            __focus__(target.previous);
          } else if (!backwards && target.next) {
            __focus__(target.next);
          } else {
            __blur__(activeElement);
          }
        }
      }
    })
    .then(() => {
      // It seems IE11 fires focus events async when invoking `focus()` on elements,
      // to get tests passing, and make sure events are called in the right order, we'll
      // wait a bit.
      let isIE11 = !window.ActiveXObject && 'ActiveXObject' in window;
      if (isIE11) {
        return new Promise(resolve => {
          setTimeout(resolve, 50);
        });
      }
      return;
    })
    .then(() => {
      let activeElement = getActiveElement(ownerDocument);
      fireEvent(activeElement, 'keyup', keyboardEventOptions);
    });
}
