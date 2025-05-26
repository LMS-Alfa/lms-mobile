import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useAppTheme } from '../contexts/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

const LoadingScreen = () => {
  const { theme } = useAppTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top', 'left', 'right', 'bottom']}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.text, { color: theme.textSecondary }]}>
          Loading...
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    fontSize: 16,
    marginTop: 16,
  },
});

export default LoadingScreen; 