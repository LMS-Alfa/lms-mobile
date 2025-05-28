import { useNavigation } from '@react-navigation/native'
import React, { useEffect, useState } from 'react'
import {
	ActivityIndicator,
	FlatList,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/Feather'
import NotificationCard from '../../components/parent/NotificationCard'
import UnifiedNotificationHandler, {
	NotificationItem,
} from '../../components/parent/UnifiedNotificationHandler'
import { useAppTheme } from '../../contexts/ThemeContext'
import { fetchUnifiedNotifications } from '../../services/parentSupabaseService'
import { useAuthStore } from '../../store/authStore'
import { useUnifiedNotificationStore } from '../../store/unifiedNotificationStore'

// Filter Types
type FilterType = 'all' | 'score' | 'attendance' | 'announcement'

const ParentNotificationsScreen = () => {
	const navigation = useNavigation()
	const { theme } = useAppTheme()
	const { user } = useAuthStore()
	const {
		notifications: storeNotifications,
		unreadCount,
		markAsRead,
		markAllAsRead: markAllNotificationsAsRead,
		loadNotifications,
		addNotification,
		bulkAddNotifications,
	} = useUnifiedNotificationStore()

	const [loading, setLoading] = useState(true)
	const [searchQuery, setSearchQuery] = useState('')
	const [activeFilter, setActiveFilter] = useState<FilterType>('all')
	const [filteredNotifications, setFilteredNotifications] = useState<NotificationItem[]>([])
	const [notifications, setNotifications] = useState<NotificationItem[]>([])
	const [refreshing, setRefreshing] = useState(false)

	// Load notifications when component mounts
	useEffect(() => {
		const initialize = async () => {
			try {
				setLoading(true)
				// First load notifications from the store (these have read status preserved)
				await loadNotifications()

				// Then fetch fresh notifications from Supabase
				if (user?.id) {
					await fetchAndMergeNotifications()
				}
			} catch (error) {
				console.error('Error loading notifications:', error)
			} finally {
				setLoading(false)
			}
		}

		initialize()
	}, [loadNotifications, user?.id])

	// Fetch notifications from Supabase and merge with store notifications
	const fetchAndMergeNotifications = async () => {
		if (!user?.id) return

		try {
			// Fetch fresh notifications from Supabase
			const supabaseNotifications = await fetchUnifiedNotifications(user.id)

			// Create a map of existing notifications by ID for quick lookup
			const existingNotificationsMap = new Map(
				storeNotifications.map(notification => [notification.id, notification])
			)

			// Merge notifications, preserving read status from store
			const mergedNotifications = supabaseNotifications.map(notification => {
				const existing = existingNotificationsMap.get(notification.id)
				return {
					...notification,
					// If we have this notification in the store, use its read status
					read: existing ? existing.read : notification.read,
				}
			})

			// Update state with merged notifications
			setNotifications(mergedNotifications)

			// Add all notifications to the store using the bulk add function
			// This is more efficient than adding them one by one
			bulkAddNotifications(mergedNotifications)
		} catch (error) {
			console.error('Error fetching notifications from Supabase:', error)
		}
	}

	// Refresh notifications
	const handleRefresh = async () => {
		setRefreshing(true)
		await fetchAndMergeNotifications()
		setRefreshing(false)
	}

	// Apply filtering and searching whenever notifications, search query, or filter changes
	useEffect(() => {
		// Apply filter
		let result = [...notifications]

		// Type filter
		if (activeFilter !== 'all') {
			result = result.filter(item => item.type === activeFilter)
		}

		// Search filter
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase()
			result = result.filter(item => item.content.toLowerCase().includes(query))
		}

		// Sort by timestamp (newest first)
		result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

		setFilteredNotifications(result)
	}, [notifications, searchQuery, activeFilter])

	// Handle new notification
	const handleNewNotification = (notification: NotificationItem) => {
		addNotification(notification)
		setNotifications(prev => {
			// Check if this notification already exists
			const exists = prev.some(item => item.id === notification.id)
			if (exists) {
				// Replace the existing notification
				return prev.map(item => (item.id === notification.id ? notification : item))
			} else {
				// Add the new notification
				return [notification, ...prev]
			}
		})
	}

	// Handle notification press (mark as read)
	const handleNotificationPress = (notification: NotificationItem) => {
		if (!notification.read) {
			markAsRead(notification.id)
			// Update local state to reflect read status
			setNotifications(prev =>
				prev.map(item => (item.id === notification.id ? { ...item, read: true } : item))
			)
		}
	}

	// Toggle filter
	const toggleFilter = (filter: FilterType) => {
		setActiveFilter(filter === activeFilter ? 'all' : filter)
	}

	// Render filter button
	const renderFilterButton = (filter: FilterType, label: string, iconName: string) => {
		const isActive = activeFilter === filter

		return (
			<TouchableOpacity
				style={[
					styles.filterButton,
					{
						backgroundColor: isActive ? theme.primary : theme.cardBackground,
						borderColor: isActive ? theme.primary : theme.border,
					},
				]}
				onPress={() => toggleFilter(filter)}
			>
				<Icon name={iconName} size={14} color={isActive ? '#FFFFFF' : theme.textSecondary} />
				<Text style={[styles.filterText, { color: isActive ? '#FFFFFF' : theme.textSecondary }]}>
					{label}
				</Text>
			</TouchableOpacity>
		)
	}

	// Render notification item
	const renderNotificationItem = ({ item }: { item: NotificationItem }) => (
		<NotificationCard notification={item} onPress={() => handleNotificationPress(item)} />
	)

	// Update: Create a local markAllAsRead function that updates both store and local state
	const markAllAsRead = () => {
		// Call the store function to mark all as read
		markAllNotificationsAsRead()

		// Update local state to reflect the change
		setNotifications(prev => prev.map(notification => ({ ...notification, read: true })))
	}

	if (loading) {
		return (
			<SafeAreaView style={styles.loadingContainer}>
				<ActivityIndicator size='large' color='#4A90E2' />
				<Text style={styles.loadingText}>Loading notifications...</Text>
			</SafeAreaView>
		)
	}

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
			{/* Unified Notification Handler */}
			<UnifiedNotificationHandler onNewNotification={handleNewNotification} />

			<View
				style={[
					styles.header,
					{ backgroundColor: theme.cardBackground, borderBottomColor: theme.border },
				]}
			>
				<TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
					<Icon name='arrow-left' size={24} color={theme.primary} />
				</TouchableOpacity>

				<View style={styles.headerContent}>
					<Text style={[styles.screenTitle, { color: theme.text }]}>Notifications</Text>
					{unreadCount > 0 && (
						<View style={styles.badgeContainer}>
							<Text style={styles.badgeText}>{unreadCount}</Text>
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
			<View
				style={[
					styles.searchContainer,
					{ backgroundColor: theme.cardBackground, borderColor: theme.border },
				]}
			>
				<Icon name='search' size={18} color={theme.textSecondary} style={styles.searchIcon} />
				<TextInput
					style={[styles.searchInput, { color: theme.text }]}
					placeholder='Search notifications...'
					placeholderTextColor={theme.textSecondary}
					value={searchQuery}
					onChangeText={setSearchQuery}
					clearButtonMode='while-editing'
				/>
			</View>

			{/* Filter buttons */}
			<View style={styles.filterContainer}>
				<ScrollView horizontal showsHorizontalScrollIndicator={false}>
					{renderFilterButton('score', 'Scores', 'award')}
					{renderFilterButton('attendance', 'Attendance', 'user-check')}
					{renderFilterButton('announcement', 'Announcements', 'bell')}

					{(activeFilter !== 'all' || searchQuery.trim() !== '') && (
						<TouchableOpacity
							style={[styles.filterButton, styles.clearFilterButton]}
							onPress={() => {
								setActiveFilter('all')
								setSearchQuery('')
							}}
						>
							<Icon name='x' size={14} color='#FFFFFF' />
							<Text style={[styles.filterText, styles.clearFilterText]}>Clear</Text>
						</TouchableOpacity>
					)}
				</ScrollView>
			</View>

			{/* Notifications list */}
			<FlatList
				data={filteredNotifications}
				renderItem={renderNotificationItem}
				keyExtractor={item => item.id}
				contentContainerStyle={styles.notificationsList}
				refreshing={refreshing}
				onRefresh={handleRefresh}
				ListEmptyComponent={() => (
					<View style={styles.emptyContainer}>
						<Icon name='bell-off' size={40} color={theme.textSecondary} />
						<Text style={[styles.emptyText, { color: theme.textSecondary }]}>
							{activeFilter !== 'all' || searchQuery
								? 'No matching notifications found'
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
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 16,
		borderBottomWidth: 1,
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
		fontSize: 14,
	},
	searchContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		margin: 16,
		marginTop: 16,
		marginBottom: 8,
		paddingHorizontal: 12,
		borderRadius: 8,
		borderWidth: 1,
	},
	searchIcon: {
		marginRight: 8,
	},
	searchInput: {
		flex: 1,
		height: 40,
		fontSize: 16,
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
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	loadingText: {
		marginTop: 16,
	},
	emptyContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		padding: 32,
	},
	emptyText: {
		marginTop: 16,
		textAlign: 'center',
	},
})

export default ParentNotificationsScreen
