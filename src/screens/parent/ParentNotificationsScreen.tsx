import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Alert
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Feather';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ParentNotification
} from '../../services/parentService';
import {
  fetchParentNotifications,
  markParentNotificationAsRead
} from '../../services/parentSupabaseService';
import { ParentTabParamList } from '../../navigators/ParentTabNavigator';
import { useAuthStore } from '../../store/authStore';
import { useAppTheme } from '../../contexts/ThemeContext';

// Define navigation type
type ParentNavigationProp = StackNavigationProp<ParentTabParamList>;

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  
  // Format date depending on how old it is
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const notifDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  if (notifDate.getTime() === today.getTime()) {
    return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  } else if (notifDate.getTime() === yesterday.getTime()) {
    return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: 'numeric',
      minute: '2-digit'
    });
  }
};

// Get icon for notification type
const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'grade': return 'award';
    case 'attendance': return 'user-check';
    case 'behavior': return 'alert-triangle';
    case 'announcement': return 'bell';
    case 'event': return 'calendar';
    default: return 'info';
  }
};

// Get color for notification type
const getNotificationColor = (type: string) => {
  switch (type) {
    case 'grade': return '#4A90E2';
    case 'attendance': return '#F44336';
    case 'behavior': return '#FF9800';
    case 'announcement': return '#66BB6A';
    case 'event': return '#9C27B0';
    default: return '#999999';
  }
};

