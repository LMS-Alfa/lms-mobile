import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  // Image, // Removed as profileImage logic is simplified
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useAuthStore, User } from '../../store/authStore'; // Import User type
// import { updateUserProfile, fetchUserProfile } from '../../services/userService'; // Assuming a userService exists
import { useAppTheme } from '../../contexts/ThemeContext';
// import * as ImagePicker from 'expo-image-picker'; // If you want image picking

// MOCK_USER_PROFILE removed

const EditProfileScreen = () => {
  const { user, updateUser, setPartialUser } = useAuthStore(); // Added updateUser from store
  const { theme } = useAppTheme();

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const email = user?.email || ''; // Email is not editable
  // phoneNumber and profileImage states removed for now
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // useEffect for loading profile (currently commented out)
  // ...

  const handleSaveProfile = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User not found. Unable to save profile.');
      return;
    }
    if (!firstName || !lastName) {
      Alert.alert('Validation Error', 'First name and last name are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updatedProfileData = {
        firstName,
        lastName,
      };

      // Call the updateUser action from the auth store
      const success = await updateUser(user.id, updatedProfileData);

      if (success) {
        // Optionally, update local state if updateUser doesn't auto-refresh or if needed immediately
        // setPartialUser(updatedProfileData); // updateUser should ideally refresh the user state via initialize()
        Alert.alert('Success', 'Profile updated successfully!');
      } else {
        // Error state should be set by updateUser within the store if it fails
        Alert.alert('Error', 'Failed to update profile. Please try again.');
        // The store's updateUserError can be observed if needed for more specific messages
      }

    } catch (err: any) { // Explicitly type err
      setError(err.message || 'An unexpected error occurred.');
      Alert.alert('Error', err.message || 'Failed to update profile. Please try again.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // pickImage function (currently commented out)
  // ...

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ color: theme.text, marginTop: 10 }}>Loading Profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.contentContainer}>
      <Text style={[styles.title, { color: theme.text }]}>Edit Profile</Text>
      
      {error && <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>}

      {/* Image picker commented out */}

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>First Name</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
          value={firstName}
          onChangeText={setFirstName}
          placeholder="Enter your first name"
          placeholderTextColor={theme.textSecondary}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>Last Name</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
          value={lastName}
          onChangeText={setLastName}
          placeholder="Enter your last name"
          placeholderTextColor={theme.textSecondary}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>Email Address</Text>
        <TextInput
          style={[styles.input, styles.readOnlyInput, { backgroundColor: theme.cardBackground, color: theme.textSecondary, borderColor: theme.border }]} // Changed to cardBackground
          value={email}
          editable={false}
          placeholderTextColor={theme.textSecondary}
        />
      </View>

      {/* Phone number input removed */}

      <TouchableOpacity 
        style={[styles.saveButton, { backgroundColor: theme.primary }]} 
        onPress={handleSaveProfile} 
        disabled={saving || !firstName || !lastName}
      >
        {saving ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.saveButtonText}>Save Changes</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  // imagePickerContainer, profileImage, profileImagePlaceholder, changeProfileText styles removed as feature is commented out
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    marginBottom: 5,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  readOnlyInput: {
    // Using theme.secondaryBackground directly in the style prop now
  },
  saveButton: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 15,
    fontSize: 14,
  },
});

export default EditProfileScreen; 