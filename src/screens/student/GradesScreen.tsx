import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Dimensions,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/Feather';
import { useAuthStore } from '../../store/authStore';
import { 
  SubjectGrade, 
  GradeItem, 
  getStudentGrades, 
  calculateGPA, 
  getLetterGrade, 
  getSubjectColor 
} from '../../services/gradesService';

// Define navigation types
type RootStackParamList = {
  SubjectGrades: { subjectId: number, subjectName: string };
};

type SubjectGradesNavigationProp = StackNavigationProp<RootStackParamList, 'SubjectGrades'>;

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

// Helper function to get attendance icon
const getAttendanceIcon = (attendance?: string) => {
  if (!attendance) return null;
  
  switch (attendance.toLowerCase()) {
    case 'present':
      return <Icon name="check-circle" size={14} color="#4CAF50" style={styles.attendanceIcon} />;
    case 'absent':
      return <Icon name="x-circle" size={14} color="#F44336" style={styles.attendanceIcon} />;
    case 'late':
      return <Icon name="clock" size={14} color="#FF9800" style={styles.attendanceIcon} />;
    case 'excused':
      return <Icon name="alert-circle" size={14} color="#9E9E9E" style={styles.attendanceIcon} />;
    default:
      return null;
  }
};

// Get color for attendance status
const getAttendanceColor = (attendance?: string) => {
  if (!attendance) return '#999999';
  
  switch (attendance.toLowerCase()) {
    case 'present': return '#4CAF50';
    case 'absent': return '#F44336';
    case 'late': return '#FF9800';
    case 'excused': return '#9E9E9E';
    default: return '#999999';
  }
};

