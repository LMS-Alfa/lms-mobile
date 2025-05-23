/**
 * EventEmitter polyfill for react-native
 * This provides a basic implementation of the Node.js events module
 * Used by packages like 'ws' that depend on Node.js built-ins
 */

// Basic EventEmitter implementation
class EventEmitter {
  private events: { [key: string]: Function[] } = {};

  on(event: string, listener: Function): this {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
    return this;
  }

  addListener(event: string, listener: Function): this {
    return this.on(event, listener);
  }

  once(event: string, listener: Function): this {
    const onceWrapper = (...args: any[]) => {
      listener(...args);
      this.removeListener(event, onceWrapper);
    };
    return this.on(event, onceWrapper);
  }

  off(event: string, listener: Function): this {
    return this.removeListener(event, listener);
  }

  removeListener(event: string, listener: Function): this {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(l => l !== listener);
    }
    return this;
  }

  removeAllListeners(event?: string): this {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    if (!this.events[event]) {
      return false;
    }
    
    this.events[event].forEach(listener => {
      listener(...args);
    });
    
    return true;
  }

  listenerCount(event: string): number {
    return this.events[event]?.length || 0;
  }

  rawListeners(event: string): Function[] {
    return this.events[event] || [];
  }
}

// Apply the polyfill
if (typeof global !== 'undefined') {
  // Don't override if something is already providing the polyfill
  if (!global.EventEmitter) {
    global.EventEmitter = EventEmitter;
  }
  
  // Setup module.exports structure for Node.js modules that try to require('events')
  if (!global.process) {
    global.process = {} as any;
  }
  
  if (!global.process.env) {
    global.process.env = {} as any;
  }
  
  console.log('EventEmitter polyfill applied successfully');
}

// Make it available via module.exports pattern for CommonJS compatibility
const eventsExports = {
  EventEmitter
};

// Export for ESM and TypeScript
export default eventsExports;
export { EventEmitter }; 