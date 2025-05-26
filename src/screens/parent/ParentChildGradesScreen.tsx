import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Platform,
  StatusBar,
  Alert
} from 'react-native';
import { supabase } from '../../utils/supabase';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ParentHomeStackParamList } from '../../navigators/ParentTabNavigator';
import Icon from 'react-native-vector-icons/Feather';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  fetchChildGrades,
  fetchParentChildAssignments,
  ChildAssignment
} from '../../services/parentSupabaseService';
import { useAuthStore } from '../../store/authStore';
import { useAppTheme } from '../../contexts/ThemeContext';

// Import these types from parentSupabaseService directly
// This is a workaround since we're using a slightly different interface structure
import type { SubjectGrade, GradeItem } from '../../services/parentSupabaseService';

// Define route params type
type ParentChildGradesRouteProp = RouteProp<ParentHomeStackParamList, 'ParentChildGrades'>;
type ParentChildGradesNavigationProp = StackNavigationProp<ParentHomeStackParamList, 'ParentChildGrades'>;

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

// Helper function to get attendance text
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

// Get color for grade
const getGradeColor = (grade?: string): string => {
  if (!grade) return '#999999';
  
  if (grade.startsWith('A')) return '#4CAF50'; // Green
  if (grade.startsWith('B')) return '#4A90E2'; // Blue
  if (grade.startsWith('C')) return '#FF9800'; // Orange
  if (grade.startsWith('D')) return '#FF5722'; // Deep Orange
  if (grade.startsWith('F')) return '#F44336'; // Red
  return '#999999'; // Default gray
};

// Get color for attendance status
const getAttendanceColor = (attendance?: string): string => {
  if (!attendance) return '#999999';
  
  switch (attendance.toLowerCase()) {
    case 'present': return '#4CAF50'; // Green
    case 'absent': return '#F44336';  // Red
    case 'late': return '#FF9800';    // Orange
    case 'excused': return '#9E9E9E'; // Gray
    default: return '#999999';        // Default gray
  }
};

