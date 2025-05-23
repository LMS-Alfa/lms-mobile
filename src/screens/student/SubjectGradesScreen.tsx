import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { useAuthStore } from '../../store/authStore';
import { GradeItem, getSubjectGrades, getSubjectColor } from '../../services/gradesService';

// Define route params type
type RootStackParamList = {
  SubjectGrades: { subjectId: number, subjectName: string };
};

type SubjectGradesRouteProp = RouteProp<RootStackParamList, 'SubjectGrades'>;

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

const SubjectGradesScreen = () => {
  const [grades, setGrades] = useState<GradeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const route = useRoute<SubjectGradesRouteProp>();
  const navigation = useNavigation();
  const { user } = useAuthStore();
  
  const { subjectId, subjectName } = route.params;
  
  // Fetch grades for this subject
  useEffect(() => {
    const fetchGrades = async () => {
      if (!user) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }
      
      try {
        setError(null);
        const gradesData = await getSubjectGrades(user.id, subjectId);
        setGrades(gradesData);
      } catch (err) {
        console.error('Error fetching subject grades:', err);
        setError('Failed to load grades. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchGrades();
  }, [user, subjectId]);
  
  const renderGradeItem = ({ item }: { item: GradeItem }) => (
    <View style={styles.gradeItem}>
      <View style={styles.gradeHeader}>
        <View style={styles.gradeTypeContainer}>
          <View style={[
            styles.iconContainer, 
            { backgroundColor: item.score !== null 
                ? getSubjectColor(item.grade) 
                : getAttendanceColor(item.attendance) 
            }
          ]}>
            {item.score !== null ? (
              <Icon name={getGradeTypeIcon(item.type)} size={16} color="#FFFFFF" />
            ) : (
              getAttendanceIcon(item.attendance)
            )}
          </View>
          <Text style={styles.gradeTitle}>{item.title}</Text>
        </View>
        <View style={styles.scoreContainer}>
          {item.score !== null ? (
            <>
              <View style={[styles.gradeBadge, { backgroundColor: getSubjectColor(item.grade) }]}>
                <Text style={styles.gradeBadgeText}>{item.grade}</Text>
              </View>
              <Text style={styles.scoreText}>{item.score}</Text>
            </>
          ) : (
            <View style={[styles.attendanceBadge, { backgroundColor: getAttendanceColor(item.attendance) }]}>
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
        
        {item.score !== null && item.attendance && (
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
          <Text style={styles.subjectName}>{subjectName}</Text>
          <Text style={styles.screenTitle}>Grades & Attendance</Text>
        </View>
      </View>
      
      {gradesWithScores.length > 0 && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>Grade Summary</Text>
            <View style={[styles.averageGradeBadge, { backgroundColor: getSubjectColor(averageScore.toFixed(0)) }]}>
              <Text style={styles.averageGradeText}>
                {Math.round(averageScore)}
              </Text>
            </View>
          </View>
          
          <View style={styles.gradeCounts}>
            <View style={styles.gradeCountItem}>
              <Text style={styles.gradeCountValue}>
                {gradesWithScores.filter(g => g.grade.startsWith('A')).length}
              </Text>
              <Text style={styles.gradeCountLabel}>A's</Text>
            </View>
            
            <View style={styles.gradeCountItem}>
              <Text style={styles.gradeCountValue}>
                {gradesWithScores.filter(g => g.grade.startsWith('B')).length}
              </Text>
              <Text style={styles.gradeCountLabel}>B's</Text>
            </View>
            
            <View style={styles.gradeCountItem}>
              <Text style={styles.gradeCountValue}>
                {gradesWithScores.filter(g => g.grade.startsWith('C')).length}
              </Text>
              <Text style={styles.gradeCountLabel}>C's</Text>
            </View>
            
            <View style={styles.gradeCountItem}>
              <Text style={styles.gradeCountValue}>
                {gradesWithScores.filter(g => 
                  g.grade.startsWith('D') || 
                  g.grade.startsWith('F')
                ).length}
              </Text>
              <Text style={styles.gradeCountLabel}>D's/F's</Text>
            </View>
          </View>
        </View>
      )}
      
      <View style={styles.gradesList}>
        <Text style={styles.gradesTitle}>
          {grades.some(g => g.score === null) 
            ? 'All Grades & Attendance' 
            : 'All Grades'
          }
        </Text>
        
        <FlatList
          data={grades}
          renderItem={renderGradeItem}
          keyExtractor={(item) => item.id.toString()}
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
  subjectName: {
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
  gradeCounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  gradeCountItem: {
    alignItems: 'center',
  },
  gradeCountValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  gradeCountLabel: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
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

export default SubjectGradesScreen; 