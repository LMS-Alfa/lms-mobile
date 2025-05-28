import React from 'react'
import { useUnifiedNotificationStore } from '../../store/unifiedNotificationStore'
import UnifiedNotificationHandler, { NotificationItem } from './UnifiedNotificationHandler'

interface RealtimeScoreNotificationsProps {
	onNewNotification?: (notification: NotificationItem) => void
}

/**
 * RealtimeScoreNotifications provides real-time notifications for scores, attendance,
 * and announcements by using the UnifiedNotificationHandler and storing notifications
 * in the UnifiedNotificationStore.
 */
const RealtimeScoreNotifications: React.FC<RealtimeScoreNotificationsProps> = ({
	onNewNotification,
}) => {
	const { addNotification } = useUnifiedNotificationStore()

	// Handle new notifications from the UnifiedNotificationHandler
	const handleNewNotification = (notification: NotificationItem) => {
		// Add to store
		addNotification(notification)

		// Forward to parent component if provided
		if (onNewNotification) {
			onNewNotification(notification)
		}
	}

	return <UnifiedNotificationHandler onNewNotification={handleNewNotification} />
}

export default RealtimeScoreNotifications