const ParentChildGradesScreen = () => {
  const [subjects, setSubjects] = useState<SubjectGrade[]>([]);
  const [expandedSubjects, setExpandedSubjects] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<any>(null);
  const [performanceSummary, setPerformanceSummary] = useState<any>(null);
  const [assignments, setAssignments] = useState<ChildAssignment[]>([]);
  
  const route = useRoute<ParentChildGradesRouteProp>();
  const navigation = useNavigation<ParentChildGradesNavigationProp>();
  const { user } = useAuthStore();
  const { theme } = useAppTheme();
  
  const { childId, childName } = route.params;
  
  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);
        
        if (!user || !user.id) {
          setError('User not authenticated. Please log in again.');
          setLoading(false);
          return;
        }
        
        console.log(`[ParentChildGradesScreen] Loading data for child: ${childId}`);
        
        // Fetch grades from Supabase
        let gradesData = await fetchChildGrades(childId);
        
        // Log the raw data for debugging purposes
        console.log(`[ParentChildGradesScreen] Received ${gradesData.length} subjects from API`);
        
        // Check if any subjects have grades
        let hasAnyGrades = false;
        let hasAnyAttendance = false;
        
        gradesData.forEach(subject => {
          console.log(`[ParentChildGradesScreen] Subject: ${subject.subjectName}, Grades count: ${subject.grades.length}`);
          
          // Check if any grades or attendance records exist
          subject.grades.forEach(grade => {
            if (grade.score !== null && grade.score !== undefined) hasAnyGrades = true;
            if (grade.attendance) hasAnyAttendance = true;
          });
        });
        
        console.log(`[ParentChildGradesScreen] Has any grades: ${hasAnyGrades}, Has any attendance: ${hasAnyAttendance}`);
        
        // If no subjects have grades or attendance, try fetching directly
        if (!hasAnyGrades && !hasAnyAttendance && gradesData.length > 0) {
          try {
            // This is a fallback - we'll make a direct request for attendance data
            const { data: attendanceRecords } = await supabase
              .from('attendance')
              .select(`
                id,
                status,
                noted_at,
                lesson_id,
                student_id
              `)
              .eq('student_id', childId);
              
            if (attendanceRecords && attendanceRecords.length > 0) {
              console.log(`[ParentChildGradesScreen] Direct query found ${attendanceRecords.length} attendance records`);
            } else {
              console.log('[ParentChildGradesScreen] No attendance records found in direct query');
            }
          } catch (directQueryErr) {
            console.error('[ParentChildGradesScreen] Error in direct attendance query:', directQueryErr);
          }
        }
        
        // Set the subjects data
        setSubjects(gradesData);
        
        // Attempt to fetch assignments, but handle gracefully if it fails
        let assignmentsData: ChildAssignment[] = [];
        try {
          assignmentsData = await fetchParentChildAssignments(childId, user.id);
          setAssignments(assignmentsData || []);
          console.log(`[ParentChildGradesScreen] Fetched ${assignmentsData?.length || 0} assignments`);
        } catch (assignmentErr) {
          console.error('[ParentChildGradesScreen] Error fetching assignments:', assignmentErr);
          // Continue with empty assignments
        }
        
        // Calculate attendance summary from the grade data
        const attendance = {
          present: 0,
          absent: 0,
          late: 0,
          excused: 0
        };
        
        // Aggregate attendance data from all subjects
        let totalAttendanceRecords = 0;
        gradesData.forEach(subject => {
          subject.grades.forEach(grade => {
            if (grade.attendance) {
              totalAttendanceRecords++;
              // Make sure the attendance status is lowercase for consistent comparison
              const status = grade.attendance.toLowerCase();
              if (status === 'present') attendance.present++;
              else if (status === 'absent') attendance.absent++;
              else if (status === 'late') attendance.late++;
              else if (status === 'excused') attendance.excused++;
              else console.log(`[ParentChildGradesScreen] Unknown attendance status: ${status}`);
            }
          });
        });
        
        console.log(`[ParentChildGradesScreen] Found ${totalAttendanceRecords} total attendance records`);
        console.log(`[ParentChildGradesScreen] Attendance summary:`, attendance);
        
        setAttendanceSummary(attendance);
        
        // Calculate performance summary
        let totalGrades = 0;
        let totalScore = 0;
        
        gradesData.forEach(subject => {
          subject.grades.forEach(grade => {
            if (grade.score !== null && grade.score !== undefined) {
              totalScore += grade.score;
              totalGrades++;
            }
          });
        });
        
        console.log(`[ParentChildGradesScreen] Found ${totalGrades} total graded items with average score: ${totalGrades > 0 ? (totalScore / totalGrades).toFixed(2) : 'N/A'}`);
        
        // Calculate GPA (assuming scores are out of 10 and converting to 4.0 scale)
        const gpa = totalGrades > 0 
          ? ((totalScore / totalGrades)).toFixed(1) 
          : '0.0';
        
        // Calculate assignment data (safely)
        const completedAssignments = assignmentsData?.filter(a => a?.isCompleted)?.length || 0;
        const totalAssignments = assignmentsData?.length || 0;
        const upcomingAssignments = assignmentsData?.filter(a => a && !a.isPastDue && !a.isCompleted)?.length || 0;
        const overdueAssignments = assignmentsData?.filter(a => a && a.isPastDue && !a.isCompleted)?.length || 0;
        
        const performanceSummaryData = {
          gpa,
          totalAssignments,
          completedAssignments,
          upcomingAssignments,
          overdueAssignments
        };
        
        console.log('[ParentChildGradesScreen] Performance summary:', performanceSummaryData);
        setPerformanceSummary(performanceSummaryData);
        
      } catch (err) {
        console.error('Error fetching child grades:', err);
        setError('Failed to load grades. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [childId, user]);
  
  // Navigate to subject details
  const navigateToSubjectGrades = (subject: SubjectGrade) => {
    navigation.navigate('ParentSubjectGrades', {
      childId,
      childName,
      subjectId: subject.id,
      subjectName: subject.subjectName
    });
  };
  
  // Toggle subject expansion
  const toggleSubjectExpansion = (subjectId: number) => {
    setExpandedSubjects(prev => ({
      ...prev,
      [subjectId]: !prev[subjectId]
    }));
  };

  // Render subject item
  const renderSubjectItem = ({ item }: { item: SubjectGrade }) => {
    const isExpanded = expandedSubjects[item.id];
    
    // Make sure we have valid grades array
    const grades = item.grades || [];
    
    // Log information about this subject for debugging
    console.log(`[ParentChildGradesScreen] Rendering subject ${item.subjectName} with ${grades.length} grades/attendance records`);
    
    // Count how many attendance and grade records we have
    const attendanceCount = grades.filter(g => g.attendance).length;
    const gradeCount = grades.filter(g => g.score !== null && g.score !== undefined).length;
    console.log(`[ParentChildGradesScreen] Subject ${item.subjectName} has ${attendanceCount} attendance records and ${gradeCount} grade records`);
    
    return (
      <TouchableOpacity 
        style={[
          styles.subjectCard,
          { 
            backgroundColor: theme.cardBackground,
            shadowColor: theme.text,
            borderColor: isExpanded ? item.color : theme.border 
          },
          isExpanded && { borderWidth: 2 }
        ]}
        onPress={() => toggleSubjectExpansion(item.id)}
      >
        <View style={styles.subjectHeader}>
          <View style={[styles.subjectIconContainer, { backgroundColor: item.color }]}>
            <Text style={styles.subjectIconText}>{item.subjectName?.charAt(0) || 'S'}</Text>
          </View>
          <View style={styles.subjectInfo}>
            <Text style={[styles.subjectName, { color: theme.text }]}>{item.subjectName || 'Unknown Subject'}</Text>
            <Text style={[styles.teacherName, { color: theme.textSecondary }]}>{item.teacherName || 'Unknown Teacher'}</Text>
          </View>
          <View style={[styles.gradeContainer, { backgroundColor: theme.highlight }]}>
            <Text style={[
              styles.gradeText, 
              { color: item.hasGrades ? item.color : theme.subtleText }
            ]}>
              {item.averageGrade || 'N/A'}
            </Text>
          </View>
        </View>
        
        {isExpanded && (
          <View style={styles.gradesListContainer}>
            <Text style={[styles.gradesListTitle, { color: theme.text }]}>Recent Grades & Attendance</Text>
            
            {grades.length > 0 ? (
              grades.slice(0, 5).map((grade: GradeItem, idx: number) => {
                // Ensure we have a valid title
                const title = grade.title || 'Untitled Item';
                // Ensure we have a valid date
                const date = grade.date ? formatDate(grade.date) : 'No date';
                
                return (
                  <View key={`grade-${item.id}-${grade.id || idx}-${idx}`} style={[styles.gradeItem, { borderBottomColor: theme.separator }]}>
                    <View style={styles.gradeItemLeft}>
                      <Text style={[styles.gradeItemTitle, { color: theme.text }]}>{title}</Text>
                      <View style={styles.gradeItemDateContainer}>
                        <Text style={[styles.gradeItemDate, { color: theme.subtleText }]}>{date}</Text>
                        {getAttendanceIcon(grade.attendance)}
                      </View>
                    </View>
                    <View style={styles.gradeItemRight}>
                      {grade.score !== null && grade.score !== undefined ? (
                        <>
                          <View style={[styles.gradeBadge, { backgroundColor: getGradeColor(grade.grade) }]}>
                            <Text style={styles.gradeBadgeText}>{grade.grade || '?'}</Text>
                          </View>
                          <Text style={[styles.scoreText, { color: theme.text }]}>{grade.score}</Text>
                        </>
                      ) : grade.attendance ? (
                        <View style={[styles.attendanceBadge, { backgroundColor: getAttendanceColor(grade.attendance) }]}>
                          <Text style={styles.gradeBadgeText}>{getAttendanceText(grade.attendance)}</Text>
                        </View>
                      ) : (
                        <View style={[styles.attendanceBadge, { backgroundColor: theme.subtleText }]}>
                          <Text style={styles.gradeBadgeText}>No Data</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={[styles.noGradesText, { color: theme.textSecondary }]}>No grades or attendance records available for this subject</Text>
            )}
            
            {grades.length > 0 && (
              <TouchableOpacity 
                style={[styles.viewAllButton, { backgroundColor: theme.highlight }]}
                onPress={() => navigateToSubjectGrades(item)}
              >
                <Text style={[styles.viewAllText, { color: theme.primary }]}>View All Records</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right', 'bottom']}>
        <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading grades...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right', 'bottom']}>
        <View style={[styles.errorContainer, { backgroundColor: theme.background }]}>
          <Icon name="alert-circle" size={50} color={theme.danger} />
          <Text style={[styles.errorText, { color: theme.textSecondary }]}>{error}</Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right', 'bottom']}>
      <View style={[styles.contentContainer, { backgroundColor: theme.background }]}>
        {/* Header with back button */}
        <View style={[styles.header, { 
          borderBottomColor: theme.border,
          backgroundColor: theme.cardBackground 
        }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" size={24} color={theme.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{childName}'s Progress</Text>
        </View>
        
        <ScrollView>
          {/* Performance Summary */}
          {performanceSummary && (
            <View style={[styles.summaryCard, { backgroundColor: theme.cardBackground, shadowColor: theme.text }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Performance Overview</Text>
              
              <View style={styles.performanceContainer}>
                <View style={styles.performanceItem}>
                  <View style={[styles.performanceIcon, { backgroundColor: '#4A90E2' }]}>
                    <Icon name="award" size={18} color="#FFFFFF" />
                  </View>
                  <Text style={[styles.performanceValue, { color: theme.text }]}>{performanceSummary.gpa}</Text>
                  <Text style={[styles.performanceLabel, { color: theme.textSecondary }]}>GPA</Text>
                </View>
                
                <View style={styles.performanceItem}>
                  <View style={[styles.performanceIcon, { backgroundColor: '#66BB6A' }]}>
                    <Icon name="check-square" size={18} color="#FFFFFF" />
                  </View>
                  <Text style={[styles.performanceValue, { color: theme.text }]}>
                    {performanceSummary.completedAssignments}/{performanceSummary.totalAssignments}
                  </Text>
                  <Text style={[styles.performanceLabel, { color: theme.textSecondary }]}>Assignments</Text>
                </View>
              </View>
            </View>
          )}

          {/* Assignments Summary */}
          <View style={[styles.summaryCard, { backgroundColor: theme.cardBackground, shadowColor: theme.text }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Assignments Overview</Text>
            
            {assignments && assignments.length > 0 ? (
              <>
                <View style={styles.assignmentsContainer}>
                  <View style={styles.assignmentItem}>
                    <View style={[styles.assignmentIcon, { backgroundColor: '#66BB6A' }]}>
                      <Icon name="check" size={18} color="#FFFFFF" />
                    </View>
                    <Text style={[styles.assignmentValue, { color: theme.text }]}>{performanceSummary?.completedAssignments || 0}</Text>
                    <Text style={[styles.assignmentLabel, { color: theme.textSecondary }]}>Completed</Text>
                  </View>

                  <View style={styles.assignmentItem}>
                    <View style={[styles.assignmentIcon, { backgroundColor: '#F44336' }]}>
                      <Icon name="alert-triangle" size={18} color="#FFFFFF" />
                    </View>
                    <Text style={[styles.assignmentValue, { color: theme.text }]}>{performanceSummary?.overdueAssignments || 0}</Text>
                    <Text style={[styles.assignmentLabel, { color: theme.textSecondary }]}>Overdue</Text>
                  </View>
                  
                  <View style={styles.assignmentItem}>
                    <View style={[styles.assignmentIcon, { backgroundColor: '#FF9800' }]}>
                      <Icon name="clock" size={18} color="#FFFFFF" />
                    </View>
                    <Text style={[styles.assignmentValue, { color: theme.text }]}>{performanceSummary?.upcomingAssignments || 0}</Text>
                    <Text style={[styles.assignmentLabel, { color: theme.textSecondary }]}>Upcoming</Text>
                  </View>
                </View>

                {/* Recent Assignments List */}
                <View style={styles.recentAssignments}>
                  <Text style={[styles.recentAssignmentsTitle, { color: theme.text }]}>Recent Assignments</Text>
                  {assignments.slice(0, 3).map((assignment, index) => (
                    assignment && (
                      <View key={`assignment-${index}`} style={[styles.assignmentListItem, { borderBottomColor: theme.separator }]}>
                        <View style={styles.assignmentListItemLeft}>
                          <Text style={[styles.assignmentListItemTitle, { color: theme.text }]}>{assignment.title || 'Untitled Assignment'}</Text>
                          <Text style={[styles.assignmentListItemSubject, { color: theme.textSecondary }]}>{assignment.subjectName || 'No Subject'}</Text>
                        </View>
                        <View style={styles.assignmentListItemRight}>
                          {assignment.isCompleted ? (
                            <View style={[styles.assignmentStatus, styles.assignmentCompleted]}>
                              <Icon name="check" size={14} color="#FFFFFF" />
                              <Text style={styles.assignmentStatusText}>Completed</Text>
                            </View>
                          ) : assignment.isPastDue ? (
                            <View style={[styles.assignmentStatus, styles.assignmentOverdue]}>
                              <Icon name="alert-triangle" size={14} color="#FFFFFF" />
                              <Text style={styles.assignmentStatusText}>Overdue</Text>
                            </View>
                          ) : (
                            <View style={[styles.assignmentStatus, styles.assignmentUpcoming]}>
                              <Icon name="clock" size={14} color="#FFFFFF" />
                              <Text style={styles.assignmentStatusText}>Upcoming</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    )
                  ))}
                </View>
              </>
            ) : (
              <View style={styles.emptyStateContainer}>
                <Icon name="clipboard" size={40} color="#ccc" />
                <Text style={styles.emptyStateText}>No assignments found</Text>
                <Text style={styles.emptyStateSubtext}>When your child receives assignments, they will appear here</Text>
              </View>
            )}
          </View>
          
          {/* Attendance Summary */}
          {attendanceSummary && (
            <View style={[styles.summaryCard, { backgroundColor: theme.cardBackground, shadowColor: theme.text }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Attendance Overview</Text>
              
              <View style={styles.attendanceContainer}>
                <View style={styles.attendanceItem}>
                  <View style={[styles.attendanceStatusIcon, { backgroundColor: '#4CAF50' }]}>
                    <Text style={styles.attendanceStatusText}>{attendanceSummary.present}</Text>
                  </View>
                  <Text style={[styles.attendanceStatusLabel, { color: theme.textSecondary }]}>Present</Text>
                </View>
                
                <View style={styles.attendanceItem}>
                  <View style={[styles.attendanceStatusIcon, { backgroundColor: '#F44336' }]}>
                    <Text style={styles.attendanceStatusText}>{attendanceSummary.absent}</Text>
                  </View>
                  <Text style={[styles.attendanceStatusLabel, { color: theme.textSecondary }]}>Absent</Text>
                </View>
                
                <View style={styles.attendanceItem}>
                  <View style={[styles.attendanceStatusIcon, { backgroundColor: '#FF9800' }]}>
                    <Text style={styles.attendanceStatusText}>{attendanceSummary.late}</Text>
                  </View>
                  <Text style={[styles.attendanceStatusLabel, { color: theme.textSecondary }]}>Late</Text>
                </View>
                
                <View style={styles.attendanceItem}>
                  <View style={[styles.attendanceStatusIcon, { backgroundColor: '#9E9E9E' }]}>
                    <Text style={styles.attendanceStatusText}>{attendanceSummary.excused}</Text>
                  </View>
                  <Text style={[styles.attendanceStatusLabel, { color: theme.textSecondary }]}>Excused</Text>
                </View>
              </View>
            </View>
          )}
          
          {/* Subjects */}
          <View style={[styles.subjectsContainer, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Subjects</Text>
            
            <FlatList
              data={subjects}
              renderItem={renderSubjectItem}
              keyExtractor={(item) => item.id?.toString() || item.subjectName || Math.random().toString()}
              scrollEnabled={false}
              ListEmptyComponent={() => (
                <Text style={[styles.noSubjectsText, { color: theme.textSecondary }]}>No subjects found</Text>
              )}
            />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  contentContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginLeft: 8,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  performanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  performanceItem: {
    alignItems: 'center',
    flex: 1,
  },
  performanceIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  performanceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 2,
  },
  performanceLabel: {
    fontSize: 12,
    color: '#666666',
  },
  // Assignments styles
  assignmentsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  assignmentItem: {
    alignItems: 'center',
    flex: 1,
  },
  assignmentIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  assignmentValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 2,
  },
  assignmentLabel: {
    fontSize: 12,
    color: '#666666',
  },
  recentAssignments: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 16,
  },
  recentAssignmentsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  assignmentListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  assignmentListItemLeft: {
    flex: 1,
  },
  assignmentListItemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 2,
  },
  assignmentListItemSubject: {
    fontSize: 12,
    color: '#666666',
  },
  assignmentListItemRight: {
    marginLeft: 8,
  },
  assignmentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  assignmentCompleted: {
    backgroundColor: '#66BB6A',
  },
  assignmentOverdue: {
    backgroundColor: '#F44336',
  },
  assignmentUpcoming: {
    backgroundColor: '#FF9800',
  },
  assignmentStatusText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  attendanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  attendanceItem: {
    alignItems: 'center',
  },
  attendanceStatusIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  attendanceStatusText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  attendanceStatusLabel: {
    fontSize: 12,
    color: '#666666',
  },
  subjectsContainer: {
    margin: 16,
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
    paddingHorizontal: 4,
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
    backgroundColor: '#9E9E9E',
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
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
  },
  emptyStateSubtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
  },
  noSubjectsText: {
    textAlign: 'center',
    padding: 16,
  },
});

export default ParentChildGradesScreen; 