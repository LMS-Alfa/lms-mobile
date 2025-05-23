import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { Platform } from 'react-native';
import StudentDrawerNavigator from './StudentDrawerNavigator';
import CourseDetailScreen from '../screens/student/CourseDetailScreen';
import LessonDetailScreen from '../screens/student/LessonDetailScreen';
import AssignmentDetailScreen from '../screens/student/AssignmentDetailScreen';
import SubjectGradesScreen from '../screens/student/SubjectGradesScreen';
import SettingsScreen from '@/screens/student/SettingsScreen';

const Stack = createStackNavigator();

const StudentNavigator = () => {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        cardStyle: { backgroundColor: '#F5F7FA' },
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },
        headerStyle: {
          elevation: 0, // Remove shadow on Android
          shadowOpacity: 0, // Remove shadow on iOS
          borderBottomWidth: 0, // Remove the bottom border
          backgroundColor: '#4A90E2',
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
    </Stack.Navigator>
  );
};

export default StudentNavigator; 