import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl,
  Image,
  Dimensions,
  Alert,
  ImageBackground
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/Feather';
import { useAuthStore } from '../../store/authStore';
import { getStudentCourses, Course } from '../../services/courseService';

// Define navigation type
type RootStackParamList = {
  CourseDetail: { courseId: number };
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'CourseDetail'>;

// Format date to a readable format
const formatDate = (dateString?: string) => {
  if (!dateString) return 'Not scheduled';
  
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });
};

// Updated Course interface to include progress
interface ExtendedCourse extends Course {
  progress?: number;
  image_url?: string;
}

// Array of background colors for course cards
const CARD_COLORS = [
  { bg: '#EBF3FE', text: '#2C73D2', accent: '#4A90E2' },
  { bg: '#FFF0EE', text: '#D23A2C', accent: '#FF6B6B' },
  { bg: '#F0F9EA', text: '#5BAD2E', accent: '#8BC34A' },
  { bg: '#FFF8E6', text: '#F49C00', accent: '#FFC107' },
  { bg: '#F4EAFA', text: '#9C27B0', accent: '#BB86FC' },
  { bg: '#E8F8F5', text: '#16A085', accent: '#1ABC9C' },
  { bg: '#FDEBED', text: '#C0392B', accent: '#E74C3C' },
  { bg: '#ECF0F1', text: '#34495E', accent: '#7F8C8D' }
];

const CoursesScreen = () => {
  const [courses, setCourses] = useState<ExtendedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthStore();

  // Load courses data from Supabase
  const loadCourses = async () => {
    if (!user) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    try {
      const studentCourses = await getStudentCourses(user.id);
      
      // Add mock progress data for each course
      const coursesWithProgress = studentCourses.map(course => ({
        ...course,
        progress: Math.floor(Math.random() * 100) // Random progress for demo
      }));
      
      setCourses(coursesWithProgress);
      setError(null);
    } catch (err) {
      console.error('Error fetching courses:', err);
      setError('Failed to load courses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCourses();
    setRefreshing(false);
  };

  const renderCourseItem = ({ item, index }: { item: ExtendedCourse, index: number }) => {
    // Get a random color scheme from our colors array
    const colorIndex = item.id ? Math.abs(item.id % CARD_COLORS.length) : index % CARD_COLORS.length;
    const colorScheme = CARD_COLORS[colorIndex] || CARD_COLORS[0]; // Fallback to first color if undefined
    
    // Set a default image for courses that don't have one
    const courseImage = item.image_url || 
      `https://source.unsplash.com/random/600x350/?${encodeURIComponent(item.subjectname.toLowerCase())}`;
    
    // Alternate card layout for visual variety
    const isAlternateLayout = index % 2 === 1;
    
    return (
      <TouchableOpacity 
        style={[
          styles.courseCard,
          { backgroundColor: colorScheme.bg },
          isAlternateLayout ? styles.courseCardAlt : null
        ]} 
        onPress={() => navigation.navigate('CourseDetail', { courseId: item.id })}
        activeOpacity={0.9}
      >
        <ImageBackground
          source={{ uri: courseImage }}
          style={styles.courseImage}
          imageStyle={styles.courseImageStyle}
        >
          <View style={styles.courseImageOverlay}>
            <View style={styles.courseImageContent}>
              <View style={[styles.courseTag, { backgroundColor: colorScheme.accent }]}>
                <Text style={styles.courseTagText}>{item.code || 'Course'}</Text>
              </View>
              
              <Text style={styles.courseTitle}>{item.subjectname}</Text>
              
              <View style={styles.courseInstructorContainer}>
                <Icon name="user" size={14} color="#FFFFFF" />
                <Text style={styles.courseInstructor}>
                  {item.teacherName || 'No Teacher Assigned'}
                </Text>
              </View>
            </View>
          </View>
        </ImageBackground>
        
        <View style={styles.courseContent}>
          {item.description && (
            <Text style={[styles.courseDescription, { color: colorScheme.text }]} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressText, { color: colorScheme.text }]}>Progress</Text>
              <Text style={[styles.progressValue, { color: colorScheme.accent }]}>{item.progress || 0}%</Text>
            </View>
            <View style={styles.progressBarBackground}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { 
                    width: `${item.progress || 0}%`,
                    backgroundColor: colorScheme.accent
                  }
                ]} 
              />
            </View>
          </View>
          
          <View style={styles.courseStats}>
            <View style={styles.statItem}>
              <Icon name="book" size={16} color={colorScheme.accent} />
              <Text style={[styles.statText, { color: colorScheme.text }]}>
                {item.lessons?.length || 0} Lessons
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Icon name="clock" size={16} color={colorScheme.accent} />
              <Text style={[styles.statText, { color: colorScheme.text }]}>
                {item.status || 'Active'}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading your courses...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle" size={50} color="#F44336" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadCourses}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={courses}
        renderItem={renderCourseItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={() => (
          <View style={styles.header}>
            <Text style={styles.headerTitle}>My Courses</Text>
            <Text style={styles.headerSubtitle}>
              You are enrolled in {courses.length} courses
            </Text>
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Icon name="book" size={50} color="#ccc" />
            <Text style={styles.emptyText}>You are not enrolled in any courses yet</Text>
          </View>
        )}
      />
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  courseCard: {
    borderRadius: 16,
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  courseCardAlt: {
    transform: [{ scale: 0.98 }],
  },
  courseImage: {
    width: '100%',
    height: 120, // Reduced from 160 to make header smaller
  },
  courseImageStyle: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  courseImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.4)'
  },
  courseImageContent: {
    width: '100%',
  },
  courseTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#4A90E2',
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  courseTagText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  courseTitle: {
    fontSize: 18, // Reduced from 20 to make header text smaller
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  courseInstructorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  courseInstructor: {
    fontSize: 12, // Reduced from 14 to make instructor text smaller
    color: '#FFFFFF',
    marginLeft: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  courseContent: {
    padding: 16,
  },
  courseDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  courseStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 13,
    marginLeft: 6,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default CoursesScreen; 