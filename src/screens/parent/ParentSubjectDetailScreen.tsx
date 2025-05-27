import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native'
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native'
import { ParentHomeStackParamList } from '../../navigators/ParentTabNavigator'
import {
  fetchParentChildSubjectGradesForSubject,
  fetchParentChildAssignmentsForSubject,
  fetchParentChildAttendanceForSubject,
  SubjectGrade,
  GradeItem,
  ChildAssignment,
} from '../../services/parentSupabaseService'
import { Card, Button } from 'react-native-paper'
import { Ionicons } from '@expo/vector-icons'
import { useAppTheme, AppTheme } from '../../contexts/ThemeContext'
import { SafeAreaView } from 'react-native-safe-area-context'

type ParentSubjectDetailScreenRouteProp = RouteProp<
  ParentHomeStackParamList,
  'SubjectDetail'
>

// Add date formatting utilities
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const formatDateFull = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

enum TabType {
  GRADES = 'grades',
  ASSIGNMENTS = 'assignments',
  ATTENDANCE = 'attendance',
}

const ParentSubjectDetailScreen = () => {
  const route = useRoute<ParentSubjectDetailScreenRouteProp>()
  const navigation = useNavigation()
  const { childId, subjectId, subjectName, parentId } = route.params
  const { theme, isDarkMode } = useAppTheme()

  const [activeTab, setActiveTab] = useState<TabType>(TabType.GRADES)
  const [subjectData, setSubjectData] = useState<SubjectGrade | null>(null)
  const [assignments, setAssignments] = useState<ChildAssignment[]>([])
  const [attendance, setAttendance] = useState<{
    records: Array<{
      id: string
      status: string
      date: string
      lessonName: string
      lessonDate?: string
      subjectName: string
    }>
    statistics: {
      total: number
      present: number
      absent: number
      late: number
      excused: number
    }
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [activeTab])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      if (activeTab === TabType.GRADES) {
        const data = await fetchParentChildSubjectGradesForSubject(
          childId,
          parentId,
          subjectId
        )
        setSubjectData(data)
      } else if (activeTab === TabType.ASSIGNMENTS) {
        const data = await fetchParentChildAssignmentsForSubject(
          childId,
          parentId,
          subjectId
        )
        setAssignments(data)
      } else if (activeTab === TabType.ATTENDANCE) {
        const data = await fetchParentChildAttendanceForSubject(
          childId,
          parentId,
          subjectId
        )
        setAttendance(data)
      }
    } catch (err) {
      console.error('Error loading subject data:', err)
      setError('Failed to load data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const renderGrades = () => {
    if (!subjectData) return <Text style={[styles.emptyText, {color: theme.textSecondary}]}>No grades available</Text>

    return (
      <View style={styles.sectionContainer}>
        <Card style={[styles.summaryCard, { backgroundColor: theme.cardBackground }]}>
          <Card.Content>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Subject Summary</Text>
            <Text style={[styles.teacherName, { color: theme.textSecondary }]}>
              Teacher: {subjectData.teacherName}
            </Text>
            <Text style={[styles.averageGrade, { color: theme.primary }]}>
              Average: {subjectData.averageGrade} ({subjectData.numericGrade.toFixed(1)})
            </Text>
          </Card.Content>
        </Card>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Grades</Text>
        {subjectData.grades.length === 0 ? (
          <Text style={[styles.emptyText, {color: theme.textSecondary}]}>No grades recorded yet</Text>
        ) : (
          subjectData.grades.map((grade: GradeItem) => (
            <Card key={grade.id.toString()} style={[styles.itemCard, { backgroundColor: theme.cardBackground }]}>
              <Card.Content>
                <View style={styles.itemHeader}>
                  <Text style={[styles.itemTitle, { color: theme.text }]}>{grade.title}</Text>
                  <Text style={[styles.gradeValue, { color: getGradeColor(grade.grade, theme) }]}>
                    {grade.grade || 'N/A'}
                  </Text>
                </View>
                <Text style={[styles.itemDate, { color: theme.textSecondary }]}>{formatDate(grade.date)}</Text>
                {grade.score !== null && (
                  <Text style={[styles.scoreText, { color: theme.text }]}>Score: {grade.score}/10</Text>
                )}
                {grade.attendance && (
                  <Text style={[
                    styles.attendanceText,
                    { color: getAttendanceColor(grade.attendance, theme) },
                  ]}>
                    Attendance: {grade.attendance}
                  </Text>
                )}
                {grade.feedback && (
                  <View style={[styles.feedbackContainer, { backgroundColor: theme.background }]}>
                    <Text style={[styles.feedbackLabel, { color: theme.textSecondary }]}>Feedback:</Text>
                    <Text style={[styles.feedbackText, { color: theme.text }]}>{grade.feedback}</Text>
                  </View>
                )}
              </Card.Content>
            </Card>
          ))
        )}
      </View>
    )
  }

  const renderAssignments = () => {
    if (assignments.length === 0) return <Text style={[styles.emptyText, {color: theme.textSecondary}]}>No assignments available</Text>

    return (
      <View style={styles.sectionContainer}>
        {assignments.map(assignment => (
          <Card key={assignment.id} style={[styles.itemCard, { backgroundColor: theme.cardBackground }]}>
            <Card.Content>
              <View style={styles.itemHeader}>
                <Text style={[styles.itemTitle, { color: theme.text }]}>{assignment.title}</Text>
                <View style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(assignment, theme) },
                  ]}>
                  <Text style={styles.statusText}>
                    {assignment.isCompleted
                      ? 'Completed'
                      : assignment.isPastDue
                      ? 'Past Due'
                      : 'Upcoming'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.itemDate, { color: theme.textSecondary }]}>
                Due: {formatDateFull(assignment.dueDate)}
              </Text>
              {assignment.score !== undefined && assignment.score !== null && (
                <Text style={[styles.scoreText, { color: theme.text }]}>Score: {assignment.score}/10</Text>
              )}
              {assignment.feedback && (
                <View style={[styles.feedbackContainer, { backgroundColor: theme.background }]}>
                  <Text style={[styles.feedbackLabel, { color: theme.textSecondary }]}>Feedback:</Text>
                  <Text style={[styles.feedbackText, { color: theme.text }]}>{assignment.feedback}</Text>
                </View>
              )}
            </Card.Content>
          </Card>
        ))}
      </View>
    )
  }

  const renderAttendance = () => {
    if (!attendance) return <Text style={[styles.emptyText, {color: theme.textSecondary}]}>No attendance records available</Text>

    const { records, statistics } = attendance

    return (
      <View style={styles.sectionContainer}>
        <Card style={[styles.summaryCard, { backgroundColor: theme.cardBackground }]}>
          <Card.Content>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Attendance Summary</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.success }]}>{statistics.present}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Present</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.danger }]}>{statistics.absent}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Absent</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.warning }]}>{statistics.late}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Late</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.primary }]}>{statistics.excused}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Excused</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Attendance Records</Text>
        {records.length === 0 ? (
          <Text style={[styles.emptyText, {color: theme.textSecondary}]}>No attendance records yet</Text>
        ) : (
          records.map(record => (
            <Card key={record.id} style={[styles.itemCard, { backgroundColor: theme.cardBackground }]}>
              <Card.Content>
                <View style={styles.itemHeader}>
                  <Text style={[styles.itemTitle, { color: theme.text }]}>{record.lessonName}</Text>
                  <Text style={[
                      styles.attendanceStatus,
                      { color: getAttendanceColor(record.status, theme) },
                    ]}>
                    {record.status}
                  </Text>
                </View>
                <Text style={[styles.itemDate, { color: theme.textSecondary }]}>{formatDate(record.date)}</Text>
              </Card.Content>
            </Card>
          ))
        )}
      </View>
    )
  }

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading data...</Text>
        </View>
      )
    }

    if (error) {
      return (
        <View style={styles.centeredContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.danger} />
          <Text style={[styles.errorText, { color: theme.textSecondary }]}>{error}</Text>
          <Button
            mode="contained"
            onPress={loadData}
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
            labelStyle={{ color: theme.cardBackground }}
          >
            Retry
          </Button>
        </View>
      )
    }

    switch (activeTab) {
      case TabType.GRADES:
        return renderGrades()
      case TabType.ASSIGNMENTS:
        return renderAssignments()
      case TabType.ATTENDANCE:
        return renderAttendance()
      default:
        return null
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <Text style={styles.title}>{subjectName}</Text>
      </View>

      <View style={[styles.tabBar, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === TabType.GRADES && [styles.activeTab, { borderBottomColor: theme.primary }],
          ]}
          onPress={() => setActiveTab(TabType.GRADES)}
        >
          <Text style={[
              styles.tabText,
              { color: activeTab === TabType.GRADES ? theme.primary : theme.textSecondary },
            ]}>
            Grades
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === TabType.ASSIGNMENTS && [
              styles.activeTab,
              { borderBottomColor: theme.primary },
            ],
          ]}
          onPress={() => setActiveTab(TabType.ASSIGNMENTS)}
        >
          <Text style={[
              styles.tabText,
              { color: activeTab === TabType.ASSIGNMENTS ? theme.primary : theme.textSecondary },
            ]}>
            Assignments
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === TabType.ATTENDANCE && [
              styles.activeTab,
              { borderBottomColor: theme.primary },
            ],
          ]}
          onPress={() => setActiveTab(TabType.ATTENDANCE)}
        >
          <Text style={[
              styles.tabText,
              { color: activeTab === TabType.ATTENDANCE ? theme.primary : theme.textSecondary },
            ]}>
            Attendance
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  )
}

