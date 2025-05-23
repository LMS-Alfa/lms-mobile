/**
 * This file provides a minimal TLS module polyfill
 * for packages that try to require('tls') in React Native
 */

// Import our net polyfill - tls is basically net with encryption
import netPolyfill from '../net-polyfill';

// Create a minimal TLS module with the same API as net
const tlsPolyfill = {
  ...netPolyfill,
  // TLS-specific methods will just throw errors when called
  connect: () => {
    throw new Error('TLS connections are not supported in React Native');
  },
  createServer: () => {
    throw new Error('TLS servers are not supported in React Native');
  }
};

// Export as a CommonJS module
module.exports = tlsPolyfill; 