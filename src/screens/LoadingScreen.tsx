import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme, DefaultTheme } from 'styled-components/native';

const LoadingScreen = () => {
  const theme = useTheme() as DefaultTheme & {
    primary?: string;
    text?: string;
    textSecondary?: string;
    background?: string;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ActivityIndicator size="large" color={theme.primary || '#1890FF'} />
      <Text style={[styles.text, { color: theme.textSecondary }]}>
        Loading...
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
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