// Helper functions for UI
const getGradeColor = (grade: string, theme: AppTheme) => {
  switch (grade) {
    case 'A':
      return theme.success
    case 'B':
      return theme.primary
    case 'C':
      return theme.warning
    case 'D':
      return theme.warning
    case 'F':
      return theme.danger
    default:
      return theme.textSecondary
  }
}

const getAttendanceColor = (status: string, theme: AppTheme) => {
  switch (status.toLowerCase()) {
    case 'present':
      return theme.success
    case 'absent':
      return theme.danger
    case 'late':
      return theme.warning
    case 'excused':
      return theme.primary
    default:
      return theme.textSecondary
  }
}

const getStatusColor = (assignment: ChildAssignment, theme: AppTheme) => {
  if (assignment.isCompleted) {
    return theme.success
  } else if (assignment.isPastDue) {
    return theme.danger
  } else {
    return theme.primary
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    elevation: 2,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: 'white',
  },
  tabBar: {
    flexDirection: 'row',
    elevation: 1,
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 30,
    paddingHorizontal: 20,
  },
  sectionContainer: {
    flex: 1,
  },
  summaryCard: {
    marginBottom: 20,
    borderRadius: 12,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  teacherName: {
    fontSize: 15,
    marginBottom: 6,
  },
  averageGrade: {
    fontSize: 17,
    fontWeight: 'bold',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 12,
  },
  itemCard: {
    marginBottom: 16,
    borderRadius: 10,
    elevation: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  gradeValue: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  itemDate: {
    fontSize: 13,
    marginBottom: 8,
  },
  scoreText: {
    fontSize: 14,
    marginTop: 6,
  },
  attendanceText: {
    fontSize: 14,
    marginTop: 6,
  },
  feedbackContainer: {
    marginTop: 10,
    padding: 10,
    borderRadius: 6,
  },
  feedbackLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  feedbackText: {
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 13,
  },
  attendanceStatus: {
    fontSize: 16,
    fontWeight: 'bold',
  },
})

export default ParentSubjectDetailScreen 