import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { useAppTheme } from '../../contexts/ThemeContext';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';

const ChangePasswordScreen: React.FC = () => {
  const { theme } = useAppTheme();
  const styles = makeStyles(theme);
  const navigation = useNavigation();

  const updateUser = useAuthStore(state => state.updateUser);
  const updatingUser = useAuthStore(state => state.updatingUser);
  const updateUserError = useAuthStore(state => state.updateUserError);
  const clearUpdateUserError = useAuthStore(state => state.clearUpdateUserError);
  const currentUser = useAuthStore(state => state.user);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  useEffect(() => {
    return () => {
      if (updateUserError) {
        clearUpdateUserError();
      }
    };
  }, [updateUserError, clearUpdateUserError]);

  const handleChangePassword = async () => {
    if (!currentUser) {
      Alert.alert('Error', 'User not found. Please re-login.');
      return;
    }
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      Alert.alert('Validation Error', 'All password fields are required.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert('Validation Error', 'New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Validation Error', 'New password must be at least 6 characters long.');
      return;
    }

    const success = await updateUser(currentUser.id, { password: newPassword });

    if (success) {
      Alert.alert('Success', 'Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      navigation.goBack();
    } else {
      Alert.alert('Change Password Failed', updateUserError || 'Could not change password. Please try again.');
    }
  };
  
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContentContainer}>
        <Text style={styles.headerTitle}>Change Password</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Current Password</Text>
          <TextInput
            style={styles.input}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Enter current password"
            placeholderTextColor={theme.placeholder}
            secureTextEntry
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>New Password</Text>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Enter new password (min. 6 characters)"
            placeholderTextColor={theme.placeholder}
            secureTextEntry
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Confirm New Password</Text>
          <TextInput
            style={styles.input}
            value={confirmNewPassword}
            onChangeText={setConfirmNewPassword}
            placeholder="Confirm new password"
            placeholderTextColor={theme.placeholder}
            secureTextEntry
          />
        </View>
        
        {updateUserError && (
          <Text style={styles.errorText}>{updateUserError}</Text>
        )}

        <TouchableOpacity 
          style={[styles.button, updatingUser && styles.buttonDisabled]}
          onPress={handleChangePassword} 
          disabled={updatingUser}
        >
          {updatingUser ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Change Password</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

const makeStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scrollContentContainer: {
    padding: 20,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 24,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: theme.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.inputBackground,
    color: theme.text,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    fontSize: 16,
  },
  button: {
    backgroundColor: theme.primary,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: theme.disabled,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  errorText: {
    color: theme.danger,
    textAlign: 'center',
    marginBottom: 10,
  },
});

export default ChangePasswordScreen; 