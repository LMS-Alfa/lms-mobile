/**
 * This file provides a minimal dgram module polyfill
 * for packages that try to require('dgram') in React Native
 */

import { EventEmitter } from '../events-polyfill';

// Create a minimal Socket class that mimics node's dgram.Socket
class Socket extends EventEmitter {
  constructor() {
    super();
    this.isClosed = false;
  }

  // All methods are noop implementations that just return this
  // to allow for method chaining
  bind(port, address, callback) {
    if (typeof callback === 'function') {
      setTimeout(() => {
        callback();
        this.emit('listening');
      }, 0);
    } else {
      setTimeout(() => {
        this.emit('listening');
      }, 0);
    }
    return this;
  }

  close(callback) {
    this.isClosed = true;
    if (typeof callback === 'function') {
      setTimeout(() => {
        callback();
        this.emit('close');
      }, 0);
    } else {
      setTimeout(() => {
        this.emit('close');
      }, 0);
    }
    return this;
  }

  setBroadcast() {
    return this;
  }

  setMulticastTTL() {
    return this;
  }

  setMulticastLoopback() {
    return this;
  }

  setTTL() {
    return this;
  }

  address() {
    return { address: '0.0.0.0', port: 0, family: 'IPv4' };
  }

  send(msg, offset, length, port, address, callback) {
    if (this.isClosed) {
      const error = new Error('Socket is closed');
      if (typeof callback === 'function') {
        callback(error);
      }
      return;
    }
    
    // In React Native, we can't actually send UDP packets
    if (typeof callback === 'function') {
      setTimeout(() => {
        callback(null);
      }, 0);
    }
  }
}

// Create a minimal dgram module
const dgramPolyfill = {
  createSocket: function(type) {
    return new Socket();
  }
};

// Export as a CommonJS module
module.exports = dgramPolyfill; 