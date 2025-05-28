import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { Platform } from 'react-native';
import StudentDrawerNavigator from './StudentDrawerNavigator';
import CourseDetailScreen from '../screens/student/CourseDetailScreen';
import LessonDetailScreen from '../screens/student/LessonDetailScreen';
import AssignmentDetailScreen from '../screens/student/AssignmentDetailScreen';
import SubjectGradesScreen from '../screens/student/SubjectGradesScreen';
import SettingsScreen from '@/screens/student/SettingsScreen';
import ChangePasswordScreen from '@/screens/student/ChangePasswordScreen';
import EditProfileScreen from '@/screens/student/EditProfileScreen';
import { useAppTheme } from '../contexts/ThemeContext';

const Stack = createStackNavigator();

const StudentNavigator = () => {
  const { theme } = useAppTheme();

  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        cardStyle: { backgroundColor: theme.background },
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },
        headerStyle: {
          elevation: 0, // Remove shadow on Android
          shadowOpacity: 0, // Remove shadow on iOS
          borderBottomWidth: 0, // Remove the bottom border
          backgroundColor: theme.primary,
        },
        headerTintColor: '#FFFFFF',
      }}
    >
      <Stack.Screen 
        name="StudentDrawer" 
        component={StudentDrawerNavigator} 
      />
      <Stack.Screen 
        name="CourseDetail" 
        component={CourseDetailScreen}
        options={{
          headerShown: true,
          title: 'Course Details',
          ...Platform.select({
            ios: {
              headerBackTitle: 'Back',
            },
          }),
        }}
      />
      <Stack.Screen 
        name="LessonDetail" 
        component={LessonDetailScreen}
        options={{
          headerShown: true,
          title: 'Lesson',
          ...Platform.select({
            ios: {
              headerBackTitle: 'Back',
            },
          }),
        }}
      />
      <Stack.Screen
        name="AssignmentDetail"
        component={AssignmentDetailScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="SubjectGrades"
        component={SubjectGradesScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          headerShown: true,
          title: 'Settings',
          ...Platform.select({
            ios: {
              headerBackTitle: 'Back',
            },
          }),
        }}
      />
      <Stack.Screen 
        name="ChangePassword" 
        component={ChangePasswordScreen}
        options={{
          headerShown: true,
          title: 'Change Password',
          ...Platform.select({
            ios: {
              headerBackTitle: 'Back',
            },
          }),
        }}
      />
      <Stack.Screen 
        name="EditProfile" 
        component={EditProfileScreen}
        options={{
          headerShown: true,
          title: 'Edit Profile',
          ...Platform.select({
            ios: {
              headerBackTitle: 'Back',
            },
          }),
        }}
      />
    </Stack.Navigator>
  );
};

export default StudentNavigator; 