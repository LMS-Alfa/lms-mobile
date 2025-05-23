import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

// Mock data for announcements
const mockAnnouncements = [
  {
    id: 1,
    title: 'Final Exam Schedule Released',
    content: 'The schedule for final exams has been released. Please check your student portal for your personalized exam timetable.',
    date: '2023-05-15T10:30:00',
    author: 'Academic Affairs Office',
    type: 'institution',
    course: null,
    isRead: false,
    isImportant: true
  },
  {
    id: 2,
    title: 'Midterm Exam Date Change',
    content: 'The midterm exam for Mathematics 101 has been rescheduled to May 25th due to a scheduling conflict with the campus event. The exam will now take place from 10:00 AM to 12:00 PM in Hall A.',
    date: '2023-05-12T15:45:00',
    author: 'Dr. Robert Chen',
    type: 'course',
    course: 'Mathematics',
    isRead: true,
    isImportant: true
  },
  {
    id: 3,
    title: 'Campus Closed for Memorial Day',
    content: 'Please note that the campus will be closed on Monday, May 29th in observance of Memorial Day. All classes and administrative services will be suspended. Regular operations will resume on Tuesday, May 30th.',
    date: '2023-05-10T09:15:00',
    author: 'Administration',
    type: 'institution',
    course: null,
    isRead: true,
    isImportant: false
  },
  {
    id: 4,
    title: 'Lab Report Guidelines Updated',
    content: 'The guidelines for the upcoming physics lab report have been updated. Please review the new format requirements in the course materials section before submitting your report.',
    date: '2023-05-08T14:20:00',
    author: 'Prof. Sarah Johnson',
    type: 'course',
    course: 'Physics',
    isRead: false,
    isImportant: false
  },
  {
    id: 5,
    title: 'Essay Submission Deadline Extended',
    content: 'Due to multiple requests, the deadline for the Macbeth analysis essay has been extended to June 2nd at 11:59 PM. No further extensions will be granted.',
    date: '2023-05-06T16:30:00',
    author: 'Dr. Emily Thompson',
    type: 'course',
    course: 'English Literature',
    isRead: true,
    isImportant: false
  },
  {
    id: 6,
    title: 'System Maintenance Notice',
    content: 'The student portal will be undergoing scheduled maintenance on Saturday, May 20th from 2:00 AM to 6:00 AM. During this time, access to the portal and its services will be temporarily unavailable.',
    date: '2023-05-05T11:00:00',
    author: 'IT Department',
    type: 'system',
    course: null,
    isRead: true,
    isImportant: true
  },
  {
    id: 7,
    title: 'Guest Lecture Announcement',
    content: 'We are pleased to announce a special guest lecture by Dr. James Miller, a renowned historian, on "Ancient Civilizations and Their Impact on Modern Society." The lecture will take place on May 26th at 4:00 PM in the Main Auditorium.',
    date: '2023-05-03T13:40:00',
    author: 'Prof. Michael Brown',
    type: 'course',
    course: 'History',
    isRead: false,
    isImportant: false
  },
  {
    id: 8,
    title: 'Chemistry Quiz Postponed',
    content: 'The quiz scheduled for this week has been postponed to next week due to lab equipment maintenance. The new date will be announced soon.',
    date: '2023-05-01T10:15:00',
    author: 'Dr. Lisa Rodriguez',
    type: 'course',
    course: 'Chemistry',
    isRead: false,
    isImportant: true
  },
  {
    id: 9,
    title: 'Registration for Fall Semester Opens Soon',
    content: 'Registration for the Fall 2023 semester will open on June 1st. Please review your degree requirements and consult with your academic advisor before registration.',
    date: '2023-04-28T09:30:00',
    author: 'Registrar Office',
    type: 'institution',
    course: null,
    isRead: true,
    isImportant: true
  },
  {
    id: 10,
    title: 'Library Hours Extended During Finals Week',
    content: 'The main library will extend its hours during finals week (June 5-9). The library will be open from 7:00 AM to 2:00 AM to accommodate students preparing for exams.',
    date: '2023-04-25T14:50:00',
    author: 'Library Services',
    type: 'institution',
    course: null,
    isRead: true,
    isImportant: false
  }
];

