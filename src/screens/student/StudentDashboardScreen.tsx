import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useEffect, useState, useCallback } from 'react'
import {
	ActivityIndicator,
	RefreshControl,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native'
import Icon from 'react-native-vector-icons/Feather'
import { Assignment, getStudentAssignments } from '../../services/assignmentService'
import { GradeItem, getStudentGrades } from '../../services/gradesService'
import { useAuthStore } from '../../store/authStore'
import { useAppTheme } from '../../contexts/ThemeContext'

// Define the type for the navigation stack
type StudentStackParamList = {
	AssignmentDetail: { assignmentId: number }
	Grades: undefined
	Schedule: undefined
	Announcements: undefined
	Assignments: undefined
}

// Mock data - will be replaced with API calls
const mockUpcomingAssignments = [
	{ id: 1, title: 'Math Assignment', dueDate: '2023-05-25', subject: 'Mathematics' },
	{ id: 2, title: 'Physics Lab Report', dueDate: '2023-05-26', subject: 'Physics' },
	{ id: 3, title: 'History Essay', dueDate: '2023-05-28', subject: 'History' },
]

const mockSchedule = [
	{ id: 1, title: 'Mathematics', time: '09:00 - 10:30', room: 'Room 101' },
	{ id: 2, title: 'Physics', time: '11:00 - 12:30', room: 'Lab 3' },
	{ id: 3, title: 'English Literature', time: '14:00 - 15:30', room: 'Room 205' },
]

const mockAnnouncements = [
	{
		id: 1,
		title: 'End of Semester Notice',
		content: 'All assignments must be submitted by June 10th.',
		date: '2023-05-15',
	},
	{
		id: 2,
		title: 'Summer School Registration',
		content: 'Registration for summer courses is now open.',
		date: '2023-05-12',
	},
]

const StudentDashboardScreen = () => {
	const { theme } = useAppTheme()
	const [refreshing, setRefreshing] = useState(false)
	const [loading, setLoading] = useState(true)
	const [assignments, setAssignments] = useState<Assignment[]>([])
	const [recentGrades, setRecentGrades] = useState<GradeItem[]>([])
	const [gradesLoading, setGradesLoading] = useState(true)
	const [gradesError, setGradesError] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)
	const navigation = useNavigation<StackNavigationProp<StudentStackParamList>>()
	const { user } = useAuthStore()

	const fetchAssignments = async () => {
		try {
			if (!user?.id) return
			const data = await getStudentAssignments(user.id)
			const upcomingAssignments = data
				.filter(a => a.status !== 'completed')
				.sort((a, b) => new Date(a.duedate || '').getTime() - new Date(b.duedate || '').getTime())
				.slice(0, 3)
			setAssignments(upcomingAssignments)
			setError(null)
		} catch (err) {
			console.error('Error fetching assignments:', err)
			setError('Failed to load assignments')
		}
	}

	const fetchGrades = async () => {
		try {
			if (!user?.id) return
			setGradesLoading(true)
			const subjectGrades = await getStudentGrades(user.id)
			const allGrades: GradeItem[] = []
			subjectGrades.forEach(subject => {
				if (subject.grades && subject.grades.length > 0) {
					const gradesWithSubject = subject.grades.map(grade => ({
						...grade,
						subjectName: subject.subjectName,
					}))
					allGrades.push(...gradesWithSubject)
				}
			})
			const sortedGrades = allGrades
				.filter(grade => grade.score !== null)
				.sort((a, b) => {
					const dateA = new Date(a.date).getTime()
					const dateB = new Date(b.date).getTime()
					if (dateB !== dateA) {
						return dateB - dateA
					}
					return (b.score || 0) - (a.score || 0)
				})
				.slice(0, 3)
			setRecentGrades(sortedGrades)
			setGradesError(null)
		} catch (err) {
			console.error('Error fetching grades:', err)
			setGradesError('Failed to load grades')
		} finally {
			setGradesLoading(false)
		}
	}

	useEffect(() => {
		Promise.all([fetchAssignments(), fetchGrades()]).finally(() => setLoading(false))
	}, [user?.id])

	const onRefresh = useCallback(async () => {
		setRefreshing(true)
		await Promise.all([fetchAssignments(), fetchGrades()])
		setRefreshing(false)
	}, [user?.id])

	if (loading) {
		return (
			<View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
				<ActivityIndicator size='large' color={theme.primary} />
				<Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading your dashboard...</Text>
			</View>
		)
	}

	const getStatusColor = (status: Assignment['status']) => {
		switch (status) {
			case 'overdue':
				return theme.danger
			case 'in_progress':
				return theme.warning
			case 'not_started':
			default:
				return theme.primary
		}
	}

	const getStatusText = (status: Assignment['status']) => {
		switch (status) {
			case 'overdue':
				return 'Overdue'
			case 'in_progress':
				return 'In Progress'
			case 'not_started':
				return 'Not Started'
			default:
				return status
		}
	}

	return (
		<ScrollView
			style={[styles.container, { backgroundColor: theme.background }]}
			refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />}
		>
			{/* Welcome Section */}
			<View style={[styles.welcomeSection, { backgroundColor: theme.primary }]}>
				<Text style={[styles.welcomeText, { color: theme.cardBackground }]}>Welcome back, {user?.firstName || 'Student'}!</Text>
				<Text style={[styles.dateText, { color: theme.subtleText }]}>
					{new Date().toLocaleDateString('en-US', {
						weekday: 'long',
						year: 'numeric',
						month: 'long',
						day: 'numeric',
					})}
				</Text>
			</View>

			{/* Upcoming Assignments */}
			<View style={[styles.sectionContainer, { backgroundColor: theme.cardBackground, shadowColor: theme.text }]}>
				<View style={styles.sectionHeader}>
					<Text style={[styles.sectionTitle, { color: theme.text }]}>Upcoming Assignments</Text>
					<TouchableOpacity style={styles.seeAllButton} onPress={() => navigation.navigate('Assignments')}>
						<Text style={[styles.seeAllText, { color: theme.primary }]}>See all</Text>
					</TouchableOpacity>
				</View>

				{error ? (
					<Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
				) : assignments.length === 0 ? (
					<Text style={[styles.noAssignmentsText, { color: theme.textSecondary }]}>No upcoming assignments</Text>
				) : (
					assignments.map((assignment, index) => (
						<TouchableOpacity
							key={assignment.id}
							style={[
								styles.assignmentItem,
								{ borderBottomColor: theme.separator },
								index === assignments.length - 1 && styles.lastItem,
							]}
							onPress={() => {
								const idAsNumber = parseInt(String(assignment.id), 10)
								if (!isNaN(idAsNumber)) {
									navigation.navigate('AssignmentDetail', { assignmentId: idAsNumber })
								}
							}}
						>
							<View style={styles.assignmentContent}>
								<Text style={[styles.assignmentTitle, { color: theme.text }]}>{assignment.title}</Text>
								<Text style={[styles.assignmentSubject, { color: theme.textSecondary }]}>
									{assignment.subject?.subjectname || 'No subject'}
								</Text>
								<View style={styles.statusContainer}>
									<View
										style={[
											styles.statusDot,
											{ backgroundColor: getStatusColor(assignment.status) },
										]}
									/>
									<Text style={[styles.statusText, { color: getStatusColor(assignment.status) }]}>
										{getStatusText(assignment.status)}
									</Text>
								</View>
							</View>
							<View style={styles.assignmentDueDate}>
								<Text style={[styles.dueDateLabel, { color: theme.textSecondary }]}>Due:</Text>
								<Text
									style={[
										styles.dueDateText,
										{ color: assignment.status === 'overdue' ? theme.danger : theme.text },
									]}
								>
									{assignment.duedate
										? new Date(assignment.duedate).toLocaleDateString()
										: 'No due date'}
								</Text>
							</View>
						</TouchableOpacity>
					))
				)}
			</View>

			{/* Recent Grades */}
			<View style={[styles.sectionContainer, { backgroundColor: theme.cardBackground, shadowColor: theme.text }]}>
				<View style={styles.sectionHeader}>
					<Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Grades</Text>
					<TouchableOpacity style={styles.seeAllButton} onPress={() => navigation.navigate('Grades')}>
						<Text style={[styles.seeAllText, { color: theme.primary }]}>See all</Text>
					</TouchableOpacity>
				</View>

				{gradesLoading ? (
					<View style={styles.loadingIndicator}>
						<ActivityIndicator size='small' color={theme.primary} />
						<Text style={[styles.loadingGradesText, { color: theme.textSecondary }]}>Loading grades...</Text>
					</View>
				) : gradesError ? (
					<Text style={[styles.errorText, { color: theme.danger }]}>{gradesError}</Text>
				) : recentGrades.length === 0 ? (
					<Text style={[styles.noAssignmentsText, { color: theme.textSecondary }]}>No grades available</Text>
				) : (
					recentGrades.map((grade, index) => (
						<TouchableOpacity
							key={grade.id}
							style={[
								styles.gradeItem,
								{ borderBottomColor: theme.separator },
								index === recentGrades.length - 1 && styles.lastItem,
							]}
							onPress={() => navigation.navigate('Grades')}
						>
							<View style={styles.gradeContent}>
								<Text style={[styles.gradeTitle, { color: theme.text }]}>{grade.title}</Text>
								<Text style={[styles.gradeSubject, { color: theme.textSecondary }]}>
									{(grade as any).subjectName || 'No subject'}
								</Text>
							</View>
							<View style={styles.gradeValue}>
								<Text
									style={[
										styles.gradeText,
										{
											color: grade.grade.startsWith('A')
												? theme.success
												: grade.grade.startsWith('B')
												? theme.success
												: grade.grade.startsWith('C')
												? theme.warning
												: theme.danger,
										},
									]}
								>
									{grade.grade}
								</Text>
							</View>
						</TouchableOpacity>
					))
				)}
			</View>
			{/* Bottom padding */}
			<View style={styles.bottomPadding} />
		</ScrollView>
	)
}

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
	welcomeSection: {
		padding: 20,
	},
	welcomeText: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 5,
	},
	dateText: {
		fontSize: 14,
	},
	sectionContainer: {
		borderRadius: 10,
		marginHorizontal: 16,
		marginTop: 20,
		padding: 16,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 2,
	},
	sectionHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 20,
	},
	sectionTitle: {
		fontSize: 20,
		fontWeight: '600',
	},
	seeAllButton: {
		paddingVertical: 4,
		paddingHorizontal: 8,
	},
	seeAllText: {
		fontSize: 15,
		fontWeight: '500',
	},
	assignmentItem: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: 16,
		borderBottomWidth: 1,
	},
	assignmentContent: {
		flex: 1,
		marginRight: 10,
	},
	assignmentTitle: {
		fontSize: 16,
		fontWeight: '500',
		marginBottom: 4,
	},
	assignmentSubject: {
		fontSize: 14,
	},
	assignmentDueDate: {
		alignItems: 'flex-end',
		justifyContent: 'center',
	},
	dueDateLabel: {
		fontSize: 12,
		marginBottom: 2,
	},
	dueDateText: {
		fontSize: 14,
		fontWeight: '500',
	},
	gradeItem: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: 16,
		borderBottomWidth: 1,
	},
	gradeContent: {
		flex: 1,
		marginRight: 10,
	},
	gradeTitle: {
		fontSize: 16,
		fontWeight: '500',
		marginBottom: 4,
	},
	gradeSubject: {
		fontSize: 14,
	},
	gradeValue: {
		justifyContent: 'center',
		alignItems: 'flex-end',
	},
	gradeText: {
		fontSize: 20,
		fontWeight: 'bold',
	},
	bottomPadding: {
		height: 24,
	},
	errorText: {
		textAlign: 'center',
		marginVertical: 10,
		fontStyle: 'italic',
	},
	noAssignmentsText: {
		textAlign: 'center',
		marginVertical: 10,
		fontStyle: 'italic',
		paddingVertical: 20,
	},
	statusContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 6,
	},
	statusDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		marginRight: 6,
	},
	statusText: {
		fontSize: 12,
		fontWeight: '500',
	},
	loadingIndicator: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		padding: 10,
	},
	loadingGradesText: {
		marginLeft: 10,
		fontSize: 14,
	},
	lastItem: {
		borderBottomWidth: 0,
	},
})

export default StudentDashboardScreen
