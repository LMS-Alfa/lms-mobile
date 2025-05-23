import React from 'react';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import { useTheme } from 'styled-components/native';
import PlaceholderScreen from '../screens/common/PlaceholderScreen'; // Import shared PlaceholderScreen
import LogoutScreen from '../screens/auth/LogoutScreen'; // Import shared LogoutScreen
import UserManagementScreen from '../screens/admin/UserManagementScreen'; // Import UserManagementScreen
import AddUserScreen from '../screens/admin/AddUserScreen'; // Import AddUserScreen

// Define the parameter list for the Admin Drawer Navigator
export type AdminDrawerParamList = {
  AdminDashboard: undefined;
  UserManagement: undefined;
  AddUserScreen: undefined; // Added AddUserScreen
  RoleManagement: undefined;
  Subjects: undefined;
  Classes: undefined;
  MorningClasses: undefined;
  Assignments: undefined;
  Grades: undefined;
  Timetables: undefined;
  Announcements: undefined;
  Profile: undefined;
  Settings: undefined;
  Logout: undefined; 
};

const Drawer = createDrawerNavigator<AdminDrawerParamList>();

// Define icons for each route
const DRAWER_ICONS: Record<keyof AdminDrawerParamList, string> = {
  AdminDashboard: 'grid',
  UserManagement: 'users',
  AddUserScreen: '', // AddUserScreen should not have an icon as it won't be in the drawer list
  RoleManagement: 'shield',
  Subjects: 'book',
  Classes: 'layers',
  MorningClasses: 'clock',
  Assignments: 'edit-3',
  Grades: 'award',
  Timetables: 'calendar',
  Announcements: 'bell',
  Profile: 'user',
  Settings: 'settings',
  Logout: 'log-out',
};

const CustomDrawerContent = (props: any) => {
  const theme = useTheme();
  const { state, navigation } = props;
  const { routes, index } = state;

  // Separate Logout route from other routes
  const mainRoutes = routes.filter((route: any) => route.name !== 'Logout' && route.name !== 'AddUserScreen' && route.name !== 'EditUserScreen');
  const logoutRoute = routes.find((route: any) => route.name === 'Logout');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <DrawerContentScrollView {...props} style={{ flex: 1 }}>
        {mainRoutes.map((route: any, i: number) => {
          // Calculate actual index in the original routes array for `isFocused`
          const originalIndex = routes.findIndex((r: any) => r.key === route.key);
          const isFocused = index === originalIndex;
          const iconName = DRAWER_ICONS[route.name as keyof AdminDrawerParamList] || 'circle';
          
          const descriptor = props.descriptors[route.key];
          const title =
            descriptor.options.title !== undefined
              ? descriptor.options.title
              : route.name;

          return (
            <TouchableOpacity
              key={route.key}
              style={[
                styles.drawerItem,
                { backgroundColor: isFocused ? theme.primary + '20' : 'transparent' },
              ]}
              onPress={() => navigation.navigate(route.name)}
            >
              <Icon 
                name={iconName} 
                size={20} 
                color={isFocused ? theme.primary : theme.textSecondary} 
                style={styles.drawerIcon} 
              />
              <Text 
                style={[
                  styles.drawerLabel,
                  { color: isFocused ? theme.primary : theme.textSecondary }
                ]}
              >
                {title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </DrawerContentScrollView>
      {/* Logout Button - Fixed at the bottom */} 
      {logoutRoute && (
        <View style={[styles.logoutContainer, { borderTopColor: theme.separator || '#e1e1e1' }]}>
          <TouchableOpacity
            key={logoutRoute.key}
            style={styles.drawerItem}
            onPress={() => navigation.navigate(logoutRoute.name)}
          >
            <Icon 
              name={DRAWER_ICONS[logoutRoute.name as keyof AdminDrawerParamList] || 'log-out'} 
              size={20} 
              color={theme.danger || 'red'}
              style={styles.drawerIcon} 
            />
            <Text 
              style={[
                styles.drawerLabel,
                { color: theme.danger || 'red' }
              ]}
            >
              {props.descriptors[logoutRoute.key].options.title || logoutRoute.name}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const AdminDrawerNavigator = () => {
  const theme = useTheme();

  return (
    <Drawer.Navigator
      initialRouteName="AdminDashboard"
      drawerContent={(props) => <CustomDrawerContent {...props} />} // Use custom drawer content
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.primary,
        },
        headerTintColor: theme.headerText,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        // drawerStyle and other drawer item styling options are now controlled by CustomDrawerContent
      }}
    >
      <Drawer.Screen 
        name="AdminDashboard" 
        component={AdminDashboardScreen} 
        options={{ title: 'Dashboard' }} 
      />
      <Drawer.Screen 
        name="UserManagement" 
        component={UserManagementScreen}  // Changed from PlaceholderScreen
        options={{ title: 'User Management' }} 
      />
      <Drawer.Screen 
        name="AddUserScreen" 
        component={AddUserScreen} 
        options={{ title: 'Add User' }} // This title might be used by the header
      />
      <Drawer.Screen name="RoleManagement" component={PlaceholderScreen} options={{ title: 'Role Management' }} />
      <Drawer.Screen name="Subjects" component={PlaceholderScreen} options={{ title: 'Subjects' }} />
      <Drawer.Screen name="Classes" component={PlaceholderScreen} options={{ title: 'Classes' }} />
      <Drawer.Screen name="MorningClasses" component={PlaceholderScreen} options={{ title: 'Morning Classes' }} />
      <Drawer.Screen name="Assignments" component={PlaceholderScreen} options={{ title: 'Assignments' }} />
      <Drawer.Screen name="Grades" component={PlaceholderScreen} options={{ title: 'Grades' }} />
      <Drawer.Screen name="Timetables" component={PlaceholderScreen} options={{ title: 'Timetables' }} />
      <Drawer.Screen name="Announcements" component={PlaceholderScreen} options={{ title: 'Announcements' }} />
      <Drawer.Screen name="Profile" component={PlaceholderScreen} options={{ title: 'Profile' }} />
      <Drawer.Screen name="Settings" component={PlaceholderScreen} options={{ title: 'Settings' }} />
      <Drawer.Screen 
        name="Logout" 
        component={LogoutScreen} 
        options={{ title: 'Logout' }} 
      />
    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  drawerIcon: {
    marginRight: 20, 
  },
  drawerLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  logoutContainer: {
    borderTopWidth: 1,
    paddingTop: 10, // Kept paddingTop
    paddingBottom: 20, // Increased paddingBottom for more space at the very bottom
    paddingHorizontal: 15, // Assuming this was manually set to 15 as per previous step
  },
});

export default AdminDrawerNavigator; 