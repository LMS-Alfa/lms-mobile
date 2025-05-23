/**
 * Window polyfill for React Native
 * This provides a minimal mock of browser's window object
 * to prevent crashes when libraries try to access browser APIs
 */

import mockDocument from './document-polyfill';

// Create a minimal Window implementation
class MockWindow {
  document = mockDocument;
  location = {
    href: 'https://reactnative.dev',
    protocol: 'https:',
    host: 'reactnative.dev',
    hostname: 'reactnative.dev',
    port: '',
    pathname: '/',
    search: '',
    hash: '',
    origin: 'https://reactnative.dev',
    assign: (url: string) => {},
    replace: (url: string) => {},
    reload: () => {}
  };
  
  navigator = {
    userAgent: 'React Native',
    language: 'en-US',
    languages: ['en-US', 'en'],
    platform: 'react-native',
    appName: 'React Native',
    appVersion: '1.0.0',
    vendor: 'React Native',
    onLine: true,
    geolocation: {
      getCurrentPosition: () => {},
      watchPosition: () => 0,
      clearWatch: () => {}
    }
  };
  
  localStorage = {
    getItem: (key: string): string | null => null,
    setItem: (key: string, value: string): void => {},
    removeItem: (key: string): void => {},
    clear: (): void => {},
    key: (index: number): string | null => null,
    length: 0
  };
  
  sessionStorage = {
    getItem: (key: string): string | null => null,
    setItem: (key: string, value: string): void => {},
    removeItem: (key: string): void => {},
    clear: (): void => {},
    key: (index: number): string | null => null,
    length: 0
  };
  
  // Timer functions
  setTimeout = global.setTimeout;
  clearTimeout = global.clearTimeout;
  setInterval = global.setInterval;
  clearInterval = global.clearInterval;
  requestAnimationFrame = (callback: FrameRequestCallback): number => setTimeout(() => callback(Date.now()), 16);
  cancelAnimationFrame = (handle: number): void => clearTimeout(handle);
  
  // Event handling
  addEventListener(event: string, callback: Function): void {
    // No-op implementation
  }
  
  removeEventListener(event: string, callback: Function): void {
    // No-op implementation
  }
  
  dispatchEvent(event: any): boolean {
    return true;
  }
  
  // Screen properties
  screen = {
    width: 375,
    height: 667,
    availWidth: 375,
    availHeight: 667,
    colorDepth: 24,
    pixelDepth: 24,
    orientation: {
      type: 'portrait-primary',
      angle: 0
    }
  };
  
  // Viewport dimensions
  innerWidth = 375;
  innerHeight = 667;
  outerWidth = 375;
  outerHeight = 667;
  devicePixelRatio = 2;
  
  // History API mock
  history = {
    length: 1,
    state: null,
    scrollRestoration: 'auto' as ScrollRestoration,
    pushState: () => {},
    replaceState: () => {},
    go: () => {},
    back: () => {},
    forward: () => {}
  };
  
  // Basic functions commonly used
  atob = global.atob;
  btoa = global.btoa;
  
  // Fetch API
  fetch = global.fetch;
  
  // Console
  console = global.console;
  
  // Self reference
  self = this;
  globalThis = this;
  
  // DOM elements construction
  HTMLElement = class {};
  HTMLDivElement = class {};
  HTMLSpanElement = class {};
  HTMLImageElement = class {};
  HTMLCanvasElement = class {};
  SVGElement = class {};
  
  // Events
  Event = class {
    type: string;
    bubbles: boolean;
    cancelable: boolean;
    defaultPrevented: boolean = false;
    
    constructor(type: string, options: any = {}) {
      this.type = type;
      this.bubbles = !!options.bubbles;
      this.cancelable = !!options.cancelable;
    }
    
    preventDefault() {
      if (this.cancelable) {
        this.defaultPrevented = true;
      }
    }
    
    stopPropagation() {}
    stopImmediatePropagation() {}
  };
  
  // Add any other window properties/methods needed by specific libraries
  matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true
  });
  
  // Performance timing
  performance = {
    now: () => Date.now(),
    mark: () => {},
    measure: () => {},
    getEntriesByType: () => [],
    getEntriesByName: () => [],
    clearMarks: () => {},
    clearMeasures: () => {},
    timing: {
      navigationStart: Date.now()
    }
  };
}

// Create a window instance
const mockWindow = new MockWindow();

// Apply the polyfill
if (typeof global !== 'undefined') {
  // Only add properties that don't already exist
  if (typeof global.window === 'undefined') {
    console.log('Window polyfill applied');
    global.window = mockWindow as any;
    
    // Also set global.self to window for libraries that use self instead
    if (typeof global.self === 'undefined') {
      global.self = global.window;
    }
  }
}

export default mockWindow; 