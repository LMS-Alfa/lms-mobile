import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  ScrollView
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { 
  GradeItem, 
  fetchChildGrades, 
  fetchParentChildAssignments,
  ChildAssignment
} from '../../services/parentSupabaseService';
import { ParentHomeStackParamList } from '../../navigators/ParentTabNavigator';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { GlobalStyles } from '../../styles/GlobalStyles';
import { useAuthStore } from '../../store/authStore';

// Define route params type
type ParentSubjectGradesRouteProp = RouteProp<ParentHomeStackParamList, 'ParentSubjectGrades'>;

// Assignment types
type AssignmentStatus = 'completed' | 'in-progress' | 'upcoming' | 'overdue';

interface Assignment {
  id: string | number;
  title: string;
  description?: string;
  dueDate: string;
  status: AssignmentStatus;
  score?: number;
  completed?: boolean;
  submittedDate?: string;
  feedback?: string;
}

// Extended GradeItem with optional notes
interface ExtendedGradeItem extends GradeItem {
  notes?: string;
  lessonName?: string;
  lessonType?: string;
}

// Include ParentDetailedAssignment interface (likely returned from the API)
interface ParentDetailedAssignment {
  assignments: Assignment[];
  // Other possible fields that might be in the API response
}

// Format date to a readable format
const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
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

// Get color for assignment status
const getAssignmentStatusColor = (status: AssignmentStatus): string => {
  switch (status) {
    case 'completed': return '#4CAF50';
    case 'in-progress': return '#4A90E2';
    case 'upcoming': return '#9E9E9E';
    case 'overdue': return '#F44336';
    default: return '#999999';
  }
};

