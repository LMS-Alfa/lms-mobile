// Fallback polyfills in case react-native-polyfill-globals fails
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import base64 from 'base-64';

// Basic polyfills that don't rely on external packages
export function applyFallbackPolyfills() {
  console.log('Applying fallback polyfills');
  
  // Base64 polyfills
  global.btoa = global.btoa || base64.encode;
  global.atob = global.atob || base64.decode;
  
  // Process polyfill
  global.process = global.process || {};
  global.process.env = global.process.env || {};
  global.process.nextTick = global.process.nextTick || setImmediate;
  
  // Console polyfills
  if (!global.console) {
    global.console = {};
  }
  const noop = () => {};
  ['log', 'warn', 'error', 'debug', 'info'].forEach(method => {
    if (!global.console[method]) {
      global.console[method] = noop;
    }
  });
  
  // Timing functions
  global.setImmediate = global.setImmediate || ((fn, ...args) => setTimeout(() => fn(...args), 0));
  global.clearImmediate = global.clearImmediate || clearTimeout;
  
  // Buffer polyfill
  if (typeof global.Buffer === 'undefined') {
    global.Buffer = require('buffer/').Buffer;
  }
  
  // Crypto polyfill
  if (typeof global.crypto !== 'object') {
    global.crypto = {};
  }
  if (typeof global.crypto.getRandomValues !== 'function') {
    global.crypto.getRandomValues = function(array) {
      const getRandomValues = require('react-native-get-random-values').getRandomValues;
      return getRandomValues(array);
    };
  }
  
  // Improved TextEncoder fallback
  if (typeof global.TextEncoder === 'undefined') {
    global.TextEncoder = class TextEncoder {
      encoding = 'utf-8';
      
      encode(str) {
        if (str === undefined) return new Uint8Array();
        if (typeof str !== 'string') {
          str = String(str);
        }
        
        const buf = new Uint8Array(str.length * 4); // Allocate enough space for all possible encodings
        let bufIdx = 0;
        
        for (let i = 0; i < str.length; i++) {
          const codePoint = str.codePointAt(i);
          
          // Handle UTF-8 encoding
          if (codePoint < 0x80) {
            // 1-byte sequence
            buf[bufIdx++] = codePoint;
          } else if (codePoint < 0x800) {
            // 2-byte sequence
            buf[bufIdx++] = 0xc0 | (codePoint >> 6);
            buf[bufIdx++] = 0x80 | (codePoint & 0x3f);
          } else if (codePoint < 0x10000) {
            // 3-byte sequence
            buf[bufIdx++] = 0xe0 | (codePoint >> 12);
            buf[bufIdx++] = 0x80 | ((codePoint >> 6) & 0x3f);
            buf[bufIdx++] = 0x80 | (codePoint & 0x3f);
          } else {
            // 4-byte sequence
            buf[bufIdx++] = 0xf0 | (codePoint >> 18);
            buf[bufIdx++] = 0x80 | ((codePoint >> 12) & 0x3f);
            buf[bufIdx++] = 0x80 | ((codePoint >> 6) & 0x3f);
            buf[bufIdx++] = 0x80 | (codePoint & 0x3f);
            i++; // Skip the next code unit as it's part of this 4-byte sequence
          }
        }
        
        return buf.subarray(0, bufIdx);
      }
    };
  }
  
  // Improved TextDecoder fallback
  if (typeof global.TextDecoder === 'undefined') {
    global.TextDecoder = class TextDecoder {
      constructor(encoding = 'utf-8', options = {}) {
        this.encoding = encoding.toLowerCase();
        this.fatal = options.fatal || false;
        this.ignoreBOM = options.ignoreBOM || false;
      }
      
      decode(buffer, options = {}) {
        const bytes = new Uint8Array(buffer);
        let pos = 0;
        let result = '';
        
        while (pos < bytes.length) {
          let byte1 = bytes[pos++];
          
          // 1-byte sequence (0x00-0x7F)
          if (byte1 < 0x80) {
            result += String.fromCharCode(byte1);
            continue;
          }
          
          // 2-byte sequence (0xC2-0xDF)
          if (byte1 >= 0xC2 && byte1 < 0xE0) {
            if (pos >= bytes.length) break;
            const byte2 = bytes[pos++];
            result += String.fromCharCode(((byte1 & 0x1F) << 6) | (byte2 & 0x3F));
            continue;
          }
          
          // 3-byte sequence (0xE0-0xEF)
          if (byte1 >= 0xE0 && byte1 < 0xF0) {
            if (pos + 1 >= bytes.length) break;
            const byte2 = bytes[pos++];
            const byte3 = bytes[pos++];
            const codePoint = ((byte1 & 0x0F) << 12) | ((byte2 & 0x3F) << 6) | (byte3 & 0x3F);
            result += String.fromCodePoint(codePoint);
            continue;
          }
          
          // 4-byte sequence (0xF0-0xF4)
          if (byte1 >= 0xF0 && byte1 <= 0xF4) {
            if (pos + 2 >= bytes.length) break;
            const byte2 = bytes[pos++];
            const byte3 = bytes[pos++];
            const byte4 = bytes[pos++];
            const codePoint = ((byte1 & 0x07) << 18) | ((byte2 & 0x3F) << 12) |
                              ((byte3 & 0x3F) << 6) | (byte4 & 0x3F);
            result += String.fromCodePoint(codePoint);
          }
        }
        
        return result;
      }
    };
  }
} 