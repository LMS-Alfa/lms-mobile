import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useAuthStore } from '../../store/authStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

// Define a local stack param list that includes EditProfile
// This should ideally be part of a shared types file if used across multiple navigators
type SettingsStackParamList = {
  Settings: undefined; // Current screen
  EditProfile: undefined; // The screen we want to navigate to
  ChangePassword: undefined; // Existing navigation target
  // Add other routes accessible from Settings if any
};

const SettingsScreen = () => {
  const { user, logout } = useAuthStore();
  const { isDarkMode, toggleTheme, theme } = useAppTheme();
  const navigation = useNavigation<StackNavigationProp<SettingsStackParamList>>();
  
  // Handle logout
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
          }
        }
      ]
    );
  };

  const handleEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  // Navigate to change password screen
  const handleChangePassword = () => {
    navigation.navigate('ChangePassword' as never);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Profile Section */}
        <View style={[styles.profileSection, { backgroundColor: theme.cardBackground }]}>
          <View style={[styles.avatarContainer, { backgroundColor: theme.primary }]}>
            <Text style={styles.avatarText}>
              {user?.firstName?.charAt(0) || 'S'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.userName, { color: theme.text }]}>{user?.firstName} {user?.lastName || ''}</Text>
            <Text style={[styles.userEmail, { color: theme.textSecondary }]}>{user?.email || 'student@example.com'}</Text>
          </View>
          <TouchableOpacity 
            style={[styles.editButton, { backgroundColor: theme.primary }]} 
            onPress={handleEditProfile}
          >
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Settings Sections */}
        <View style={[styles.settingsSection, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Appearance</Text>
          
          <View style={[styles.settingItem, { borderBottomColor: theme.separator }]}>
            <View style={styles.settingLeft}>
              <Icon name={isDarkMode ? "moon" : "sun"} size={22} color={theme.text} style={styles.settingIcon} />
              <Text style={[styles.settingText, { color: theme.text }]}>Dark Mode</Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: theme.disabled, true: theme.primary }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={theme.disabled}
            />
          </View>
        </View>

        <View style={[styles.settingsSection, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Account</Text>
          
          <TouchableOpacity style={[styles.accountItem, { borderBottomColor: theme.separator }]} onPress={handleChangePassword}>
            <View style={styles.settingLeft}>
              <Icon name="lock" size={22} color={theme.text} style={styles.settingIcon} />
              <Text style={[styles.settingText, { color: theme.text }]}>Change Password</Text>
            </View>
            <Icon name="chevron-right" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.accountItem, { borderBottomColor: theme.separator }]} onPress={handleLogout}>
            <View style={styles.settingLeft}>
              <Icon name="log-out" size={22} color={theme.danger} style={styles.settingIcon} />
              <Text style={[styles.settingText, { color: theme.danger }]}>Logout</Text>
            </View>
            <Icon name="chevron-right" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.versionText, { color: theme.textSecondary }]}>Version 1.0.0</Text>
          <Text style={[styles.copyrightText, { color: theme.textSecondary }]}>© 2025 LMS Educational System</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  profileSection: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
  },
  editButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  settingsSection: {
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: 16,
  },
  settingText: {
    fontSize: 16,
  },
  accountItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 14,
    marginBottom: 4,
  },
  copyrightText: {
    fontSize: 12,
  },
});

export default SettingsScreen; 