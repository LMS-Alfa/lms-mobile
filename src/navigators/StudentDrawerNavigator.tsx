import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Dimensions, Image } from 'react-native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { useAuthStore } from '../store/authStore';
import { useAppTheme } from '../contexts/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

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
const CustomDrawerContent = (props: any) => {
  const { logout, user } = useAuthStore();
  const navigation = useNavigation();
  const { theme } = useAppTheme();

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

  const handleSettingsPress = () => {
    navigation.navigate('Settings' as never);
  };

  return (
    <SafeAreaView style={[styles.drawerContainer, { backgroundColor: theme.cardBackground }]} edges={['top', 'bottom']}>
      <View style={[styles.userSection, { borderBottomColor: theme.separator }]}>
        <View style={[styles.avatarCircle, { backgroundColor: theme.primary }]}>
          <Text style={styles.avatarText}>
            {user?.firstName?.charAt(0) || 'S'}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: theme.text }]}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={[styles.userRole, { color: theme.textSecondary }]}>
            Student
          </Text>
        </View>
      </View>
      
      <ScrollView style={styles.scrollContainer}>
        <DrawerItemList {...props} />
      </ScrollView>
      
      <View style={[styles.bottomSection, { borderTopColor: theme.separator }]}>
        <TouchableOpacity 
          style={styles.bottomItem}
          onPress={handleSettingsPress}
        >
          <Icon name="settings" size={22} color={theme.text} style={styles.bottomIcon} />
          <Text style={[styles.bottomText, { color: theme.text }]}>Settings</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.bottomItem}
          onPress={handleLogout}
        >
          <Icon name="log-out" size={22} color={theme.danger} style={styles.bottomIcon} />
          <Text style={[styles.bottomText, { color: theme.danger }]}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// Student Drawer Navigator
const StudentDrawerNavigator = () => {
  const { theme } = useAppTheme();

  return (
    <Drawer.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.primary,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        drawerActiveTintColor: theme.primary,
        drawerInactiveTintColor: theme.text,
        drawerLabelStyle: {
          marginLeft: -6,
          fontSize: 16,
          fontWeight: '500',
        },
        drawerStyle: {
          width: width * 0.75, // 75% of screen width
          backgroundColor: theme.cardBackground,
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
  drawerContainer: {
    flex: 1,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userInfo: {
    marginLeft: 15,
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  userRole: {
    fontSize: 14,
    marginTop: 2,
  },
  scrollContainer: {
    flex: 1,
  },
  bottomSection: {
    padding: 15,
    borderTopWidth: 1,
  },
  bottomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
  },
  bottomIcon: {
    marginRight: 18,
  },
  bottomText: {
    fontSize: 16,
    fontWeight: '500',
  },
  iconContainer: {
    marginLeft: 5,
  },
});

export default StudentDrawerNavigator; 