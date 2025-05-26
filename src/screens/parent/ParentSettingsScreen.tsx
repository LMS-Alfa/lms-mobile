import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuthStore } from '../../store/authStore'; // For logout
import { StackNavigationProp } from '@react-navigation/stack'; // For navigation type
import { SettingsStackParamList } from '../../navigators/ParentTabNavigator'; // Import SettingsStackParamList
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context'; // Added SafeAreaView
import { useTheme, DefaultTheme } from 'styled-components/native'; // Added useTheme, DefaultTheme
import { useAppTheme } from '../../contexts/ThemeContext'; // Import the actual hook

// AppTheme interface to match the one in ThemeContext.tsx
interface AppTheme extends DefaultTheme {
  primary: string;
  text: string;
  textSecondary: string;
  background: string;
  cardBackground: string;
  inputBackground: string;
  border: string;
  lightBorder: string;
  danger: string;
  success: string;
  warning: string;
  disabled: string;
  highlight: string;
  separator: string;
  placeholder: string;
  subtleText: string;
  mediumText: string;
  errorText: string;
  fontSize?: { 
    screenTitle?: number;
    sectionTitle?: number;
    itemText?: number;
    itemDescription?: number;
  };
}

// Placeholder for ThemeContext - replace with actual import from app's context
interface AppThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

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

// Update navigation prop type to use SettingsStackParamList
type ParentSettingsNavigationProp = StackNavigationProp<SettingsStackParamList, 'ParentSettings'>;

interface SettingsItemProps {
  icon: string;
  title: string;
  description?: string;
  onPress?: () => void; // Make onPress optional for items with a switch
  isDestructive?: boolean;
  hasSwitch?: boolean; // To indicate if the item should render a Switch
  switchValue?: boolean; // Current value for the switch
  onSwitchChange?: (value: boolean) => void; // Handler for switch value change
}

const SettingsItem: React.FC<SettingsItemProps> = ({ 
  icon, 
  title, 
  description, 
  onPress, 
  isDestructive,
  hasSwitch,
  switchValue,
  onSwitchChange
}) => {
  const { theme: contextTheme } = useAppTheme(); 
  const styles = makeStyles(contextTheme); 

  const content = (
    <>
      <MaterialCommunityIcons 
        name={icon} 
        size={24} 
        color={isDestructive ? contextTheme.danger : contextTheme.primary} 
        style={styles.itemIcon}
      />
      <View style={styles.itemTextContainer}>
        <Text style={[styles.itemTitle, isDestructive && { color: contextTheme.danger }]}>{title}</Text>
        {description && <Text style={styles.itemDescription}>{description}</Text>}
      </View>
      {hasSwitch && onSwitchChange ? (
        <Switch
          trackColor={{ false: contextTheme.disabled, true: contextTheme.primary }}
          thumbColor="#FFFFFF"
          ios_backgroundColor={contextTheme.disabled}
          onValueChange={onSwitchChange}
          value={switchValue}
        />
      ) : (
        !isDestructive && <MaterialCommunityIcons name="chevron-right" size={24} color={contextTheme.textSecondary} />
      )}
    </>
  );

  if (hasSwitch) {
    return <View style={styles.settingsItem}>{content}</View>;
  }

  return (
    <TouchableOpacity style={styles.settingsItem} onPress={onPress} activeOpacity={0.7}>
      {content}
    </TouchableOpacity>
  );
};

const ParentSettingsScreen: React.FC = () => {
  const { isDarkMode, toggleTheme, theme: currentTheme } = useAppTheme();
  const styles = makeStyles(currentTheme);
  const { logout } = useAuthStore();
  const navigation = useNavigation<ParentSettingsNavigationProp>();

  // State for notification toggle (local state for now)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true); // Default to true

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: () => logout() }
      ]
    );
  };

  const accountItems = [
    { 
      icon: 'account-edit-outline', 
      title: 'Edit Profile', 
      description: 'Update your name, contact info', 
      onPress: () => navigation.navigate('EditProfile')
    },
    { 
      icon: 'lock-reset', 
      title: 'Change Password', 
      onPress: () => navigation.navigate('ChangePassword') // Navigate to ChangePassword
    },
    ];

  const appearanceItems = [
    { 
      icon: isDarkMode ? 'weather-night' : 'weather-sunny', 
      title: 'Dark Mode', 
      hasSwitch: true, 
      switchValue: isDarkMode, 
      onSwitchChange: toggleTheme 
    },
    // Add notification toggle item here if it fits under Appearance
    // Or create a new section for "Notifications"
  ];

  const notificationItems = [
    {
      icon: notificationsEnabled ? 'bell-ring-outline' : 'bell-off-outline',
      title: 'Enable Notifications',
      hasSwitch: true,
      switchValue: notificationsEnabled,
      onSwitchChange: () => setNotificationsEnabled(prev => !prev) // Add persistence later
    }
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView>
        <Text style={styles.screenTitle}>Settings</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          {accountItems.map((item, index) => <SettingsItem key={`acc-${index}`} {...item} />)}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          {appearanceItems.map((item, index) => <SettingsItem key={`app-${index}`} {...item} />)}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          {notificationItems.map((item, index) => <SettingsItem key={`notif-${index}`} {...item} />)}
        </View>
        
        <View style={styles.section}>
          <SettingsItem 
            icon="logout" 
            title="Logout" 
            onPress={handleLogout} 
            isDestructive
          />
        </View>
        <View style={{ height: currentTheme.spacing?.[6] || 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// Updated makeStyles to accept and use a theme object that matches AppTheme
const makeStyles = (theme: AppTheme) => {

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background, 
    },
    centeredMessageContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing?.[4] || 16, // e.g., spacing[4] for medium
    },
    screenTitle: {
      fontSize: theme.fontSize?.screenTitle || 22,
      fontWeight: 'bold',
      color: theme.text,
      paddingHorizontal: theme.spacing?.[4] || 16,
      paddingTop: theme.spacing?.[6] || 24, // e.g., spacing[6] for large
      paddingBottom: theme.spacing?.[4] || 16,
    },
    section: {
      marginTop: theme.spacing?.[4] || 16,
      marginBottom: theme.spacing?.[2] || 8, // e.g., spacing[2] for small
    },
    sectionTitle: {
      fontSize: theme.fontSize?.sectionTitle || 18,
      fontWeight: '600',
      color: theme.textSecondary,
      paddingHorizontal: theme.spacing?.[4] || 16,
      marginBottom: theme.spacing?.[2] || 8,
      textTransform: 'uppercase',
    },
    settingsItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.cardBackground,
      paddingHorizontal: theme.spacing?.[4] || 16,
      paddingVertical: theme.spacing?.[4] || 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    itemIcon: {
      marginRight: theme.spacing?.[4] || 16,
    },
    itemTextContainer: {
      flex: 1,
    },
    itemTitle: {
      fontSize: theme.fontSize?.itemText || 16,
      color: theme.text,
    },
    itemDescription: {
      fontSize: theme.fontSize?.itemDescription || 12,
      color: theme.textSecondary,
      marginTop: 2,
    },
    destructiveText: {
      color: theme.danger,
    }
  });
}

export default ParentSettingsScreen; 