// Helper function to format date
const formatDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    // Today, show time
    return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  } else if (diffDays === 1) {
    // Yesterday
    return 'Yesterday';
  } else if (diffDays < 7) {
    // Within a week
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  } else {
    // More than a week ago
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
};

const AnnouncementsScreen = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [filteredAnnouncements, setFilteredAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedAnnouncement, setExpandedAnnouncement] = useState(null);
  
  // Simulate loading announcements data
  useEffect(() => {
    const loadAnnouncements = () => {
      // Simulate API call
      setTimeout(() => {
        setAnnouncements(mockAnnouncements);
        setFilteredAnnouncements(mockAnnouncements);
        setLoading(false);
      }, 1000);
    };

    loadAnnouncements();
  }, []);

  // Filter announcements based on active filter and search query
  useEffect(() => {
    let result = [...announcements];
    
    // Apply type filter
    if (activeFilter === 'course') {
      result = result.filter(a => a.type === 'course');
    } else if (activeFilter === 'institution') {
      result = result.filter(a => a.type === 'institution');
    } else if (activeFilter === 'unread') {
      result = result.filter(a => !a.isRead);
    } else if (activeFilter === 'important') {
      result = result.filter(a => a.isImportant);
    }
    
    // Apply search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      result = result.filter(a => 
        a.title.toLowerCase().includes(query) || 
        a.content.toLowerCase().includes(query) ||
        (a.course && a.course.toLowerCase().includes(query)) ||
        a.author.toLowerCase().includes(query)
      );
    }
    
    setFilteredAnnouncements(result);
  }, [activeFilter, searchQuery, announcements]);

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate refreshing data
    setTimeout(() => {
      setAnnouncements(mockAnnouncements);
      setFilteredAnnouncements(mockAnnouncements);
      setRefreshing(false);
    }, 1500);
  };

  const toggleExpandAnnouncement = (id) => {
    setExpandedAnnouncement(expandedAnnouncement === id ? null : id);
    
    // Mark as read if expanding
    if (expandedAnnouncement !== id) {
      const updatedAnnouncements = announcements.map(a => {
        if (a.id === id && !a.isRead) {
          return { ...a, isRead: true };
        }
        return a;
      });
      setAnnouncements(updatedAnnouncements);
    }
  };

  const getAnnouncementIcon = (type) => {
    switch (type) {
      case 'course': return 'book';
      case 'institution': return 'briefcase';
      case 'system': return 'settings';
      default: return 'bell';
    }
  };

  const getAnnouncementTypeLabel = (type) => {
    switch (type) {
      case 'course': return 'Course';
      case 'institution': return 'Institution';
      case 'system': return 'System';
      default: return 'General';
    }
  };

  const renderAnnouncementItem = ({ item }) => {
    const isExpanded = expandedAnnouncement === item.id;
    
    return (
      <TouchableOpacity 
        style={[
          styles.announcementCard,
          !item.isRead && styles.unreadCard
        ]}
        onPress={() => toggleExpandAnnouncement(item.id)}
        activeOpacity={0.7}
      >
        {!item.isRead && <View style={styles.unreadIndicator} />}
        
        <View style={styles.announcementHeader}>
          <View style={styles.announcementMeta}>
            <View style={styles.announcementTypeContainer}>
              <Icon 
                name={getAnnouncementIcon(item.type)} 
                size={14} 
                color="#666" 
                style={styles.typeIcon} 
              />
              <Text style={styles.announcementType}>
                {item.course || getAnnouncementTypeLabel(item.type)}
              </Text>
            </View>
            <Text style={styles.announcementDate}>{formatDate(item.date)}</Text>
          </View>
          
          <View style={styles.titleContainer}>
            <Text style={styles.announcementTitle} numberOfLines={isExpanded ? 0 : 2}>
              {item.isImportant && (
                <Text style={styles.importantTag}>IMPORTANT: </Text>
              )}
              {item.title}
            </Text>
          </View>
          
          <Text style={styles.announcementAuthor}>From: {item.author}</Text>
        </View>
        
        <View style={[
          styles.announcementContent,
          isExpanded ? styles.expandedContent : styles.collapsedContent
        ]}>
          <Text style={styles.contentText} numberOfLines={isExpanded ? 0 : 3}>
            {item.content}
          </Text>
          
          {!isExpanded && item.content.length > 150 && (
            <Text style={styles.readMoreText}>Read more</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading announcements...</Text>
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
          placeholder="Search announcements..."
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
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          <FilterTab 
            label="All" 
            icon="list" 
            isActive={activeFilter === 'all'} 
            onPress={() => setActiveFilter('all')} 
          />
          <FilterTab 
            label="Course" 
            icon="book" 
            isActive={activeFilter === 'course'} 
            onPress={() => setActiveFilter('course')} 
          />
          <FilterTab 
            label="Institution" 
            icon="briefcase" 
            isActive={activeFilter === 'institution'} 
            onPress={() => setActiveFilter('institution')} 
          />
          <FilterTab 
            label="Unread" 
            icon="mail" 
            isActive={activeFilter === 'unread'} 
            onPress={() => setActiveFilter('unread')} 
            count={announcements.filter(a => !a.isRead).length}
          />
          <FilterTab 
            label="Important" 
            icon="alert-triangle" 
            isActive={activeFilter === 'important'} 
            onPress={() => setActiveFilter('important')} 
            count={announcements.filter(a => a.isImportant).length}
          />
        </ScrollView>
      </View>
      
      {/* Announcements List */}
      <FlatList
        data={filteredAnnouncements}
        renderItem={renderAnnouncementItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Icon name="bell-off" size={50} color="#ccc" />
            <Text style={styles.emptyText}>
              {searchQuery.length > 0 
                ? "No announcements match your search" 
                : "No announcements to display"}
            </Text>
          </View>
        )}
      />
    </View>
  );
};

// Filter tab component
const FilterTab = ({ label, icon, isActive, onPress, count }) => {
  return (
    <TouchableOpacity
      style={[styles.filterTab, isActive && styles.activeFilterTab]}
      onPress={onPress}
    >
      <Icon name={icon} size={16} color={isActive ? '#FFFFFF' : '#666'} style={styles.filterIcon} />
      <Text style={[styles.filterText, isActive && styles.activeFilterText]}>
        {label}
      </Text>
      {count > 0 && (
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ScrollView component
const ScrollView = React.forwardRef((props, ref) => {
  return <FlatList ref={ref} {...props} horizontal />;
});

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
  filterContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  filterScrollContent: {
    paddingHorizontal: 16,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 10,
  },
  activeFilterTab: {
    backgroundColor: '#4A90E2',
  },
  filterIcon: {
    marginRight: 6,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeFilterText: {
    color: '#FFFFFF',
  },
  countBadge: {
    backgroundColor: '#FF5252',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  countText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
  },
  announcementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  unreadCard: {
    backgroundColor: '#F8FBFF',
  },
  unreadIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 4,
    height: '100%',
    backgroundColor: '#4A90E2',
  },
  announcementHeader: {
    padding: 16,
    paddingLeft: 20,
  },
  announcementMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  announcementTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIcon: {
    marginRight: 6,
  },
  announcementType: {
    fontSize: 12,
    color: '#666',
  },
  announcementDate: {
    fontSize: 12,
    color: '#999',
  },
  titleContainer: {
    marginBottom: 8,
  },
  announcementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    lineHeight: 22,
  },
  importantTag: {
    color: '#F44336',
    fontWeight: 'bold',
  },
  announcementAuthor: {
    fontSize: 12,
    color: '#666',
  },
  announcementContent: {
    paddingHorizontal: 16,
    paddingLeft: 20,
  },
  expandedContent: {
    paddingBottom: 16,
  },
  collapsedContent: {
    paddingBottom: 12,
  },
  contentText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  readMoreText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '500',
    marginTop: 4,
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

export default AnnouncementsScreen; 