/**
 * WebSocket wrapper for React Native
 * This provides a consistent WebSocket API that works in React Native
 * instead of relying on the ws package which requires Node.js modules
 */

// Use the built-in WebSocket from React Native
class WebSocketWrapper {
  private ws: WebSocket;
  readyState: number = 0;
  protocol: string = '';
  url: string = '';
  
  constructor(url: string, protocols?: string | string[], options?: any) {
    this.url = url;
    
    if (typeof protocols === 'string') {
      this.protocol = protocols;
    } else if (Array.isArray(protocols) && protocols.length > 0) {
      this.protocol = protocols[0];
    }
    
    this.ws = new WebSocket(url, protocols);
    
    this.ws.onopen = (event) => {
      this.readyState = this.ws.readyState;
      if (this.onopen) this.onopen(event);
    };
    
    this.ws.onclose = (event) => {
      this.readyState = this.ws.readyState;
      if (this.onclose) this.onclose(event);
    };
    
    this.ws.onmessage = (event) => {
      if (this.onmessage) this.onmessage(event);
    };
    
    this.ws.onerror = (event) => {
      if (this.onerror) this.onerror(event);
    };
  }
  
  // Event handlers
  onopen: ((event: any) => void) | null = null;
  onclose: ((event: any) => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  
  // Methods
  close(code?: number, reason?: string): void {
    this.ws.close(code, reason);
  }
  
  send(data: string | ArrayBuffer | ArrayBufferView): void {
    this.ws.send(data);
  }
  
  // Additional methods and properties that ws may expect
  ping(): void {
    // Native WebSocket doesn't support ping, so this is a no-op
    console.log('WebSocket ping not supported in React Native');
  }
  
  terminate(): void {
    this.ws.close();
  }
  
  // Add addEventListener and removeEventListener for compatibility
  addEventListener(type: string, listener: (event: any) => void): void {
    if (type === 'open') {
      this.onopen = listener;
    } else if (type === 'close') {
      this.onclose = listener;
    } else if (type === 'message') {
      this.onmessage = listener;
    } else if (type === 'error') {
      this.onerror = listener;
    }
  }
  
  removeEventListener(type: string, listener: (event: any) => void): void {
    if (
      (type === 'open' && this.onopen === listener) ||
      (type === 'close' && this.onclose === listener) ||
      (type === 'message' && this.onmessage === listener) ||
      (type === 'error' && this.onerror === listener)
    ) {
      if (type === 'open') this.onopen = null;
      if (type === 'close') this.onclose = null;
      if (type === 'message') this.onmessage = null;
      if (type === 'error') this.onerror = null;
    }
  }
}

// Create a class that mimics the WebSocket.Server API
// This won't actually work, but it will prevent crashes
class WebSocketServer {
  constructor(options: any) {
    console.warn('WebSocketServer is not supported in React Native');
  }
  
  on(event: string, listener: (socket: any) => void): void {
    // No-op
  }
  
  close(callback?: () => void): void {
    if (callback) callback();
  }
  
  clients: any[] = [];
}

// Export the WebSocket wrapper
export default {
  WebSocket: WebSocketWrapper,
  WebSocketServer
}; 