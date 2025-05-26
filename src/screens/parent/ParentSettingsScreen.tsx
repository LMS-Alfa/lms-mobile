import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuthStore } from '../../store/authStore'; // For logout
import { StackNavigationProp } from '@react-navigation/stack'; // For navigation type
import { ParentTabParamList } from '../../navigators/ParentTabNavigator'; // For navigation type
import { useNavigation } from '@react-navigation/native';

// Mock theme (align with other new screens)
const mockTheme = {
  colors: {
    background: '#F0F4F8',
    text: '#333333',
    textSecondary: '#555555',
    primary: '#007AFF',
    cardBackground: '#FFFFFF',
    borderColor: '#E0E0E0',
    iconColor: '#007AFF',
    logoutButton: '#D32F2F',
    logoutText: '#FFFFFF',
  },
  spacing: { small: 8, medium: 16, large: 24, section: 32 },
  fontSize: { screenTitle: 22, sectionTitle: 18, itemText: 16, itemDescription: 12 }
};

// Define navigation prop type for this screen if it needs to navigate
// (e.g., to a "Change Password" screen not yet created)
// For now, we are using ParentTabParamList for logout related navigation
type ParentSettingsNavigationProp = StackNavigationProp<ParentTabParamList, 'Settings'>;

interface SettingsItemProps {
  icon: string;
  title: string;
  description?: string;
  onPress: () => void;
  isDestructive?: boolean;
}

const SettingsItem: React.FC<SettingsItemProps> = ({ icon, title, description, onPress, isDestructive }) => {
  const theme = mockTheme;
  const styles = makeStyles(theme);
  return (
    <TouchableOpacity style={styles.settingsItem} onPress={onPress}>
      <MaterialCommunityIcons 
        name={icon} 
        size={24} 
        color={isDestructive ? theme.colors.logoutButton : theme.colors.iconColor} 
        style={styles.itemIcon}
      />
      <View style={styles.itemTextContainer}>
        <Text style={[styles.itemTitle, isDestructive && styles.destructiveText]}>{title}</Text>
        {description && <Text style={styles.itemDescription}>{description}</Text>}
      </View>
      {!isDestructive && (
        <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.textSecondary} />
      )}
    </TouchableOpacity>
  );
};

const ParentSettingsScreen: React.FC = () => {
  const theme = mockTheme;
  const styles = makeStyles(theme);
  const { logout, user } = useAuthStore();
  const navigation = useNavigation<ParentSettingsNavigationProp>();

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: () => logout() } // authStore.logout will handle navigation
      ]
    );
  };

  const accountItems = [
    { icon: 'account-edit-outline', title: 'Edit Profile', description: 'Update your name, contact info', onPress: () => Alert.alert("Navigate", "To Edit Profile Screen") },
    { icon: 'lock-reset', title: 'Change Password', onPress: () => Alert.alert("Navigate", "To Change Password Screen") },
    { icon: 'bell-ring-outline', title: 'Notification Preferences', description: 'Manage how you receive alerts', onPress: () => Alert.alert("Navigate", "To Notification Preferences") },
  ];

  const appItems = [
    { icon: 'information-outline', title: 'About Us', onPress: () => Alert.alert("Info", "LMS App v1.0") },
    { icon: 'help-circle-outline', title: 'Help & Support', onPress: () => Alert.alert("Navigate", "To Help/Support Screen") },
    { icon: 'file-document-outline', title: 'Terms of Service', onPress: () => Alert.alert("Navigate", "To Terms Screen") },
    { icon: 'shield-lock-outline', title: 'Privacy Policy', onPress: () => Alert.alert("Navigate", "To Privacy Policy Screen") },
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.screenTitle}>Settings</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        {accountItems.map((item, index) => <SettingsItem key={`acc-${index}`} {...item} />)}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App & Legal</Text>
        {appItems.map((item, index) => <SettingsItem key={`app-${index}`} {...item} />)}
      </View>
      
      <View style={styles.section}>
        <SettingsItem 
          icon="logout" 
          title="Logout" 
          onPress={handleLogout} 
          isDestructive
        />
      </View>
      <View style={{ height: theme.spacing.large }} />{/* Bottom padding */}
    </ScrollView>
  );
};

const makeStyles = (theme: typeof mockTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  screenTitle: {
    fontSize: theme.fontSize.screenTitle,
    fontWeight: 'bold',
    color: theme.colors.text,
    paddingHorizontal: theme.spacing.medium,
    paddingTop: theme.spacing.large,
    paddingBottom: theme.spacing.medium,
  },
  section: {
    marginTop: theme.spacing.medium,
    marginBottom: theme.spacing.small,
  },
  sectionTitle: {
    fontSize: theme.fontSize.sectionTitle,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    paddingHorizontal: theme.spacing.medium,
    marginBottom: theme.spacing.small,
    textTransform: 'uppercase',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    paddingHorizontal: theme.spacing.medium,
    paddingVertical: theme.spacing.medium,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
  },
  itemIcon: {
    marginRight: theme.spacing.medium,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: theme.fontSize.itemText,
    color: theme.colors.text,
  },
  itemDescription: {
    fontSize: theme.fontSize.itemDescription,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  destructiveText: {
    color: theme.colors.logoutButton,
  }
});

export default ParentSettingsScreen; 