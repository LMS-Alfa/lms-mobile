import { RealtimeChannel } from '@supabase/supabase-js'
import React, { useEffect, useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { formatRelativeTime } from '../../utils/dateUtils'
import { sendLocalNotification } from '../../utils/notificationSetup'
import { supabase } from '../../utils/supabase'

interface AnnouncementNotificationHandlerProps {
	onNewNotification?: (notification: any) => void
}

// Fixed channel name for announcements
const ANNOUNCEMENTS_CHANNEL = 'announcements-channel-fixed'

/**
 * Component that listens specifically for announcement changes in the database
 */
const AnnouncementNotificationHandler: React.FC<AnnouncementNotificationHandlerProps> = ({
	onNewNotification,
}) => {
	const [channel, setChannel] = useState<RealtimeChannel | null>(null)
	const { user } = useAuthStore()

	useEffect(() => {
		if (!user || user.role !== 'Parent') return

		const setupAnnouncementListener = async () => {
			try {
				console.log('[AnnouncementNotifications] Setting up announcement listener')

				// Clean up existing channel if any
				if (channel) {
					console.log('[AnnouncementNotifications] Cleaning up existing channel')
					supabase.removeChannel(channel)
					setChannel(null)
				}

				// Create a channel for announcements with specific filter
				const announcementsChannel = supabase
					.channel(ANNOUNCEMENTS_CHANNEL)
					.on(
						'postgres_changes',
						{
							event: '*', // Listen for all events (INSERT, UPDATE, DELETE)
							schema: 'public',
							table: 'announcements',
							filter: 'targetAudience=in.(ALL,Parents,Parent)', // No limit, fetch all announcements
						},
						async payload => {
							console.log('[AnnouncementNotifications] Announcement change detected:', payload)

							try {
								// Handle based on event type
								switch (payload.eventType) {
									case 'INSERT':
										await handleAnnouncementInsert(payload)
										break
									case 'UPDATE':
										await handleAnnouncementUpdate(payload)
										break
									case 'DELETE':
										await handleAnnouncementDelete(payload)
										break
									default:
										console.log(
											`[AnnouncementNotifications] Unhandled event type: ${payload.eventType}`
										)
								}
							} catch (error) {
								console.error(
									'[AnnouncementNotifications] Error processing announcement notification:',
									error
								)
							}
						}
					)
					.subscribe(status => {
						console.log(`[AnnouncementNotifications] Subscription status:`, status)
					})

				// Store channel for cleanup
				setChannel(announcementsChannel)
				console.log('[AnnouncementNotifications] Listener active')
			} catch (error) {
				console.error('[AnnouncementNotifications] Error setting up listener:', error)
			}
		}

		setupAnnouncementListener()

		// Cleanup on unmount
		return () => {
			console.log('[AnnouncementNotifications] Cleaning up subscription')
			if (channel) {
				try {
					supabase.removeChannel(channel)
				} catch (e) {
					console.error('[AnnouncementNotifications] Error removing channel:', e)
				}
			}
		}
	}, [user])

	// Handler for announcement inserts
	const handleAnnouncementInsert = async (payload: any) => {
		try {
			const announcementData = payload.new

			if (!announcementData) {
				console.error('[AnnouncementNotifications] Invalid payload received')
				return
			}

			const title = announcementData.title || 'New Announcement'
			const message = announcementData.content || ''

			// Format creation time in user's timezone if available
			let formattedMessage = message
			if (announcementData.created_at) {
				formattedMessage += ` - Posted ${formatRelativeTime(announcementData.created_at)}`
			}

			// Notification data
			const notificationData = {
				id: `announcement-${announcementData.id}`,
				title,
				message: formattedMessage,
				date: announcementData.created_at || new Date().toISOString(), // Prioritize created_at field
				type: 'announcement',
				read: false,
				isImportant: announcementData.isImportant,
				action: 'created',
				relatedStudentId: announcementData.target_student_id || undefined,
				relatedSubjectId: announcementData.target_subject_id || undefined,
			}

			// Show local notification
			await sendLocalNotification(title, formattedMessage, {
				...notificationData,
				data: announcementData,
			})

			// Call callback if provided
			if (onNewNotification) {
				onNewNotification(notificationData)
			}
		} catch (error) {
			console.error('[AnnouncementNotifications] Error processing insertion:', error)
		}
	}

	// Handler for announcement updates
	const handleAnnouncementUpdate = async (payload: any) => {
		try {
			const announcementData = payload.new

			if (!announcementData) {
				console.error('[AnnouncementNotifications] Invalid payload received')
				return
			}

			const title = `Updated: ${announcementData.title || 'Announcement'}`
			const message = announcementData.content || ''

			// Format update time in user's timezone if available
			let formattedMessage = message
			if (announcementData.updated_at) {
				formattedMessage += ` - Updated ${formatRelativeTime(announcementData.updated_at)}`
			}

			// Notification data
			const notificationData = {
				id: `announcement-update-${announcementData.id}`,
				title,
				message: formattedMessage,
				date:
					announcementData.updated_at || announcementData.created_at || new Date().toISOString(),
				type: 'announcement',
				read: false,
				isImportant: announcementData.isImportant,
				action: 'updated',
				relatedStudentId: announcementData.target_student_id || undefined,
				relatedSubjectId: announcementData.target_subject_id || undefined,
			}

			// Show local notification
			await sendLocalNotification(title, formattedMessage, {
				...notificationData,
				data: announcementData,
			})

			// Call callback if provided
			if (onNewNotification) {
				onNewNotification(notificationData)
			}
		} catch (error) {
			console.error('[AnnouncementNotifications] Error processing update:', error)
		}
	}

	// Handler for announcement deletions
	const handleAnnouncementDelete = async (payload: any) => {
		try {
			const deletedAnnouncement = payload.old

			if (!deletedAnnouncement) {
				console.error('[AnnouncementNotifications] Invalid deletion payload received')
				return
			}

			const title = 'Announcement Removed'
			const message = `The announcement "${deletedAnnouncement.title}" has been removed`

			// Notification data
			const notificationData = {
				id: `announcement-deleted-${deletedAnnouncement.id}`,
				title,
				message,
				date: new Date().toISOString(),
				type: 'announcement',
				read: false,
				action: 'deleted',
				relatedStudentId: deletedAnnouncement.target_student_id || undefined,
				relatedSubjectId: deletedAnnouncement.target_subject_id || undefined,
			}

			// Show local notification
			await sendLocalNotification(title, message, {
				...notificationData,
				data: deletedAnnouncement,
			})

			// Call callback if provided
			if (onNewNotification) {
				onNewNotification(notificationData)
			}
		} catch (error) {
			console.error('[AnnouncementNotifications] Error processing deletion:', error)
		}
	}

	// This component doesn't render anything visible
	return null
}

export default AnnouncementNotificationHandler
