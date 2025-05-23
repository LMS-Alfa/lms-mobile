import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Image,
  FlatList,
  Dimensions
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/Feather';
import { getCourseDetails, Course, Lesson } from '../../services/courseService';

// Define navigation types
type RootStackParamList = {
  CourseDetail: { courseId: number };
  LessonDetail: { lesson: Lesson };
};

type CourseDetailRouteProp = RouteProp<RootStackParamList, 'CourseDetail'>;
type CourseDetailNavigationProp = StackNavigationProp<RootStackParamList, 'CourseDetail'>;

// Course modules mock data (this would come from a Supabase query in a real app)
interface Material {
  id: number;
  title: string;
  type: 'pdf' | 'video' | 'zip' | string;
}

interface Module {
  id: number;
  title: string;
  description: string;
  isCompleted: boolean;
  materials: Material[];
}

interface Assignment {
  id: number;
  title: string;
  dueDate: string;
  status: 'completed' | 'in_progress' | 'not_started';
  grade: string | null;
  description: string;
}

const mockModules: Module[] = [
  {
    id: 1,
    title: 'Introduction',
    description: 'Overview of the course and basics',
    isCompleted: true,
    materials: [
      { id: 101, title: 'Course Syllabus', type: 'pdf' },
      { id: 102, title: 'Introduction Video', type: 'video' }
    ]
  },
  {
    id: 2,
    title: 'Fundamentals',
    description: 'Core concepts and principles',
    isCompleted: true,
    materials: [
      { id: 201, title: 'Lecture Notes', type: 'pdf' },
      { id: 202, title: 'Practice Problems', type: 'pdf' },
      { id: 203, title: 'Tutorial Video', type: 'video' }
    ]
  },
  {
    id: 3,
    title: 'Advanced Topics',
    description: 'In-depth exploration of complex subjects',
    isCompleted: false,
    materials: [
      { id: 301, title: 'Research Paper', type: 'pdf' },
      { id: 302, title: 'Case Study', type: 'pdf' },
      { id: 303, title: 'Lecture Recording', type: 'video' },
      { id: 304, title: 'Supplementary Materials', type: 'zip' }
    ]
  },
  {
    id: 4,
    title: 'Final Project',
    description: 'Comprehensive application of course material',
    isCompleted: false,
    materials: [
      { id: 401, title: 'Project Guidelines', type: 'pdf' },
      { id: 402, title: 'Reference Materials', type: 'zip' }
    ]
  }
];

// Course assignments mock data (this would come from a Supabase query in a real app)
const mockAssignments: Assignment[] = [
  {
    id: 1,
    title: 'Assignment 1',
    dueDate: '2023-06-01T23:59:00',
    status: 'completed',
    grade: 'A',
    description: 'Introductory assignment covering basic concepts'
  },
  {
    id: 2,
    title: 'Assignment 2',
    dueDate: '2023-06-15T23:59:00',
    status: 'in_progress',
    grade: null,
    description: 'Mid-term assignment focusing on core topics'
  },
  {
    id: 3,
    title: 'Final Project',
    dueDate: '2023-07-01T23:59:00',
    status: 'not_started',
    grade: null,
    description: 'Comprehensive final project to demonstrate mastery'
  }
];

// Format date to a readable format
const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return 'No date';
  
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
  status?: string;
}

