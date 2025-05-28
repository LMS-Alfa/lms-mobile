import AsyncStorage from '@react-native-async-storage/async-storage'
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useEffect, useState } from 'react'
import {
	ActivityIndicator,
	Alert,
	Animated,
	Dimensions,
	FlatList,
	Image,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/Feather'
import NotificationCard from '../../components/parent/NotificationCard'
import RealtimeScoreNotifications from '../../components/parent/RealtimeScoreNotifications'
import StudentPerformanceSummary from '../../components/parent/StudentPerformanceSummary'
import { NotificationItem } from '../../components/parent/UnifiedNotificationHandler'
import { EVENTS } from '../../constants/events'
import { useAppTheme } from '../../contexts/ThemeContext'
import { ParentHomeStackParamList, ParentTabParamList } from '../../navigators/ParentTabNavigator'
import { ChildData, ParentNotification } from '../../services/parentService'
import {
	fetchParentChildren,
	fetchParentNotifications,
	fetchUnifiedNotifications,
} from '../../services/parentSupabaseService'
import { useAuthStore } from '../../store/authStore'
import { useUnifiedNotificationStore } from '../../store/unifiedNotificationStore'
import { eventEmitter } from '../../utils/eventEmitter'

// Define navigation types
type ParentDashboardNavigationProp = StackNavigationProp<
	ParentHomeStackParamList,
	'ParentDashboard'
>

// We don't need to combine them for useNavigation if we use getParent()
// type CombinedNavigationProp = ParentDashboardNavigationProp & BottomTabNavigationProp<ParentTabParamList>;

// Define event data types
interface ScoreUpdateEventData {
	studentId: string
	scoreId: string
	score: number
}

interface AttendanceUpdateEventData {
	studentId: string
	attendanceId: string
	status: string
}

const formatDate = (dateString: string) => {
	const date = new Date(dateString)
	const now = new Date()
	const diffTime = Math.abs(now.getTime() - date.getTime())
	const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

	if (diffDays === 0) {
		return 'Today'
	} else if (diffDays === 1) {
		return 'Yesterday'
	} else if (diffDays < 7) {
		return `${diffDays} days ago`
	} else {
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
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

// Get placeholder avatar
const getChildAvatar = (firstName: string, lastName: string) => {
	const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`
	return (
		<View style={styles.avatarPlaceholder}>
			<Text style={styles.avatarText}>{initials}</Text>
		</View>
	)
}

const ParentDashboardScreen = () => {
	const [children, setChildren] = useState<ChildData[]>([])
	const [notifications, setNotifications] = useState<ParentNotification[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [expandedChildIds, setExpandedChildIds] = useState<string[]>([])
	const [loadingChildIds, setLoadingChildIds] = useState<string[]>([])
	const [animationValues, setAnimationValues] = useState<{ [key: string]: Animated.Value }>({})

	const navigation = useNavigation<ParentDashboardNavigationProp>()
	const { user } = useAuthStore()
	const { theme } = useAppTheme()
	const {
		notifications: unifiedNotifications,
		unreadCount,
		markAsRead,
		loadNotifications,
		addNotification,
		bulkAddNotifications,
		clearAllNotifications,
	} = useUnifiedNotificationStore()

	// Initialize animation values when children data is loaded
	useEffect(() => {
		const animValues: { [key: string]: Animated.Value } = {}
		children.forEach(child => {
			animValues[child.id] = new Animated.Value(0) // 0 = collapsed, 1 = expanded
		})
		setAnimationValues(animValues)
	}, [children])

	// Get read announcements from AsyncStorage
	useEffect(() => {
		const getReadNotifications = async () => {
			try {
				const readNotificationsJson = await AsyncStorage.getItem('readParentNotifications')
				return readNotificationsJson ? JSON.parse(readNotificationsJson) : {}
			} catch (err) {
				console.error('Error fetching read notifications from storage:', err)
				return {}
			}
		}

		// Load data
		const loadData = async () => {
			try {
				setError(null)

				if (!user || !user.id) {
					setError('User not authenticated. Please log in again.')
					setLoading(false)
					return
				}

				// Load notifications from the store
				await loadNotifications()

				// Fetch unified notifications from Supabase
				const supabaseNotifications = await fetchUnifiedNotifications(user.id)
				if (supabaseNotifications.length > 0) {
					// Add all notifications to the store in bulk
					bulkAddNotifications(supabaseNotifications)
				}

				// Get read notification states
				const readNotifications = await getReadNotifications()

				// Load data from Supabase
				const [childrenData, notificationsData] = await Promise.all([
					fetchParentChildren(user.id),
					fetchParentNotifications(user.id),
				])

				// Mark notifications as read if they are in our stored read notifications
				const notificationsWithReadState = notificationsData.map(notification => ({
					...notification,
					read: readNotifications[notification.id] === true,
				}))

				setChildren(childrenData)
				setNotifications(notificationsWithReadState)
			} catch (err) {
				console.error('Error fetching parent dashboard data:', err)
				setError('Failed to load data. Please try again.')
			} finally {
				setLoading(false)
			}
		}

		loadData()

		// Listen for score and attendance updates
		const scoreUpdateListener = (data: ScoreUpdateEventData) => {
			console.log('[ParentDashboard] Score updated, refreshing data:', data)
			loadData() // Refresh child data when scores are updated
		}

		const attendanceUpdateListener = (data: AttendanceUpdateEventData) => {
			console.log('[ParentDashboard] Attendance updated, refreshing data:', data)
			loadData() // Refresh child data when attendance is updated
		}

		// Add event listeners
		eventEmitter.on(EVENTS.SCORE_UPDATED, scoreUpdateListener)
		eventEmitter.on(EVENTS.ATTENDANCE_UPDATED, attendanceUpdateListener)

		return () => {
			// Clean up listeners
			eventEmitter.off(EVENTS.SCORE_UPDATED, scoreUpdateListener)
			eventEmitter.off(EVENTS.ATTENDANCE_UPDATED, attendanceUpdateListener)
		}
	}, [])

	// Handle notification press
	const handleNotificationPress = (notification: NotificationItem) => {
		try {
			// Skip if already read
			if (notification.read) return

			// Mark as read in store
			markAsRead(notification.id)

			// Navigate based on notification type
			if (notification.type === 'score' && notification.studentId) {
				const child = children.find(c => c.id === notification.studentId)
				if (child) {
					navigation.navigate('ParentChildGrades', {
						childId: child.id,
						childName: `${child.firstName} ${child.lastName}`,
					})
				}
			} else if (notification.type === 'attendance' && notification.studentId) {
				const child = children.find(c => c.id === notification.studentId)
				if (child) {
					navigation.navigate('ParentSchedule', {
						childId: child.id,
						childName: `${child.firstName} ${child.lastName}`,
					})
				}
			}
		} catch (err) {
			console.error('Error handling notification:', err)
			Alert.alert('Error', 'Failed to process notification')
		}
	}

	// Navigate to child grades screen
	const navigateToChildGrades = (child: ChildData) => {
		navigation.navigate('ParentChildGrades', {
			childId: child.id,
			childName: `${child.firstName} ${child.lastName}`,
		})
	}

	// Navigate to child schedule screen
	const navigateToChildSchedule = (child: ChildData) => {
		navigation.navigate('ParentSchedule', {
			childId: child.id,
			childName: `${child.firstName} ${child.lastName}`,
		})
	}

	// View all notifications
	const handleViewAllNotifications = () => {
		// Get the parent tab navigator and navigate
		const parentTabNavigator = navigation.getParent<BottomTabNavigationProp<ParentTabParamList>>()
		if (parentTabNavigator) {
			parentTabNavigator.navigate('Notifications')
		}
	}

	// Handle new notification from UnifiedNotificationHandler
	const handleNewNotification = (notification: NotificationItem) => {
		// Add notification to the store
		addNotification(notification)

		// Update activity indicators if needed
		if (notification.studentId) {
			// If the notification is related to a specific child, and their card is collapsed,
			// this will trigger a UI update to show the activity indicator
			setExpandedChildIds([...expandedChildIds])
		}
	}

	// Modify the toggle function to include animation
	const toggleChildExpansion = async (childId: string) => {
		const isExpanding = !expandedChildIds.includes(childId)

		if (isExpanding) {
			// Expand: First update state, then animate
			setExpandedChildIds(prev => [...prev, childId])
			setLoadingChildIds(prev => [...prev, childId])

			// Animate to expanded state
			Animated.timing(animationValues[childId], {
				toValue: 1,
				duration: 300,
				useNativeDriver: false,
			}).start()

			// Simulate data loading delay (remove this in production)
			await new Promise(resolve => setTimeout(resolve, 500))

			// Remove loading state
			setLoadingChildIds(prev => prev.filter(id => id !== childId))
		} else {
			// Collapse: First animate, then update state
			Animated.timing(animationValues[childId], {
				toValue: 0,
				duration: 300,
				useNativeDriver: false,
			}).start(() => {
				// Update state after animation finishes
				setExpandedChildIds(expandedChildIds.filter(id => id !== childId))
			})
		}
	}

	// Add this function to determine if a child has recent activity
	const hasRecentActivity = (childId: string) => {
		// Check if there are any unread notifications for this child
		return unifiedNotifications.some(
			notification => notification.studentId === childId && !notification.read
		)
	}

	// Modify the renderChildItem function
	const renderChildItem = ({ item }: { item: ChildData }) => {
		const isExpanded = expandedChildIds.includes(item.id)
		const isLoading = loadingChildIds.includes(item.id)
		const hasActivity = hasRecentActivity(item.id)

		// Only render if animation is initialized
		if (!animationValues[item.id]) return null

		const maxHeight = animationValues[item.id].interpolate({
			inputRange: [0, 1],
			outputRange: [0, 500], // Use a large enough value to contain all content
			extrapolate: 'clamp',
		})

		const opacity = animationValues[item.id].interpolate({
			inputRange: [0, 0.5, 1],
			outputRange: [0, 0.8, 1],
		})

		const rotateAnimation = animationValues[item.id].interpolate({
			inputRange: [0, 1],
			outputRange: ['0deg', '180deg'],
		})

		return (
			<View
				style={[
					styles.childCard,
					{ backgroundColor: theme.cardBackground, borderColor: theme.border },
				]}
			>
				<TouchableOpacity
					onPress={() => toggleChildExpansion(item.id)}
					style={styles.childHeader}
					activeOpacity={0.7}
				>
					<View style={styles.childInfoContainer}>
						<View style={styles.avatarContainer}>
							{item.avatar ? (
								<Image source={{ uri: item.avatar }} style={styles.avatar} />
							) : (
								getChildAvatar(item.firstName, item.lastName)
							)}
							{hasActivity && !isExpanded && <View style={styles.activityIndicator} />}
						</View>
						<View style={styles.childDetails}>
							<Text
								style={[styles.childName, { color: theme.text }]}
							>{`${item.firstName} ${item.lastName}`}</Text>
							{item.className && (
								<Text style={[styles.childClass, { color: theme.textSecondary }]}>
									{item.className}
								</Text>
							)}
							{hasActivity && !isExpanded && (
								<Text style={styles.newActivityText}>New activity</Text>
							)}
						</View>
						<Animated.View style={{ transform: [{ rotate: rotateAnimation }] }}>
							<Icon name='chevron-down' size={20} color={theme.textSecondary} />
						</Animated.View>
					</View>
				</TouchableOpacity>

				<Animated.View
					style={[
						styles.childContent,
						{
							maxHeight,
							opacity,
							overflow: 'hidden',
						},
					]}
				>
					{isLoading ? (
						<View style={styles.loadingContainer}>
							<ActivityIndicator size='small' color={theme.primary} />
							<Text style={[styles.loadingText, { color: theme.textSecondary }]}>
								Loading data...
							</Text>
						</View>
					) : (
						<>
							{/* Student Performance Summary */}
							<StudentPerformanceSummary
								studentId={item.id}
								studentName={`${item.firstName} ${item.lastName}`}
							/>

							<View style={[styles.childActionsContainer, { borderTopColor: theme.separator }]}>
								<TouchableOpacity
									style={[styles.actionButton, styles.gradesButton]}
									onPress={() => navigateToChildGrades(item)}
								>
									<Icon name='bar-chart-2' size={16} color='#FFF' />
									<Text style={styles.actionButtonText}>View Grades</Text>
								</TouchableOpacity>
								<TouchableOpacity
									style={[styles.actionButton, styles.scheduleButton]}
									onPress={() => navigateToChildSchedule(item)}
								>
									<Icon name='calendar' size={16} color='#FFF' />
									<Text style={styles.actionButtonText}>View Schedule</Text>
								</TouchableOpacity>
							</View>
						</>
					)}
				</Animated.View>
			</View>
		)
	}

	// Function to clear all AsyncStorage data
	const clearAllData = () => {
		Alert.alert(
			'Clear All Data',
			'Are you sure you want to clear all locally stored data? This will remove all notifications and preferences.',
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Clear Data',
					style: 'destructive',
					onPress: async () => {
						try {
							// Clear unified notifications from the store
							clearAllNotifications()

							// Clear read parent notifications
							await AsyncStorage.removeItem('readParentNotifications')

							// Add any other AsyncStorage keys that need to be cleared

							// Show success message
							Alert.alert('Success', 'All data has been cleared successfully')

							// Reload data
							setLoading(true)
						} catch (err) {
							console.error('Error clearing data:', err)
							Alert.alert('Error', 'Failed to clear data. Please try again.')
						}
					},
				},
			]
		)
	}

	if (loading) {
		return (
			<SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
				<View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
					<ActivityIndicator size='large' color={theme.primary} />
					<Text style={[styles.loadingText, { color: theme.textSecondary }]}>
						Loading dashboard...
					</Text>
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
					<TouchableOpacity
						style={[styles.retryButton, { backgroundColor: theme.primary }]}
						onPress={() => setLoading(true)}
					>
						<Text style={[styles.retryButtonText, { color: '#FFFFFF' }]}>Retry</Text>
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		)
	}

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
			<RealtimeScoreNotifications onNewNotification={handleNewNotification} />

			<ScrollView style={[styles.scrollView, { backgroundColor: theme.background }]}>
				{/* Parent Welcome Header */}
				<View style={[styles.header, { backgroundColor: theme.primary }]}>
					<View style={styles.headerContent}>
						<View>
							<Text style={[styles.headerTitle, { color: '#FFFFFF' }]}>Parent Dashboard</Text>
							<Text style={[styles.headerSubtitle, { color: 'rgba(255, 255, 255, 0.8)' }]}>
								Monitor your children's progress
							</Text>
						</View>

						<TouchableOpacity style={styles.clearDataButton} onPress={clearAllData}>
							<Icon name='trash-2' size={16} color='#FFFFFF' />
							<Text style={styles.clearDataText}>Clear Data</Text>
						</TouchableOpacity>
					</View>
				</View>

				{/* Children Section */}
				<View style={styles.sectionContainer}>
					<Text style={[styles.sectionTitle, { color: theme.text }]}>My Children</Text>

					<FlatList
						data={children}
						renderItem={renderChildItem}
						keyExtractor={item => item.id}
						scrollEnabled={false}
						ListEmptyComponent={() => (
							<View style={styles.emptyContainer}>
								<Text style={[styles.emptyText, { color: theme.textSecondary }]}>
									No children found
								</Text>
							</View>
						)}
					/>
				</View>

				{/* Notifications Section */}
				<View style={styles.sectionContainer}>
					<View style={styles.sectionHeader}>
						<Text style={[styles.sectionTitle, { color: theme.text }]}>Notifications</Text>

						{unreadCount > 0 && (
							<View style={[styles.badgeContainer, { backgroundColor: theme.danger }]}>
								<Text style={[styles.badgeText, { color: '#FFFFFF' }]}>{unreadCount}</Text>
							</View>
						)}

						<TouchableOpacity style={styles.viewAllButton} onPress={handleViewAllNotifications}>
							<Text style={[styles.viewAllText, { color: theme.primary }]}>View All</Text>
						</TouchableOpacity>
					</View>

					{unifiedNotifications.length > 0 ? (
						<View style={styles.notificationsContainer}>
							{unifiedNotifications.slice(0, 3).map(notification => (
								<NotificationCard
									key={notification.id}
									notification={notification}
									onPress={() => handleNotificationPress(notification)}
									compact={true}
								/>
							))}

							{unifiedNotifications.length > 3 && (
								<TouchableOpacity
									style={[styles.moreNotificationsButton, { borderColor: theme.border }]}
									onPress={handleViewAllNotifications}
								>
									<Text style={[styles.moreNotificationsText, { color: theme.primary }]}>
										See {unifiedNotifications.length - 3} more notifications
									</Text>
								</TouchableOpacity>
							)}
						</View>
					) : (
						<View style={styles.emptyContainer}>
							<Text style={[styles.emptyText, { color: theme.textSecondary }]}>
								No notifications
							</Text>
						</View>
					)}
				</View>
			</ScrollView>
		</SafeAreaView>
	)
}

const { width } = Dimensions.get('window')

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F5F7FA',
	},
	scrollView: {
		flex: 1,
	},
	header: {
		backgroundColor: '#4A90E2',
		padding: 20,
		paddingTop: 40,
		paddingBottom: 30,
	},
	headerContent: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	headerTitle: {
		fontSize: 24,
		fontWeight: 'bold',
		color: '#FFFFFF',
		marginBottom: 4,
	},
	headerSubtitle: {
		fontSize: 14,
		color: 'rgba(255, 255, 255, 0.8)',
	},
	sectionContainer: {
		margin: 16,
		marginTop: 16,
		marginBottom: 8,
	},
	sectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333333',
		marginBottom: 12,
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
	viewAllButton: {
		marginLeft: 'auto',
	},
	viewAllText: {
		color: '#4A90E2',
		fontSize: 14,
	},
	childCard: {
		backgroundColor: '#FFFFFF',
		borderRadius: 10,
		marginBottom: 15,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
		overflow: 'hidden',
	},
	childHeader: {
		padding: 15,
	},
	childContent: {
		padding: 0,
		paddingHorizontal: 15,
		paddingBottom: 15,
	},
	childInfoContainer: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	avatarContainer: {
		position: 'relative',
		marginRight: 15,
	},
	avatar: {
		width: 50,
		height: 50,
		borderRadius: 25,
	},
	avatarPlaceholder: {
		width: 50,
		height: 50,
		borderRadius: 25,
		backgroundColor: '#007AFF',
		justifyContent: 'center',
		alignItems: 'center',
	},
	avatarText: {
		color: '#FFFFFF',
		fontSize: 18,
		fontWeight: 'bold',
	},
	childDetails: {
		flex: 1,
	},
	childName: {
		fontSize: 18,
		fontWeight: 'bold',
		color: '#333',
	},
	childClass: {
		fontSize: 14,
		color: '#666',
		marginTop: 2,
	},
	childActivity: {
		fontSize: 12,
		color: '#999',
		marginTop: 2,
	},
	childActionsContainer: {
		flexDirection: 'row',
		justifyContent: 'space-around',
		marginTop: 10,
		borderTopWidth: 1,
		borderTopColor: '#EEE',
		paddingTop: 10,
	},
	actionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 20,
	},
	gradesButton: {
		backgroundColor: '#4CAF50',
	},
	scheduleButton: {
		backgroundColor: '#2196F3',
	},
	actionButtonText: {
		color: '#FFFFFF',
		fontSize: 13,
		fontWeight: '500',
		marginLeft: 6,
	},
	notificationsContainer: {
		marginTop: 4,
	},
	loadingContainer: {
		padding: 20,
		alignItems: 'center',
		justifyContent: 'center',
	},
	loadingText: {
		marginTop: 8,
		fontSize: 14,
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
		padding: 20,
	},
	emptyText: {
		fontSize: 14,
		color: '#999',
		textAlign: 'center',
	},
	moreNotificationsButton: {
		borderWidth: 1,
		borderColor: '#E0E0E0',
		borderRadius: 8,
		padding: 8,
		alignItems: 'center',
		marginTop: 8,
	},
	moreNotificationsText: {
		color: '#4A90E2',
		fontSize: 12,
	},
	activityIndicator: {
		position: 'absolute',
		width: 12,
		height: 12,
		backgroundColor: '#F44336',
		borderRadius: 6,
		borderWidth: 2,
		borderColor: '#FFFFFF',
		top: 0,
		right: 0,
	},
	newActivityText: {
		fontSize: 12,
		color: '#F44336',
		fontWeight: '500',
	},
	clearDataButton: {
		backgroundColor: 'rgba(0,0,0,0.2)',
		borderRadius: 8,
		padding: 8,
		flexDirection: 'row',
		alignItems: 'center',
	},
	clearDataText: {
		color: '#FFFFFF',
		fontSize: 12,
		marginLeft: 4,
	},
})

export default ParentDashboardScreen
