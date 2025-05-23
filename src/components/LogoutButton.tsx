import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { useTheme, DefaultTheme } from 'styled-components/native';
import Icon from 'react-native-vector-icons/Feather';
import { useAuthStore } from '../store/authStore';
import { useNavigation } from '@react-navigation/native';

interface LogoutButtonProps {
  variant?: 'icon' | 'text' | 'full'; // Different display options
  color?: string; // Optional custom color
  size?: number; // Optional custom size
  onLogoutSuccess?: () => void; // Optional callback after logout
}

const LogoutButton: React.FC<LogoutButtonProps> = ({ 
  variant = 'icon', 
  color,
  size = 24,
  onLogoutSuccess
}) => {
  const theme = useTheme() as DefaultTheme & {
    primary?: string;
    danger?: string;
    text?: string;
  };
  
  const navigation = useNavigation();
  const logout = useAuthStore(state => state.logout);
  const loading = useAuthStore(state => state.loading);
  
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            await logout();
            if (onLogoutSuccess) {
              onLogoutSuccess();
            }
            // Navigate to login screen
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' as never }]
            });
          }
        }
      ]
    );
  };
  
  const buttonColor = color || theme.danger || '#F44336';
  
  if (variant === 'icon') {
    return (
      <TouchableOpacity 
        onPress={handleLogout}
        disabled={loading}
        style={styles.iconButton}
      >
        <Icon name="log-out" size={size} color={buttonColor} />
      </TouchableOpacity>
    );
  } else if (variant === 'text') {
    return (
      <TouchableOpacity 
        onPress={handleLogout}
        disabled={loading}
        style={styles.textButton}
      >
        <Text style={[styles.textButtonLabel, { color: buttonColor }]}>
          Logout
        </Text>
      </TouchableOpacity>
    );
  } else {
    // Full button with icon and text
    return (
      <TouchableOpacity 
        onPress={handleLogout}
        disabled={loading}
        style={[styles.fullButton, { backgroundColor: buttonColor }]}
      >
        <Icon name="log-out" size={size - 4} color="#fff" style={styles.fullButtonIcon} />
        <Text style={styles.fullButtonLabel}>
          Logout
        </Text>
      </TouchableOpacity>
    );
  }
};

const styles = StyleSheet.create({
  iconButton: {
    padding: 8,
  },
  textButton: {
    padding: 8,
  },
  textButtonLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  fullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 8,
  },
  fullButtonIcon: {
    marginRight: 8,
  },
  fullButtonLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  }
});

export default LogoutButton; 