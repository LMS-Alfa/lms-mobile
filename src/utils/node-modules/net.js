/**
 * This file is used to provide the net module for
 * packages that try to require('net') in React Native
 */

// Import our net implementation
import netPolyfill from '../net-polyfill';

// Export as a CommonJS module
module.exports = netPolyfill; 