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
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { useAuthStore } from '../../store/authStore';
import { Assignment, getStudentAssignments } from '../../services/assignmentService';
import { StackNavigationProp } from '@react-navigation/stack';

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
}

const AssignmentsScreen = () => {
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
      const assignmentsData = await getStudentAssignments(user.id);
      setAssignments(assignmentsData);
      setFilteredAssignments(assignmentsData);
    } catch (err) {
      console.error('Error fetching assignments:', err);
      setError('Failed to load assignments. Please try again.');
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
      case 'completed': return '#4CAF50';
      case 'in_progress': return '#FF9800';
      case 'overdue': return '#F44336';
      case 'not_started': return '#2196F3';
      default: return '#2196F3';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in_progress': return 'In Progress';
      case 'overdue': return 'Overdue';
      case 'not_started': return 'Not Started';
      default: return 'Unknown';
    }
  };

  const renderAssignmentItem = ({ item }: { item: Assignment }) => {
    const dueDate = item.duedate ? new Date(item.duedate) : null;
    const today = new Date();
    const isOverdue = dueDate && dueDate < today && item.status !== 'completed';
    const statusColor = isOverdue ? '#F44336' : getStatusColor(item.status);
    
    return (
      <TouchableOpacity 
        style={styles.assignmentCard}
        onPress={() => navigation.navigate('AssignmentDetail', { assignmentId: item.id })}
      >
        <View style={styles.assignmentHeader}>
          <View style={styles.subjectContainer}>
            <Text style={styles.subjectText}>{item.subject?.subjectname || 'No Subject'}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>
              {isOverdue ? 'Overdue' : getStatusText(item.status)}
            </Text>
          </View>
        </View>
        
        <Text style={styles.assignmentTitle}>{item.title}</Text>
        {item.description && (
          <Text style={styles.assignmentDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        
        <View style={styles.assignmentFooter}>
          <View style={styles.dueContainer}>
            <Icon name="clock" size={16} color="#666" style={styles.footerIcon} />
            <Text style={[
              styles.dueText,
              isOverdue && styles.overdueText
            ]}>
              {item.status === 'completed' && item.submissions && item.submissions.length > 0 
                ? 'Submitted: ' + formatDate(item.submissions[0].submittedat) 
                : 'Due: ' + formatDate(item.duedate)}
            </Text>
          </View>
          
          {item.status === 'completed' && item.submissions && item.submissions.length > 0 && item.submissions[0].grade && (
            <View style={styles.gradeContainer}>
              <Text style={styles.gradeLabel}>Grade:</Text>
              <Text style={styles.gradeText}>{item.submissions[0].grade} / {item.maxscore || '??'}</Text>
            </View>
          )}
          
          {item.attachments && item.attachments.length > 0 && (
            <View style={styles.attachmentIndicator}>
              <Icon name="paperclip" size={16} color="#666" />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading assignments...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle" size={50} color="#F44336" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={loadAssignments}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search assignments..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="x" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Filter Tabs */}
      <View style={styles.tabContainer}>
        <ScrollableTab 
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
      
      {/* Assignment List */}
      <FlatList
        data={filteredAssignments}
        renderItem={renderAssignmentItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Icon name="clipboard" size={50} color="#ccc" />
            <Text style={styles.emptyText}>
              {searchQuery.length > 0 
                ? "No assignments match your search" 
                : "No assignments in this category"}
            </Text>
          </View>
        )}
      />
    </View>
  );
};

// Fix the ScrollableTab component
const ScrollableTab: React.FC<ScrollableTabProps> = ({ tabs, activeTab, onTabChange }) => {
  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabScrollContainer}
      data={tabs}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity
          key={item.id}
          style={[styles.tab, activeTab === item.id && styles.activeTab]}
          onPress={() => onTabChange(item.id)}
        >
          <Text 
            style={[styles.tabText, activeTab === item.id && styles.activeTabText]}
          >
            {item.label}
          </Text>
        </TouchableOpacity>
      )}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#333',
  },
  tabContainer: {
    marginBottom: 10,
  },
  tabScrollContainer: {
    paddingHorizontal: 16,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  activeTab: {
    backgroundColor: '#4A90E2',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
  },
  assignmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  assignmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subjectContainer: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#E3F2FD',
    borderRadius: 4,
  },
  subjectText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1976D2',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  assignmentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  assignmentDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
    lineHeight: 20,
  },
  assignmentFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  dueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerIcon: {
    marginRight: 6,
  },
  dueText: {
    fontSize: 12,
    color: '#666666',
  },
  overdueText: {
    color: '#F44336',
    fontWeight: '500',
  },
  gradeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gradeLabel: {
    fontSize: 12,
    color: '#666666',
    marginRight: 4,
  },
  gradeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  attachmentIndicator: {
    marginLeft: 'auto',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
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
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default AssignmentsScreen; 