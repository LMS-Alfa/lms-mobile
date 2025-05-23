/**
 * Document polyfill for React Native
 * This provides a minimal mock of browser's document object
 * to prevent crashes when libraries try to access DOM properties
 */

// Create a minimal implementation of DOM EventTarget
class MockEventTarget {
  private eventListeners: {[key: string]: Function[]} = {};

  addEventListener(type: string, listener: Function): void {
    if (!this.eventListeners[type]) {
      this.eventListeners[type] = [];
    }
    this.eventListeners[type].push(listener);
  }

  removeEventListener(type: string, listener: Function): void {
    if (!this.eventListeners[type]) return;
    this.eventListeners[type] = this.eventListeners[type].filter(
      (l) => l !== listener
    );
  }

  dispatchEvent(event: any): boolean {
    const listeners = this.eventListeners[event.type] || [];
    for (const listener of listeners) {
      listener(event);
    }
    return !event.defaultPrevented;
  }
}

// Create a minimal implementation of DOM Node
class MockNode extends MockEventTarget {
  nodeType: number = 1;
  nodeName: string = '';
  nodeValue: string | null = null;
  childNodes: MockNode[] = [];
  parentNode: MockNode | null = null;
  nextSibling: MockNode | null = null;
  previousSibling: MockNode | null = null;
  firstChild: MockNode | null = null;
  lastChild: MockNode | null = null;
  
  // Mock methods
  appendChild(node: MockNode): MockNode {
    // Remove from existing parent if any
    if (node.parentNode) {
      node.parentNode.removeChild(node);
    }
    
    // Update sibling relationships
    if (this.childNodes.length > 0) {
      const lastChild = this.childNodes[this.childNodes.length - 1];
      lastChild.nextSibling = node;
      node.previousSibling = lastChild;
    } else {
      this.firstChild = node;
    }
    
    // Add to children
    this.childNodes.push(node);
    node.parentNode = this;
    this.lastChild = node;
    
    return node;
  }
  
  insertBefore(newNode: MockNode, referenceNode: MockNode | null): MockNode {
    // If referenceNode is null, append to the end
    if (referenceNode === null) {
      return this.appendChild(newNode);
    }
    
    // Remove from existing parent if any
    if (newNode.parentNode) {
      newNode.parentNode.removeChild(newNode);
    }
    
    // Find the index of the reference node
    const index = this.childNodes.indexOf(referenceNode);
    if (index === -1) {
      throw new Error('Reference node not found');
    }
    
    // Update sibling relationships
    newNode.nextSibling = referenceNode;
    newNode.previousSibling = referenceNode.previousSibling;
    
    if (referenceNode.previousSibling) {
      referenceNode.previousSibling.nextSibling = newNode;
    } else {
      this.firstChild = newNode;
    }
    
    referenceNode.previousSibling = newNode;
    
    // Insert at the correct position
    this.childNodes.splice(index, 0, newNode);
    newNode.parentNode = this;
    
    return newNode;
  }
  
  removeChild(node: MockNode): MockNode {
    const index = this.childNodes.indexOf(node);
    if (index === -1) {
      throw new Error('Node not found');
    }
    
    // Update sibling relationships
    if (node.previousSibling) {
      node.previousSibling.nextSibling = node.nextSibling;
    } else {
      this.firstChild = node.nextSibling;
    }
    
    if (node.nextSibling) {
      node.nextSibling.previousSibling = node.previousSibling;
    } else {
      this.lastChild = node.previousSibling;
    }
    
    // Remove from children array
    this.childNodes.splice(index, 1);
    
    // Clear relationships
    node.parentNode = null;
    node.nextSibling = null;
    node.previousSibling = null;
    
    return node;
  }
  
  // Remove this node from its parent
  remove(): void {
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  }
  
  // More DOM Node methods
  hasChildNodes(): boolean {
    return this.childNodes.length > 0;
  }
  
  cloneNode(deep: boolean = false): MockNode {
    const clone = new MockNode();
    clone.nodeType = this.nodeType;
    clone.nodeName = this.nodeName;
    clone.nodeValue = this.nodeValue;
    
    if (deep && this.childNodes.length > 0) {
      for (const child of this.childNodes) {
        clone.appendChild(child.cloneNode(true));
      }
    }
    
    return clone;
  }
  
  // Helper for React Navigation
  contains(other: MockNode | null): boolean {
    if (!other) return false;
    
    let parent = other.parentNode;
    while (parent) {
      if (parent === this) {
        return true;
      }
      parent = parent.parentNode;
    }
    
    return false;
  }
}

