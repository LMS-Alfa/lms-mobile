/**
 * Explicit polyfill for web streams API
 * This file provides the necessary ES6 streams implementation
 * that react-native-polyfill-globals expects
 */

// Direct import of the ES6 implementation
import * as webStreamsPolyfill from 'web-streams-polyfill/ponyfill';

// Make the streams implementation available globally
if (typeof global !== 'undefined') {
  // Add ReadableStream to global
  if (!global.ReadableStream) {
    global.ReadableStream = webStreamsPolyfill.ReadableStream;
  }
  
  // Add WritableStream to global
  if (!global.WritableStream) {
    global.WritableStream = webStreamsPolyfill.WritableStream;
  }
  
  // Add TransformStream to global
  if (!global.TransformStream) {
    global.TransformStream = webStreamsPolyfill.TransformStream;
  }
  
  // Add ByteLengthQueuingStrategy to global
  if (!global.ByteLengthQueuingStrategy) {
    global.ByteLengthQueuingStrategy = webStreamsPolyfill.ByteLengthQueuingStrategy;
  }
  
  // Add CountQueuingStrategy to global
  if (!global.CountQueuingStrategy) {
    global.CountQueuingStrategy = webStreamsPolyfill.CountQueuingStrategy;
  }

  console.log('Web Streams polyfill applied successfully');
}

// Export the components directly for use in other modules
export default webStreamsPolyfill; 