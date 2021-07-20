import { assign } from '@ember/polyfills';
import { isDocument, isElement } from './-target';
import tuple from '../-tuple';

// eslint-disable-next-line require-jsdoc
const MOUSE_EVENT_CONSTRUCTOR = (() => {
  try {
    new MouseEvent('test');
    return true;
  } catch (e) {
    return false;
  }
})();
const DEFAULT_EVENT_OPTIONS = { bubbles: true, cancelable: true };

export const KEYBOARD_EVENT_TYPES = tuple('keydown', 'keypress', 'keyup');
export type KeyboardEventType = typeof KEYBOARD_EVENT_TYPES[number];

// eslint-disable-next-line require-jsdoc
export function isKeyboardEventType(eventType: any): eventType is KeyboardEventType {
  return KEYBOARD_EVENT_TYPES.indexOf(eventType) > -1;
}

const MOUSE_EVENT_TYPES = tuple(
  'click',
  'mousedown',
  'mouseup',
  'dblclick',
  'mouseenter',
  'mouseleave',
  'mousemove',
  'mouseout',
  'mouseover'
);
export type MouseEventType = typeof MOUSE_EVENT_TYPES[number];

// eslint-disable-next-line require-jsdoc
export function isMouseEventType(eventType: any): eventType is MouseEventType {
  return MOUSE_EVENT_TYPES.indexOf(eventType) > -1;
}

const FILE_SELECTION_EVENT_TYPES = tuple('change');
export type FileSelectionEventType = typeof FILE_SELECTION_EVENT_TYPES[number];

// eslint-disable-next-line require-jsdoc
export function isFileSelectionEventType(eventType: any): eventType is FileSelectionEventType {
  return FILE_SELECTION_EVENT_TYPES.indexOf(eventType) > -1;
}

// eslint-disable-next-line require-jsdoc
export function isFileSelectionInput(element: any): element is HTMLInputElement {
  return element.files;
}

function fireEvent(
  element: Element | Document | Window,
  eventType: KeyboardEventType,
  options?: any
): Event;

function fireEvent(
  element: Element | Document | Window,
  eventType: MouseEventType,
  options?: any
): Event | void;

function fireEvent(element: Element | Document | Window, eventType: string, options?: any): Event;

/**
  Internal helper used to build and dispatch events throughout the other DOM helpers.

  @private
  @param {Element} element the element to dispatch the event to
  @param {string} eventType the type of event
  @param {Object} [options] additional properties to be set on the event
  @returns {Event} the event that was dispatched
*/
function fireEvent(
  element: Element | Document | Window,
  eventType: string,
  options = {}
): Event | void {
  if (!element) {
    throw new Error('Must pass an element to `fireEvent`');
  }

  let event;
  if (isKeyboardEventType(eventType)) {
    event = buildKeyboardEvent(eventType, options);
  } else if (isMouseEventType(eventType)) {
    let rect;
    if (element instanceof Window && element.document.documentElement) {
      rect = element.document.documentElement.getBoundingClientRect();
    } else if (isDocument(element)) {
      rect = element.documentElement!.getBoundingClientRect();
    } else if (isElement(element)) {
      rect = element.getBoundingClientRect();
    } else {
      return;
    }

    let x = rect.left + 1;
    let y = rect.top + 1;
    let simulatedCoordinates = {
      screenX: x + 5, // Those numbers don't really mean anything.
      screenY: y + 95, // They're just to make the screenX/Y be different of clientX/Y..
      clientX: x,
      clientY: y,
    };

    event = buildMouseEvent(eventType, assign(simulatedCoordinates, options));
  } else if (isFileSelectionEventType(eventType) && isFileSelectionInput(element)) {
    event = buildFileEvent(eventType, element, options);
  } else {
    event = buildBasicEvent(eventType, options);
  }

  element.dispatchEvent(event);
  return event;
}

export default fireEvent;

// eslint-disable-next-line require-jsdoc
function buildBasicEvent(type: string, options: any = {}): Event {
  let event = document.createEvent('Events');

  let bubbles = options.bubbles !== undefined ? options.bubbles : true;
  let cancelable = options.cancelable !== undefined ? options.cancelable : true;

  delete options.bubbles;
  delete options.cancelable;

  // bubbles and cancelable are readonly, so they can be
  // set when initializing event
  event.initEvent(type, bubbles, cancelable);
  assign(event, options);
  return event;
}

