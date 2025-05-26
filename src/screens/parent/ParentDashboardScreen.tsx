import AsyncStorage from '@react-native-async-storage/async-storage'
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useEffect, useState } from 'react'
import {
	ActivityIndicator,
	Alert,
	Dimensions,
	FlatList,
	Image,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View
} from 'react-native'
import Icon from 'react-native-vector-icons/Feather'
import RealtimeScoreNotifications from '../../components/parent/RealtimeScoreNotifications'
import { ParentHomeStackParamList, ParentTabParamList } from '../../navigators/ParentTabNavigator'
import { ChildData, ParentNotification } from '../../services/parentService'
import { useAuthStore } from '../../store/authStore';
import { useAppTheme } from '../../contexts/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
	fetchParentChildren,
	fetchParentNotifications,
	markParentNotificationAsRead,
} from '../../services/parentSupabaseService'

// Define navigation types
type ParentDashboardNavigationProp = StackNavigationProp<
	ParentHomeStackParamList,
	'ParentDashboard'
>

// We don't need to combine them for useNavigation if we use getParent()
// type CombinedNavigationProp = ParentDashboardNavigationProp & BottomTabNavigationProp<ParentTabParamList>;

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

	const navigation = useNavigation<ParentDashboardNavigationProp>()
	const { user } = useAuthStore()

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
	}, [user])

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
			await markParentNotificationAsRead(notification.id)

			// Update local state
			setNotifications(prev => prev.map(n => (n.id === notification.id ? { ...n, read: true } : n)))

			// Navigate based on notification type
			if (
				notification.type === 'grade' &&
				notification.relatedStudentId &&
				notification.relatedSubjectId
			) {
				const child = children.find(c => c.id === notification.relatedStudentId)
				if (child) {
					navigation.navigate('ParentChildGrades', {
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

	// Render child item
	const renderChildItem = ({ item }: { item: ChildData }) => (
		<TouchableOpacity onPress={() => navigateToChildGrades(item)} style={styles.childCard}>
			<View style={styles.childInfoContainer}>
				{item.avatar ? (
					<Image source={{ uri: item.avatar }} style={styles.avatar} />
				) : (
					getChildAvatar(item.firstName, item.lastName)
				)}
				<View style={styles.childDetails}>
					<Text style={styles.childName}>{`${item.firstName} ${item.lastName}`}</Text>
					{item.className && <Text style={styles.childClass}>{item.className}</Text>}
				</View>
			</View>
			<View style={styles.childActionsContainer}>
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
		</TouchableOpacity>
	)

	// Render notification item
	const renderNotificationItem = ({ item }: { item: ParentNotification }) => (
		<TouchableOpacity
			style={[
				styles.notificationItem,
				item.read ? styles.notificationRead : styles.notificationUnread,
			]}
			onPress={() => handleNotificationPress(item)}
		>
			<View style={[styles.notificationIcon, { backgroundColor: getNotificationColor(item.type) }]}>
				<Icon name={getNotificationIcon(item.type)} size={16} color='#FFFFFF' />
			</View>

			<View style={styles.notificationContent}>
				<Text style={styles.notificationTitle}>{item.title}</Text>
				<Text style={styles.notificationMessage} numberOfLines={2}>
					{item.message}
				</Text>
				<Text style={styles.notificationDate}>{formatDate(item.date)}</Text>
			</View>

			{!item.read && <View style={styles.unreadIndicator} />}
		</TouchableOpacity>
	)

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size='large' color='#4A90E2' />
				<Text style={styles.loadingText}>Loading dashboard...</Text>
			</View>
		)
	}

	if (error) {
		return (
			<View style={styles.errorContainer}>
				<Icon name='alert-circle' size={50} color='#F44336' />
				<Text style={styles.errorText}>{error}</Text>
				<TouchableOpacity style={styles.retryButton} onPress={() => setLoading(true)}>
					<Text style={styles.retryButtonText}>Retry</Text>
				</TouchableOpacity>
			</View>
		)
	}

	const unreadCount = notifications.filter(n => !n.read).length

	return (
		<View style={styles.container}>
			<RealtimeScoreNotifications />

			<ScrollView style={styles.scrollView}>
				{/* Parent Welcome Header */}
				<View style={styles.header}>
					<View>
						<Text style={styles.headerTitle}>Parent Dashboard</Text>
						<Text style={styles.headerSubtitle}>Monitor your children's progress</Text>
					</View>
				</View>

				{/* Children Section */}
				<View style={styles.sectionContainer}>
					<Text style={styles.sectionTitle}>My Children</Text>

					<FlatList
						data={children}
						renderItem={renderChildItem}
						keyExtractor={item => item.id}
						scrollEnabled={false}
						ListEmptyComponent={() => (
							<View style={styles.emptyContainer}>
								<Text style={styles.emptyText}>No children found</Text>
							</View>
						)}
					/>
				</View>

				{/* Notifications Section */}
				<View style={styles.sectionContainer}>
					<View style={styles.sectionHeader}>
						<Text style={styles.sectionTitle}>Notifications</Text>

						{unreadCount > 0 && (
							<View style={styles.badgeContainer}>
								<Text style={styles.badgeText}>{unreadCount}</Text>
							</View>
						)}

						<TouchableOpacity style={styles.viewAllButton} onPress={handleViewAllNotifications}>
							<Text style={styles.viewAllText}>View All</Text>
						</TouchableOpacity>
					</View>

					<FlatList
						data={notifications.slice(0, 3)}
						renderItem={renderNotificationItem}
						keyExtractor={item => item.id}
						scrollEnabled={false}
						ListEmptyComponent={() => (
							<View style={styles.emptyContainer}>
								<Text style={styles.emptyText}>No notifications</Text>
							</View>
						)}
					/>
				</View>
			</ScrollView>
		</View>
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
		padding: 15,
		marginBottom: 15,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	childInfoContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 10,
	},
	avatar: {
		width: 50,
		height: 50,
		borderRadius: 25,
		marginRight: 15,
	},
	avatarPlaceholder: {
		width: 50,
		height: 50,
		borderRadius: 25,
		marginRight: 15,
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
	notificationItem: {
		backgroundColor: '#FFFFFF',
		borderRadius: 10,
		padding: 12,
		marginBottom: 10,
		flexDirection: 'row',
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 1,
		elevation: 1,
	},
	notificationUnread: {
		backgroundColor: '#FFFFFF',
	},
	notificationRead: {
		backgroundColor: '#F8F9FA',
	},
	notificationIcon: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: '#4A90E2',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12,
	},
	notificationContent: {
		flex: 1,
	},
	notificationTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#333333',
		marginBottom: 2,
	},
	notificationMessage: {
		fontSize: 12,
		color: '#666666',
		marginBottom: 4,
	},
	notificationDate: {
		fontSize: 10,
		color: '#999999',
	},
	unreadIndicator: {
		width: 10,
		height: 10,
		borderRadius: 5,
		backgroundColor: '#4A90E2',
		marginLeft: 8,
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
		padding: 20,
	},
	emptyText: {
		fontSize: 14,
		color: '#999',
		textAlign: 'center',
	},
})

export default ParentDashboardScreen