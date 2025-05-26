import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useEffect, useState } from 'react'
import {
	ActivityIndicator,
	Alert,
	FlatList,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native'
import Icon from 'react-native-vector-icons/Feather'
import RealtimeScoreNotifications from '../../components/parent/RealtimeScoreNotifications'
import { ParentTabParamList } from '../../navigators/ParentTabNavigator'
import { ParentNotification } from '../../services/parentService'
import {
	fetchParentNotifications,
	fetchStudentGrades,
	markParentNotificationAsRead,
} from '../../services/parentSupabaseService'
import { useAuthStore } from '../../store/authStore'
import { supabase } from '../../utils/supabase'
import { useAppTheme } from '../../contexts/ThemeContext'
import { SafeAreaView } from 'react-native-safe-area-context'

// Define navigation type
type ParentNavigationProp = StackNavigationProp<ParentTabParamList>

const formatDate = (dateString: string) => {
	const date = new Date(dateString)

	// Format date depending on how old it is
	const now = new Date()
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
	const yesterday = new Date(today)
	yesterday.setDate(yesterday.getDate() - 1)

	const notifDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

	if (notifDate.getTime() === today.getTime()) {
		return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
	} else if (notifDate.getTime() === yesterday.getTime()) {
		return `Yesterday at ${date.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
		})}`
	} else {
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
			hour: 'numeric',
			minute: '2-digit',
		})
	}
}

// Get icon for notification type
const getNotificationIcon = (type: string) => {
	switch (type) {
		case 'grade':
			return 'award'
		case 'attendance':
			return 'user-check'
		case 'behavior':
			return 'alert-triangle'
		case 'announcement':
			return 'bell'
		case 'event':
			return 'calendar'
		default:
			return 'info'
	}
}

// Get color for notification type
const getNotificationColor = (type: string) => {
	switch (type) {
		case 'grade':
			return '#4A90E2'
		case 'attendance':
			return '#F44336'
		case 'behavior':
			return '#FF9800'
		case 'announcement':
			return '#66BB6A'
		case 'event':
			return '#9C27B0'
		default:
			return '#999999'
	}
}

// Get grade badge color based on score mentioned in message
const getGradeBadgeColor = (message: string): string => {
	// Try to extract score from message (e.g., "score of 8.5")
	const scoreMatch = message.match(/score of (\d+\.?\d*)/i)
	if (scoreMatch && scoreMatch[1]) {
		const score = parseFloat(scoreMatch[1])
		if (score >= 9) return '#4CAF50' // A - Green
		if (score >= 8) return '#8BC34A' // B - Light Green
		if (score >= 7) return '#CDDC39' // C - Lime
		if (score >= 6) return '#FFC107' // D - Amber
		return '#F44336' // F - Red
	}

	// If no score found, try to look for grade letters
	if (message.includes('A+') || message.includes('A grade')) return '#4CAF50'
	if (message.includes('B+') || message.includes('B grade')) return '#8BC34A'
	if (message.includes('C+') || message.includes('C grade')) return '#CDDC39'
	if (message.includes('D+') || message.includes('D grade')) return '#FFC107'
	if (message.includes('F grade')) return '#F44336'

	// Default color for grade notifications
	return '#4A90E2'
}

// Extract grade value from notification title
const getGradeValue = (title: string): string | null => {
	// Look for patterns like "New Grade: A in Mathematics"
	const gradeMatch = title.match(/New Grade: ([A-F][+-]?) in/i)
	if (gradeMatch && gradeMatch[1]) {
		return gradeMatch[1]
	}
	return null
}

// Convert a grade object to a notification object
const convertGradeToNotification = (
	grade: any,
	studentName: string,
	subjectName: string
): ParentNotification => {
	const scoreValue = grade.score || 0
	const letterGrade = convertScoreToLetterGrade(scoreValue)
	const date = grade.created_at || new Date().toISOString()

	// Get lesson name if available (will need to be joined from lessons table)
	const lessonName = grade.lesson?.lessonname || 'an assignment'

	return {
		id: `grade-${grade.id}`,
		title: `New Grade: ${letterGrade} in ${subjectName}`,
		message: `${studentName} received a score of ${scoreValue} on ${lessonName}`,
		date,
		type: 'grade',
		read: false,
		relatedStudentId: grade.student_id,
		relatedSubjectId: grade.lesson?.subjectid || 0,
	}
}

