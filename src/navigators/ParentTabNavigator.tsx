import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NavigatorScreenParams } from '@react-navigation/native';
import { useAppTheme } from '../contexts/ThemeContext';

// Import Parent Screens
import ParentDashboardScreen from '../screens/parent/ParentDashboardScreen';
import ParentNotificationsScreen from '../screens/parent/ParentNotificationsScreen';
import ParentSettingsScreen from '../screens/parent/ParentSettingsScreen';
import ParentChildGradesScreen from '../screens/parent/ParentChildGradesScreen';
import ParentSubjectGradesScreen from '../screens/parent/ParentSubjectGradesScreen';
import ParentAssignmentDetailScreen from '../screens/parent/ParentAssignmentDetailScreen';
import ParentScheduleScreen from '../screens/parent/ParentScheduleScreen';
import EditProfileScreen from '../screens/parent/EditProfileScreen';
import ChangePasswordScreen from '../screens/parent/ChangePasswordScreen';

// Define Param Lists
export type ParentHomeStackParamList = {
  ParentDashboard: undefined;
  ParentChildGrades: { childId: string; childName: string };
  ParentSubjectGrades: { childId: string; childName: string; subjectId: number; subjectName: string };
  ParentAssignmentDetail: { assignmentId: string; childId: string; childName?: string; assignmentTitle?: string };
  ParentSchedule: { childId: string; childName?: string };
  // Add other screens that can be navigated to from the dashboard/home flow
};

// Define Settings Stack Param List
export type SettingsStackParamList = {
  ParentSettings: undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
  // Add other settings-related screens here, e.g., ChangePassword
};

export type ParentTabParamList = {
  Home: NavigatorScreenParams<ParentHomeStackParamList> | undefined;
  Notifications: undefined;
  Schedule: { childId?: string; childName?: string };
  Settings: NavigatorScreenParams<SettingsStackParamList>;
};

const Tab = createBottomTabNavigator<ParentTabParamList>();
const HomeStack = createStackNavigator<ParentHomeStackParamList>();
const SettingsStack = createStackNavigator<SettingsStackParamList>();

// Home Stack Navigator (for screens accessible from the Home tab)
const HomeStackNavigator = () => {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="ParentDashboard" component={ParentDashboardScreen} />
      <HomeStack.Screen name="ParentChildGrades" component={ParentChildGradesScreen} />
      <HomeStack.Screen name="ParentSubjectGrades" component={ParentSubjectGradesScreen} />
      <HomeStack.Screen name="ParentAssignmentDetail" component={ParentAssignmentDetailScreen} />
      <HomeStack.Screen name="ParentSchedule" component={ParentScheduleScreen} />
    </HomeStack.Navigator>
  );
};

// Settings Stack Navigator
const SettingsStackNavigator = () => {
  return (
    <SettingsStack.Navigator screenOptions={{ headerShown: false }}>
      <SettingsStack.Screen name="ParentSettings" component={ParentSettingsScreen} />
      <SettingsStack.Screen name="EditProfile" component={EditProfileScreen} />
      <SettingsStack.Screen name="ChangePassword" component={ChangePasswordScreen} />
    </SettingsStack.Navigator>
  );
};

const ParentTabNavigator = () => {
  const { theme } = useAppTheme();
  
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.cardBackground,
          borderTopColor: theme.border,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Notifications') {
            iconName = focused ? 'bell' : 'bell-outline';
          } else if (route.name === 'Schedule') {
            iconName = focused ? 'calendar-month' : 'calendar-month-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'cog' : 'cog-outline';
          }
          return <MaterialCommunityIcons name={iconName as string} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStackNavigator} />
      <Tab.Screen name="Notifications" component={ParentNotificationsScreen} />
      <Tab.Screen name="Schedule" component={ParentScheduleScreen} />
      <Tab.Screen name="Settings" component={SettingsStackNavigator} />
    </Tab.Navigator>
  );
};

export default ParentTabNavigator; 