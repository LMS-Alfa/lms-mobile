import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useTheme } from 'styled-components/native';
import PlaceholderScreen from '../screens/common/PlaceholderScreen'; 
import LogoutScreen from '../screens/auth/LogoutScreen';

export type TeacherDrawerParamList = {
  TeacherDashboard: undefined;
  TeacherProfile: undefined;
  TeacherSettings: undefined;
  Logout: undefined;
};

const Drawer = createDrawerNavigator<TeacherDrawerParamList>();

const TeacherDrawerNavigator = () => {
  const theme = useTheme();

  return (
    <Drawer.Navigator
      initialRouteName="TeacherDashboard"
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.primary, 
        },
        headerTintColor: theme.headerText, 
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        drawerStyle: {
          backgroundColor: theme.background,
          width: 260,
        },
        drawerActiveTintColor: theme.primary,
        drawerInactiveTintColor: theme.textSecondary,
        drawerLabelStyle: {
          marginLeft: -20, 
          fontSize: 15,
        },
      }}
    >
      <Drawer.Screen 
        name="TeacherDashboard" 
        component={PlaceholderScreen} // Initially a placeholder
        options={{ title: 'Dashboard' }} 
      />
      <Drawer.Screen 
        name="TeacherProfile" 
        component={PlaceholderScreen} 
        options={{ title: 'Profile' }} 
      />
      <Drawer.Screen 
        name="TeacherSettings" 
        component={PlaceholderScreen} 
        options={{ title: 'Settings' }} 
      />
      <Drawer.Screen 
        name="Logout" 
        component={LogoutScreen} 
        options={{ title: 'Logout' }} 
      />
    </Drawer.Navigator>
  );
};

export default TeacherDrawerNavigator; 