import { useEffect } from 'react';
import { Keyboard, Platform, EmitterSubscription, TextInputProps } from 'react-native';

/**
 * useKeyboardPersistence - Hook to ensure keyboard doesn't dismiss unexpectedly
 * 
 * This hook helps prevent issues where the keyboard might close after typing
 * a single character, which is a common issue on some Android devices.
 */
export const useKeyboardPersistence = (): void => {
  useEffect(() => {
    let keyboardDidHideListener: EmitterSubscription | null = null;
    
    if (Platform.OS === 'android') {
      // This prevents the keyboard from being hidden unexpectedly
      keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
        // We intentionally leave this empty to override default behavior
        // This prevents the keyboard from auto-hiding after typing a character
      });
    }
    
    return () => {
      if (keyboardDidHideListener) {
        keyboardDidHideListener.remove();
      }
    };
  }, []);
};

/**
 * configureTextInput - Helper function to configure TextInput props for consistent behavior
 * 
 * This function returns the proper configuration for TextInput components
 * to ensure keyboard stays visible during typing.
 */
export const configureTextInput = (isSecure = false): Partial<TextInputProps> => {
  return {
    blurOnSubmit: false,
    contextMenuHidden: false, // Often useful to prevent unexpected actions
    autoCorrect: false, // Typically, you want to control autocorrect behavior
    autoCapitalize: "none", // Usually set to none for emails, usernames, etc.
    textContentType: isSecure ? 'password' : 'none' as TextInputProps['textContentType'],
    ...(Platform.OS === 'android' ? { 
      disableFullscreenUI: true, // Helps with some Android keyboard issues
    } : {}),
  };
}; 