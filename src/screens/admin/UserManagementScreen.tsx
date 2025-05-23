import React, { useEffect, useCallback, useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, ScrollView, Animated, Alert } from 'react-native';
import { useTheme, DefaultTheme } from 'styled-components/native';
import Icon from 'react-native-vector-icons/Feather';
import { useAuthStore, User, UserRole } from '../../store/authStore';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Utility to get initials
const getInitials = (firstName?: string | null, lastName?: string | null) => {
  const firstInitial = firstName ? firstName[0] : '';
  const lastInitial = lastName ? lastName[0] : '';
  return `${firstInitial}${lastInitial}`.toUpperCase() || 'U'; // Fallback to 'U' for User
};

// Format date function (basic example)
const formatDate = (dateString?: string | null) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } catch (e) {
    return 'Invalid Date';
  }
};

// Get role color
const getRoleColor = (role: UserRole, theme: any) => {
  switch(role) {
    case 'admin':
      return theme.adminColor || '#9C27B0';
    case 'teacher':
      return theme.teacherColor || '#2196F3';
    case 'student':
      return theme.studentColor || '#4CAF50';
    case 'parent':
      return theme.parentColor || '#FF9800';
    default:
      return theme.primary || '#007bff';
  }
};

// Get status color
const getStatusColor = (status: string | null | undefined, theme: any) => {
  switch(status) {
    case 'active':
      return theme.success || '#4CAF50';
    case 'pending':
      return theme.warning || '#FF9800';
    case 'invited':
      return theme.info || '#2196F3';
    default:
      return theme.textSecondary || '#757575';
  }
};

// Background pastel color for role badge
const getRoleBgColor = (role: UserRole, theme: any) => {
  const baseColor = getRoleColor(role, theme);
  return baseColor + '15'; // 15% opacity of the base color
};

const USER_ROLE_FILTERS: Array<{ label: string, value: UserRole | 'All' }> = [
  { label: 'All', value: 'All' },
  { label: 'Admins', value: 'Admin' },
  { label: 'Teachers', value: 'Teacher' },
  { label: 'Students', value: 'Student' },
  { label: 'Parents', value: 'Parent' },
];

// Animated User Item Component
const AnimatedUserItem: React.FC<{ item: User; index: number; renderContent: (item: User) => React.ReactNode; itemsLoaded: boolean }> = ({ item, index, renderContent, itemsLoaded }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (itemsLoaded) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      }).start();
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      }).start();
    } else {
      // Reset animation values if itemsLoaded is false (e.g., on filter change)
      fadeAnim.setValue(0);
      slideAnim.setValue(20);
    }
  }, [fadeAnim, slideAnim, index, itemsLoaded]);
  
  // If not yet loaded for animation, render transparently or not at all to avoid flash
  // However, for simplicity in this pass, we let it animate from value 0.

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      {renderContent(item)}
    </Animated.View>
  );
};

// Relationship badge component
const RelationshipBadge: React.FC<{ user: User; navigation: NavigationProp<ParamListBase>; theme: any }> = ({ user, navigation, theme }) => {
  const allUsers = useAuthStore(state => state.allUsers);
  
  if (user.role === 'student' && user.parent_id) {
    const parent = allUsers.find(u => u.id === user.parent_id);
    if (parent) {
      return (
        <TouchableOpacity 
          style={[styles.relationshipBadge, { backgroundColor: getRoleBgColor('parent', theme) }]}
          onPress={() => navigation.navigate('EditUserScreen', { userId: parent.id })}
        >
          <Icon name="users" size={12} color={getRoleColor('parent', theme)} style={styles.relationshipIcon} />
          <Text style={[styles.relationshipText, { color: getRoleColor('parent', theme) }]}>
            Parent: {parent.firstName} {parent.lastName}
          </Text>
          <Icon name="chevron-right" size={12} color={getRoleColor('parent', theme)} />
        </TouchableOpacity>
      );
    }
  }
  
  if (user.role === 'parent' && user.childrenIds && user.childrenIds.length > 0) {
    const children = allUsers.filter(u => user.childrenIds?.includes(u.id));
    if (children.length === 0) return null;
    
    if (children.length === 1) {
      const child = children[0];
      return (
        <TouchableOpacity 
          style={[styles.relationshipBadge, { backgroundColor: getRoleBgColor('student', theme) }]}
          onPress={() => navigation.navigate('EditUserScreen', { userId: child.id })}
        >
          <Icon name="user" size={12} color={getRoleColor('student', theme)} style={styles.relationshipIcon} />
          <Text style={[styles.relationshipText, { color: getRoleColor('student', theme) }]}>
            Child: {child.firstName} {child.lastName}
          </Text>
          <Icon name="chevron-right" size={12} color={getRoleColor('student', theme)} />
        </TouchableOpacity>
      );
    } else {
      return (
        <TouchableOpacity 
          style={[styles.relationshipBadge, { backgroundColor: getRoleBgColor('student', theme) }]}
          onPress={() => {
            // Show a popup with the list of children or navigate to a dedicated screen
            Alert.alert(
              'Children',
              children.map(child => `${child.firstName} ${child.lastName}`).join('\n'),
              [{ text: 'OK' }]
            );
          }}
        >
          <Icon name="users" size={12} color={getRoleColor('student', theme)} style={styles.relationshipIcon} />
          <Text style={[styles.relationshipText, { color: getRoleColor('student', theme) }]}>
            {children.length} Children
          </Text>
          <Icon name="chevron-right" size={12} color={getRoleColor('student', theme)} />
        </TouchableOpacity>
      );
    }
  }
  
  return null;
};

