/**
 * This file is used to provide the ws module for
 * packages that try to require('ws') in React Native
 */

// Import our WebSocket wrapper
import WebSocketWrapper from '../websocket-wrapper';

// Export as a CommonJS module
module.exports = WebSocketWrapper; 