// Simple Tab View Component
const TabView = ({ 
  tabs, 
  activeTab, 
  onTabChange 
}: { 
  tabs: string[], 
  activeTab: number, 
  onTabChange: (index: number) => void 
}) => {
  return (
    <View style={tabStyles.container}>
      {tabs.map((tab, index) => (
        <TouchableOpacity
          key={index}
          style={[
            tabStyles.tab,
            activeTab === index && tabStyles.activeTab
          ]}
          onPress={() => onTabChange(index)}
        >
          <Text 
            style={[
              tabStyles.tabText,
              activeTab === index && tabStyles.activeTabText
            ]}
          >
            {tab}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// Tab styles
const tabStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#4A90E2',
  },
  tabText: {
    fontSize: 14,
    color: '#666666',
  },
  activeTabText: {
    color: '#4A90E2',
    fontWeight: '600',
  },
});

const ParentSubjectGradesScreen = () => {
  const [grades, setGrades] = useState<GradeItem[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  
  const route = useRoute<ParentSubjectGradesRouteProp>();
  const navigation = useNavigation();
  const { user } = useAuthStore();
  
  const { childId, childName, subjectId, subjectName } = route.params;
  
  // Fetch grades and assignments for this subject
  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        setLoading(true);
        
        console.log(`Fetching data for child: ${childId}, subject: ${subjectId}, name: ${subjectName}`);
        
        // Get all subject grades from Supabase
        const subjectsData = await fetchChildGrades(childId);
        
        // Add detailed logging to debug subject IDs and structure
        console.log("All available subjects:", subjectsData.map(s => ({
          id: s.id,
          name: s.subjectName,
          gradeCount: s.grades?.length || 0
        })));

        // If no subjects were found, display error
        if (!subjectsData || subjectsData.length === 0) {
          console.error("No subjects found for this child");
          setError('No subjects found for this child. Please try again.');
          setLoading(false);
          return;
        }
        
        // Try multiple approaches to find the subject
        let subjectData = null;
        
        // 1. Try to find by exact ID match (convert both to strings for comparison)
        subjectData = subjectsData.find(s => String(s.id) === String(subjectId));
        console.log(`Attempt 1 - Match by exact ID: ${!!subjectData}`);
        
        // 2. If not found, try by subject name exact match
        if (!subjectData && subjectName) {
          subjectData = subjectsData.find(s => 
            s.subjectName === subjectName
          );
          console.log(`Attempt 2 - Match by exact name: ${!!subjectData}`);
        }
        
        // 3. If still not found, try case-insensitive name match
        if (!subjectData && subjectName) {
          subjectData = subjectsData.find(s => 
            s.subjectName.toLowerCase() === subjectName.toLowerCase()
          );
          console.log(`Attempt 3 - Match by lowercase name: ${!!subjectData}`);
        }
        
        // If we still can't find the subject, check if there's only one subject and use that
        if (!subjectData && subjectsData.length === 1) {
          console.log("Only one subject found, using it as default");
          subjectData = subjectsData[0];
        }
        
        // If we still couldn't find the subject, report error
        if (!subjectData) {
          console.error(`Subject with ID ${subjectId} or name ${subjectName} not found in data`);
          setError('Subject data not found. Please try again.');
          setLoading(false);
          return;
        }
        
        console.log(`Found subject: ${subjectData.subjectName} (ID: ${subjectData.id})`);
        console.log(`Found ${subjectData.grades?.length || 0} grades/attendance records for this subject`);
        
        // Process grades to enhance with lesson information
        const processedGrades = (subjectData.grades || [])
          .filter(grade => grade && (grade.date || grade.score || grade.attendance))
          .map(grade => {
            // Create an extended grade item with lesson details if available
            const extendedGrade: ExtendedGradeItem = {
              ...grade,
              // Extract lesson name and type if available
              lessonName: grade.lessonId?.lessonname || grade.title || 'Unknown Lesson',
              lessonType: grade.lessonId?.type || grade.type || 'Unknown Type'
            };
            return extendedGrade;
          })
          .sort((a, b) => {
            // Sort by date (newest first)
            const dateA = new Date(a.date || 0);
            const dateB = new Date(b.date || 0);
            return dateB.getTime() - dateA.getTime();
          });
        
        console.log(`Processed ${processedGrades.length} grade records with lesson details`);
        console.log("First few grade items:", processedGrades.slice(0, 2));
        
        // Set the grades for this subject
        setGrades(processedGrades);
        
        // Fetch assignments for this child
        if (user && user.id) {
          try {
            // Store the actual matched subject ID for use in assignment filtering
            const matchedSubjectId = subjectData.id;
            const matchedSubjectName = subjectData.subjectName;
            
            // Get all assignments for the child
            const allAssignments = await fetchParentChildAssignments(childId, user.id);
            
            console.log(`Fetched ${allAssignments?.length || 0} total assignments for child ${childId}`);
            
            // Filter assignments for the current subject
            // First ensure we have assignments to filter
            if (allAssignments && Array.isArray(allAssignments) && allAssignments.length > 0) {
              console.log("Assignment subject names:", allAssignments.map(a => a.subjectName));
              
              // Filter to only include assignments for the current subject
              // Try multiple approaches to match the subject
              const subjectAssignments = allAssignments.filter(assignment => {
                // Compare with the subject we actually found in the database
                return assignment.subjectName?.toLowerCase() === matchedSubjectName?.toLowerCase();
              });
              
              console.log(`Filtered ${subjectAssignments.length} assignments for subject "${matchedSubjectName}" (ID: ${matchedSubjectId})`);
              
              // Map to the Assignment interface
              const mappedAssignments: Assignment[] = subjectAssignments.map(assignment => ({
                id: assignment.id,
                title: assignment.title,
                description: undefined, // Instructions not available in ChildAssignment
                dueDate: assignment.dueDate,
                status: assignment.isCompleted ? 'completed' : 
                        assignment.isPastDue ? 'overdue' : 'upcoming',
                score: assignment.score,
                completed: assignment.isCompleted,
                submittedDate: undefined, // SubmittedAt not available in ChildAssignment
                feedback: assignment.feedback
              }));
              
              setAssignments(mappedAssignments);
            } else {
              setAssignments([]);
              console.log('No assignments found for this child');
            }
          } catch (assignmentErr) {
            console.error('Error fetching assignments:', assignmentErr);
            // Don't fail completely if assignments can't be fetched
            setAssignments([]);
          }
        } else {
          console.log('No user logged in. Cannot fetch assignments.');
          setAssignments([]);
        }
      } catch (err) {
        console.error('Error fetching subject data:', err);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [childId, subjectId, subjectName, user]);
  
  // Render a grade item
  const renderGradeItem = ({ item }: { item: GradeItem }) => {
    // Cast to extended type to access additional properties
    const extendedItem = item as ExtendedGradeItem;
    
    return (
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
                <Icon name={getGradeTypeIcon(extendedItem.lessonType || item.type || 'assignment')} size={16} color="#FFFFFF" />
              ) : (
                getAttendanceIcon(item.attendance)
              )}
            </View>
            <View style={styles.gradeTitleContainer}>
              <Text style={styles.gradeTitle}>
                {extendedItem.lessonName || item.title}
              </Text>
              {extendedItem.lessonType && (
                <Text style={styles.lessonTypeText}>
                  {extendedItem.lessonType.charAt(0).toUpperCase() + extendedItem.lessonType.slice(1)}
                </Text>
              )}
            </View>
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
  };

  // Render an attendance item
  const renderAttendanceItem = ({ item }: { item: GradeItem }) => {
    // Only show items with attendance data
    if (!item.attendance) return null;
    
    // Safely cast to ExtendedGradeItem to access optional notes
    const extendedItem = item as ExtendedGradeItem;
    
    return (
      <View style={styles.attendanceItem}>
        <View style={styles.attendanceHeader}>
          <View style={styles.attendanceTypeContainer}>
            <View style={[styles.iconContainer, { backgroundColor: getColorFor(item.attendance, true) }]}>
              {getAttendanceIcon(item.attendance)}
            </View>
            <View style={styles.attendanceTitleContainer}>
              <Text style={styles.attendanceTitle}>
                {extendedItem.lessonName || item.title || 'Class Session'}
              </Text>
              {extendedItem.lessonType && (
                <Text style={styles.lessonTypeText}>
                  {extendedItem.lessonType.charAt(0).toUpperCase() + extendedItem.lessonType.slice(1)}
                </Text>
              )}
              <Text style={styles.dateText}>{formatDate(item.date)}</Text>
            </View>
          </View>
          <View style={[styles.attendanceBadge, { backgroundColor: getColorFor(item.attendance, true) }]}>
            <Text style={styles.gradeBadgeText}>{getAttendanceText(item.attendance)}</Text>
          </View>
        </View>

        {extendedItem.notes && (
          <View style={styles.attendanceNotes}>
            <Text style={styles.notesLabel}>Notes:</Text>
            <Text style={styles.notesText}>{extendedItem.notes}</Text>
          </View>
        )}
      </View>
    );
  };

  // Render an assignment item
  const renderAssignmentItem = ({ item }: { item: Assignment }) => (
    <View style={styles.assignmentItem}>
      <View style={styles.assignmentHeader}>
        <View style={styles.assignmentTypeContainer}>
          <View style={[styles.iconContainer, { backgroundColor: getAssignmentStatusColor(item.status) }]}>
            <Icon 
              name={
                item.status === 'completed' ? 'check-circle' : 
                item.status === 'overdue' ? 'alert-circle' :
                item.status === 'in-progress' ? 'clock' : 'calendar'
              } 
              size={16} 
              color="#FFFFFF" 
            />
          </View>
          <View style={styles.assignmentTitleContainer}>
            <Text style={styles.assignmentTitle}>{item.title}</Text>
            <Text style={styles.dateText}>Due: {formatDate(item.dueDate)}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getAssignmentStatusColor(item.status) }]}>
          <Text style={styles.gradeBadgeText}>
            {item.status === 'completed' ? 'Completed' : 
             item.status === 'overdue' ? 'Overdue' :
             item.status === 'in-progress' ? 'In Progress' : 'Upcoming'}
          </Text>
        </View>
      </View>

      {item.description && (
        <View style={styles.assignmentDescription}>
          <Text style={styles.descriptionText}>{item.description}</Text>
        </View>
      )}

      {item.score !== undefined && (
        <View style={styles.assignmentScore}>
          <Text style={styles.scoreLabel}>Score:</Text>
          <Text style={styles.scoreValue}>{item.score}</Text>
        </View>
      )}

      {item.feedback && (
        <View style={styles.assignmentFeedback}>
          <Text style={styles.feedbackLabel}>Teacher Feedback:</Text>
          <Text style={styles.feedbackText}>{item.feedback}</Text>
        </View>
      )}
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
  
  // Filter grades data for different purposes
  // Items with scores for the grades tab
  const gradesWithScores = grades.filter(grade => 
    grade.score !== null && grade.score !== undefined
  );
  
  // Items with attendance for the attendance tab
  const attendanceItems = grades.filter(g => g.attendance);
  
  // Calculate average grade (only for items with scores)
  const totalScore = gradesWithScores.reduce((sum, grade) => sum + (grade.score || 0), 0);
  const averageScore = gradesWithScores.length > 0 ? totalScore / gradesWithScores.length : 0;
  
  // Get info about attendance
  const attendance = {
    present: grades.filter(g => g.attendance?.toLowerCase() === 'present').length,
    absent: grades.filter(g => g.attendance?.toLowerCase() === 'absent').length,
    late: grades.filter(g => g.attendance?.toLowerCase() === 'late').length,
    excused: grades.filter(g => g.attendance?.toLowerCase() === 'excused').length,
  };

  // Get assignment stats
  const assignmentStats = {
    completed: assignments.filter(a => a.status === 'completed').length,
    inProgress: assignments.filter(a => a.status === 'in-progress').length,
    upcoming: assignments.filter(a => a.status === 'upcoming').length,
    overdue: assignments.filter(a => a.status === 'overdue').length,
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
      
      <View style={styles.contentContainer}>
        {/* Tab Navigation */}
        <TabView 
          tabs={['Grades', 'Attendance', 'Assignments']} 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
        />
        
        {/* Tab Content */}
        {activeTab === 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Grade Entries</Text>
              <Text style={styles.sectionSubtitle}>
                {gradesWithScores.length} grade{gradesWithScores.length !== 1 ? 's' : ''} • 
                Avg: {Math.round(averageScore * 10) / 10}
              </Text>
            </View>
            <FlatList
              data={gradesWithScores}
              renderItem={renderGradeItem}
              keyExtractor={(item, index) => `grade-${item.id || index}`}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={() => (
                <View style={styles.emptyContainer}>
                  <Icon name="bar-chart-2" size={50} color="#ccc" />
                  <Text style={styles.emptyText}>No grades available for this subject</Text>
                </View>
              )}
            />
          </>
        )}
        
        {activeTab === 1 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Attendance Records</Text>
              <Text style={styles.sectionSubtitle}>
                Present: {attendance.present} • 
                Absent: {attendance.absent} • 
                Late: {attendance.late}
              </Text>
            </View>
            <FlatList
              data={attendanceItems}
              renderItem={renderAttendanceItem}
              keyExtractor={(item, index) => `attendance-${item.id || index}`}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={() => (
                <View style={styles.emptyContainer}>
                  <Icon name="user-check" size={50} color="#ccc" />
                  <Text style={styles.emptyText}>No attendance records available</Text>
                </View>
              )}
            />
          </>
        )}
        
        {activeTab === 2 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Assignments</Text>
              <Text style={styles.sectionSubtitle}>
                Completed: {assignmentStats.completed} • 
                Overdue: {assignmentStats.overdue} • 
                Upcoming: {assignmentStats.upcoming}
              </Text>
            </View>
            <FlatList
              data={assignments}
              renderItem={renderAssignmentItem}
              keyExtractor={(item, index) => `assignment-${item.id || index}`}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={() => (
                <View style={styles.emptyContainer}>
                  <Icon name="file-text" size={50} color="#ccc" />
                  <Text style={styles.emptyText}>No assignments available for this subject</Text>
                </View>
              )}
            />
          </>
        )}
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
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#666666',
  },
  listContent: {
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
  gradeTitleContainer: {
    flexDirection: 'column',
    flex: 1,
  },
  gradeTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    flex: 1,
  },
  lessonTypeText: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
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
  attendanceItem: {
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
  attendanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  attendanceTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  attendanceTitleContainer: {
    flexDirection: 'column',
    flex: 1,
  },
  attendanceTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
  },
  attendanceNotes: {
    marginTop: 4,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 2,
  },
  notesText: {
    fontSize: 12,
    color: '#666666',
  },
  assignmentItem: {
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
  assignmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  assignmentTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  assignmentTitleContainer: {
    flexDirection: 'column',
    flex: 1,
  },
  assignmentTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 10,
  },
  assignmentDescription: {
    marginTop: 4,
  },
  descriptionText: {
    fontSize: 12,
    color: '#666666',
  },
  assignmentScore: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333333',
    marginRight: 4,
  },
  scoreValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333333',
  },
  assignmentFeedback: {
    marginTop: 4,
  },
  feedbackLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 2,
  },
  feedbackText: {
    fontSize: 12,
    color: '#666666',
  },
});

export default ParentSubjectGradesScreen; 