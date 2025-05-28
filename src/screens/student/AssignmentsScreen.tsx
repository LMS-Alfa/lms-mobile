import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
  ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { useAuthStore } from '../../store/authStore';
import { Assignment, getStudentAssignments } from '../../services/assignmentService';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppTheme } from '../../contexts/ThemeContext';

const formatDate = (dateString: string | null) => {
  if (!dateString) return 'No date set';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });
};

// Define navigation types
type RootStackParamList = {
  AssignmentDetail: { assignmentId: number };
};

type AssignmentDetailNavigationProp = StackNavigationProp<RootStackParamList, 'AssignmentDetail'>;

// Define tab interface
interface ScrollableTabProps {
  tabs: Array<{ id: string; label: string }>;
  activeTab: string;
  onTabChange: (tabId: string) => void;
  theme: any;
}

const AssignmentsScreen = () => {
  const { theme } = useAppTheme();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [filteredAssignments, setFilteredAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigation = useNavigation<AssignmentDetailNavigationProp>();
  const { user } = useAuthStore();

  // Load assignments data from Supabase
  const loadAssignments = async () => {
    if (!user) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      setLoading(true);
      const assignmentsData = await getStudentAssignments(user.id);
      setAssignments(assignmentsData);
    } catch (err) {
      console.error('Error fetching assignments:', err);
      setError('Failed to load assignments. Please try again.');
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  // Load assignments on component mount
  useEffect(() => {
    loadAssignments();
  }, [user]);

  // Filter assignments based on active tab and search query
  useEffect(() => {
    let result = [...assignments];
    
    // Apply tab filter
    if (activeTab === 'upcoming') {
      result = result.filter(a => a.status === 'not_started');
    } else if (activeTab === 'in_progress') {
      result = result.filter(a => a.status === 'in_progress');
    } else if (activeTab === 'completed') {
      result = result.filter(a => a.status === 'completed');
    } else if (activeTab === 'overdue') {
      result = result.filter(a => a.status === 'overdue');
    }
    
    // Apply search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      result = result.filter(a => 
        (a.title && a.title.toLowerCase().includes(query)) || 
        (a.subject?.subjectname && a.subject.subjectname.toLowerCase().includes(query)) ||
        (a.description && a.description.toLowerCase().includes(query))
      );
    }
    
    setFilteredAssignments(result);
  }, [activeTab, searchQuery, assignments]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAssignments();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return theme.success;
      case 'in_progress': return theme.warning;
      case 'overdue': return theme.danger;
      case 'not_started': return theme.primary;
      default: return theme.primary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in_progress': return 'In Progress';
      case 'overdue': return 'Overdue';
      case 'not_started': return 'Not Started';
      default: return status.charAt(0).toUpperCase() + status.slice(1).replace('_',' ');
    }
  };

  const renderAssignmentItem = ({ item }: { item: Assignment }) => {
    const dueDate = item.duedate ? new Date(item.duedate) : null;
    const today = new Date();
    const currentStatus = String(item.status);
    const isOverdue = dueDate && dueDate < today && currentStatus !== 'completed';
    const statusColor = isOverdue ? theme.danger : getStatusColor(currentStatus);
    
    return (
      <TouchableOpacity 
        style={[styles.assignmentCard, { backgroundColor: theme.cardBackground, shadowColor: theme.text }]}
        onPress={() => navigation.navigate('AssignmentDetail', { assignmentId: item.id })}
      >
        <View style={styles.assignmentHeader}>
          <View style={[styles.subjectContainer, { backgroundColor: theme.primary + '33'}]}>
            <Text style={[styles.subjectText, { color: theme.primary }]}>{item.subject?.subjectname || 'No Subject'}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>
              {isOverdue ? 'Overdue' : getStatusText(currentStatus)}
            </Text>
          </View>
        </View>
        
        <Text style={[styles.assignmentTitle, { color: theme.text }]}>{item.title}</Text>
        {item.description && (
          <Text style={[styles.assignmentDescription, { color: theme.textSecondary }]} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        
        <View style={styles.assignmentFooter}>
          <View style={styles.dueContainer}>
            <Icon name="clock" size={16} color={theme.textSecondary} style={styles.footerIcon} />
            <Text style={[
              styles.dueText,
              { color: theme.textSecondary },
              isOverdue && { color: theme.danger }
            ]}>
              {currentStatus === 'completed' && item.submissions && item.submissions.length > 0 
                ? 'Submitted: ' + formatDate(item.submissions[0].submittedat) 
                : 'Due: ' + formatDate(item.duedate)}
            </Text>
          </View>
          
          {currentStatus === 'completed' && item.submissions && item.submissions.length > 0 && item.submissions[0].grade && (
            <View style={styles.gradeContainer}>
              <Text style={[styles.gradeLabel, { color: theme.textSecondary }]}>Grade:</Text>
              <Text style={[styles.gradeText, { color: theme.success }]}>{item.submissions[0].grade} / {item.maxscore || '??'}</Text>
            </View>
          )}
          
          {item.attachments && item.attachments.length > 0 && (
            <View style={styles.attachmentIndicator}>
              <Icon name="paperclip" size={16} color={theme.textSecondary} />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading assignments...</Text>
      </View>
    );
  }

  if (error && !refreshing) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.background }]}>
        <Icon name="alert-circle" size={50} color={theme.danger} />
        <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: theme.primary }]}
          onPress={loadAssignments}
        >
          <Text style={[styles.retryButtonText, { color: theme.cardBackground }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: theme.cardBackground, borderBottomColor: theme.separator }]}>
        <Icon name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search assignments..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={theme.textSecondary}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="x" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Filter Tabs */}
      <View style={[styles.tabOuterContainer, { backgroundColor: theme.cardBackground, borderBottomColor: theme.separator}]}>
        <ScrollableTab 
          theme={theme}
          tabs={[
            { id: 'all', label: 'All' },
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'in_progress', label: 'In Progress' },
            { id: 'overdue', label: 'Overdue' },
            { id: 'completed', label: 'Completed' }
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </View>
      
      {error && refreshing && (
        <View style={[styles.inlineErrorView, {backgroundColor: theme.danger + '33'}]}>
          <Text style={[styles.inlineErrorText, {color: theme.danger}]}>Refresh failed: {error}</Text>
        </View>
      )}

      {filteredAssignments.length === 0 && !loading ? (
         <View style={styles.emptyContainer}>
          <Icon name="file-text" size={40} color={theme.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            {searchQuery ? 'No assignments match your search.' : `No ${activeTab !== 'all' ? getStatusText(activeTab) : ''} assignments.`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredAssignments}
          renderItem={renderAssignmentItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContentContainer}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              colors={[theme.primary]} 
              tintColor={theme.primary}
            />
          }
        />
      )}
    </View>
  );
};