interface UserManagementScreenProps {
  navigation: NavigationProp<ParamListBase>;
}

const UserManagementScreen: React.FC<UserManagementScreenProps> = ({ navigation }) => {
  const theme = useTheme() as DefaultTheme & { 
    primary?: string; text?: string; textSecondary?: string; backgroundAlt?: string; 
    cardBackground?: string; danger?: string; success?: string; separator?: string; 
    greenDot?: string; yellowDot?: string; greyDot?: string; 
    tabActiveBorder?: string; tabInactiveBorder?: string; 
    tabActiveText?: string; tabInactiveText?: string; 
    subtleBorder?: string; // For minimalistic borders
    lightBackground?: string; // For lighter UI elements
    adminColor?: string; // Admin role color
    teacherColor?: string; // Teacher role color
    studentColor?: string; // Student role color
    parentColor?: string; // Parent role color
    warning?: string; // Warning color
    info?: string; // Info color
  };
  
  // Individual selectors for useAuthStore
  const allUsers = useAuthStore(state => state.allUsers);
  const fetchAllUsers = useAuthStore(state => state.fetchAllUsers);
  const loadingUsers = useAuthStore(state => state.loadingUsers);
  const usersError = useAuthStore(state => state.usersError);
  const deleteUser = useAuthStore(state => state.deleteUser);
  const deletingUser = useAuthStore(state => state.deletingUser);
  const deleteUserError = useAuthStore(state => state.deleteUserError);
  const clearDeleteUserError = useAuthStore(state => state.clearDeleteUserError);

  const [selectedRoleFilter, setSelectedRoleFilter] = useState<UserRole | 'All'>(USER_ROLE_FILTERS[0].value);
  const [itemsAnimLoaded, setItemsAnimLoaded] = useState(false);

  useEffect(() => {
    fetchAllUsers().then(() => {
        setTimeout(() => setItemsAnimLoaded(true), 50);
    });
  }, [fetchAllUsers]); // fetchAllUsers is stable from Zustand, so this runs once on mount

  // Handle user deletion
  const handleDeleteUser = useCallback((userId: string) => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete this user? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            const success = await deleteUser(userId);
            if (success) {
              Alert.alert('Success', 'User has been deleted successfully.');
            }
          } 
        }
      ]
    );
  }, [deleteUser]);

  // Error handling for deletion
  useEffect(() => {
    if (deleteUserError) {
      Alert.alert('Delete Failed', deleteUserError);
      clearDeleteUserError();
    }
  }, [deleteUserError, clearDeleteUserError]);

  // Purely compute filteredUsers
  const filteredUsers = useMemo(() => {
    if (selectedRoleFilter === 'All') {
      return allUsers;
    }
    return allUsers.filter(user => user.role === selectedRoleFilter);
  }, [allUsers, selectedRoleFilter]);

  // Effect to handle animation state when filteredUsers change
  useEffect(() => {
    setItemsAnimLoaded(false); // Reset animation flag
    const timer = setTimeout(() => {
      setItemsAnimLoaded(true); // Trigger animations for the new list
    }, 50); // Small delay for UI to update with new list before animating

    return () => clearTimeout(timer); // Cleanup timer
  }, [filteredUsers]); // This effect runs when the filteredUsers array reference changes

  const renderUserItemContent = useCallback((item: User) => {
    const lastLogin = item.lastLogin 
        ? new Date(item.lastLogin)
        : null;
    
    const formatLastLogin = (date: Date) => {
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 3600 * 24));
        
        if (diffDays === 0) {
            return 'Today';
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else if (diffDays < 30) {
            return `${Math.floor(diffDays / 7)} weeks ago`;
        } else {
            return `${Math.floor(diffDays / 30)} months ago`;
        }
    };
    
    const lastLoginText = lastLogin 
        ? `Last login: ${formatLastLogin(lastLogin)}`
        : 'Never logged in';
    
    const statusText = item.status === 'active' 
        ? 'Active' 
        : item.status === 'pending' 
            ? 'Pending' 
            : item.status === 'invited' 
                ? 'Invited' 
                : 'Inactive';
    
    const lastLoginOrStatusText = item.status === 'active' 
        ? lastLoginText 
        : `Status: ${statusText}`;
    
    const roleColor = getRoleColor(item.role, theme);
    const roleBgColor = getRoleBgColor(item.role, theme);
    const statusColor = getStatusColor(item.status, theme);
    
    const initials = getInitials(item.firstName, item.lastName);
    
    // Get relationship information
    let relationshipInfo = null;
    if (item.role === 'student' && item.parent_id) {
        const parent = allUsers.find(u => u.id === item.parent_id);
        if (parent) {
            relationshipInfo = (
                <View style={styles.relationshipInfo}>
                    <Text style={[styles.relationshipLabel, { color: theme.textSecondary }]}>
                        Parent:
                    </Text>
                    <Text style={[styles.relationshipValue, { color: theme.text }]}>
                        {parent.firstName} {parent.lastName}
                    </Text>
                </View>
            );
        }
    } else if (item.role === 'parent' && item.childrenIds && item.childrenIds.length > 0) {
        const children = allUsers.filter(u => item.childrenIds?.includes(u.id));
        if (children.length > 0) {
            relationshipInfo = (
                <View style={styles.relationshipInfo}>
                    <Text style={[styles.relationshipLabel, { color: theme.textSecondary }]}>
                        {children.length === 1 ? 'Child:' : `Children (${children.length}):`}
                    </Text>
                    <Text style={[styles.relationshipValue, { color: theme.text }]} numberOfLines={2} ellipsizeMode="tail">
                        {children.length === 1 
                            ? `${children[0].firstName} ${children[0].lastName}`
                            : children.map(c => `${c.firstName} ${c.lastName}`).join(', ')}
                    </Text>
                </View>
            );
        }
    }
    
    return (
      <View style={[styles.userCard, { backgroundColor: theme.cardBackground || '#ffffff' }]}>
        <View style={styles.userCardHeader}>
          <View style={[styles.avatarContainer, { backgroundColor: roleBgColor }]}>
            <Text style={[styles.avatarText, { color: roleColor }]}>{initials}</Text>
          </View>
          
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: theme.text }]}>
              {item.firstName} {item.lastName}
            </Text>
            <Text style={[styles.userEmail, { color: theme.textSecondary }]}>
              {item.email}
            </Text>
            
            {/* Show the relationship information directly in the card header */}
            {relationshipInfo}
          </View>
          
          <View style={styles.userActions}>
            <TouchableOpacity 
              onPress={() => navigation.navigate('EditUserScreen', { userId: item.id })} 
              style={[styles.actionButton, { borderColor: theme.subtleBorder || '#eeeeee' }]}
            >
              <Icon name="edit-2" size={16} color={theme.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => handleDeleteUser(item.id)} 
              style={[styles.actionButton, { borderColor: theme.subtleBorder || '#eeeeee' }]}
              disabled={deletingUser}
            >
              <Icon name="trash-2" size={16} color={theme.danger} />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={[styles.userCardBody, { borderTopColor: theme.subtleBorder || '#eeeeee' }]}>
          <View style={styles.userDetailsRow}>
            <View style={[styles.roleBadge, { backgroundColor: roleBgColor }]}>
              <Text style={[styles.roleText, { color: roleColor }]}>
                {item.role.charAt(0).toUpperCase() + item.role.slice(1)}
              </Text>
            </View>
            
            <View style={styles.statusContainer}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {statusText}
              </Text>
            </View>
            
            <Text style={[styles.lastLogin, { color: theme.textSecondary }]}>
              {lastLoginText}
            </Text>
          </View>
          
          {/* Relationship badge component remains as is */}
          <RelationshipBadge user={item} navigation={navigation} theme={theme} />
        </View>
      </View>
    );
  }, [theme, navigation, handleDeleteUser, deletingUser, allUsers]);

  if (loadingUsers && !allUsers.length) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: theme.backgroundAlt }]} edges={['top', 'right', 'left']}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ color: theme.textSecondary, marginTop: 10 }}>Loading users...</Text>
      </SafeAreaView>
    );
  }

  if (usersError) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: theme.backgroundAlt }]} edges={['top', 'right', 'left']}>
        <Icon name="alert-circle" size={40} color={theme.danger} />
        <Text style={[styles.errorText, { color: theme.danger }]}>Error: {usersError}</Text>
        <TouchableOpacity onPress={() => { setItemsAnimLoaded(false); fetchAllUsers().then(() => setTimeout(() => setItemsAnimLoaded(true), 50)); }} style={styles.retryButton}>
            <Text style={{color: theme.primary}}>Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundAlt || '#f4f6f8' }]} edges={['right', 'left']}>
   
      <FlatList
        data={filteredUsers}
        renderItem={({ item, index }) => (
            <AnimatedUserItem 
                item={item} 
                index={index} 
                renderContent={renderUserItemContent} 
                itemsLoaded={itemsAnimLoaded}
            />
        )}
        style={{marginTop: 8}}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContentContainer}
        ListHeaderComponent={
          <View style={{marginTop: 6}}>
            <View style={styles.pageHeaderContainer}>
              <View style={styles.pageTitleContainer}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>User Management</Text>
                <Text style={[styles.headerSubtitle, { color: theme.textSecondary}]}>Manage system users, roles and permissions.</Text>
              </View>
              <TouchableOpacity 
                style={[styles.addUserButton, { backgroundColor: theme.primary || '#007bff' }]} 
                onPress={() => navigation.navigate('AddUserScreen')}
              >
                <Icon name="user-plus" size={16} color="#fff" style={{marginRight: 6}}/>
                <Text style={styles.addUserButtonText}>Add User</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterTabsScrollContainer}>
              {USER_ROLE_FILTERS.map(filter => (
                <TouchableOpacity 
                  key={filter.value} 
                  style={[
                    styles.filterTab,
                    {
                      backgroundColor: selectedRoleFilter === filter.value 
                        ? (filter.value !== 'All' ? getRoleBgColor(filter.value as UserRole, theme) : theme.primary + '15') 
                        : (theme.lightBackground || 'transparent'),
                      borderColor: selectedRoleFilter === filter.value
                        ? (filter.value !== 'All' ? getRoleColor(filter.value as UserRole, theme) : theme.primary)
                        : (theme.tabInactiveBorder || theme.subtleBorder || '#ddd')
                    }
                  ]}
                  onPress={() => setSelectedRoleFilter(filter.value)}
                >
                  <Text 
                    style={[
                      styles.filterTabText,
                      {
                        color: selectedRoleFilter === filter.value 
                          ? (filter.value !== 'All' ? getRoleColor(filter.value as UserRole, theme) : theme.primary) 
                          : (theme.tabInactiveText || theme.textSecondary || '#555')
                      }
                    ]}
                  >
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {loadingUsers && allUsers.length > 0 && (
                 <ActivityIndicator style={styles.inlineLoader} size="small" color={theme.primary} />
            )}
          </View>
        }
        ListEmptyComponent={
          !loadingUsers ? (
            <View style={styles.centeredListEmpty}>
              <Icon name="users" size={48} color={theme.textSecondary} style={{marginBottom: 10}}/>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No users found for "{USER_ROLE_FILTERS.find(f=>f.value === selectedRoleFilter)?.label || selectedRoleFilter}".</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 0,
    paddingTop: 6,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 0,
    paddingTop: 0,
  },
  centeredListEmpty: {
    alignItems: 'center',
    paddingVertical: 60,
    opacity: 0.7,
  },
  pageHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
    marginTop: 4,
  },
  pageTitleContainer: {
    flex: 1,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14, 
    lineHeight: 20,
  },
  addUserButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    marginLeft: 10,
  },
  addUserButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  filterTabsScrollContainer: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    marginTop: 6,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 10,
    borderWidth: 1,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  inlineLoader: {
    marginVertical: 15,
  },
  listContentContainer: {
    paddingBottom: 20,
    paddingTop: 0,
    paddingHorizontal: 16,
  },
  userCard: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  userCardHeader: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  userCardBody: {
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
  },
  userActions: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderWidth: 1,
  },
  userDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginRight: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  lastLogin: {
    fontSize: 12,
  },
  relationshipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 12,
  },
  relationshipIcon: {
    marginRight: 6,
  },
  relationshipText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 15,
    fontSize: 15,
    textAlign: 'center', 
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
  },
  relationshipInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  relationshipLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginRight: 6,
  },
  relationshipValue: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default UserManagementScreen; 