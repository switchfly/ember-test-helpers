type Target = string | Element | Document | Window;

export default Target;

// eslint-disable-next-line require-jsdoc
export function isElement(target: any): target is Element {
  return target.nodeType === Node.ELEMENT_NODE;
}

// eslint-disable-next-line require-jsdoc
export function isDocument(target: any): target is Document {
  return target.nodeType === Node.DOCUMENT_NODE;
}

// eslint-disable-next-line require-jsdoc
export function isContentEditable(element: Element): element is HTMLElement {
  return 'isContentEditable' in element && (element as HTMLElement).isContentEditable;
}