// eslint-disable-next-line require-jsdoc
function buildMouseEvent(type: MouseEventType, options: any = {}) {
  let event;
  let eventOpts: any = assign({ view: window }, DEFAULT_EVENT_OPTIONS, options);
  if (MOUSE_EVENT_CONSTRUCTOR) {
    event = new MouseEvent(type, eventOpts);
  } else {
    try {
      event = document.createEvent('MouseEvents');
      event.initMouseEvent(
        type,
        eventOpts.bubbles,
        eventOpts.cancelable,
        window,
        eventOpts.detail,
        eventOpts.screenX,
        eventOpts.screenY,
        eventOpts.clientX,
        eventOpts.clientY,
        eventOpts.ctrlKey,
        eventOpts.altKey,
        eventOpts.shiftKey,
        eventOpts.metaKey,
        eventOpts.button,
        eventOpts.relatedTarget
      );
    } catch (e) {
      event = buildBasicEvent(type, options);
    }
  }

  return event;
}

// eslint-disable-next-line require-jsdoc
export function buildKeyboardEvent(type: KeyboardEventType, options: any = {}) {
  let eventOpts: any = assign({}, DEFAULT_EVENT_OPTIONS, options);
  let event: Event | undefined;
  let eventMethodName: 'initKeyboardEvent' | 'initKeyEvent' | undefined;

  try {
    event = new KeyboardEvent(type, eventOpts);

    // Property definitions are required for B/C for keyboard event usage
    // If this properties are not defined, when listening for key events
    // keyCode/which will be 0. Also, keyCode and which now are string
    // and if app compare it with === with integer key definitions,
    // there will be a fail.
    //
    // https://w3c.github.io/uievents/#interface-keyboardevent
    // https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent
    Object.defineProperty(event, 'keyCode', {
      get() {
        return parseInt(eventOpts.keyCode);
      },
    });

    Object.defineProperty(event, 'which', {
      get() {
        return parseInt(eventOpts.which);
      },
    });

    return event;
  } catch (e) {
    // left intentionally blank
  }

  try {
    event = document.createEvent('KeyboardEvents');
    eventMethodName = 'initKeyboardEvent';
  } catch (e) {
    // left intentionally blank
  }

  if (!event) {
    try {
      event = document.createEvent('KeyEvents');
      eventMethodName = 'initKeyEvent';
    } catch (e) {
      // left intentionally blank
    }
  }

  if (event && eventMethodName) {
    (event as any)[eventMethodName](
      type,
      eventOpts.bubbles,
      eventOpts.cancelable,
      window,
      eventOpts.ctrlKey,
      eventOpts.altKey,
      eventOpts.shiftKey,
      eventOpts.metaKey,
      eventOpts.keyCode,
      eventOpts.charCode
    );
  } else {
    event = buildBasicEvent(type, options);
  }

  return event;
}

// eslint-disable-next-line require-jsdoc
function buildFileEvent(
  type: FileSelectionEventType,
  element: HTMLInputElement,
  options: any = {}
): Event {
  let event = buildBasicEvent(type);
  let files = options.files;

  if (Array.isArray(options)) {
    throw new Error(
      'Please pass an object with a files array to `triggerEvent` instead of passing the `options` param as an array to.'
    );
  }

  if (Array.isArray(files)) {
    Object.defineProperty(files, 'item', {
      value(index: number) {
        return typeof index === 'number' ? this[index] : null;
      },
      configurable: true,
    });
    Object.defineProperty(element, 'files', {
      value: files,
      configurable: true,
    });

    let elementProto = Object.getPrototypeOf(element);
    let valueProp = Object.getOwnPropertyDescriptor(elementProto, 'value');
    Object.defineProperty(element, 'value', {
      configurable: true,
      get() {
        return valueProp!.get!.call(element);
      },
      set(value) {
        valueProp!.set!.call(element, value);

        // We are sure that the value is empty here.
        // For a non-empty value the original setter must raise an exception.
        Object.defineProperty(element, 'files', {
          configurable: true,
          value: [],
        });
      },
    });
  }

  Object.defineProperty(event, 'target', {
    value: element,
  });

  return event;
}
