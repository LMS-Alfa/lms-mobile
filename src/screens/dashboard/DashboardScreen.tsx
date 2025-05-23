import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useTheme, DefaultTheme } from 'styled-components/native';
import Icon from 'react-native-vector-icons/Feather';
import { useAuthStore } from '../../store/authStore';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import Layout from '../../components/Layout';
import LogoutButton from '../../components/LogoutButton';

interface DashboardScreenProps {
  navigation: NavigationProp<ParamListBase>;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const theme = useTheme() as DefaultTheme & {
    primary?: string;
    text?: string;
    textSecondary?: string;
    background?: string;
    cardBackground?: string;
    danger?: string;
  };

  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    // Set greeting based on time of day
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Good Morning');
    } else if (hour < 18) {
      setGreeting('Good Afternoon');
    } else {
      setGreeting('Good Evening');
    }
  }, []);

  // Create subtitle with user name and role
  const subtitle = user ? `${user.firstName} · ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}` : '';

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
    <Layout 
      title={greeting} 
      subtitle={subtitle}
      showLogout={true}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.quickActionsContainer}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {/* Add a prominent logout button */}
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: theme.cardBackground }]}
              onPress={handleLogout}
            >
              <Icon name="log-out" size={24} color={theme.danger || '#F44336'} style={styles.quickActionIcon} />
              <Text style={[styles.quickActionText, { color: theme.danger || '#F44336' }]}>Logout</Text>
            </TouchableOpacity>

            {/* Admin actions */}
            {user?.role.toLowerCase() === 'admin' && (
              <TouchableOpacity
                style={[styles.quickActionButton, { backgroundColor: theme.cardBackground }]}
                onPress={() => navigation.navigate('UserManagement')}
              >
                <Icon name="users" size={24} color={theme.primary} style={styles.quickActionIcon} />
                <Text style={[styles.quickActionText, { color: theme.text }]}>User Management</Text>
              </TouchableOpacity>
            )}
            
            {/* Common actions for all roles */}
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: theme.cardBackground }]}
              onPress={() => navigation.navigate('Profile')}
            >
              <Icon name="user" size={24} color={theme.primary} style={styles.quickActionIcon} />
              <Text style={[styles.quickActionText, { color: theme.text }]}>My Profile</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: theme.cardBackground }]}
              onPress={() => navigation.navigate('Messages')}
            >
              <Icon name="message-circle" size={24} color={theme.primary} style={styles.quickActionIcon} />
              <Text style={[styles.quickActionText, { color: theme.text }]}>Messages</Text>
            </TouchableOpacity>
            
            {/* Parent-specific actions */}
            {user?.role.toLowerCase() === 'parent' && (
              <TouchableOpacity
                style={[styles.quickActionButton, { backgroundColor: theme.cardBackground }]}
                onPress={() => navigation.navigate('ChildrenProgress')}
              >
                <Icon name="bar-chart-2" size={24} color={theme.primary} style={styles.quickActionIcon} />
                <Text style={[styles.quickActionText, { color: theme.text }]}>Children Progress</Text>
              </TouchableOpacity>
            )}
            
            {/* Student-specific actions */}
            {user?.role.toLowerCase() === 'student' && (
              <TouchableOpacity
                style={[styles.quickActionButton, { backgroundColor: theme.cardBackground }]}
                onPress={() => navigation.navigate('Assignments')}
              >
                <Icon name="book-open" size={24} color={theme.primary} style={styles.quickActionIcon} />
                <Text style={[styles.quickActionText, { color: theme.text }]}>My Assignments</Text>
              </TouchableOpacity>
            )}
            
            {/* Teacher-specific actions */}
            {user?.role.toLowerCase() === 'teacher' && (
              <TouchableOpacity
                style={[styles.quickActionButton, { backgroundColor: theme.cardBackground }]}
                onPress={() => navigation.navigate('GradeBook')}
              >
                <Icon name="clipboard" size={24} color={theme.primary} style={styles.quickActionIcon} />
                <Text style={[styles.quickActionText, { color: theme.text }]}>Grade Book</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </Layout>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 20,
  },
  quickActionsContainer: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  quickActionIcon: {
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default DashboardScreen; 