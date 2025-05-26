import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useEffect, useState } from 'react'
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

// Define the type for the navigation stack
type StudentStackParamList = {
	AssignmentDetail: { assignmentId: number }
	Grades: undefined
	Schedule: undefined
	Announcements: undefined
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
			// Sort by due date and take only upcoming assignments (not completed)
			const upcomingAssignments = data
				.filter(a => a.status !== 'completed')
				.sort((a, b) => new Date(a.duedate || '').getTime() - new Date(b.duedate || '').getTime())
				.slice(0, 3) // Take only the first 3
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
			// Fetch all subject grades for the student
			const subjectGrades = await getStudentGrades(user.id)

			// Extract all grade items from all subjects
			const allGrades: GradeItem[] = []
			subjectGrades.forEach(subject => {
				if (subject.grades && subject.grades.length > 0) {
					// Add subject name to each grade item for display
					const gradesWithSubject = subject.grades.map(grade => ({
						...grade,
						subjectName: subject.subjectName,
					}))
					allGrades.push(...gradesWithSubject)
				}
			})

			// Sort grades by date (most recent first), then by score (highest first),
			// and take only the top 3
			const sortedGrades = allGrades
				.filter(grade => grade.score !== null) // Filter out grades without scores
				.sort((a, b) => {
					// First sort by date (most recent first)
					const dateA = new Date(a.date).getTime()
					const dateB = new Date(b.date).getTime()
					if (dateB !== dateA) {
						return dateB - dateA
					}
					// If dates are the same, sort by score (highest first)
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

	const onRefresh = React.useCallback(async () => {
		setRefreshing(true)
		await Promise.all([fetchAssignments(), fetchGrades()])
		setRefreshing(false)
	}, [user?.id])

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size='large' color='#4A90E2' />
				<Text style={styles.loadingText}>Loading your dashboard...</Text>
			</View>
		)
	}

	const getStatusColor = (status: Assignment['status']) => {
		switch (status) {
			case 'overdue':
				return '#FF4B4B'
			case 'in_progress':
				return '#FFB800'
			case 'not_started':
				return '#4A90E2'
			default:
				return '#4A90E2'
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
			style={styles.container}
			refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
		>
			{/* Welcome Section */}
			<View style={styles.welcomeSection}>
				<Text style={styles.welcomeText}>Welcome back, {user?.firstName || 'Student'}!</Text>
				<Text style={styles.dateText}>
					{new Date().toLocaleDateString('en-US', {
						weekday: 'long',
						year: 'numeric',
						month: 'long',
						day: 'numeric',
					})}
				</Text>
			</View>

			{/* Quick Stats */}
			<View style={styles.statsContainer}>
				<View style={styles.statItem}>
					<Icon name='file-text' size={24} color='#4A90E2' />
					<Text style={styles.statNumber}>{assignments.length}</Text>
					<Text style={styles.statLabel}>Assignments</Text>
				</View>
				<View style={styles.statItem}>
					<Icon name='calendar' size={24} color='#4A90E2' />
					<Text style={styles.statNumber}>{mockSchedule.length}</Text>
					<Text style={styles.statLabel}>Classes Today</Text>
				</View>
				<View style={styles.statItem}>
					<Icon name='bell' size={24} color='#4A90E2' />
					<Text style={styles.statNumber}>{mockAnnouncements.length}</Text>
					<Text style={styles.statLabel}>Announcements</Text>
				</View>
			</View>

			{/* Upcoming Assignments */}
			<View style={styles.sectionContainer}>
				<View style={styles.sectionHeader}>
					<Text style={styles.sectionTitle}>Upcoming Assignments</Text>
					<TouchableOpacity onPress={() => navigation.navigate('Assignments')}>
						<Text style={styles.seeAllText}>See all</Text>
					</TouchableOpacity>
				</View>

				{error ? (
					<Text style={styles.errorText}>{error}</Text>
				) : assignments.length === 0 ? (
					<Text style={styles.noAssignmentsText}>No upcoming assignments</Text>
				) : (
					assignments.map(assignment => (
						<TouchableOpacity
							key={assignment.id}
							style={styles.assignmentItem}
							onPress={() =>
								navigation.navigate('AssignmentDetail', { assignmentId: assignment.id })
							}
						>
							<View style={styles.assignmentContent}>
								<Text style={styles.assignmentTitle}>{assignment.title}</Text>
								<Text style={styles.assignmentSubject}>
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
								<Text style={styles.dueDateLabel}>Due:</Text>
								<Text
									style={[
										styles.dueDateText,
										assignment.status === 'overdue' && styles.overdueDateText,
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
			<View style={styles.sectionContainer}>
				<View style={styles.sectionHeader}>
					<Text style={styles.sectionTitle}>Recent Grades</Text>
					<TouchableOpacity onPress={() => navigation.navigate('Grades')}>
						<Text style={styles.seeAllText}>See all</Text>
					</TouchableOpacity>
				</View>

				{gradesLoading ? (
					<View style={styles.loadingIndicator}>
						<ActivityIndicator size='small' color='#4A90E2' />
						<Text style={styles.loadingGradesText}>Loading grades...</Text>
					</View>
				) : gradesError ? (
					<Text style={styles.errorText}>{gradesError}</Text>
				) : recentGrades.length === 0 ? (
					<Text style={styles.noAssignmentsText}>No grades available</Text>
				) : (
					recentGrades.map(grade => (
						<TouchableOpacity
							key={grade.id}
							style={styles.gradeItem}
							onPress={() => navigation.navigate('Grades')}
						>
							<View style={styles.gradeContent}>
								<Text style={styles.gradeTitle}>{grade.title}</Text>
								<Text style={styles.gradeSubject}>
									{(grade as any).subjectName || 'No subject'}
								</Text>
							</View>
							<View style={styles.gradeValue}>
								<Text
									style={[
										styles.gradeText,
										grade.grade.startsWith('A')
											? styles.gradeA
											: grade.grade.startsWith('B')
											? styles.gradeB
											: grade.grade.startsWith('C')
											? styles.gradeC
											: styles.gradeOther,
									]}
								>
									{grade.grade}
								</Text>
							</View>
						</TouchableOpacity>
					))
				)}
			</View>

			{/* Today's Schedule */}
			<View style={styles.sectionContainer}>
				<View style={styles.sectionHeader}>
					<Text style={styles.sectionTitle}>Today's Schedule</Text>
					<TouchableOpacity onPress={() => navigation.navigate('Schedule')}>
						<Text style={styles.seeAllText}>Full schedule</Text>
					</TouchableOpacity>
				</View>

				{mockSchedule.map(classItem => (
					<TouchableOpacity
						key={classItem.id}
						style={styles.scheduleItem}
						onPress={() => navigation.navigate('Schedule')}
					>
						<View style={styles.scheduleTimeContainer}>
							<Text style={styles.scheduleTime}>{classItem.time}</Text>
							<Text style={styles.scheduleRoom}>{classItem.room}</Text>
						</View>
						<View style={styles.scheduleDetails}>
							<Text style={styles.scheduleTitle}>{classItem.title}</Text>
						</View>
					</TouchableOpacity>
				))}
			</View>

			{/* Recent Announcements */}
			<View style={styles.sectionContainer}>
				<View style={styles.sectionHeader}>
					<Text style={styles.sectionTitle}>Announcements</Text>
					<TouchableOpacity onPress={() => navigation.navigate('Announcements')}>
						<Text style={styles.seeAllText}>See all</Text>
					</TouchableOpacity>
				</View>

				{mockAnnouncements.map(announcement => (
					<TouchableOpacity
						key={announcement.id}
						style={styles.announcementItem}
						onPress={() => navigation.navigate('Announcements')}
					>
						<View style={styles.announcementHeader}>
							<Text style={styles.announcementTitle}>{announcement.title}</Text>
							<Text style={styles.announcementDate}>
								{new Date(announcement.date).toLocaleDateString()}
							</Text>
						</View>
						<Text style={styles.announcementContent} numberOfLines={2}>
							{announcement.content}
						</Text>
					</TouchableOpacity>
				))}
			</View>

			{/* Bottom padding */}
			<View style={styles.bottomPadding} />
		</ScrollView>
	)
}

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
	welcomeSection: {
		padding: 20,
		backgroundColor: '#4A90E2',
	},
	welcomeText: {
		fontSize: 24,
		fontWeight: 'bold',
		color: '#FFFFFF',
		marginBottom: 5,
	},
	dateText: {
		fontSize: 14,
		color: '#E1F0FF',
	},
	statsContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		padding: 16,
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
	statItem: {
		alignItems: 'center',
		flex: 1,
	},
	statNumber: {
		fontSize: 20,
		fontWeight: 'bold',
		color: '#333',
		marginTop: 5,
	},
	statLabel: {
		fontSize: 12,
		color: '#666',
		marginTop: 2,
	},
	sectionContainer: {
		backgroundColor: '#FFFFFF',
		borderRadius: 10,
		marginHorizontal: 16,
		marginTop: 20,
		padding: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 2,
	},
	sectionHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		color: '#333',
	},
	seeAllText: {
		fontSize: 14,
		color: '#4A90E2',
	},
	assignmentItem: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#F0F0F0',
	},
	assignmentContent: {
		flex: 1,
	},
	assignmentTitle: {
		fontSize: 16,
		fontWeight: '500',
		color: '#333',
		marginBottom: 4,
	},
	assignmentSubject: {
		fontSize: 14,
		color: '#666',
	},
	assignmentDueDate: {
		alignItems: 'flex-end',
	},
	dueDateLabel: {
		fontSize: 12,
		color: '#999',
	},
	dueDateText: {
		fontSize: 14,
		fontWeight: '500',
		color: '#FF6B6B',
	},
	gradeItem: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#F0F0F0',
	},
	gradeContent: {
		flex: 1,
	},
	gradeTitle: {
		fontSize: 16,
		fontWeight: '500',
		color: '#333',
		marginBottom: 4,
	},
	gradeSubject: {
		fontSize: 14,
		color: '#666',
	},
	gradeValue: {
		justifyContent: 'center',
	},
	gradeText: {
		fontSize: 20,
		fontWeight: 'bold',
	},
	gradeA: {
		color: '#4CAF50',
	},
	gradeB: {
		color: '#8BC34A',
	},
	gradeC: {
		color: '#FFC107',
	},
	gradeOther: {
		color: '#FF5722',
	},
	scheduleItem: {
		flexDirection: 'row',
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#F0F0F0',
	},
	scheduleTimeContainer: {
		width: 120,
	},
	scheduleTime: {
		fontSize: 14,
		fontWeight: '500',
		color: '#333',
	},
	scheduleRoom: {
		fontSize: 12,
		color: '#666',
		marginTop: 4,
	},
	scheduleDetails: {
		flex: 1,
		justifyContent: 'center',
	},
	scheduleTitle: {
		fontSize: 16,
		fontWeight: '500',
		color: '#333',
	},
	announcementItem: {
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#F0F0F0',
	},
	announcementHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
	},
	announcementTitle: {
		fontSize: 16,
		fontWeight: '500',
		color: '#333',
		flex: 1,
	},
	announcementDate: {
		fontSize: 12,
		color: '#999',
	},
	announcementContent: {
		fontSize: 14,
		color: '#666',
		lineHeight: 20,
	},
	bottomPadding: {
		height: 24,
	},
	errorText: {
		color: '#FF4B4B',
		textAlign: 'center',
		marginVertical: 10,
		fontStyle: 'italic',
	},
	noAssignmentsText: {
		textAlign: 'center',
		marginVertical: 10,
		color: '#666',
		fontStyle: 'italic',
	},
	statusContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 4,
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
	overdueDateText: {
		color: '#FF4B4B',
	},
	loadingIndicator: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		padding: 10,
	},
	loadingGradesText: {
		marginLeft: 10,
		color: '#666',
		fontSize: 14,
	},
})

export default StudentDashboardScreen