// Fix the ScrollableTab component
const ScrollableTab: React.FC<ScrollableTabProps> = ({ tabs, activeTab, onTabChange, theme }) => {
  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false} 
      contentContainerStyle={styles.tabContainerScroll}
    >
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={[
            styles.tabItem,
            { backgroundColor: activeTab === tab.id ? theme.primary : theme.cardBackground },
            activeTab === tab.id && styles.activeTabItem
          ]}
          onPress={() => onTabChange(tab.id)}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === tab.id ? theme.cardBackground : theme.textSecondary }
          ]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 25,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  tabOuterContainer: {
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabContainerScroll: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  tabItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
    height: 38,
  },
  activeTabItem: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContentContainer: {
    padding: 16,
  },
  assignmentCard: {
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  assignmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subjectContainer: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
  },
  subjectText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  assignmentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  assignmentDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  assignmentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  dueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  footerIcon: {
    marginRight: 6,
  },
  dueText: {
    fontSize: 13,
    fontWeight: '500',
  },
  overdueText: {
    fontWeight: 'bold',
  },
  gradeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  gradeLabel: {
    fontSize: 13,
    marginRight: 4,
    fontWeight: '500',
  },
  gradeText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  attachmentIndicator: {
    paddingLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
  },
  inlineErrorView: {
    padding: 10,
    alignItems: 'center',
  },
  inlineErrorText: {
    fontSize: 14,
  },
});

export default AssignmentsScreen; 