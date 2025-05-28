import { RealtimeChannel } from '@supabase/supabase-js'
import React, { useEffect, useState } from 'react'
import { Alert } from 'react-native'
import { useAuthStore } from '../../store/authStore'
import { formatRelativeTime } from '../../utils/dateUtils'
import { eventEmitter, EVENTS } from '../../utils/eventEmitter'
import { playNotificationSound } from '../../utils/soundNotification'
import { supabase } from '../../utils/supabase'

// Notification type definition to unify all notification types
export type NotificationItem = {
	id: string
	type: 'score' | 'attendance' | 'announcement'
	content: string
	timestamp: string
	studentId?: string
	read?: boolean
}

interface UnifiedNotificationHandlerProps {
	onNewNotification?: (notification: NotificationItem) => void
}

const UnifiedNotificationHandler: React.FC<UnifiedNotificationHandlerProps> = ({
	onNewNotification,
}) => {
	const { user } = useAuthStore()
	const [channels, setChannels] = useState<RealtimeChannel[]>([])
	const [initialized, setInitialized] = useState(false)

	// Set up subscriptions when component mounts
	useEffect(() => {
		console.log('[UnifiedNotifications] User role:', user?.role)
		console.log('[UnifiedNotifications] User role tolowercase:', user?.role.toLowerCase())

		if (!user || user.role.toLowerCase() !== 'parent') return

		const setupRealtimeListener = async () => {
			try {
				console.log('[UnifiedNotifications] Setting up realtime subscriptions for parent', user.id)

				// First get the list of children for this parent from the users table
				const { data: childrenData, error: childrenError } = await supabase
					.from('users')
					.select('id, firstName, lastName')
					.eq('parent_id', user.id)
					.eq('role', 'Student')

				if (childrenError) {
					console.error('[UnifiedNotifications] Error fetching children:', childrenError)
					return
				}

				// Extract child IDs
				const childIds = childrenData.map(child => child.id)
				if (childIds.length === 0) {
					console.log('[UnifiedNotifications] No children found for parent', user.id)
					return
				}

				console.log('[UnifiedNotifications] Found children:', childIds)

				// Create a map of child ID to name
				const childNameMap = Object.fromEntries(
					childrenData.map(child => [child.id, `${child.firstName} ${child.lastName}`])
				)

				// Create three separate channels for each table type
				const scoresChannel = supabase
					.channel('listen:scores')
					// Listen for score changes
					.on(
						'postgres_changes',
						{
							event: '*',
							schema: 'public',
							table: 'scores',
							filter: `student_id=in.(${childIds.join(',')})`,
						},
						async payload => {
							console.log('[UnifiedNotifications] Score change detected:', payload)

							try {
								// Handle based on event type
								const scoreData = payload.new || payload.old
								if (!scoreData) return

								// Fetch additional details about the score
								const { data: lesson, error: lessonError } = await supabase
									.from('lessons')
									.select(
										`
										id,
										lessonname,
										subjectid,
										subjects:subjectid (
											id,
											subjectname
										)
									`
									)
									.eq('id', scoreData.lesson_id)
									.single()

								if (lessonError) {
									console.error(
										'[UnifiedNotifications] Error fetching lesson details:',
										lessonError
									)
									return
								}

								// Find student name from our already fetched data
								const studentName = childNameMap[scoreData.student_id] || 'Your child'
								const action = payload.eventType === 'INSERT' ? 'received' : 'updated to'

								// Get subject name
								let subjectName = 'Unknown Subject'
								if (lesson.subjects) {
									// Handle subjects properly based on whether it's an array or object
									if (Array.isArray(lesson.subjects)) {
										// If it's an array, take the first item
										subjectName = lesson.subjects[0]?.subjectname || 'Unknown Subject'
									} else {
										// If it's an object, access directly - use type assertion
										const subjectObj = lesson.subjects as { subjectname?: string }
										subjectName = subjectObj.subjectname || 'Unknown Subject'
									}
								}

								const content = `${studentName} ${action} a score of ${scoreData.score} in ${subjectName} - ${lesson.lessonname}`

								// Create standardized notification with a unique ID that includes timestamp
								// For updates, always create with read: false to show as unread
								const notification: NotificationItem = {
									id: `score-${scoreData.id}-${Date.now()}`, // Unique ID with timestamp
									type: 'score',
									content: content,
									timestamp: new Date().toISOString(), // Use current time for updates to show at top
									studentId: scoreData.student_id,
									read: false, // Always set as unread for both new and updated scores
								}

								// Play sound for new notifications
								await playNotificationSound()

								// Notify parent component
								if (onNewNotification) {
									onNewNotification(notification)
								}

								// Emit event for other components to update
								eventEmitter.emit(EVENTS.NEW_NOTIFICATION, notification)

								// Also emit event for updating dashboard GPA data
								eventEmitter.emit(EVENTS.SCORE_UPDATED, {
									studentId: scoreData.student_id,
									scoreId: scoreData.id,
									score: scoreData.score,
								})
							} catch (error) {
								console.error('[UnifiedNotifications] Error processing score notification:', error)
							}
						}
					)
					.subscribe(status => {
						console.log(`[UnifiedNotifications] Scores channel status:`, status)
					})

				const attendanceChannel = supabase
					.channel('listen:attendance')
					// Listen for attendance changes
					.on(
						'postgres_changes',
						{
							event: '*',
							schema: 'public',
							table: 'attendance',
							filter: `student_id=in.(${childIds.join(',')})`,
						},
						async payload => {
							console.log('[UnifiedNotifications] Attendance change detected:', payload)

							try {
								// Handle based on event type
								const attendanceData = payload.new || payload.old
								if (!attendanceData) return

								// Find student name from our already fetched data
								const studentName = childNameMap[attendanceData.student_id] || 'Your child'

								// Fetch lesson details
								const { data: lesson, error: lessonError } = await supabase
									.from('lessons')
									.select(
										`
										id,
										lessonname,
										subjectid,
										subjects:subjectid (
											id,
											subjectname
										)
									`
									)
									.eq('id', attendanceData.lesson_id)
									.single()

								if (lessonError) {
									console.error(
										'[UnifiedNotifications] Error fetching lesson for attendance:',
										lessonError
									)
								}

								// Get subject name
								let subjectName = 'Unknown Subject'
								let lessonName = 'Unknown Lesson'
								if (lesson) {
									lessonName = lesson.lessonname || 'Unknown Lesson'
									if (lesson.subjects) {
										// Handle subjects properly based on whether it's an array or object
										if (Array.isArray(lesson.subjects)) {
											// If it's an array, take the first item
											subjectName = lesson.subjects[0]?.subjectname || 'Unknown Subject'
										} else {
											// If it's an object, access directly - use type assertion
											const subjectObj = lesson.subjects as { subjectname?: string }
											subjectName = subjectObj.subjectname || 'Unknown Subject'
										}
									}
								}

								const status =
									attendanceData.status.charAt(0).toUpperCase() + attendanceData.status.slice(1)
								const action = payload.eventType === 'INSERT' ? 'marked' : 'updated to'

								const content = `${studentName} ${action} ${status} for ${subjectName} (${lessonName})`

								// Create standardized notification with a unique ID that includes timestamp
								// For updates, always create with read: false to show as unread
								const notification: NotificationItem = {
									id: `attendance-${attendanceData.id}-${Date.now()}`, // Unique ID with timestamp
									type: 'attendance',
									content: content,
									timestamp: new Date().toISOString(), // Use current time for updates to show at top
									studentId: attendanceData.student_id,
									read: false, // Always set as unread for both new and updated attendance
								}

								// Play sound for new notifications
								await playNotificationSound()

								// Notify parent component
								if (onNewNotification) {
									onNewNotification(notification)
								}

								// Emit event for other components to update
								eventEmitter.emit(EVENTS.NEW_NOTIFICATION, notification)

								// Also emit event for updating dashboard attendance data
								eventEmitter.emit(EVENTS.ATTENDANCE_UPDATED, {
									studentId: attendanceData.student_id,
									attendanceId: attendanceData.id,
									status: attendanceData.status,
								})
							} catch (error) {
								console.error(
									'[UnifiedNotifications] Error processing attendance notification:',
									error
								)
							}
						}
					)
					.subscribe(status => {
						console.log(`[UnifiedNotifications] Attendance channel status:`, status)
					})

				const announcementsChannel = supabase
					.channel('listen:announcements')
					// Listen for announcement changes
					.on(
						'postgres_changes',
						{
							event: '*',
							schema: 'public',
							table: 'announcements',
							filter: 'targetAudience=in.(ALL,Parents,Parent)',
						},
						async payload => {
							console.log('[UnifiedNotifications] Announcement change detected:', payload)

							try {
								// Handle based on event type
								const announcementData = payload.new || payload.old
								if (!announcementData) return

								const title = announcementData.title || 'New Announcement'
								let content = announcementData.content || ''

								// Format creation/update time
								if (payload.eventType === 'UPDATE' && announcementData.updated_at) {
									content = `${content} (Updated ${formatRelativeTime(
										announcementData.updated_at
									)})`
								} else if (announcementData.created_at) {
									content = `${content} (Posted ${formatRelativeTime(announcementData.created_at)})`
								}

								// Create standardized notification with read: false
								const notification: NotificationItem = {
									id: `announcement-${announcementData.id}-${Date.now()}`, // Unique ID with timestamp
									type: 'announcement',
									content: `${title}: ${content}`,
									timestamp: new Date().toISOString(), // Use current time for updates to show at top
									read: false, // Always unread for both new and updated announcements
								}

								// Play sound for new notifications
								await playNotificationSound()

								// Notify parent component
								if (onNewNotification) {
									onNewNotification(notification)
								}

								// Emit event for other components to update
								eventEmitter.emit(EVENTS.NEW_NOTIFICATION, notification)
							} catch (error) {
								console.error(
									'[UnifiedNotifications] Error processing announcement notification:',
									error
								)
							}
						}
					)
					.subscribe(status => {
						console.log(`[UnifiedNotifications] Announcements channel status:`, status)
					})

				// Store channels for cleanup
				setChannels([scoresChannel, attendanceChannel, announcementsChannel])
				setInitialized(true)
				console.log('[UnifiedNotifications] All channels initialized successfully')
			} catch (error) {
				console.error('[UnifiedNotifications] Error setting up subscriptions:', error)
				Alert.alert('Notification Error', `Failed to set up notifications: ${error}`)
			}
		}

		setupRealtimeListener()

		// Cleanup on unmount
		return () => {
			console.log('[UnifiedNotifications] Cleaning up subscriptions')
			channels.forEach(channel => {
				try {
					supabase.removeChannel(channel)
				} catch (e) {
					console.error('[UnifiedNotifications] Error removing channel:', e)
				}
			})
		}
	}, [user, onNewNotification])

	// This component doesn't render anything visible
	return null
}

export default UnifiedNotificationHandler