// Helper function to convert score to letter grade
const convertScoreToLetterGrade = (score: number): string => {
	if (score >= 9) return 'A'
	if (score >= 7) return 'B'
	if (score >= 5) return 'C'
	if (score >= 3) return 'D'
	return 'F'
}

const ParentNotificationsScreen = () => {
	const [notifications, setNotifications] = useState<ParentNotification[]>([])
	const [filteredNotifications, setFilteredNotifications] = useState<ParentNotification[]>([])
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [searchQuery, setSearchQuery] = useState('')
	const [activeFilter, setActiveFilter] = useState<string | null>(null)
	const [childStudentMap, setChildStudentMap] = useState<Record<string, string>>({})

	const navigation = useNavigation<ParentNavigationProp>()
	const { user } = useAuthStore()
	const { theme } = useAppTheme()

	// Load notifications when component mounts
	useEffect(() => {
		loadNotifications()
	}, [user])

	// Refresh notifications when the screen comes into focus
	useFocusEffect(
		React.useCallback(() => {
			loadNotifications()
			return () => {}
		}, [user])
	)

	// Helper function to get children data
	const fetchChildrenData = async (parentId: string) => {
		try {
			// Get the parent's children
			const { data: children, error: childrenError } = await supabase
				.from('users')
				.select('id, firstName, lastName')
				.eq('parent_id', parentId)
				.eq('role', 'Student')

			if (childrenError) {
				console.error('Error fetching children:', childrenError)
				return { childIds: [], childNames: {} }
			}

			if (!children || children.length === 0) {
				return { childIds: [], childNames: {} }
			}

			// Create a map of child IDs to full names
			const childNames: Record<string, string> = {}
			children.forEach(child => {
				childNames[child.id] = `${child.firstName} ${child.lastName}`
			})

			return {
				childIds: children.map(child => child.id),
				childNames,
			}
		} catch (error) {
			console.error('Error in fetchChildrenData:', error)
			return { childIds: [], childNames: {} }
		}
	}

	// Load notifications function
	const loadNotifications = async () => {
		try {
			setError(null)

			if (!user || !user.id) {
				setError('User not authenticated. Please log in again.')
				setLoading(false)
				setRefreshing(false)
				return
			}

			// Get read notification states from AsyncStorage
			const readNotificationsJson = await AsyncStorage.getItem('readParentNotifications')
			const readNotifications = readNotificationsJson ? JSON.parse(readNotificationsJson) : {}

			// Fetch children data
			const { childIds, childNames } = await fetchChildrenData(user.id)
			setChildStudentMap(childNames)

			// Only show debug alert if no children found
			if (childIds.length === 0) {
				console.warn('No children found for this parent')
			}

			// Fetch notifications from Supabase
			const notificationsData = await fetchParentNotifications(user.id)

			// Initialize an array to hold both announcements and grade notifications
			let allNotifications: ParentNotification[] = []

			// Add announcements
			allNotifications = [...notificationsData]

			// Fetch recent grades for each child and convert to notifications
			if (childIds.length > 0) {
				for (const childId of childIds) {
					try {
						const childName = childNames[childId] || 'Your child'

						// Fetch grades for this child
						const grades = await fetchStudentGrades(childId)

						// Take only the most recent grades (up to 3)
						const recentGrades = grades.slice(0, 3)

						// Only log success, don't show alert
						console.log(`Found ${recentGrades.length} recent grades for ${childName}`)

						// Convert each grade to a notification
						for (const grade of recentGrades) {
							const notification = convertGradeToNotification(grade, childName, grade.subjectName)

							// Check if we already have this grade in our read notifications
							notification.read = readNotifications[notification.id] === true

							allNotifications.push(notification)
						}
					} catch (error) {
						console.error(`Error fetching grades for child ${childId}:`, error)
						// Don't show alert for each error, just log it
					}
				}
			}

			// Sort all notifications by date (most recent first)
			allNotifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

			// Mark notifications as read if they're in AsyncStorage
			const notificationsWithReadState = allNotifications.map(notification => ({
				...notification,
				read: readNotifications[notification.id] === true,
			}))

			setNotifications(notificationsWithReadState)
			setFilteredNotifications(notificationsWithReadState)
			setLoading(false)
			setRefreshing(false)
		} catch (err) {
			console.error('Error fetching notifications:', err)
			setError('Failed to load notifications. Please try again.')
			setLoading(false)
			setRefreshing(false)
		}
	}

	// Handle pull-to-refresh
	const handleRefresh = () => {
		setRefreshing(true)
		loadNotifications()
	}

	// Filter notifications based on search query and active filter
	useEffect(() => {
		let result = notifications

		// Apply type filter
		if (activeFilter) {
			if (activeFilter === 'parent') {
				// Filter for parent-specific announcements
				result = result.filter(
					notif =>
						notif.type === 'announcement' &&
						!['grade', 'attendance', 'behavior', 'event'].includes(notif.type)
				)
			} else {
				// Regular type filtering
				result = result.filter(notif => notif.type === activeFilter)
			}
		}

		// Apply text search
		if (searchQuery) {
			const query = searchQuery.toLowerCase()
			result = result.filter(
				notif =>
					notif.title.toLowerCase().includes(query) || notif.message.toLowerCase().includes(query)
			)
		}

		setFilteredNotifications(result)
	}, [notifications, searchQuery, activeFilter])

	// Handle notification press
	const handleNotificationPress = async (notification: ParentNotification) => {
		try {
			// Skip if already read
			if (notification.read) return

			// Mark as read in AsyncStorage
			const readNotificationsJson = await AsyncStorage.getItem('readParentNotifications')
			const readNotifications = readNotificationsJson ? JSON.parse(readNotificationsJson) : {}

			// Update the read status
			readNotifications[notification.id] = true
			await AsyncStorage.setItem('readParentNotifications', JSON.stringify(readNotifications))

			// Try to mark as read on server (though this might be a no-op now)
			if (!notification.id.startsWith('grade-')) {
				// Only for regular notifications, not converted grade notifications
				await markParentNotificationAsRead(notification.id)
			}

			// Update local state
			const updateReadStatus = (items: ParentNotification[]) =>
				items.map(n => (n.id === notification.id ? { ...n, read: true } : n))

			setNotifications(updateReadStatus)
			setFilteredNotifications(updateReadStatus)

			// Handle notification based on type
			if (notification.type === 'grade' && notification.relatedStudentId) {
				const childName = childStudentMap[notification.relatedStudentId] || 'Your child'
				navigation.navigate('Home', {
					screen: 'ParentChildGrades',
					params: {
						childId: notification.relatedStudentId,
						childName: childName,
					},
				})
			} else if (notification.type === 'announcement') {
				// For announcements, show a detailed view with full message
				Alert.alert(notification.title, notification.message, [{ text: 'OK', style: 'default' }])
			}
		} catch (err) {
			console.error('Error marking notification as read:', err)
			Alert.alert('Error', 'Failed to process notification')
		}
	}

	// Toggle filter
	const toggleFilter = (filter: string) => {
		if (activeFilter === filter) {
			setActiveFilter(null)
		} else {
			setActiveFilter(filter)
		}
	}

	// Clear all filters
	const clearFilters = () => {
		setActiveFilter(null)
		setSearchQuery('')
	}

	// Mark all as read
	const markAllAsRead = async () => {
		try {
			// Get existing read notifications
			const readNotificationsJson = await AsyncStorage.getItem('readParentNotifications')
			const readNotifications = readNotificationsJson ? JSON.parse(readNotificationsJson) : {}

			// Mark all as read in the object
			notifications.forEach(notification => {
				readNotifications[notification.id] = true
			})

			// Save back to AsyncStorage
			await AsyncStorage.setItem('readParentNotifications', JSON.stringify(readNotifications))

			// Update local state
			const updatedNotifications = notifications.map(n => ({ ...n, read: true }))
			setNotifications(updatedNotifications)
			setFilteredNotifications(filteredNotifications.map(n => ({ ...n, read: true })))
		} catch (err) {
			console.error('Error marking all notifications as read:', err)
			Alert.alert('Error', 'Failed to mark notifications as read')
		}
	}

	// Render notification item
	const renderNotificationItem = ({ item }: { item: ParentNotification }) => {
		const isParentSpecific = item.type === 'announcement'
		const isGradeNotification = item.type === 'grade'
		const gradeValue = isGradeNotification ? getGradeValue(item.title) : null

		return (
			<TouchableOpacity
				style={[
					styles.notificationItem,
					{ 
						backgroundColor: theme.cardBackground,
						borderColor: theme.border,
						shadowColor: theme.text
					},
					item.read ? { opacity: 0.8 } : {}
				]}
				onPress={() => handleNotificationPress(item)}
			>
				<View
					style={[
						styles.notificationIcon,
						{
							backgroundColor: isGradeNotification
								? getGradeBadgeColor(item.message)
								: getNotificationColor(item.type),
						},
					]}
				>
					<Icon name={getNotificationIcon(item.type)} size={20} color='#FFFFFF' />
				</View>

				<View style={styles.notificationContent}>
					<View style={styles.notificationHeader}>
						<Text style={[styles.notificationTitle, { color: theme.text }]}>
							{item.title}
							{isParentSpecific && <Text style={styles.parentTag}> • Parent</Text>}
							{isGradeNotification && gradeValue && (
								<Text style={[styles.gradeValueTag, { color: getGradeBadgeColor(item.message) }]}>
									{' '}
									• {gradeValue}
								</Text>
							)}
						</Text>
						{!item.read && <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />}
					</View>
					<Text style={[styles.notificationMessage, { color: theme.textSecondary }]}>{item.message}</Text>
					<Text style={[styles.notificationDate, { color: theme.subtleText }]}>{formatDate(item.date)}</Text>
				</View>
			</TouchableOpacity>
		)
	}

	if (loading) {
		return (
			<SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
				<View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
					<ActivityIndicator size='large' color={theme.primary} />
					<Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading notifications...</Text>
				</View>
			</SafeAreaView>
		)
	}

	if (error) {
		return (
			<SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
				<View style={[styles.errorContainer, { backgroundColor: theme.background }]}>
					<Icon name='alert-circle' size={50} color={theme.danger} />
					<Text style={[styles.errorText, { color: theme.textSecondary }]}>{error}</Text>
					<TouchableOpacity style={[styles.button, { backgroundColor: theme.primary }]} onPress={() => navigation.goBack()}>
						<Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Go Back</Text>
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		)
	}

	const unreadCount = notifications.filter(n => !n.read).length

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
			{/* Include the realtime notifications component */}
			<RealtimeScoreNotifications />

			<View style={[styles.header, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
				<TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
					<Icon name='arrow-left' size={24} color={theme.primary} />
				</TouchableOpacity>

				<View style={styles.headerContent}>
					<Text style={[styles.screenTitle, { color: theme.text }]}>Notifications</Text>
					{unreadCount > 0 && (
						<View style={[styles.badgeContainer, { backgroundColor: theme.danger }]}>
							<Text style={[styles.badgeText, { color: '#FFFFFF' }]}>{unreadCount}</Text>
						</View>
					)}
				</View>

				{unreadCount > 0 && (
					<TouchableOpacity style={styles.markReadButton} onPress={markAllAsRead}>
						<Text style={[styles.markReadText, { color: theme.primary }]}>Mark all read</Text>
					</TouchableOpacity>
				)}
			</View>

			{/* Search bar */}
			<View style={[styles.searchContainer, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
				<Icon name='search' size={18} color={theme.textSecondary} style={styles.searchIcon} />
				<TextInput
					style={[styles.searchInput, { color: theme.text }]}
					placeholder='Search notifications...'
					placeholderTextColor={theme.subtleText}
					value={searchQuery}
					onChangeText={setSearchQuery}
					clearButtonMode='while-editing'
				/>
			</View>

			{/* Filter buttons */}
			<View style={styles.filterContainer}>
				<ScrollView horizontal showsHorizontalScrollIndicator={false}>
					<TouchableOpacity
						style={[
							styles.filterButton,
							{ backgroundColor: theme.cardBackground, borderColor: theme.border },
							activeFilter === 'grade' && { backgroundColor: getNotificationColor('grade') },
						]}
						onPress={() => toggleFilter('grade')}
					>
						<Icon
							name='award'
							size={14}
							color={activeFilter === 'grade' ? '#FFFFFF' : getNotificationColor('grade')}
						/>
						<Text style={[
							styles.filterText, 
							{ color: activeFilter === 'grade' ? '#FFFFFF' : theme.textSecondary }
						]}>
							Grades
						</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={[
							styles.filterButton,
							{ backgroundColor: theme.cardBackground, borderColor: theme.border },
							activeFilter === 'attendance' && {
								backgroundColor: getNotificationColor('attendance'),
							},
						]}
						onPress={() => toggleFilter('attendance')}
					>
						<Icon
							name='user-check'
							size={14}
							color={activeFilter === 'attendance' ? '#FFFFFF' : getNotificationColor('attendance')}
						/>
						<Text style={[
							styles.filterText, 
							{ color: activeFilter === 'attendance' ? '#FFFFFF' : theme.textSecondary }
						]}>
							Attendance
						</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={[
							styles.filterButton,
							{ backgroundColor: theme.cardBackground, borderColor: theme.border },
							activeFilter === 'announcement' && {
								backgroundColor: getNotificationColor('announcement'),
							},
						]}
						onPress={() => toggleFilter('announcement')}
					>
						<Icon
							name='bell'
							size={14}
							color={
								activeFilter === 'announcement' ? '#FFFFFF' : getNotificationColor('announcement')
							}
						/>
						<Text style={[
							styles.filterText, 
							{ color: activeFilter === 'announcement' ? '#FFFFFF' : theme.textSecondary }
						]}>
							Announcements
						</Text>
					</TouchableOpacity>

					{/* Clear filter button - only shows when a filter is active or search has text */}
					{(activeFilter || searchQuery) && (
						<TouchableOpacity
							style={[styles.filterButton, styles.clearFilterButton]}
							onPress={clearFilters}
						>
							<Icon name='x' size={14} color='#FFFFFF' />
							<Text style={[styles.filterText, styles.clearFilterText]}>Clear Filters</Text>
						</TouchableOpacity>
					)}
				</ScrollView>
			</View>

			{/* Notifications list */}
			<FlatList
				data={filteredNotifications}
				renderItem={renderNotificationItem}
				keyExtractor={item => item.id}
				contentContainerStyle={[styles.notificationsList, { backgroundColor: theme.background }]}
				refreshing={refreshing}
				onRefresh={handleRefresh}
				ListEmptyComponent={() => (
					<View style={styles.emptyContainer}>
						<Icon name='bell-off' size={50} color={theme.subtleText} />
						<Text style={[styles.emptyText, { color: theme.textSecondary }]}>
							{activeFilter || searchQuery
								? 'No notifications match your filters'
								: 'No notifications yet'}
						</Text>
					</View>
				)}
			/>
		</SafeAreaView>
	)
}

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
		flexDirection: 'row',
		alignItems: 'center',
		marginLeft: 8,
	},
	screenTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		color: '#333333',
	},
	badgeContainer: {
		backgroundColor: '#F44336',
		borderRadius: 12,
		paddingHorizontal: 8,
		paddingVertical: 2,
		marginLeft: 8,
	},
	badgeText: {
		color: '#FFFFFF',
		fontSize: 12,
		fontWeight: 'bold',
	},
	markReadButton: {
		marginLeft: 'auto',
	},
	markReadText: {
		color: '#4A90E2',
		fontSize: 14,
	},
	searchContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FFFFFF',
		margin: 16,
		marginTop: 16,
		marginBottom: 8,
		paddingHorizontal: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#EEEEEE',
	},
	searchIcon: {
		marginRight: 8,
	},
	searchInput: {
		flex: 1,
		height: 40,
		fontSize: 16,
		color: '#333333',
	},
	filterContainer: {
		paddingHorizontal: 16,
		paddingVertical: 8,
	},
	filterButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
		marginRight: 8,
		borderWidth: 1,
	},
	clearFilterButton: {
		backgroundColor: '#F44336',
		borderColor: '#F44336',
	},
	filterText: {
		fontSize: 12,
		marginLeft: 4,
	},
	clearFilterText: {
		color: '#FFFFFF',
	},
	notificationsList: {
		padding: 16,
		paddingTop: 8,
	},
	notificationItem: {
		backgroundColor: '#FFFFFF',
		borderRadius: 10,
		padding: 16,
		marginBottom: 10,
		flexDirection: 'row',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 1,
		elevation: 1,
	},
	notificationUnread: {
		backgroundColor: '#FFFFFF',
	},
	notificationRead: {
		backgroundColor: '#F8F9FA',
	},
	parentSpecificNotification: {
		borderLeftWidth: 4,
		borderLeftColor: '#66BB6A',
	},
	gradeNotification: {
		borderLeftWidth: 4,
		borderLeftColor: '#4A90E2',
	},
	notificationIcon: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: '#4A90E2',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12,
	},
	notificationContent: {
		flex: 1,
	},
	notificationHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 4,
	},
	notificationTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#333333',
		flex: 1,
	},
	parentTag: {
		fontSize: 12,
		fontWeight: 'bold',
		color: '#66BB6A',
	},
	gradeValueTag: {
		fontSize: 14,
		fontWeight: 'bold',
	},
	unreadDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: '#4A90E2',
		marginLeft: 8,
	},
	notificationMessage: {
		fontSize: 14,
		color: '#666666',
		marginBottom: 8,
	},
	notificationDate: {
		fontSize: 12,
		color: '#999999',
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
		paddingVertical: 10,
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
})

export default ParentNotificationsScreen
