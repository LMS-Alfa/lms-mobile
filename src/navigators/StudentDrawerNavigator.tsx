import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Dimensions, Image } from 'react-native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { useAuthStore } from '../store/authStore';

// Import student screens
import StudentDashboardScreen from '../screens/student/StudentDashboardScreen';
import CoursesScreen from '../screens/student/CoursesScreen';
import AssignmentsScreen from '../screens/student/AssignmentsScreen';
import GradesScreen from '../screens/student/GradesScreen';
import ScheduleScreen from '../screens/student/ScheduleScreen';
import AnnouncementsScreen from '../screens/student/AnnouncementsScreen';

// Create drawer navigator
const Drawer = createDrawerNavigator();
const { width } = Dimensions.get('window');

// Custom drawer content
const CustomDrawerContent = (props) => {
  const { logout } = useAuthStore();
  const navigation = useNavigation();
  const { user } = useAuthStore();

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
            // Navigate to login screen
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' as never }]
            });
          }
        }
      ]
    );
  };

  return (
    <DrawerContentScrollView 
      {...props}
      contentContainerStyle={styles.drawerContentContainer}
    >
      <View style={styles.profileContainer}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {user?.firstName?.charAt(0) || user?.username?.charAt(0) || 'S'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>{user?.firstName} {user?.lastName || ''}</Text>
            <Text style={styles.userEmail}>{user?.email || 'Student'}</Text>
          </View>
        </View>
        <View style={styles.divider} />
      </View>
      
      <View style={styles.drawerItemsContainer}>
        <DrawerItemList {...props} />
      </View>
      
      <View style={styles.bottomItems}>
        <View style={styles.divider} />
        <DrawerItem
          label="Settings"
          icon={({ color, size }) => (
            <View style={styles.iconContainer}>
              <Icon name="settings" color={color} size={size} />
            </View>
          )}
          onPress={() => navigation.navigate('Settings')}
          style={styles.bottomDrawerItem}
          labelStyle={styles.drawerItemLabel}
        />
        <DrawerItem
          label="Logout"
          icon={({ color, size }) => (
            <View style={styles.iconContainer}>
              <Icon name="log-out" color="#F44336" size={size} />
            </View>
          )}
          onPress={handleLogout}
          labelStyle={styles.logoutLabel}
          style={styles.bottomDrawerItem}
        />
      </View>
    </DrawerContentScrollView>
  );
};

// Student Drawer Navigator
const StudentDrawerNavigator = () => {
  return (
    <Drawer.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
        headerStyle: {
          backgroundColor: '#4A90E2',
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        drawerActiveTintColor: '#4A90E2',
        drawerInactiveTintColor: '#333333',
        drawerLabelStyle: {
          marginLeft: -6,
          fontSize: 16,
          fontWeight: '500',
        },
        drawerStyle: {
          width: width * 0.75, // 75% of screen width
          backgroundColor: '#FFFFFF',
        },
        drawerItemStyle: {
          borderRadius: 8,
          paddingVertical: 2,
          marginVertical: 2,
          marginHorizontal: 10,
        },
        drawerIconStyle: {
          marginRight: 10,
        },
      }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen
        name="Dashboard"
        component={StudentDashboardScreen}
        options={{
          title: 'Dashboard',
          drawerIcon: ({ color, size }) => (
            <View style={styles.iconContainer}>
              <Icon name="home" color={color} size={size} />
            </View>
          ),
        }}
      />
      <Drawer.Screen
        name="Courses"
        component={CoursesScreen}
        options={{
          title: 'My Courses',
          drawerIcon: ({ color, size }) => (
            <View style={styles.iconContainer}>
              <Icon name="book" color={color} size={size} />
            </View>
          ),
        }}
      />
      <Drawer.Screen
        name="Assignments"
        component={AssignmentsScreen}
        options={{
          title: 'Assignments',
          drawerIcon: ({ color, size }) => (
            <View style={styles.iconContainer}>
              <Icon name="file-text" color={color} size={size} />
            </View>
          ),
        }}
      />
      <Drawer.Screen
        name="Grades"
        component={GradesScreen}
        options={{
          title: 'My Grades',
          drawerIcon: ({ color, size }) => (
            <View style={styles.iconContainer}>
              <Icon name="bar-chart-2" color={color} size={size} />
            </View>
          ),
        }}
      />
      <Drawer.Screen
        name="Schedule"
        component={ScheduleScreen}
        options={{
          title: 'Schedule',
          drawerIcon: ({ color, size }) => (
            <View style={styles.iconContainer}>
              <Icon name="calendar" color={color} size={size} />
            </View>
          ),
        }}
      />
      <Drawer.Screen
        name="Messages"
        component={StudentDashboardScreen} // Placeholder, will update later
        options={{
          title: 'Messages',
          drawerIcon: ({ color, size }) => (
            <View style={styles.iconContainer}>
              <Icon name="message-square" color={color} size={size} />
            </View>
          ),
        }}
      />
      <Drawer.Screen
        name="Announcements"
        component={AnnouncementsScreen}
        options={{
          title: 'Announcements',
          drawerIcon: ({ color, size }) => (
            <View style={styles.iconContainer}>
              <Icon name="bell" color={color} size={size} />
            </View>
          ),
        }}
      />
    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  drawerContentContainer: {
    flex: 1,
  },
  profileContainer: {
    padding: 0,
    backgroundColor: '#F5F7FA',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
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
    color: '#333333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666666',
  },
  drawerItemsContainer: {
    flex: 1,
    paddingTop: 15,
  },
  bottomItems: {
    marginBottom: 10,
  },
  bottomDrawerItem: {
    marginVertical: 0,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 0,
    marginVertical: 5,
  },
  drawerItemLabel: {
    fontWeight: '500',
  },
  logoutLabel: {
    color: '#F44336',
    fontWeight: '500',
  },
  iconContainer: {
    width: 24,
    alignItems: 'center',
    marginRight: 12,
  },
});

export default StudentDrawerNavigator; 