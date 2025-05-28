import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { NotificationItem } from '../components/parent/UnifiedNotificationHandler'

// Interface for the notification store
interface NotificationStoreState {
	notifications: NotificationItem[]
	unreadCount: number

	// Actions
	addNotification: (notification: NotificationItem) => void
	bulkAddNotifications: (notifications: NotificationItem[]) => void
	markAsRead: (id: string) => void
	markAllAsRead: () => void
	loadNotifications: () => Promise<void>
	clearAllNotifications: () => void
}

// Local storage key
const STORAGE_KEY = 'unified_notifications'

// Create the store
export const useUnifiedNotificationStore = create<NotificationStoreState>((set, get) => ({
	notifications: [],
	unreadCount: 0,

	// Add a new notification
	addNotification: notification => {
		const notificationWithRead: NotificationItem = {
			...notification,
			read: false,
		}

		set(state => {
			// Check if this notification already exists (by ID)
			const existingIndex = state.notifications.findIndex(n => n.id === notification.id)
			let updatedNotifications = [...state.notifications]

			if (existingIndex >= 0) {
				// Update existing notification
				updatedNotifications[existingIndex] = notificationWithRead
			} else {
				// Add new notification at the beginning
				updatedNotifications = [notificationWithRead, ...state.notifications]
			}

			// Sort by timestamp (newest first)
			updatedNotifications.sort(
				(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
			)

			// Persist to AsyncStorage
			AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedNotifications)).catch(err =>
				console.error('Failed to save notifications to storage:', err)
			)

			// Calculate unread count
			const unreadCount = updatedNotifications.filter(n => !n.read).length

			return {
				notifications: updatedNotifications,
				unreadCount,
			}
		})
	},

	// Add multiple notifications at once (bulk import)
	bulkAddNotifications: notifications => {
		set(state => {
			// Create a map of existing notifications by ID for quick lookup
			const existingNotificationsMap = new Map(
				state.notifications.map(notification => [notification.id, notification])
			)

			// Process each new notification
			const updatedNotifications = [...state.notifications]
			let hasChanges = false

			notifications.forEach(notification => {
				const existing = existingNotificationsMap.get(notification.id)

				if (existing) {
					// For existing notifications, preserve the read status
					const updated = {
						...notification,
						read: existing.read,
					}

					// Find and replace in the array
					const index = updatedNotifications.findIndex(n => n.id === notification.id)
					if (index >= 0) {
						updatedNotifications[index] = updated
						hasChanges = true
					}
				} else {	
					// Add new notification
					updatedNotifications.push({
						...notification,
						read: notification.read || false,
					})
					hasChanges = true
				}
			})

			if (!hasChanges) {
				// No changes, return current state
				return state
			}

			// Sort by timestamp (newest first)
			updatedNotifications.sort(
				(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
			)

			// Persist to AsyncStorage
			AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedNotifications)).catch(err =>
				console.error('Failed to save notifications to storage:', err)
			)

			// Calculate unread count
			const unreadCount = updatedNotifications.filter(n => !n.read).length

			return {
				notifications: updatedNotifications,
				unreadCount,
			}
		})
	},

	// Mark a notification as read
	markAsRead: id => {
		set(state => {
			const updatedNotifications = state.notifications.map(notification =>
				notification.id === id ? { ...notification, read: true } : notification
			)

			// Persist to AsyncStorage
			AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedNotifications)).catch(err =>
				console.error('Failed to update notifications in storage:', err)
			)

			// Recalculate unread count
			const unreadCount = updatedNotifications.filter(n => !n.read).length

			return {
				notifications: updatedNotifications,
				unreadCount,
			}
		})
	},

	// Mark all notifications as read
	markAllAsRead: () => {
		set(state => {
			const updatedNotifications = state.notifications.map(notification => ({
				...notification,
				read: true,
			}))

			// Persist to AsyncStorage
			AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedNotifications)).catch(err =>
				console.error('Failed to update notifications in storage:', err)
			)

			return {
				notifications: updatedNotifications,
				unreadCount: 0,
			}
		})
	},

	// Load notifications from storage
	loadNotifications: async () => {
		try {
			const storedNotifications = await AsyncStorage.getItem(STORAGE_KEY)
			if (storedNotifications) {
				const notifications = JSON.parse(storedNotifications) as NotificationItem[]
				const unreadCount = notifications.filter(n => !n.read).length
				set({ notifications, unreadCount })
			}
		} catch (error) {
			console.error('Failed to load notifications from storage:', error)
		}
	},

	// Clear all notifications
	clearAllNotifications: () => {
		set({ notifications: [], unreadCount: 0 })
		AsyncStorage.removeItem(STORAGE_KEY).catch(err =>
			console.error('Failed to clear notifications from storage:', err)
		)
	},
}))
