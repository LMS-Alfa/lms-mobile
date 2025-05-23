/**
 * Explicit polyfill for Fetch API
 * This file provides the necessary fetch implementation
 * that react-native-polyfill-globals expects
 */

try {
  // Try to require the fetch API polyfill
  const fetchPolyfill = require('react-native-fetch-api');
  
  // Apply the fetch polyfill if it's available
  if (typeof global !== 'undefined' && fetchPolyfill) {
    // Don't override the existing fetch implementation if it's already defined
    if (!global.fetch) {
      global.fetch = fetchPolyfill.fetch;
    }
    
    // Define Headers if not already defined
    if (!global.Headers) {
      global.Headers = fetchPolyfill.Headers;
    }
    
    // Define Request if not already defined
    if (!global.Request) {
      global.Request = fetchPolyfill.Request;
    }
    
    // Define Response if not already defined
    if (!global.Response) {
      global.Response = fetchPolyfill.Response;
    }
    
    console.log('Fetch API polyfill applied successfully');
  }
} catch (error) {
  console.warn('Could not apply Fetch API polyfill:', error);
  
  // If the package is missing, provide a warning but don't crash
  if (typeof global.fetch === 'undefined') {
    console.warn('fetch is not defined and polyfill failed to load');
    
    // Provide a minimal fetch implementation to prevent crashes
    global.fetch = () => {
      console.error('fetch polyfill is not properly installed. Please run "npm install --save react-native-fetch-api"');
      return Promise.reject(new Error('fetch is not implemented'));
    };
  }
} 