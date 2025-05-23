/**
 * WebSocket polyfill for React Native
 * This file helps patch the 'ws' package to work in React Native
 */

// Force ws to use the native WebSocket implementation instead of Node.js net/http
if (typeof global !== 'undefined') {
  // Store the original WebSocket implementation
  const NativeWebSocket = global.WebSocket;
  
  // Ensure isomorphic-ws and similar libraries use the native WebSocket
  // Add custom properties that isomorphic-ws might check
  if (NativeWebSocket) {
    console.log('Adding custom WebSocket properties for compatibility');
    
    // Assuming React Native WebSocket might not have some of these properties
    // that Node.js ws library checks for
    global.WebSocket = NativeWebSocket;
    
    // Patch WebSocket objects to work with ws/isomorphic-ws
    if (!global.WebSocket.prototype.addEventListener) {
      global.WebSocket.prototype.addEventListener = function(type: string, listener: Function) {
        if (type === 'open') {
          this.onopen = listener;
        } else if (type === 'close') {
          this.onclose = listener;
        } else if (type === 'message') {
          this.onmessage = listener;
        } else if (type === 'error') {
          this.onerror = listener;
        }
      };
    }
    
    if (!global.WebSocket.prototype.removeEventListener) {
      global.WebSocket.prototype.removeEventListener = function(type: string, listener: Function) {
        if (type === 'open' && this.onopen === listener) {
          this.onopen = null;
        } else if (type === 'close' && this.onclose === listener) {
          this.onclose = null;
        } else if (type === 'message' && this.onmessage === listener) {
          this.onmessage = null;
        } else if (type === 'error' && this.onerror === listener) {
          this.onerror = null;
        }
      };
    }
    
    // Force connecting property to avoid ws checks for net.Socket
    Object.defineProperty(global.WebSocket.prototype, 'connecting', {
      get() {
        return this.readyState === 0; // WebSocket.CONNECTING
      }
    });
    
    // Patch the WebSocketServer to use mock functionality
    // (this won't actually work - it just prevents crashes when code tries to use it)
    global.WebSocketServer = function() {
      return { 
        on: () => {}, 
        close: () => {},
        clients: []
      };
    };
  }
  
  console.log('WebSocket polyfill applied successfully');
} 