const CourseDetailScreen = () => {
  const [course, setCourse] = useState<ExtendedCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('modules'); // 'modules', 'info'
  const navigation = useNavigation<CourseDetailNavigationProp>();
  const route = useRoute<CourseDetailRouteProp>();
  const { courseId } = route.params;

  // Load course data from Supabase
  useEffect(() => {
    const loadCourse = async () => {
      try {
        setLoading(true);
        const courseData = await getCourseDetails(courseId);
        setCourse({
          ...courseData,
          progress: 30, // Hardcoded for now, would come from API
          status: 'active' // Hardcoded for now, would come from API
        });
        setError(null);
        
        // Set navigation header title with the course name
        if (courseData) {
          navigation.setOptions({
            title: courseData.subjectname,
            headerStyle: {
              backgroundColor: courseData.color || '#4A90E2',
              elevation: 0,
              shadowOpacity: 0,
            }
          });
        }
      } catch (err) {
        console.error('Error fetching course details:', err);
        setError('Failed to load course details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadCourse();
  }, [courseId, navigation]);

  const renderModuleItem = ({ item }: { item: Lesson }) => {
    // Calculate a background gradient color based on the lesson ID
    const gradientIndex = item.id % 5;
    const gradientColors = [
      '#4A90E2', // Blue
      '#9B59B6', // Purple
      '#2ECC71', // Green
      '#F39C12', // Orange
      '#E74C3C', // Red
    ];
    const backgroundColor = gradientColors[gradientIndex];
    
    return (
      <TouchableOpacity 
        style={[styles.moduleCard, { borderLeftColor: backgroundColor, borderLeftWidth: 5 }]}
        onPress={() => navigation.navigate('LessonDetail', { lesson: item })}
      >
        <View style={styles.moduleHeader}>
          <View style={styles.moduleHeaderLeft}>
            <Text style={styles.moduleTitle}>{item.lessonname}</Text>
          </View>
          <View style={styles.moduleExpandButton}>
            <Icon name="chevron-right" size={20} color="#666" />
          </View>
        </View>
        
        {item.description && (
          <Text style={styles.moduleDescription} numberOfLines={2}>{item.description}</Text>
        )}
        
        <View style={styles.moduleContentInfo}>
          {item.videourl && (
            <View style={styles.contentTag}>
              <Icon name="video" size={14} color="#FFFFFF" />
              <Text style={styles.contentTagText}>Video</Text>
            </View>
          )}
          
          {item.fileurls && Array.isArray(item.fileurls) && item.fileurls.length > 0 && (
            <View style={styles.contentTag}>
              <Icon name="file" size={14} color="#FFFFFF" />
              <Text style={styles.contentTagText}>{item.fileurls.length} File{item.fileurls.length > 1 ? 's' : ''}</Text>
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
        <Text style={styles.loadingText}>Loading course details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle" size={50} color="#F44336" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!course) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle" size={50} color="#F44336" />
        <Text style={styles.errorText}>Course not found</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Course Header */}
        <View style={[styles.headerContainer, { backgroundColor: course.color || '#4A90E2' }]}>
          <View style={styles.courseInfo}>
            <Text style={styles.courseInstructor}>Teacher: {course.teacherName || 'No Teacher Assigned'}</Text>
            
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>{`${course.progress || 0}% Complete`}</Text>
              <View style={styles.progressBarBackground}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { width: `${course.progress || 0}%` }
                  ]} 
                />
              </View>
            </View>
          </View>
        </View>
        
        {/* Display debug info if there are no lessons */}
        {(activeTab === 'modules' && (!course.lessons || course.lessons.length === 0)) && (
          <View style={styles.debugContainer}>
            <Text style={styles.debugText}>No lessons found for this subject.</Text>
          </View>
        )}
        
        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'modules' && styles.activeTabButton]} 
            onPress={() => setActiveTab('modules')}
          >
            <Text 
              style={[styles.tabButtonText, activeTab === 'modules' && styles.activeTabButtonText]}
            >
              Lessons
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'info' && styles.activeTabButton]} 
            onPress={() => setActiveTab('info')}
          >
            <Text 
              style={[styles.tabButtonText, activeTab === 'info' && styles.activeTabButtonText]}
            >
              Info
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Tab Content */}
        <View style={styles.contentContainer}>
          {activeTab === 'modules' && (
            <View>
              <FlatList
                data={course.lessons}
                renderItem={renderModuleItem}
                keyExtractor={item => item.id.toString()}
                scrollEnabled={false}
                ListEmptyComponent={() => (
                  <View style={styles.emptyState}>
                    <Icon name="book" size={40} color="#ccc" />
                    <Text style={styles.emptyStateText}>No lessons available</Text>
                  </View>
                )}
              />
            </View>
          )}
          
          {activeTab === 'info' && (
            <View style={styles.infoContainer}>
              <View style={styles.infoSection}>
                <Text style={styles.infoSectionTitle}>About This Course</Text>
                <Text style={styles.infoText}>{course.description}</Text>
              </View>
              
              <View style={styles.infoSection}>
                <Text style={styles.infoSectionTitle}>Course Details</Text>
                <View style={styles.infoItem}>
                  <Text style={styles.infoItemLabel}>Course Code:</Text>
                  <Text style={styles.infoItemValue}>{course.code}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoItemLabel}>Status:</Text>
                  <Text style={[
                    styles.infoItemValue,
                    { 
                      color: 
                        course.status === 'active' ? '#4CAF50' : 
                        course.status === 'upcoming' ? '#2196F3' : 
                        '#FF9800'
                    }
                  ]}>
                    {course.status && course.status.charAt(0).toUpperCase() + course.status.slice(1) || 'Unknown'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.infoSection}>
                <Text style={styles.infoSectionTitle}>Instructor</Text>
                <View style={styles.instructorContainer}>
                  <View style={styles.instructorAvatar}>
                    <Text style={styles.instructorAvatarText}>
                      {course.teacherName?.charAt(0) || 'T'}
                    </Text>
                  </View>
                  <View style={styles.instructorInfo}>
                    <Text style={styles.instructorName}>{course.teacherName || 'No Teacher Assigned'}</Text>
                    <TouchableOpacity style={styles.contactButton}>
                      <Text style={styles.contactButtonText}>Contact</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
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
  backButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  headerContainer: {
    backgroundColor: '#4A90E2',
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  courseInfo: {
    padding: 20,
  },
  courseInstructor: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 15,
    fontWeight: '500',
  },
  progressContainer: {
    marginTop: 10,
  },
  progressText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 8,
    fontWeight: '500',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: -20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: '#4A90E2',
  },
  tabButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  activeTabButtonText: {
    color: '#4A90E2',
  },
  contentContainer: {
    padding: 16,
  },
  moduleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 5,
    borderLeftColor: '#4A90E2',
  },
  moduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  moduleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  moduleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  moduleExpandButton: {
    padding: 4,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moduleDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  moduleContentInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  contentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A90E2',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginRight: 8,
    marginBottom: 4,
  },
  contentTagText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  moduleMaterials: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  materialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  materialIcon: {
    marginRight: 10,
  },
  materialTitle: {
    fontSize: 14,
    color: '#333',
  },
  noMaterialsText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 8,
  },
  debugContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    margin: 16,
    backgroundColor: '#FFD7D7',
    borderRadius: 8,
  },
  debugText: {
    fontSize: 14,
    color: '#D32F2F',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
    textAlign: 'center',
  },
  infoContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoSection: {
    marginBottom: 20,
  },
  infoSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoItemLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    width: 120,
  },
  infoItemValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  instructorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  instructorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  instructorAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  instructorInfo: {
    flex: 1,
  },
  instructorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  contactButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  contactButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
});

export default CourseDetailScreen; 