const GradesScreen = () => {
  const [subjects, setSubjects] = useState<SubjectGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<SubjectGrade | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigation = useNavigation<SubjectGradesNavigationProp>();
  const { user } = useAuthStore();
  
  // Load grades data from Supabase
  const loadGrades = async () => {
    if (!user) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const gradesData = await getStudentGrades(user.id);
      setSubjects(gradesData);
    } catch (err) {
      console.error('Error fetching grades:', err);
      setError('Failed to load grades. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load grades on component mount
  useEffect(() => {
    loadGrades();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGrades();
    setRefreshing(false);
  };

  const renderSubjectItem = ({ item }: { item: SubjectGrade }) => {
    const isSelected = selectedSubject && selectedSubject.id === item.id;
    
    return (
      <TouchableOpacity 
        style={[
          styles.subjectCard,
          isSelected && { borderColor: item.color, borderWidth: 2 }
        ]}
        onPress={() => setSelectedSubject(isSelected ? null : item)}
      >
        <View style={styles.subjectHeader}>
          <View style={[styles.subjectIconContainer, { backgroundColor: item.color }]}>
            <Text style={styles.subjectIconText}>{item.subjectName.charAt(0)}</Text>
          </View>
          <View style={styles.subjectInfo}>
            <Text style={styles.subjectName}>{item.subjectName}</Text>
            <Text style={styles.teacherName}>{item.teacherName}</Text>
          </View>
          <View style={styles.gradeContainer}>
            <Text style={[
              styles.gradeText, 
              { color: item.hasGrades ? getSubjectColor(item.subjectName) : '#999999' }
            ]}>
              {item.averageGrade}
            </Text>
          </View>
        </View>
        
        {isSelected && (
          <View style={styles.gradesListContainer}>
            <Text style={styles.gradesListTitle}>Recent Grades</Text>
            
            {item.grades.length > 0 ? (
              item.grades.slice(0, 5).map(grade => (
                <View key={grade.id} style={styles.gradeItem}>
                  <View style={styles.gradeItemLeft}>
                    <Text style={styles.gradeItemTitle}>{grade.title}</Text>
                    <View style={styles.gradeItemDateContainer}>
                      <Text style={styles.gradeItemDate}>{formatDate(grade.date)}</Text>
                      {getAttendanceIcon(grade.attendance)}
                    </View>
                  </View>
                  <View style={styles.gradeItemRight}>
                    {grade.score !== null ? (
                      <>
                        <View style={[styles.gradeBadge, { backgroundColor: getSubjectColor(grade.grade) }]}>
                          <Text style={styles.gradeBadgeText}>{grade.grade}</Text>
                        </View>
                        <Text style={styles.scoreText}>{grade.score}</Text>
                      </>
                    ) : (
                      <View style={[styles.attendanceBadge, { backgroundColor: getAttendanceColor(grade.attendance) }]}>
                        <Text style={styles.gradeBadgeText}>{grade.attendance}</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.noGradesText}>No grades available for this subject</Text>
            )}
            
            {item.grades.length > 0 && (
              <TouchableOpacity 
                style={styles.viewAllButton}
                onPress={() => navigation.navigate('SubjectGrades', { 
                  subjectId: item.id,
                  subjectName: item.subjectName
                })}
              >
                <Text style={styles.viewAllText}>View All Grades</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading your grades...</Text>
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
          onPress={loadGrades}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Filter subjects with grades for GPA calculation
  const subjectsWithGrades = subjects.filter(subject => subject.hasGrades);
  const gpaValue = calculateGPA(subjects);

  return (
    <View style={styles.container}>
      {/* Header with GPA */}
      <View style={styles.header}>
        <View style={styles.gpaContainer}>
          <Text style={styles.gpaLabel}>Current GPA</Text>
          <Text style={styles.gpaValue}>{gpaValue}</Text>
        </View>
        
        <View style={styles.semesterInfo}>
          <Text style={styles.semesterLabel}>Current Term</Text>
          <Text style={styles.courseCount}>{subjects.length} Courses</Text>
        </View>
      </View>
      
      {/* Grade Summary Cards */}
      <View style={styles.summaryContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.summaryScrollContent}
        >
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>A's</Text>
            <Text style={styles.summaryValue}>
              {subjectsWithGrades.filter(s => s.averageGrade.startsWith('A')).length}
            </Text>
          </View>
          
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>B's</Text>
            <Text style={styles.summaryValue}>
              {subjectsWithGrades.filter(s => s.averageGrade.startsWith('B')).length}
            </Text>
          </View>
          
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>C's</Text>
            <Text style={styles.summaryValue}>
              {subjectsWithGrades.filter(s => s.averageGrade.startsWith('C')).length}
            </Text>
          </View>
          
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>D's or Below</Text>
            <Text style={styles.summaryValue}>
              {subjectsWithGrades.filter(s => 
                s.averageGrade.startsWith('D') || 
                s.averageGrade.startsWith('F')
              ).length}
            </Text>
          </View>
        </ScrollView>
      </View>
      
      {/* Subjects List */}
      <FlatList
        data={subjects}
        renderItem={renderSubjectItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Icon name="bar-chart-2" size={50} color="#ccc" />
            <Text style={styles.emptyText}>No grades available</Text>
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
  header: {
    backgroundColor: '#4A90E2',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gpaContainer: {
    alignItems: 'flex-start',
  },
  gpaLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  gpaValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  semesterInfo: {
    alignItems: 'flex-end',
  },
  semesterLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  courseCount: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  summaryContainer: {
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  summaryScrollContent: {
    paddingHorizontal: 16,
  },
  summaryCard: {
    backgroundColor: '#F5F7FA',
    borderRadius: 10,
    padding: 12,
    marginRight: 12,
    width: width / 4 - 20,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  listContainer: {
    padding: 16,
  },
  subjectCard: {
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
  subjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subjectIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  subjectIconText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subjectInfo: {
    flex: 1,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 2,
  },
  teacherName: {
    fontSize: 12,
    color: '#666666',
  },
  gradeContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F5F7FA',
  },
  gradeText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  gradesListContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  gradesListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  gradeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  gradeItemLeft: {
    flex: 1,
  },
  gradeItemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 2,
  },
  gradeItemDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gradeItemDate: {
    fontSize: 12,
    color: '#666666',
  },
  attendanceIcon: {
    marginLeft: 6,
  },
  gradeItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gradeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  attendanceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  gradeBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    minWidth: 28,
    textAlign: 'right',
  },
  viewAllButton: {
    alignSelf: 'center',
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F5F7FA',
    borderRadius: 20,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4A90E2',
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
  noGradesText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  }
});

export default GradesScreen; 