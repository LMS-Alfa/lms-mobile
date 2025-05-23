# Mobile Keyboard Fix

## Issue
On some mobile devices (particularly Android), the keyboard would automatically close after typing a single character in input fields. This issue was affecting user experience by interrupting the input flow and requiring users to repeatedly tap on input fields.

## Solution
We implemented a two-part solution:

1. **Keyboard Persistence Hook (`useKeyboardPersistence`):** 
   - Located in `lms-mobile/src/utils/keyboard-utils.ts`.
   - This custom React hook is designed specifically for Android to prevent the keyboard from dismissing unexpectedly. It works by adding an event listener to `keyboardDidHide` and effectively overriding the default behavior that causes the keyboard to close prematurely.

2. **TextInput Configuration Helper (`configureTextInput`):**
   - Also in `lms-mobile/src/utils/keyboard-utils.ts`.
   - This utility function returns a set of common `TextInput` props that help ensure consistent and stable keyboard behavior. These props include:
     - `blurOnSubmit: false` (prevents keyboard dismissal when the return key is pressed).
     - `contextMenuHidden: false`
     - `autoCorrect: false`
     - `autoCapitalize: "none"`
     - `textContentType` (appropriately set for secure or non-secure inputs).
     - `disableFullscreenUI: true` (for Android, can help with some focus issues).

## How to Use
In any screen or component that uses `TextInput` and experiences keyboard issues:

```tsx
// 1. Import the utilities from the new file
import { useKeyboardPersistence, configureTextInput } from '../../utils/keyboard-utils'; // Adjust path as needed

const YourFormComponent = () => {
  // 2. Call the hook at the top level of your functional component
  useKeyboardPersistence();
  
  const [inputValue, setInputValue] = useState('');
  const isSecureField = true; // Example for a password field

  return (
    <View>
      <TextInput
        value={inputValue}
        onChangeText={setInputValue}
        placeholder="Enter text..."
        // 3. Spread the configuration props onto your TextInput.
        //    Pass `true` to `configureTextInput` if it's a secure field (e.g., password).
        {...configureTextInput(isSecureField)}
      />
      {/* You might also want to ensure your ScrollView (if any) has keyboardShouldPersistTaps="always" */}
    </View>
  );
};
```

## Important Considerations for `ScrollView`
If your `TextInput` components are inside a `ScrollView` (or `FlatList`, `SectionList`), ensure that the `ScrollView` has the prop `keyboardShouldPersistTaps="always"`. This tells the `ScrollView` to not dismiss the keyboard when a tap occurs outside the `TextInput` but still within the `ScrollView`'s bounds, which is often the desired behavior for forms.

Example:
```tsx
<ScrollView keyboardShouldPersistTaps="always">
  {/* Your TextInput components here */}
</ScrollView>
```

## Files Modified
- `lms-mobile/src/utils/keyboard-utils.ts` (created)
- `lms-mobile/src/screens/auth/LoginScreen.tsx` (updated to use the utils)
- `lms-mobile/src/screens/admin/AddUserScreen.tsx` (updated to use the utils)

## Testing
This solution should be tested on various Android and iOS devices to confirm that the keyboard remains visible during text input and behaves as expected across different form elements. 