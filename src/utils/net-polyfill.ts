/**
 * Net module polyfill for React Native
 * This provides a minimal implementation of the Node.js net module
 * Used by packages like 'ws' that depend on Node.js built-ins
 */

import { EventEmitter } from './events-polyfill';

// Mock Socket class that extends EventEmitter
class Socket extends EventEmitter {
  connecting: boolean = false;
  destroyed: boolean = false;
  readable: boolean = true;
  writable: boolean = true;
  allowHalfOpen: boolean = false;
  
  constructor(options: any = {}) {
    super();
    this.allowHalfOpen = options.allowHalfOpen || false;
  }

  connect(options: any, connectListener?: Function): this {
    this.connecting = true;
    
    if (connectListener) {
      this.once('connect', connectListener);
    }
    
    // In React Native, we can't actually connect via TCP
    // So we just emit an error
    setTimeout(() => {
      this.connecting = false;
      this.emit('error', new Error('TCP connections not supported in React Native'));
    }, 0);
    
    return this;
  }

  destroy(error?: Error): this {
    this.destroyed = true;
    
    if (error) {
      this.emit('error', error);
    }
    
    this.emit('close', Boolean(error));
    return this;
  }

  end(data?: any, encoding?: string, callback?: Function): this {
    if (callback) {
      callback();
    }
    this.emit('end');
    return this;
  }

  pause(): this {
    return this;
  }

  resume(): this {
    return this;
  }

  setTimeout(timeout: number, callback?: Function): this {
    if (callback) {
      this.once('timeout', callback);
    }
    
    return this;
  }

  setNoDelay(noDelay?: boolean): this {
    return this;
  }

  setKeepAlive(enable?: boolean, initialDelay?: number): this {
    return this;
  }

  address(): any {
    return { port: 0, family: 'IPv4', address: '0.0.0.0' };
  }

  write(data: any, encoding?: string | Function, callback?: Function): boolean {
    if (typeof encoding === 'function') {
      callback = encoding;
      encoding = undefined;
    }
    
    if (callback) {
      callback();
    }
    
    return true;
  }
}

// Mock Server class that extends EventEmitter
class Server extends EventEmitter {
  listening: boolean = false;
  
  constructor(connectionListener?: Function) {
    super();
    
    if (connectionListener) {
      this.on('connection', connectionListener);
    }
  }

  listen(port: number, hostname?: string, backlog?: number, listeningListener?: Function): this {
    this.listening = true;
    
    if (typeof listeningListener === 'function') {
      this.once('listening', listeningListener);
    }
    
    // Emit a listening event asynchronously
    setTimeout(() => {
      this.emit('listening');
    }, 0);
    
    return this;
  }

  close(callback?: Function): this {
    this.listening = false;
    
    if (callback) {
      callback();
    }
    
    return this;
  }

  address(): any {
    return { port: 0, family: 'IPv4', address: '0.0.0.0' };
  }
}

// Create a net polyfill object with Socket and Server
const netPolyfill = {
  Socket,
  Server,
  createServer: (options?: any, connectionListener?: Function): Server => {
    if (typeof options === 'function') {
      connectionListener = options;
      options = {};
    }
    
    return new Server(connectionListener);
  },
  createConnection: (options?: any, connectListener?: Function): Socket => {
    if (typeof options === 'function') {
      connectListener = options;
      options = {};
    }
    
    const socket = new Socket();
    return socket.connect(options, connectListener);
  },
  connect: (options?: any, connectListener?: Function): Socket => {
    return netPolyfill.createConnection(options, connectListener);
  },
  isIP: (input: string): number => {
    // Very basic IP check
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    
    if (ipv4Regex.test(input)) return 4;
    if (ipv6Regex.test(input)) return 6;
    return 0;
  },
  isIPv4: (input: string): boolean => netPolyfill.isIP(input) === 4,
  isIPv6: (input: string): boolean => netPolyfill.isIP(input) === 6
};

// Apply the polyfill
if (typeof global !== 'undefined') {
  console.log('Net polyfill setup complete');
}

// Export for ESM and TypeScript
export default netPolyfill; 