const ParentNotificationsScreen = () => {
  const [notifications, setNotifications] = useState<ParentNotification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<ParentNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  
  const navigation = useNavigation<ParentNavigationProp>();
  const { user } = useAuthStore();
  const { theme } = useAppTheme();
  
  // Load notifications when component mounts
  useEffect(() => {
    loadNotifications();
  }, [user]);
  
  // Refresh notifications when the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadNotifications();
      return () => {};
    }, [user])
  );
  
  // Load notifications function
  const loadNotifications = async () => {
    try {
      setError(null);
      
      if (!user || !user.id) {
        setError('User not authenticated. Please log in again.');
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      // Get read notification states from AsyncStorage
      const readNotificationsJson = await AsyncStorage.getItem('readParentNotifications');
      const readNotifications = readNotificationsJson ? JSON.parse(readNotificationsJson) : {};
      
      // Fetch notifications from Supabase
      const notificationsData = await fetchParentNotifications(user.id);
      
      // Mark notifications as read if they're in AsyncStorage
      const notificationsWithReadState = notificationsData.map(notification => ({
        ...notification,
        read: readNotifications[notification.id] === true
      }));
      
      setNotifications(notificationsWithReadState);
      setFilteredNotifications(notificationsWithReadState);
      setLoading(false);
      setRefreshing(false);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications. Please try again.');
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Handle pull-to-refresh
  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };
  
  // Filter notifications based on search query and active filter
  useEffect(() => {
    let result = notifications;
    
    // Apply type filter
    if (activeFilter) {
      if (activeFilter === 'parent') {
        // Filter for parent-specific announcements
        result = result.filter(notif => 
          notif.type === 'announcement' && 
          !['grade', 'attendance', 'behavior', 'event'].includes(notif.type)
        );
      } else {
        // Regular type filtering
        result = result.filter(notif => notif.type === activeFilter);
      }
    }
    
    // Apply text search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        notif => 
          notif.title.toLowerCase().includes(query) || 
          notif.message.toLowerCase().includes(query)
      );
    }
    
    setFilteredNotifications(result);
  }, [notifications, searchQuery, activeFilter]);
  
  // Handle notification press
  const handleNotificationPress = async (notification: ParentNotification) => {
    try {
      // Skip if already read
      if (notification.read) return;
      
      // Mark as read in AsyncStorage
      const readNotificationsJson = await AsyncStorage.getItem('readParentNotifications');
      const readNotifications = readNotificationsJson ? JSON.parse(readNotificationsJson) : {};
      
      // Update the read status
      readNotifications[notification.id] = true;
      await AsyncStorage.setItem('readParentNotifications', JSON.stringify(readNotifications));
      
      // Try to mark as read on server (though this might be a no-op now)
      await markParentNotificationAsRead(notification.id);
      
      // Update local state
      const updateReadStatus = (items: ParentNotification[]) => 
        items.map(n => (n.id === notification.id ? { ...n, read: true } : n));
      
      setNotifications(updateReadStatus);
      setFilteredNotifications(updateReadStatus);
      
      // Handle notification based on type
      if (notification.type === 'grade' && notification.relatedStudentId) {
        navigation.navigate('Home', {
          screen: 'ParentChildGrades',
          params: {
            childId: notification.relatedStudentId,
            childName: notification.message.split(' ')[0]
          }
        });
      } else if (notification.type === 'announcement') {
        // For announcements, show a detailed view with full message
        Alert.alert(
          notification.title,
          notification.message,
          [{ text: 'OK', style: 'default' }]
        );
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
      Alert.alert('Error', 'Failed to process notification');
    }
  };
  
  // Toggle filter
  const toggleFilter = (filter: string) => {
    if (activeFilter === filter) {
      setActiveFilter(null);
    } else {
      setActiveFilter(filter);
    }
  };
  
  // Mark all as read
  const markAllAsRead = async () => {
    try {
      // Get existing read notifications
      const readNotificationsJson = await AsyncStorage.getItem('readParentNotifications');
      const readNotifications = readNotificationsJson ? JSON.parse(readNotificationsJson) : {};
      
      // Mark all as read in the object
      notifications.forEach(notification => {
        readNotifications[notification.id] = true;
      });
      
      // Save back to AsyncStorage
      await AsyncStorage.setItem('readParentNotifications', JSON.stringify(readNotifications));
      
      // Update local state
      const updatedNotifications = notifications.map(n => ({ ...n, read: true }));
      setNotifications(updatedNotifications);
      setFilteredNotifications(
        filteredNotifications.map(n => ({ ...n, read: true }))
      );
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      Alert.alert('Error', 'Failed to mark notifications as read');
    }
  };
  
  // Render notification item
  const renderNotificationItem = ({ item }: { item: ParentNotification }) => {
    const isParentSpecific = item.type === 'announcement';
    
    return (
      <TouchableOpacity 
        style={[
          styles.notificationItem,
          { 
            backgroundColor: theme.cardBackground,
            shadowColor: theme.text,
            borderColor: theme.border
          },
          item.read 
            ? { backgroundColor: theme.cardBackground }
            : { backgroundColor: theme.highlight },
          isParentSpecific && { borderLeftWidth: 4, borderLeftColor: '#66BB6A' }
        ]}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={[styles.notificationIcon, { backgroundColor: getNotificationColor(item.type) }]}>
          <Icon name={getNotificationIcon(item.type)} size={20} color="#FFFFFF" />
        </View>
        
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text style={[styles.notificationTitle, { color: theme.text }]}>
              {item.title}
              {isParentSpecific && <Text style={styles.parentTag}> • Parent</Text>}
            </Text>
            {!item.read && <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />}
          </View>
          <Text style={[styles.notificationMessage, { color: theme.textSecondary }]}>{item.message}</Text>
          <Text style={[styles.notificationDate, { color: theme.subtleText }]}>{formatDate(item.date)}</Text>
        </View>
      </TouchableOpacity>
    );
  };
  
  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top', 'left', 'right', 'bottom']}>
        <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading notifications...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  if (error) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top', 'left', 'right', 'bottom']}>
        <View style={[styles.errorContainer, { backgroundColor: theme.background }]}>
          <Icon name="alert-circle" size={50} color={theme.danger} />
          <Text style={[styles.errorText, { color: theme.textSecondary }]}>{error}</Text>
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: theme.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  const unreadCount = notifications.filter(n => !n.read).length;
  
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top', 'left', 'right', 'bottom']}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" size={24} color={theme.primary} />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <Text style={[styles.screenTitle, { color: theme.text }]}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          
          {unreadCount > 0 && (
            <TouchableOpacity 
              style={styles.markReadButton}
              onPress={markAllAsRead}
            >
              <Text style={[styles.markReadText, { color: theme.primary }]}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Search bar */}
        <View style={[styles.searchContainer, { 
          backgroundColor: theme.cardBackground, 
          borderColor: theme.border 
        }]}>
          <Icon name="search" size={18} color={theme.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search notifications..."
            placeholderTextColor={theme.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>
        
        {/* Filter buttons */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity 
              style={[
                styles.filterButton, 
                { backgroundColor: theme.cardBackground, borderColor: theme.border },
                activeFilter === 'grade' && { backgroundColor: getNotificationColor('grade') }
              ]}
              onPress={() => toggleFilter('grade')}
            >
              <Icon 
                name="award" 
                size={14} 
                color={activeFilter === 'grade' ? '#FFFFFF' : getNotificationColor('grade')} 
              />
              <Text style={[
                styles.filterText,
                { color: activeFilter === 'grade' ? '#FFFFFF' : theme.textSecondary }
              ]}>Grades</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.filterButton, 
                { backgroundColor: theme.cardBackground, borderColor: theme.border },
                activeFilter === 'attendance' && { backgroundColor: getNotificationColor('attendance') }
              ]}
              onPress={() => toggleFilter('attendance')}
            >
              <Icon 
                name="user-check" 
                size={14} 
                color={activeFilter === 'attendance' ? '#FFFFFF' : getNotificationColor('attendance')} 
              />
              <Text style={[
                styles.filterText,
                { color: activeFilter === 'attendance' ? '#FFFFFF' : theme.textSecondary }
              ]}>Attendance</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.filterButton, 
                { backgroundColor: theme.cardBackground, borderColor: theme.border },
                activeFilter === 'behavior' && { backgroundColor: getNotificationColor('behavior') }
              ]}
              onPress={() => toggleFilter('behavior')}
            >
              <Icon 
                name="alert-triangle" 
                size={14} 
                color={activeFilter === 'behavior' ? '#FFFFFF' : getNotificationColor('behavior')} 
              />
              <Text style={[
                styles.filterText,
                { color: activeFilter === 'behavior' ? '#FFFFFF' : theme.textSecondary }
              ]}>Behavior</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.filterButton, 
                { backgroundColor: theme.cardBackground, borderColor: theme.border },
                activeFilter === 'announcement' && { backgroundColor: getNotificationColor('announcement') }
              ]}
              onPress={() => toggleFilter('announcement')}
            >
              <Icon 
                name="bell" 
                size={14} 
                color={activeFilter === 'announcement' ? '#FFFFFF' : getNotificationColor('announcement')} 
              />
              <Text style={[
                styles.filterText,
                { color: activeFilter === 'announcement' ? '#FFFFFF' : theme.textSecondary }
              ]}>Announcements</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.filterButton,
                { backgroundColor: theme.cardBackground, borderColor: theme.border },
                activeFilter === 'parent' && { backgroundColor: '#66BB6A' }
              ]}
              onPress={() => toggleFilter('parent')}
            >
              <Icon 
                name="users" 
                size={14} 
                color={activeFilter === 'parent' ? '#FFFFFF' : '#66BB6A'} 
              />
              <Text style={[
                styles.filterText,
                { color: activeFilter === 'parent' ? '#FFFFFF' : theme.textSecondary }
              ]}>Parent Info</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.filterButton, 
                { backgroundColor: theme.cardBackground, borderColor: theme.border },
                activeFilter === 'event' && { backgroundColor: getNotificationColor('event') }
              ]}
              onPress={() => toggleFilter('event')}
            >
              <Icon 
                name="calendar" 
                size={14} 
                color={activeFilter === 'event' ? '#FFFFFF' : getNotificationColor('event')} 
              />
              <Text style={[
                styles.filterText,
                { color: activeFilter === 'event' ? '#FFFFFF' : theme.textSecondary }
              ]}>Events</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
        
        {/* Notifications list */}
        <FlatList
          data={filteredNotifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.notificationsList}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Icon name="bell-off" size={50} color={theme.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                {activeFilter || searchQuery
                  ? 'No notifications match your filters'
                  : 'No notifications yet'}
              </Text>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  badgeContainer: {
    backgroundColor: '#F44336',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  markReadButton: {
    marginLeft: 'auto',
  },
  markReadText: {
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 12,
    marginLeft: 4,
  },
  notificationsList: {
    padding: 16,
    paddingTop: 8,
  },
  notificationItem: {
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  notificationUnread: {
  },
  notificationRead: {
  },
  parentSpecificNotification: {
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  parentTag: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#66BB6A',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 14,
    marginBottom: 8,
  },
  notificationDate: {
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
});

export default ParentNotificationsScreen; 