// Create a minimal implementation of DOM Element
class MockElement extends MockNode {
  tagName: string = '';
  style: any = {};
  attributes: {[key: string]: string} = {};
  innerHTML: string = '';
  innerText: string = '';
  textContent: string = '';
  className: string = '';
  id: string = '';
  
  constructor(tagName: string) {
    super();
    this.tagName = tagName.toUpperCase();
    this.nodeName = this.tagName;
  }
  
  getAttribute(name: string): string | null {
    return this.attributes[name] || null;
  }
  
  setAttribute(name: string, value: string): void {
    if (name === 'id') {
      this.id = value;
    } else if (name === 'class') {
      this.className = value;
    }
    
    this.attributes[name] = value;
  }
  
  removeAttribute(name: string): void {
    if (name === 'id') {
      this.id = '';
    } else if (name === 'class') {
      this.className = '';
    }
    
    delete this.attributes[name];
  }
  
  hasAttribute(name: string): boolean {
    return name in this.attributes;
  }
  
  // classList implementation
  classList = {
    _classes: new Set<string>(),
    
    add: (...classes: string[]) => {
      for (const cls of classes) {
        this.classList._classes.add(cls);
      }
      this.className = Array.from(this.classList._classes).join(' ');
    },
    
    remove: (...classes: string[]) => {
      for (const cls of classes) {
        this.classList._classes.delete(cls);
      }
      this.className = Array.from(this.classList._classes).join(' ');
    },
    
    toggle: (cls: string, force?: boolean) => {
      if (force === true || (force === undefined && !this.classList.contains(cls))) {
        this.classList.add(cls);
        return true;
      } else if (force === false || (force === undefined && this.classList.contains(cls))) {
        this.classList.remove(cls);
        return false;
      }
      return false;
    },
    
    contains: (cls: string) => this.classList._classes.has(cls),
    
    toString: () => Array.from(this.classList._classes).join(' ')
  };
  
  // More DOM Element methods
  getBoundingClientRect(): any {
    return {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0
    };
  }
}

// Create a minimal implementation of DOM Document
class MockDocument extends MockNode {
  body: MockElement;
  documentElement: MockElement;
  head: MockElement;
  private elementsById: {[id: string]: MockElement} = {};
  
  constructor() {
    super();
    this.nodeType = 9; // DOCUMENT_NODE
    this.nodeName = '#document';
    
    // Create html, head, body elements
    this.documentElement = this.createElement('html');
    this.head = this.createElement('head');
    this.body = this.createElement('body');
    
    // Set up document structure
    this.appendChild(this.documentElement);
    this.documentElement.appendChild(this.head);
    this.documentElement.appendChild(this.body);
  }
  
  createElement(tagName: string): MockElement {
    return new MockElement(tagName);
  }
  
  createTextNode(data: string): MockNode {
    const node = new MockNode();
    node.nodeType = 3; // TEXT_NODE
    node.nodeName = '#text';
    node.nodeValue = data;
    return node;
  }
  
  getElementById(id: string): MockElement | null {
    // Return element if it's in our registry
    if (this.elementsById[id]) {
      return this.elementsById[id];
    }
    
    // Otherwise create a new element and track it
    const element = this.createElement('div');
    element.setAttribute('id', id);
    this.elementsById[id] = element;
    return element;
  }
  
  querySelector(selectors: string): MockElement | null {
    // Simple implementation for common selectors
    if (selectors === 'body') {
      return this.body;
    } else if (selectors === 'head') {
      return this.head;
    } else if (selectors === 'html') {
      return this.documentElement;
    } else if (selectors.startsWith('#')) {
      // Handle ID selector
      return this.getElementById(selectors.substring(1));
    }
    
    // Default fallback
    return this.createElement('div');
  }
  
  querySelectorAll(selectors: string): MockElement[] {
    // Simple implementation - returns array with a mock element
    return [this.createElement('div')];
  }
  
  createDocumentFragment(): MockNode {
    const fragment = new MockNode();
    fragment.nodeType = 11; // DOCUMENT_FRAGMENT_NODE
    fragment.nodeName = '#document-fragment';
    return fragment;
  }
  
  createEvent(eventType: string): any {
    return {
      initEvent: (type: string, bubbles: boolean, cancelable: boolean) => {}
    };
  }
}

// Create a document instance
const mockDocument = new MockDocument();

// Apply the polyfill
if (typeof global !== 'undefined' && typeof global.document === 'undefined') {
  console.log('Document polyfill applied');
  global.document = mockDocument as any;
}

export default mockDocument; 