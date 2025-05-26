import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { GradeItem } from '../../services/parentSupabaseService';
import { fetchChildGrades } from '../../services/parentSupabaseService';
import { ParentHomeStackParamList } from '../../navigators/ParentTabNavigator';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { GlobalStyles } from '../../styles/GlobalStyles';

// Define route params type
type ParentSubjectGradesRouteProp = RouteProp<ParentHomeStackParamList, 'ParentSubjectGrades'>;

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

// Grade type icons
const getGradeTypeIcon = (type: string) => {
  switch (type) {
    case 'exam': return 'file-text';
    case 'quiz': return 'check-square';
    case 'assignment': return 'edit';
    case 'lab': return 'flask';
    case 'participation': return 'users';
    case 'presentation': return 'monitor';
    default: return 'activity';
  }
};

// Attendance icons
const getAttendanceIcon = (attendance?: string) => {
  if (!attendance) return null;
  
  switch (attendance.toLowerCase()) {
    case 'present':
      return <Icon name="check-circle" size={16} color="#4CAF50" />;
    case 'absent':
      return <Icon name="x-circle" size={16} color="#F44336" />;
    case 'late':
      return <Icon name="clock" size={16} color="#FF9800" />;
    case 'excused':
      return <Icon name="alert-circle" size={16} color="#9E9E9E" />;
    default:
      return null;
  }
};

// Get text for attendance status
const getAttendanceText = (attendance?: string) => {
  if (!attendance) return '';
  
  switch (attendance.toLowerCase()) {
    case 'present': return 'Present';
    case 'absent': return 'Absent';
    case 'late': return 'Late';
    case 'excused': return 'Excused';
    default: return attendance;
  }
};

// Get color for attendance status or grade
const getColorFor = (item: any, isAttendance: boolean = false): string => {
  if (isAttendance) {
    switch (item?.toLowerCase()) {
      case 'present': return '#4CAF50';
      case 'absent': return '#F44336';
      case 'late': return '#FF9800';
      case 'excused': return '#9E9E9E';
      default: return '#999999';
    }
  } else {
    // For grades
    if (item?.startsWith('A')) return '#4CAF50';
    if (item?.startsWith('B')) return '#4A90E2';
    if (item?.startsWith('C')) return '#FF9800';
    if (item?.startsWith('D')) return '#FF5722';
    if (item?.startsWith('F')) return '#F44336';
    return '#999999';
  }
};

