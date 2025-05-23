import 'react-native-gesture-handler'; // Must be at the top
// Import polyfills first
import './src/utils/polyfills';

import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from 'styled-components/native';
import { StatusBar } from 'expo-status-bar';
import { lightTheme } from './src/styles/theme';
import RootNavigator from './src/navigators/RootNavigator';
import { LogBox, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { initializeRoles } from './src/utils/supabase';

// Ignore specific warnings that might occur with libraries
LogBox.ignoreLogs([
  'ReactNativeFiberHostComponent: Calling getNode() on the ref of an Animated component',
  'The action \'NAVIGATE\' with payload',
  // Add more warnings to ignore for polyfills
  'Possible Unhandled Promise Rejection',
  'Setting a timer for a long period of time',
  'Remote debugger is in a background tab',
  'The native module for \'Crypto\' could not be found',
  'Unable to resolve "base-64"',
  'Unable to resolve module',
  'Metro has encountered an error',
  'Task orphaned for request',
  'Could not find node modules folder',
  'Failed to apply main polyfills',
  'polyfillGlobals function not found',
]);

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [initMessage, setInitMessage] = useState('Loading...');

  useEffect(() => {
    // Initialize the app
    const initializeApp = async () => {
      try {
        // Initialize roles in the database
        setInitMessage('Setting up required database structures...');
        const rolesInitialized = await initializeRoles();
        
        if (!rolesInitialized) {
          console.warn('Roles initialization failed, but continuing app startup');
        }
        
        // Add any other initialization tasks here
        
        // All initialization complete
      setIsReady(true);
      } catch (error) {
        console.error('Error during app initialization:', error);
        setHasError(true);
      }
    };
    
    initializeApp();
  }, []);

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1890FF" />
        <Text style={styles.loadingText}>{initMessage}</Text>
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorText}>Please restart the application</Text>
      </View>
    );
  }

  try {
    return (
      <SafeAreaProvider>
        <ThemeProvider theme={lightTheme}>
          <StatusBar style="auto" />
          <RootNavigator />
        </ThemeProvider>
      </SafeAreaProvider>
    );
  } catch (error) {
    console.error('Error rendering app:', error);
    setHasError(true);
    return null;
  }
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#595959',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ff4d4f',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#595959',
    textAlign: 'center',
  },
});
