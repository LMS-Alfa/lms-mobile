import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NavigatorScreenParams } from '@react-navigation/native';

// Import Parent Screens
import ParentDashboardScreen from '../screens/parent/ParentDashboardScreen';
import ParentNotificationsScreen from '../screens/parent/ParentNotificationsScreen';
import ParentSettingsScreen from '../screens/parent/ParentSettingsScreen';
import ParentChildGradesScreen from '../screens/parent/ParentChildGradesScreen';
import ParentSubjectGradesScreen from '../screens/parent/ParentSubjectGradesScreen';
import ParentAssignmentDetailScreen from '../screens/parent/ParentAssignmentDetailScreen';
import ParentScheduleScreen from '../screens/parent/ParentScheduleScreen';

// Define Param Lists
export type ParentHomeStackParamList = {
  ParentDashboard: undefined;
  ParentChildGrades: { childId: string; childName: string };
  ParentSubjectGrades: { childId: string; childName: string; subjectId: number; subjectName: string };
  ParentAssignmentDetail: { assignmentId: string; childId: string; childName?: string; assignmentTitle?: string };
  ParentSchedule: { childId: string; childName?: string };
  // Add other screens that can be navigated to from the dashboard/home flow
};

export type ParentTabParamList = {
  Home: NavigatorScreenParams<ParentHomeStackParamList> | undefined;
  Notifications: undefined;
  Schedule: { childId?: string; childName?: string };
  Settings: undefined;
};

const Tab = createBottomTabNavigator<ParentTabParamList>();
const HomeStack = createStackNavigator<ParentHomeStackParamList>();

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

const ParentTabNavigator = () => {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#007AFF', // Example active color
        tabBarInactiveTintColor: 'gray',
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
      <Tab.Screen name="Settings" component={ParentSettingsScreen} />
    </Tab.Navigator>
  );
};

export default ParentTabNavigator; 