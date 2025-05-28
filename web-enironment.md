# IMPORTANT CONTEXT FOR THIS PROJECT

This is a **React Native (Expo) mobile app project**, NOT a web project.

**Please follow these strict rules when generating or completing code:**

1. **DO NOT use any browser or web environment globals or APIs:**

- Do NOT use `document`, `window`, `navigator`, `localStorage`, `fetch` (unless using React Native fetch polyfill or from React Native itself), or any DOM APIs.
- Do NOT use or import any polyfill packages that emulate browser or Node.js globals.
- Do NOT assume any DOM, HTML, or browser context exists.

2. Use **React Native APIs only**, e.g.:

- Use React Native components for UI (`View`, `Text`, `ScrollView`, etc.).
- Use React Native storage like `AsyncStorage` or Expo’s `SecureStore` instead of `localStorage`.
- Use React Native-specific event listeners or hooks for device info, keyboard, or network status.

3. If a global or API is needed, make sure it is available in React Native by default, or import from React Native or Expo libraries.

4. If you want to check environment, use **`Platform` API** from React Native, NOT `navigator.userAgent` or other browser checks.

5. **NO imports or code from polyfill packages that try to simulate browser or Node.js environment.**

6. **If you need to do platform-specific workarounds, use React Native’s built-in platform detection, not browser globals.**

---

**In short:** *Assume zero browser environment.*  
*Do NOT use or simulate `document`, `window`, or `navigator`. No polyfills allowed.*

---

**Example of a bad snippet you MUST NOT generate:**

```js
const div = document.createElement('div'); // WRONG!
if (navigator.userAgent.includes('Android')) { ... } // WRONG!
window.addEventListener('resize', ...); // WRONG!
```

```ts
import { View, Text, Platform } from 'react-native';

if (Platform.OS === 'android') {
  // platform-specific code
}
```

*Please generate all code and suggestions ONLY in this React Native environment context.*


---

### Why this helps

- It explicitly **forbids document, window, navigator** and any polyfills.
- It forces Cursor to think **"This is not a web project"**.
- It sets expectations about what APIs are allowed.
- It shows examples of what NOT to do, so it learns better from the prompt.

