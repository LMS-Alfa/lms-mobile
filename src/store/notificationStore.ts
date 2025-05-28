import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'

export interface LocalNotification {
	id: string
	title: string
	message: string
	type: string
	timestamp: string
	read: boolean
	data?: any
}

interface NotificationState {
	notifications: LocalNotification[]
	unreadCount: number
	addNotification: (notification: Omit<LocalNotification, 'id' | 'timestamp' | 'read'>) => void
	markAsRead: (id: string) => void
	markAllAsRead: () => void
	loadNotifications: () => Promise<void>
}

const STORAGE_KEY = 'local_notifications'

export const useNotificationStore = create<NotificationState>((set, get) => ({
	notifications: [],
	unreadCount: 0,

	addNotification: notification => {
		const newNotification: LocalNotification = {
			...notification,
			id: Date.now().toString(),
			timestamp: new Date().toISOString(),
			read: false,
		}

		set(state => {
			const updatedNotifications = [newNotification, ...state.notifications]

			// Persist notifications to AsyncStorage
			AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedNotifications)).catch(err =>
				console.error('Failed to save notifications to storage:', err)
			)

			return {
				notifications: updatedNotifications,
				unreadCount: state.unreadCount + 1,
			}
		})
	},

	markAsRead: id => {
		set(state => {
			const updatedNotifications = state.notifications.map(notification =>
				notification.id === id ? { ...notification, read: true } : notification
			)

			// Update storage
			AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedNotifications)).catch(err =>
				console.error('Failed to update notifications in storage:', err)
			)

			// Count unread
			const unreadCount = updatedNotifications.filter(n => !n.read).length

			return {
				notifications: updatedNotifications,
				unreadCount,
			}
		})
	},

	markAllAsRead: () => {
		set(state => {
			const updatedNotifications = state.notifications.map(notification => ({
				...notification,
				read: true,
			}))

			// Update storage
			AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedNotifications)).catch(err =>
				console.error('Failed to update notifications in storage:', err)
			)

			return {
				notifications: updatedNotifications,
				unreadCount: 0,
			}
		})
	},

	loadNotifications: async () => {
		try {
			const storedNotifications = await AsyncStorage.getItem(STORAGE_KEY)
			if (storedNotifications) {
				const notifications = JSON.parse(storedNotifications) as LocalNotification[]
				const unreadCount = notifications.filter(n => !n.read).length
				set({ notifications, unreadCount })
			}
		} catch (error) {
			console.error('Failed to load notifications from storage:', error)
		}
	},
}))
