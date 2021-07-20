let workaroundForIE11: boolean;

try {
  document.createTreeWalker(document, NodeFilter.SHOW_ELEMENT);
  workaroundForIE11 = false;
} catch (error) {
  workaroundForIE11 = true;
}

/**
 Creates a TreeWalker object that you can use to traverse filtered lists of nodes or elements in a document.
 Applies a workaround for IE11, as it uses a different syntax, and expects just a function, not the `NodeFilter`
 object.
 @param {Element} root The root element or node to start traversing on.
 @param {number} whatToShow The type of nodes or elements to appear in the node list.
 @param {NodeFilter} filter A custom NodeFilter function to filter the traversed nodes.
 @param {boolean} entityReferenceExpansion A flag that specifies whether entity reference nodes are expanded.
 @returns {TreeWalker} The tree walker
*/
export function createTreeWalker(
  root: Element,
  whatToShow: number,
  filter: NodeFilter,
  entityReferenceExpansion?: boolean
): TreeWalker {
  let ownerDocument = root.ownerDocument;
  if (!ownerDocument) {
    throw new Error('Element must be in the DOM');
  }

  if (workaroundForIE11) {
    let acceptNode = filter ? ((filter.acceptNode as any) as NodeFilter) : null;
    return ownerDocument.createTreeWalker(root, whatToShow, acceptNode, entityReferenceExpansion);
  } else {
    return ownerDocument.createTreeWalker(root, whatToShow, filter, entityReferenceExpansion);
  }
}
