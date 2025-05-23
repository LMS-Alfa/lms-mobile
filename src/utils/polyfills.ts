// Initialize required polyfills for React Native
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

// Import our custom streams polyfill (must happen before polyfill-globals)
import './streams-polyfill';

// Import our custom fetch polyfill (must happen before polyfill-globals)
import './fetch-polyfill';

// Import our custom events polyfill (must happen before polyfill-globals)
import './events-polyfill';

// Import our custom net polyfill (must happen before polyfill-globals)
import './net-polyfill';

// Import our WebSocket compatibility layer
import './ws-polyfill';

// Import our document (browser DOM) polyfill
import './document-polyfill';

// Import our window (browser global) polyfill
import './window-polyfill';

// Import web-streams-polyfill explicitly
import 'web-streams-polyfill';

// Import base-64 explicitly
import base64 from 'base-64';

// Import text-encoding polyfill
import 'text-encoding';

// Import fallback polyfills
import { applyFallbackPolyfills } from './fallback-polyfills';

// Apply fallback polyfills first so we have at least basic functionality
applyFallbackPolyfills();

// Try to apply the main polyfills for better compatibility
try {
  // This needs to be imported directly rather than with require
  const polyfillGlobalsModule = require('react-native-polyfill-globals');
  
  // Check if the module exports polyfillGlobals
  if (polyfillGlobalsModule && typeof polyfillGlobalsModule.polyfillGlobals === 'function') {
    polyfillGlobalsModule.polyfillGlobals();
    console.log('Main polyfills applied successfully');
  } else {
    console.warn('polyfillGlobals function not found, using fallbacks only');
  }
} catch (error) {
  console.warn('Failed to apply main polyfills:', error);
}

// Ensure base64 is available globally
global.btoa = base64.encode;
global.atob = base64.decode;

// Additional setup for specific modules if needed
global.process = global.process || {};
global.process.env = global.process.env || {};

// Ensure Buffer is defined
if (typeof global.Buffer === 'undefined') {
  global.Buffer = require('buffer/').Buffer;
}

// Fix for "crypto.getRandomValues is not a function" error
if (typeof global.crypto !== 'object') {
  global.crypto = {};
}
if (typeof global.crypto.getRandomValues !== 'function') {
  global.crypto.getRandomValues = require('react-native-get-random-values').getRandomValues;
} 