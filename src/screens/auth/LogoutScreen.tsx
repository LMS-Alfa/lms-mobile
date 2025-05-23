import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../../store/authStore';
// CommonActions and NavigationProp are no longer strictly needed if we remove dispatch
// import { CommonActions, NavigationProp } from '@react-navigation/native'; 
import { useTheme, DefaultTheme } from 'styled-components/native';

// Define a basic ParamList for a generic navigator if needed, or use a more specific one
// For LogoutScreen, it typically doesn't rely on specific params for itself.
interface LogoutScreenProps {
  // navigation prop is no longer used directly for dispatch
  // navigation: NavigationProp<any>; 
}

const LogoutScreen: React.FC<LogoutScreenProps> = (/*{ navigation }*/) => {
  const logout = useAuthStore((state) => state.logout);
  const theme = useTheme() as DefaultTheme & { text?: string, background?: string, primary?: string };

  React.useEffect(() => {
    const performLogout = async () => {
      await logout();
      // After logout, RootNavigator will automatically navigate to Auth stack due to user state change.
      // The explicit navigation dispatch is removed.
    };
    performLogout();
  }, [logout]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background || '#f0f0f0' }]}>
      <ActivityIndicator size="large" color={theme.primary || '#007bff'} />
      <Text style={[styles.text, { color: theme.text || '#333' }]}>Logging out...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 18,
    marginTop: 10,
  },
});

export default LogoutScreen; 