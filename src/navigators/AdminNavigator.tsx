import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AdminDrawerNavigator from './AdminDrawerNavigator';
import AddUserScreen from '../screens/admin/AddUserScreen';
import EditUserScreen from '../screens/admin/EditUserScreen';

const Stack = createStackNavigator();

const AdminNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="AdminDrawer" component={AdminDrawerNavigator} />
      <Stack.Screen name="AddUserScreen" component={AddUserScreen} />
      <Stack.Screen name="EditUserScreen" component={EditUserScreen} />
    </Stack.Navigator>
  );
};

export default AdminNavigator; 