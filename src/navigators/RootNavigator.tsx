import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import { useAuthStore } from '../store/authStore';
import LoginScreen from '../screens/auth/LoginScreen';
import AdminNavigator from './AdminNavigator';
import TeacherNavigator from './TeacherNavigator';
import StudentNavigator from './StudentNavigator';
import ParentTabNavigator from './ParentTabNavigator';
import LoadingScreen from '../screens/LoadingScreen';

// Define the auth stack navigator type
type AuthStackParamList = {
  Login: undefined;
};

// Define the app stack navigator type (remains for other roles)
type AppStackParamList = {
  TeacherRoot: undefined;
  StudentHome: undefined;
  ParentMain: undefined;
  DefaultHome: undefined;
  AdminRoot: undefined;
};

// Define the root stack navigator type
type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};

// Create the navigators
const RootStack = createStackNavigator<RootStackParamList>();
const AuthStack = createStackNavigator<AuthStackParamList>();
const AppStack = createStackNavigator<AppStackParamList>();

// Placeholder screens for other roles (keep as is for now)
const TeacherHomeScreen = () => (
  <View style={styles.screenContainer}>
    <Text style={styles.screenTitle}>Teacher Dashboard</Text>
    <Text style={styles.screenSubtitle}>Coming soon</Text>
  </View>
);

const StudentHomeScreen = () => (
  <View style={styles.screenContainer}>
    <Text style={styles.screenTitle}>Student Dashboard</Text>
    <Text style={styles.screenSubtitle}>Coming soon</Text>
  </View>
);

const ParentHomeScreen = () => (
  <View style={styles.screenContainer}>
    <Text style={styles.screenTitle}>Parent Dashboard</Text>
    <Text style={styles.screenSubtitle}>Coming soon</Text>
  </View>
);

const DefaultHomeScreen = () => (
  <View style={styles.screenContainer}>
    <Text style={styles.screenTitle}>Welcome to LMS</Text>
    <Text style={styles.screenSubtitle}>Your role-specific dashboard is being prepared</Text>
  </View>
);

const AuthNavigator = () => {
  console.log('[RootNavigator] Rendering AuthNavigator (Login Screen)');
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
  );
};

// App navigator: directs to AdminDrawer or other role-specific stacks/screens
const AppNavigator = () => {
  const { user } = useAuthStore();
  console.log('[RootNavigator] Rendering AppNavigator. User:', user);
  
  if (user?.role === 'admin') {
    return <AdminNavigator />;
  }
  if (user?.role === 'teacher') {
    return <TeacherNavigator />;
  }
  if (user?.role === 'student') {
    return <StudentNavigator />;
  }
  if (user?.role === 'parent') {
    return <ParentTabNavigator />;
  }

  return (
    <AppStack.Navigator screenOptions={{ headerShown: true }}>
      {user?.role === 'student' && (
        <AppStack.Screen 
          name="StudentHome" 
          component={StudentHomeScreen} 
          options={{ title: 'Student Dashboard' }}
        />
      )}
      {user?.role === 'parent' && (
        <AppStack.Screen 
          name="ParentMain"
          component={ParentTabNavigator}
          options={{ headerShown: false }}
        />
      )}
      {(!user || !['teacher', 'student', 'parent', 'admin'].includes(user?.role as string)) && (
         <AppStack.Screen 
          name="DefaultHome" 
          component={DefaultHomeScreen} 
          options={{ title: 'Dashboard' }}
        />
      )}
    </AppStack.Navigator>
  );
};

const RootNavigator = () => {
  const { user, initialized, initialize } = useAuthStore();

  useEffect(() => {
      initialize();
  }, [initialize]);

  if (!initialized) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <RootStack.Screen name="App" component={AppNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: { 
    marginTop: 10,
    fontSize: 16,
    color: '#595959',
  },
  screenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 20,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#262626',
  },
  screenSubtitle: {
    fontSize: 16,
    color: '#595959',
  },
});

export default RootNavigator; 