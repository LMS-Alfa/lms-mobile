# React Native Environment Guidelines

This document explains how browser-specific properties have been handled in the React Native app to ensure compatibility while maintaining a native-focused environment.

## Core Principles

React Native runs in a JavaScript environment that is significantly different from web browsers. While React Native and React for web share many concepts, their runtime environments are different. This project has been configured to:

1. **Use minimal browser stubs**: Provide empty objects with only essential properties
2. **Use React Native APIs**: Prefer platform-specific APIs provided by React Native or Expo
3. **Avoid full polyfills**: Don't attempt to simulate complete browser behavior

## Minimal Browser Stubs

To prevent errors with libraries that expect browser globals, we provide minimal stubs at app initialization:

```js
// Minimal document stub
global.document = {
	createElement: () => ({ style: {} }),
	// Only essential properties
}

// Minimal window stub
global.window = {
	addEventListener: () => {},
	removeEventListener: () => {},
	// Only essential properties
}

// Minimal navigator stub
global.navigator = {
	userAgent: 'react-native',
	// Only essential properties
}
```

These stubs are initialized at the app entry point and provide just enough to prevent errors without attempting to simulate a full browser environment.

## Preferred React Native Alternatives

When writing code, prefer these React Native alternatives:

| Browser API                | React Native Alternative                                        |
| -------------------------- | --------------------------------------------------------------- |
| `window.innerWidth`        | `Dimensions.get('window').width`                                |
| `window.innerHeight`       | `Dimensions.get('window').height`                               |
| `document.createElement()` | Use React Native components (`View`, `Text`, etc.)              |
| `localStorage`             | `AsyncStorage` from '@react-native-async-storage/async-storage' |
| `navigator.userAgent`      | `Platform.OS`, `Platform.Version`, etc.                         |
| File downloads             | `FileSystem` from 'expo-file-system'                            |
| Device info                | `Device` from 'expo-device'                                     |

## Troubleshooting

If you encounter errors related to missing browser globals:

1. **Add only minimal stubs** to browser-stubs.ts for essential properties
2. Look for React Native specific solutions when possible
3. For styling, use React Native's StyleSheet or a React Native compatible styling library
4. If using a web-specific library, find a React Native alternative when possible

## Implementation Details

This project uses:

1. Minimal browser stubs in src/utils/browser-stubs.ts
2. Native adapters for platform-specific functionality in src/utils/native-adapters.ts
3. React Native best practices for UI and platform interaction

Remember: React Native is not a browser. Even with minimal stubs, prefer to use React Native's native APIs whenever possible.
