import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore, User } from '../../store/authStore';
import { useAppTheme } from '../../contexts/ThemeContext';
import { StackNavigationProp } from '@react-navigation/stack';
import { ParentTabParamList } from '../../navigators/ParentTabNavigator'; // Assuming it might be navigated from a tab
import { useNavigation } from '@react-navigation/native';

// Define navigation prop type if needed for back navigation or other actions
type EditProfileNavigationProp = StackNavigationProp<ParentTabParamList, 'Settings'>; // Or a dedicated ProfileStack

const EditProfileScreen: React.FC = () => {
  const { theme } = useAppTheme();
  const styles = makeStyles(theme);
  const navigation = useNavigation<EditProfileNavigationProp>();

  const currentUser = useAuthStore(state => state.user);
  const updateUser = useAuthStore(state => state.updateUser);
  const updatingUser = useAuthStore(state => state.updatingUser);
  const updateUserError = useAuthStore(state => state.updateUserError);
  const clearUpdateUserError = useAuthStore(state => state.clearUpdateUserError);

  const [firstName, setFirstName] = useState(currentUser?.firstName || '');
  const [lastName, setLastName] = useState(currentUser?.lastName || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  // Email is often tied to auth and harder to change. For now, let's make it visible but not editable.

  useEffect(() => {
    // If there was an update error, clear it when the component unmounts or user changes
    return () => {
      if (updateUserError) {
        clearUpdateUserError();
      }
    };
  }, [updateUserError, clearUpdateUserError]);

  const handleSaveChanges = async () => {
    if (!currentUser) {
      Alert.alert('Error', 'No user data found.');
      return;
    }

    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Validation Error', 'First name and last name cannot be empty.');
      return;
    }

    const updatedData: Partial<Omit<User, 'id'>> = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      // email: email.trim(), // Handle email update separately if allowed/needed due to auth implications
    };

    const success = await updateUser(currentUser.id, updatedData);
    if (success) {
      Alert.alert('Success', 'Profile updated successfully.');
      // Optionally navigate back or refresh data
      // navigation.goBack(); 
    } else {
      // Error is handled by the store and updateUserError will be set
      Alert.alert('Update Failed', updateUserError || 'Could not update profile. Please try again.');
    }
  };

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.centeredMessageContainer}>
          <Text style={styles.messageText}>Loading user data...</Text>
          <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 20 }}/>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContentContainer}>
        <Text style={styles.headerTitle}>Edit Profile</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>First Name</Text>
          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Enter first name"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Last Name</Text>
          <TextInput
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
            placeholder="Enter last name"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={[styles.input, styles.readOnlyInput]} // Make email read-only for now
            value={email}
            editable={false} // Supabase email changes require verification
            placeholderTextColor={theme.textSecondary}
          />
           <Text style={styles.infoText}>Email address cannot be changed here. Contact support for assistance.</Text>
        </View>
        
        {updateUserError && (
          <Text style={styles.errorText}>{updateUserError}</Text>
        )}

        <TouchableOpacity 
          style={[styles.button, updatingUser && styles.buttonDisabled]}
          onPress={handleSaveChanges} 
          disabled={updatingUser}
        >
          {updatingUser ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Save Changes</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

const makeStyles = (theme: ReturnType<typeof useAppTheme>['theme']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scrollContentContainer: {
    padding: 20,
  },
  centeredMessageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  messageText: {
    fontSize: 18,
    color: theme.text,
    textAlign: 'center',
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
  readOnlyInput: {
    backgroundColor: theme.disabled, // A slightly different background for read-only
  },
  infoText: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 5,
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

export default EditProfileScreen; 