/**
 * This file is used to provide the events module for
 * packages that try to require('events') in React Native
 */

// Import our EventEmitter implementation
import eventsPolyfill from '../events-polyfill';

// Export as a CommonJS module
module.exports = eventsPolyfill; 