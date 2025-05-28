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
import { useAppTheme } from '../../contexts/ThemeContext';

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

// Updated helper function to get attendance icon with theme
const getAttendanceIcon = (attendance: string | undefined, theme: any) => {
  if (!attendance) return null;
  
  switch (attendance.toLowerCase()) {
    case 'present':
      return <Icon name="check-circle" size={14} color={theme.success} style={styles.attendanceIcon} />;
    case 'absent':
      return <Icon name="x-circle" size={14} color={theme.danger} style={styles.attendanceIcon} />;
    case 'late':
      return <Icon name="clock" size={14} color={theme.warning} style={styles.attendanceIcon} />;
    case 'excused':
      return <Icon name="alert-circle" size={14} color={theme.textSecondary} style={styles.attendanceIcon} />;
    default:
      return null;
  }
};

// Updated to get color for attendance status with theme
const getAttendanceColor = (attendance: string | undefined, theme: any) => {
  if (!attendance) return theme.textSecondary;
  
  switch (attendance.toLowerCase()) {
    case 'present': return theme.success;
    case 'absent': return theme.danger;
    case 'late': return theme.warning;
    case 'excused': return theme.textSecondary; // Or a specific theme color for excused
    default: return theme.textSecondary;
  }
};

// Temporary fallback for subject colors - ideally, this logic moves to gradesService or is mapped from a theme object
const getDynamicSubjectColor = (subjectName: string, theme: any) => {
  // Simple hash to get a somewhat consistent color - replace with better logic or from theme if available
  let hash = 0;
  for (let i = 0; i < subjectName.length; i++) {
    hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [theme.primary, theme.success, theme.warning, theme.danger, theme.info]; // Add more from theme if needed
  return colors[Math.abs(hash) % colors.length] || theme.primary;
};

const GradesScreen = () => {
  const { theme } = useAppTheme();
  const [subjects, setSubjects] = useState<SubjectGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<SubjectGrade | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigation = useNavigation<SubjectGradesNavigationProp>();
  const { user } = useAuthStore();
  
  const loadGrades = async () => {
    if (!user) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const gradesData = await getStudentGrades(user.id);
      // Assign dynamic colors to subjects if not already provided by service
      const themedSubjects = gradesData.map(subject => ({
        ...subject,
        color: subject.color || getDynamicSubjectColor(subject.subjectName, theme)
      }));
      setSubjects(themedSubjects);
    } catch (err) {
      console.error('Error fetching grades:', err);
      setError('Failed to load grades. Please try again.');
      setSubjects([]); // Clear on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGrades();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGrades();
    setRefreshing(false);
  };

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return theme.success;
    if (grade.startsWith('B')) return theme.success; // Or a slightly different shade like theme.info
    if (grade.startsWith('C')) return theme.warning;
    if (grade.startsWith('D')) return theme.orange; // Assuming theme.orange exists
    if (grade.startsWith('F')) return theme.danger;
    return theme.textSecondary; // Default for other grades/statuses
};

  const renderSubjectItem = ({ item }: { item: SubjectGrade }) => {
    const isSelected = selectedSubject && selectedSubject.id === item.id;
    const subjectDisplayColor = item.color || getDynamicSubjectColor(item.subjectName, theme);
    
    return (
      <TouchableOpacity 
        style={[
          styles.subjectCard,
          { backgroundColor: theme.cardBackground, shadowColor: theme.text },
          isSelected && { borderColor: subjectDisplayColor, borderWidth: 2 }
        ]}
        onPress={() => setSelectedSubject(isSelected ? null : item)}
      >
        <View style={styles.subjectHeader}>
          <View style={[styles.subjectIconContainer, { backgroundColor: subjectDisplayColor + '33' }]}>
            <Text style={[styles.subjectIconText, {color: subjectDisplayColor}]}>{item.subjectName.charAt(0)}</Text>
          </View>
          <View style={styles.subjectInfo}>
            <Text style={[styles.subjectName, { color: theme.text }]}>{item.subjectName}</Text>
            <Text style={[styles.teacherName, { color: theme.textSecondary }]}>{item.teacherName}</Text>
          </View>
          <View style={styles.gradeContainer}>
            <Text style={[
              styles.gradeText, 
              { color: item.hasGrades ? getGradeColor(item.averageGrade) : theme.textSecondary }
            ]}>
              {item.averageGrade}
            </Text>
          </View>
        </View>
        
        {isSelected && (
          <View style={[styles.gradesListContainer, { borderTopColor: theme.separator }]}>
            <Text style={[styles.gradesListTitle, { color: theme.text }]}>Recent Grades</Text>
            
            {item.grades.length > 0 ? (
              item.grades.slice(0, 5).map(grade => (
                <View key={grade.id} style={[styles.gradeItem, { borderBottomColor: theme.separator }]}>
                  <View style={styles.gradeItemLeft}>
                    <Text style={[styles.gradeItemTitle, { color: theme.text }]}>{grade.title}</Text>
                    <View style={styles.gradeItemDateContainer}>
                      <Text style={[styles.gradeItemDate, { color: theme.textSecondary }]}>{formatDate(grade.date)}</Text>
                      {getAttendanceIcon(grade.attendance, theme)}
                    </View>
                  </View>
                  <View style={styles.gradeItemRight}>
                    {grade.score !== null ? (
                      <>
                        <View style={[styles.gradeBadge, { backgroundColor: getGradeColor(grade.grade) }]}>
                          <Text style={styles.gradeBadgeText}>{grade.grade}</Text>
                        </View>
                        <Text style={[styles.scoreText, { color: theme.textSecondary }]}>{grade.score}</Text>
                      </>
                    ) : (
                      <View style={[styles.attendanceBadge, { backgroundColor: getAttendanceColor(grade.attendance, theme) }]}>
                        <Text style={styles.gradeBadgeText}>{grade.attendance}</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))
            ) : (
              <Text style={[styles.noGradesText, { color: theme.textSecondary }]}>No grades available for this subject</Text>
            )}
            
            {item.grades.length > 0 && (
              <TouchableOpacity 
                style={[styles.viewAllButton, { backgroundColor: theme.primary + '20'}] }
                onPress={() => navigation.navigate('SubjectGrades', { 
                  subjectId: item.id,
                  subjectName: item.subjectName
                })}
              >
                <Text style={[styles.viewAllText, { color: theme.primary }]}>View All Grades</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading your grades...</Text>
      </View>
    );
  }

  if (error && !refreshing) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.background }]}>
        <Icon name="alert-circle" size={50} color={theme.danger} />
        <Text style={[styles.errorTextPrompt, { color: theme.danger }]}>{error}</Text>
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: theme.primary }]}
          onPress={loadGrades}
        >
          <Text style={[styles.retryButtonText, { color: theme.cardBackground }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const subjectsWithGrades = subjects.filter(subject => subject.hasGrades);
  const gpaValue = calculateGPA(subjects);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.primary, shadowColor: theme.text }]}>
        <View style={styles.gpaContainer}>
          <Text style={[styles.gpaLabel, { color: theme.cardBackground }]}>Current GPA</Text>
          <Text style={[styles.gpaValue, { color: theme.cardBackground }]}>{gpaValue}</Text>
        </View>
        
        <View style={styles.semesterInfo}>
          <Text style={[styles.semesterLabel, { color: theme.cardBackground + 'aa'}]}>Current Term</Text>
          <Text style={[styles.courseCount, { color: theme.cardBackground }]}>{subjects.length} Courses</Text>
        </View>
      </View>
      
      {error && refreshing && (
        <View style={[styles.inlineErrorView, {backgroundColor: theme.danger + '33'}]}>
          <Text style={[styles.inlineErrorText, {color: theme.danger}]}>Refresh failed. Please try again.</Text>
        </View>
      )}

      <View style={styles.summaryOuterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.summaryScrollContent}
        >
          {['A', 'B', 'C', 'D', 'F'].map(gradeLetter => (
            <View key={gradeLetter} style={[styles.summaryCard, { backgroundColor: theme.cardBackground, shadowColor: theme.text }]}>
              <Text style={[styles.summaryLabel, { color: getGradeColor(gradeLetter) }]}>{gradeLetter}'s</Text>
              <Text style={[styles.summaryValue, { color: theme.text }]}>
                {subjectsWithGrades.filter(s => s.averageGrade.startsWith(gradeLetter)).length}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
      
      {subjects.length === 0 && !loading ? (
        <View style={styles.emptyListContainer}>
          <Icon name="award" size={40} color={theme.textSecondary} />
          <Text style={[styles.emptyListText, {color: theme.textSecondary}]}>No grades or subjects found for this term yet.</Text>
        </View>
      ) : (
        <FlatList
          data={subjects}
          renderItem={renderSubjectItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary}/>
          }
        />
      )}
    </View>
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
  errorTextPrompt: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25, 
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  inlineErrorView: {
    padding: 10,
    alignItems: 'center',
    marginHorizontal: 16,
    borderRadius: 5,
    marginBottom: 10,
  },
  inlineErrorText: {
    fontSize: 14,
  },
  header: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gpaContainer: {},
  gpaLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  gpaValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  semesterInfo: {
    alignItems: 'flex-end',
  },
  semesterLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  courseCount: {
    fontSize: 16,
    fontWeight: '600',
  },
  summaryOuterContainer: {
    paddingBottom: 10,
  },
  summaryScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  summaryCard: {
    width: Dimensions.get('window').width / 4 - 20,
    minWidth: 80,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginRight: 10,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  subjectCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  subjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  subjectIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  subjectIconText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  subjectInfo: {
    flex: 1,
  },
  subjectName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 2,
  },
  teacherName: {
    fontSize: 13,
  },
  gradeContainer: {
    paddingLeft: 10,
  },
  gradeText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  gradesListContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  gradesListTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
  },
  gradeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  gradeItemLeft: {
    flex: 1,
    marginRight: 10,
  },
  gradeItemTitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  gradeItemDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gradeItemDate: {
    fontSize: 12,
  },
  attendanceIcon: {
    marginLeft: 8,
  },
  gradeItemRight: {
    alignItems: 'flex-end',
    minWidth: 60,
  },
  gradeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 4,
  },
  attendanceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  gradeBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '500',
  },
  noGradesText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 10,
    fontStyle: 'italic',
  },
  viewAllButton: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyListText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
  },
});

export default GradesScreen; 
export default GradesScreen; 