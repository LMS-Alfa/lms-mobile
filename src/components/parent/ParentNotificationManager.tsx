import AsyncStorage from '@react-native-async-storage/async-storage'
import React, { useEffect, useState } from 'react'
import { ParentNotification } from '../../services/parentService'
import AnnouncementNotificationHandler from './AnnouncementNotificationHandler'
import AttendanceNotificationHandler from './AttendanceNotificationHandler'
import ScoreNotificationHandler from './ScoreNotificationHandler'

interface ParentNotificationManagerProps {
	onNotificationsChanged?: (notifications: ParentNotification[]) => void
	maxDashboardNotifications?: number
}

/**
 * Component that manages parent notifications from scores, attendance and announcements
 * Combines all notification handlers and stores notifications in a single state
 */
const ParentNotificationManager: React.FC<ParentNotificationManagerProps> = ({
	onNotificationsChanged,
	maxDashboardNotifications = 5,
}) => {
	const [notifications, setNotifications] = useState<ParentNotification[]>([])
	const [readNotifications, setReadNotifications] = useState<Record<string, boolean>>({})

	// Load read notifications from AsyncStorage on mount
	useEffect(() => {
		const loadReadNotifications = async () => {
			try {
				const readNotificationsJson = await AsyncStorage.getItem('readParentNotifications')
				if (readNotificationsJson) {
					const readData = JSON.parse(readNotificationsJson)
					setReadNotifications(readData)
				}
			} catch (error) {
				console.error('[NotificationManager] Error loading read notifications:', error)
			}
		}

		loadReadNotifications()
	}, [])

	// Notify parent when notifications change
	useEffect(() => {
		if (onNotificationsChanged && notifications.length > 0) {
			// Apply read status to notifications
			const notificationsWithReadStatus = notifications.map(notification => ({
				...notification,
				read: readNotifications[notification.id] || false,
			}))

			// Sort by date (most recent first)
			// This handles all types of notifications - scores (updated_at), attendance (noted_at), announcements (created_at)
			const sortedNotifications = [...notificationsWithReadStatus].sort((a, b) => {
				return new Date(b.date).getTime() - new Date(a.date).getTime()
			})

			// Pass to parent callback (send all notifications, let parent component decide how many to display)
			onNotificationsChanged(sortedNotifications)
		}
	}, [notifications, readNotifications, onNotificationsChanged])

	// Handle new notifications from any source
	const handleNewNotification = (notification: ParentNotification) => {
		setNotifications(prev => {
			// Check if notification with same ID already exists
			const existingIndex = prev.findIndex(n => n.id === notification.id)

			if (existingIndex >= 0) {
				// Update existing notification
				const updated = [...prev]
				updated[existingIndex] = {
					...notification,
					read: readNotifications[notification.id] || false,
				}
				return updated
			} else {
				// Add new notification
				return [
					...prev,
					{
						...notification,
						read: readNotifications[notification.id] || false,
					},
				]
			}
		})
	}

	// Mark a notification as read
	const markAsRead = async (notificationId: string) => {
		try {
			// Update local state
			setReadNotifications(prev => ({
				...prev,
				[notificationId]: true,
			}))

			// Save to AsyncStorage
			const updatedReadNotifications = {
				...readNotifications,
				[notificationId]: true,
			}

			await AsyncStorage.setItem(
				'readParentNotifications',
				JSON.stringify(updatedReadNotifications)
			)
		} catch (error) {
			console.error('[NotificationManager] Error marking notification as read:', error)
		}
	}

	// Mark all notifications as read
	const markAllAsRead = async () => {
		try {
			// Create a map of all notification IDs set to true
			const allRead = notifications.reduce((acc, notification) => {
				acc[notification.id] = true
				return acc
			}, {} as Record<string, boolean>)

			// Update local state
			setReadNotifications(prev => ({
				...prev,
				...allRead,
			}))

			// Save to AsyncStorage
			const updatedReadNotifications = {
				...readNotifications,
				...allRead,
			}

			await AsyncStorage.setItem(
				'readParentNotifications',
				JSON.stringify(updatedReadNotifications)
			)
		} catch (error) {
			console.error('[NotificationManager] Error marking all notifications as read:', error)
		}
	}

	// Get latest notifications for dashboard
	const getDashboardNotifications = (): ParentNotification[] => {
		// Apply read status to notifications
		const notificationsWithReadStatus = notifications.map(notification => ({
			...notification,
			read: readNotifications[notification.id] || false,
		}))

		// Sort by date (most recent first)
		const sortedNotifications = [...notificationsWithReadStatus].sort((a, b) => {
			return new Date(b.date).getTime() - new Date(a.date).getTime()
		})

		// Return all notifications sorted by date
		return sortedNotifications
	}

	return (
		<>
			{/* Render all notification handlers with callbacks */}
			<ScoreNotificationHandler onNewNotification={handleNewNotification} />
			<AttendanceNotificationHandler onNewNotification={handleNewNotification} />
			<AnnouncementNotificationHandler onNewNotification={handleNewNotification} />
		</>
	)
}

export default ParentNotificationManager