const ParentSubjectGradesScreen = () => {
  const [grades, setGrades] = useState<GradeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const route = useRoute<ParentSubjectGradesRouteProp>();
  const navigation = useNavigation();
  
  const { childId, childName, subjectId, subjectName } = route.params;
  
  // Fetch grades for this subject
  useEffect(() => {
    const fetchGrades = async () => {
      try {
        setError(null);
        
        // Get all subject grades from Supabase
        const subjectsData = await fetchChildGrades(childId);
        
        // Find the specific subject by ID
        const subjectData = subjectsData.find(s => s.id === subjectId);
        
        if (!subjectData) {
          setError('Subject data not found');
          setLoading(false);
          return;
        }
        
        console.log(`Found ${subjectData.grades.length} grades/attendance records for this subject`);
        
        // Set the grades for this subject
        setGrades(subjectData.grades);
      } catch (err) {
        console.error('Error fetching subject grades:', err);
        setError('Failed to load grades. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchGrades();
  }, [childId, subjectId]);
  
  const renderGradeItem = ({ item }: { item: GradeItem }) => (
    <View style={styles.gradeItem}>
      <View style={styles.gradeHeader}>
        <View style={styles.gradeTypeContainer}>
          <View style={[
            styles.iconContainer, 
            { backgroundColor: item.score !== null && item.score !== undefined 
                ? getColorFor(item.grade) 
                : getColorFor(item.attendance, true) 
            }
          ]}>
            {item.score !== null && item.score !== undefined ? (
              <Icon name={getGradeTypeIcon(item.type || 'assignment')} size={16} color="#FFFFFF" />
            ) : (
              getAttendanceIcon(item.attendance)
            )}
          </View>
          <Text style={styles.gradeTitle}>{item.title}</Text>
        </View>
        <View style={styles.scoreContainer}>
          {item.score !== null && item.score !== undefined ? (
            <>
              <View style={[styles.gradeBadge, { backgroundColor: getColorFor(item.grade) }]}>
                <Text style={styles.gradeBadgeText}>{item.grade}</Text>
              </View>
              <Text style={styles.scoreText}>{item.score}</Text>
            </>
          ) : (
            <View style={[styles.attendanceBadge, { backgroundColor: getColorFor(item.attendance, true) }]}>
              <Text style={styles.gradeBadgeText}>{getAttendanceText(item.attendance)}</Text>
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.gradeDetail}>
        <View style={styles.detailItem}>
          <Icon name="calendar" size={12} color="#666" style={styles.detailIcon} />
          <Text style={styles.dateText}>{formatDate(item.date)}</Text>
        </View>
        
        {item.score !== null && item.score !== undefined && item.attendance && (
          <View style={styles.detailItem}>
            {getAttendanceIcon(item.attendance)}
            <Text style={styles.attendanceText}>
              {getAttendanceText(item.attendance)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading grades...</Text>
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle" size={50} color="#F44336" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  // Calculate average grade (only for items with scores)
  const gradesWithScores = grades.filter(grade => grade.score !== null);
  const totalScore = gradesWithScores.reduce((sum, grade) => sum + (grade.score || 0), 0);
  const averageScore = gradesWithScores.length > 0 ? totalScore / gradesWithScores.length : 0;
  
  // Get info about attendance
  const attendance = {
    present: grades.filter(g => g.attendance?.toLowerCase() === 'present').length,
    absent: grades.filter(g => g.attendance?.toLowerCase() === 'absent').length,
    late: grades.filter(g => g.attendance?.toLowerCase() === 'late').length,
    excused: grades.filter(g => g.attendance?.toLowerCase() === 'excused').length,
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color="#4A90E2" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.studentName}>{childName}</Text>
          <Text style={styles.screenTitle}>{subjectName} Grades</Text>
        </View>
      </View>
      
      {gradesWithScores.length > 0 && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View>
              <Text style={styles.summaryTitle}>Subject Overview</Text>
              <Text style={styles.teacherLabel}>Performance & Attendance</Text>
            </View>
            <View style={[styles.averageGradeBadge, { backgroundColor: getColorFor(`${Math.round(averageScore)}`) }]}>
              <Text style={styles.averageGradeText}>
                {Math.round(averageScore * 10) / 10}
              </Text>
            </View>
          </View>
          
          <View style={styles.statsContainer}>
            <View style={styles.statsRow}>
              {/* Grade distribution */}
              <View style={styles.statsSection}>
                <Text style={styles.statsSectionTitle}>Grade Distribution</Text>
                <View style={styles.gradeDistribution}>
                  <View style={styles.distributionItem}>
                    <Text style={styles.distributionCount}>
                      {gradesWithScores.filter(g => g.grade.startsWith('A')).length}
                    </Text>
                    <Text style={styles.distributionLabel}>A's</Text>
                  </View>
                  <View style={styles.distributionItem}>
                    <Text style={styles.distributionCount}>
                      {gradesWithScores.filter(g => g.grade.startsWith('B')).length}
                    </Text>
                    <Text style={styles.distributionLabel}>B's</Text>
                  </View>
                  <View style={styles.distributionItem}>
                    <Text style={styles.distributionCount}>
                      {gradesWithScores.filter(g => g.grade.startsWith('C')).length}
                    </Text>
                    <Text style={styles.distributionLabel}>C's</Text>
                  </View>
                  <View style={styles.distributionItem}>
                    <Text style={styles.distributionCount}>
                      {gradesWithScores.filter(g => 
                        g.grade.startsWith('D') || g.grade.startsWith('F')
                      ).length}
                    </Text>
                    <Text style={styles.distributionLabel}>D/F</Text>
                  </View>
                </View>
              </View>
              
              {/* Attendance */}
              <View style={styles.statsSection}>
                <Text style={styles.statsSectionTitle}>Attendance Stats</Text>
                <View style={styles.attendanceStats}>
                  <View style={styles.attendanceRow}>
                    <View style={[styles.attendanceDot, { backgroundColor: '#4CAF50' }]} />
                    <Text style={styles.attendanceLabel}>Present:</Text>
                    <Text style={styles.attendanceCount}>{attendance.present}</Text>
                  </View>
                  <View style={styles.attendanceRow}>
                    <View style={[styles.attendanceDot, { backgroundColor: '#F44336' }]} />
                    <Text style={styles.attendanceLabel}>Absent:</Text>
                    <Text style={styles.attendanceCount}>{attendance.absent}</Text>
                  </View>
                  <View style={styles.attendanceRow}>
                    <View style={[styles.attendanceDot, { backgroundColor: '#FF9800' }]} />
                    <Text style={styles.attendanceLabel}>Late:</Text>
                    <Text style={styles.attendanceCount}>{attendance.late}</Text>
                  </View>
                  <View style={styles.attendanceRow}>
                    <View style={[styles.attendanceDot, { backgroundColor: '#9E9E9E' }]} />
                    <Text style={styles.attendanceLabel}>Excused:</Text>
                    <Text style={styles.attendanceCount}>{attendance.excused}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>
      )}
      
      <View style={styles.gradesList}>
        <Text style={styles.gradesTitle}>
          All Grades & Attendance
        </Text>
        
        <FlatList
          data={grades}
          renderItem={renderGradeItem}
          keyExtractor={(item, index) => `grade-${item.id.toString()}-${index}`}
          contentContainerStyle={styles.gradesListContent}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Icon name="bar-chart-2" size={50} color="#ccc" />
              <Text style={styles.emptyText}>No data available for this subject</Text>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    marginLeft: 8,
  },
  studentName: {
    fontSize: 16,
    color: '#666666',
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  summaryCard: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  teacherLabel: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  averageGradeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#4CAF50',
  },
  averageGradeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statsContainer: {
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statsSection: {
    flex: 1,
  },
  statsSectionTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666666',
    marginBottom: 8,
  },
  gradeDistribution: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  distributionItem: {
    alignItems: 'center',
  },
  distributionCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  distributionLabel: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  attendanceStats: {
    marginLeft: 10,
  },
  attendanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  attendanceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  attendanceLabel: {
    fontSize: 12,
    color: '#666666',
    flex: 1,
  },
  attendanceCount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333333',
  },
  gradesList: {
    flex: 1,
    marginHorizontal: 16,
  },
  gradesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  gradesListContent: {
    paddingBottom: 16,
  },
  gradeItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  gradeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  gradeTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  gradeTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    flex: 1,
  },
  scoreContainer: {
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
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    minWidth: 30,
    textAlign: 'right',
  },
  gradeDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  detailIcon: {
    marginRight: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#666666',
    marginLeft: 4,
  },
  attendanceText: {
    fontSize: 12,
    color: '#666666',
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
  button: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 12,
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
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default ParentSubjectGradesScreen; 