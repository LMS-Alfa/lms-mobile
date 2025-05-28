import { RealtimeChannel } from '@supabase/supabase-js'
import * as Notifications from 'expo-notifications'
import React, { useEffect, useState } from 'react'
import { Alert } from 'react-native'
import { createScoreNotification } from '../../services/parentSupabaseService'
import { useAuthStore } from '../../store/authStore'
import { formatRelativeTime, formatToLocalTime } from '../../utils/dateUtils'
import { sendLocalNotification } from '../../utils/notificationSetup'
import { supabase } from '../../utils/supabase'

interface RealtimeNotificationsProps {
	// Optional props can be added here
}

// Configure notifications for in-app display
Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldShowBanner: true,
		shouldShowList: true,
		shouldPlaySound: true,
		shouldSetBadge: true,
	}),
})

// Fixed channel names
const SCORES_CHANNEL = 'scores-channel-fixed'
const ATTENDANCE_CHANNEL = 'attendance-channel-fixed'
const ANNOUNCEMENTS_CHANNEL = 'announcements-channel-fixed'

/**
 * Component that listens for realtime database changes and triggers local notifications
 * Note: This only uses local notifications as push notifications are not supported
 * in Expo Go on Android from SDK 53 without a development build.
 */
const RealtimeScoreNotifications: React.FC<RealtimeNotificationsProps> = () => {
	const [initialized, setInitialized] = useState(false)
	const [channels, setChannels] = useState<RealtimeChannel[]>([])
	const { user } = useAuthStore()

	// Initialize notifications when component mounts
	useEffect(() => {
		const initializeNotifications = async () => {
			try {
				// Request permission for local notifications
				const { status } = await Notifications.requestPermissionsAsync({
					ios: {
						allowAlert: true,
						allowBadge: true,
						allowSound: true,
					},
				})
				if (status !== 'granted') {
					console.warn('[RealtimeNotifications] Local notification permissions not granted')
				} else {
					console.log('[RealtimeNotifications] Local notification permissions granted')
				}
			} catch (error) {
				console.error('[RealtimeNotifications] Error requesting notification permissions:', error)
			}
		}

		initializeNotifications()
	}, [])

	useEffect(() => {
		if (!user || user.role !== 'Parent') return

		const setupRealtimeListener = async () => {
			try {
				console.log('[RealtimeNotifications] Setting up subscriptions')

				// Clean up any existing channels
				if (channels.length > 0) {
					console.log('[RealtimeNotifications] Cleaning up existing channels')
					channels.forEach(channel => {
						supabase.removeChannel(channel)
					})
					setChannels([])
				}

				// Get the parent's children
				const { data: children, error: childrenError } = await supabase
					.from('users')
					.select('id, firstName, lastName')
					.eq('parent_id', user.id)
					.eq('role', 'Student')

				if (childrenError) {
					console.error('[RealtimeNotifications] Error fetching children:', childrenError)
					return
				}

				if (!children || children.length === 0) {
					console.log('[RealtimeNotifications] No children found for this parent')
					return
				}

				// Get array of child IDs
				const childIds = children.map(child => child.id)
				console.log('[RealtimeNotifications] Found children:', childIds)

				// Create a map of child IDs to names for better notifications
				const childNameMap = children.reduce((acc, child) => {
					acc[child.id] = `${child.firstName} ${child.lastName}`
					return acc
				}, {} as Record<string, string>)

				// Create a channel for scores
				const scoresChannel = supabase
					.channel(SCORES_CHANNEL)
					.on(
						'postgres_changes',
						{
							event: '*', // Listen for all events (INSERT, UPDATE, DELETE)
							schema: 'public',
							table: 'scores',
							filter: `student_id=in.(${childIds.join(',')})`,
						},
						async payload => {
							console.log('[RealtimeNotifications] Score change detected:', payload)

							try {
								// Handle based on event type
								switch (payload.eventType) {
									case 'INSERT':
										await handleScoreInsertOrUpdate(payload, childNameMap, 'inserted')
										break
									case 'UPDATE':
										await handleScoreInsertOrUpdate(payload, childNameMap, 'updated')
										break
									case 'DELETE':
										await handleScoreDelete(payload, childNameMap)
										break
									default:
										console.log(
											`[RealtimeNotifications] Unhandled event type: ${payload.eventType}`
										)
								}
							} catch (error) {
								console.error('[RealtimeNotifications] Error processing score notification:', error)
							}
						}
					)
					.subscribe(status => {
						console.log(`[RealtimeNotifications] Scores subscription status:`, status)
					})

				// Store channel for cleanup
				setChannels(prev => [...prev, scoresChannel])

				// Create a channel for attendance
				const attendanceChannel = supabase
					.channel(ATTENDANCE_CHANNEL)
					.on(
						'postgres_changes',
						{
							event: '*', // Listen for all events
							schema: 'public',
							table: 'attendance',
							filter: `student_id=in.(${childIds.join(',')})`,
						},
						async payload => {
							console.log('[RealtimeNotifications] Attendance change detected:', payload)

							try {
								// Handle based on event type
								switch (payload.eventType) {
									case 'INSERT':
										await handleAttendanceInsertOrUpdate(payload, childNameMap, 'recorded')
										break
									case 'UPDATE':
										await handleAttendanceInsertOrUpdate(payload, childNameMap, 'updated')
										break
									case 'DELETE':
										await handleAttendanceDelete(payload, childNameMap)
										break
									default:
										console.log(
											`[RealtimeNotifications] Unhandled event type: ${payload.eventType}`
										)
								}
							} catch (error) {
								console.error(
									'[RealtimeNotifications] Error processing attendance notification:',
									error
								)
							}
						}
					)
					.subscribe(status => {
						console.log(`[RealtimeNotifications] Attendance subscription status:`, status)
					})

				// Store channel for cleanup
				setChannels(prev => [...prev, attendanceChannel])

				// Create a channel for announcements
				const announcementsChannel = supabase
					.channel(ANNOUNCEMENTS_CHANNEL)
					.on(
						'postgres_changes',
						{
							event: '*',
							schema: 'public',
							table: 'announcements',
							filter: 'targetAudience=in.(ALL,Parents,Parent)',
						},
						async payload => {
							console.log('[RealtimeNotifications] Announcement change detected:', payload)

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
											`[RealtimeNotifications] Unhandled event type: ${payload.eventType}`
										)
								}
							} catch (error) {
								console.error(
									'[RealtimeNotifications] Error processing announcement notification:',
									error
								)
							}
						}
					)
					.subscribe(status => {
						console.log(`[RealtimeNotifications] Announcements subscription status:`, status)
					})

				// Store channel for cleanup
				setChannels(prev => [...prev, announcementsChannel])

				console.log('[RealtimeNotifications] All subscriptions active')
				setInitialized(true)
			} catch (error) {
				console.error('[RealtimeNotifications] Error setting up subscriptions:', error)
				Alert.alert('Realtime Error', `Failed to set up notifications: ${error}`)
			}
		}

		setupRealtimeListener()

		// Cleanup
		return () => {
			console.log('[RealtimeNotifications] Cleaning up subscriptions')
			channels.forEach(channel => {
				try {
					supabase.removeChannel(channel)
				} catch (e) {
					console.error('[RealtimeNotifications] Error removing channel:', e)
				}
			})
		}
	}, [user])

	// Handler for score inserts and updates
	const handleScoreInsertOrUpdate = async (
		payload: any,
		childNameMap: Record<string, string>,
		action: string
	) => {
		// Extract the data from the payload
		const scoreData = payload.new

		if (!scoreData) {
			console.error('[RealtimeNotifications] Invalid payload received')
			return
		}

		// Get student name
		const studentName = childNameMap[scoreData.student_id] || 'Your child'

		// Get lesson details for the notification
		const { data: lesson, error: lessonError } = await supabase
			.from('lessons')
			.select('lessonname, subjectid')
			.eq('id', scoreData.lesson_id)
			.single()

		if (lessonError || !lesson) {
			console.error('[RealtimeNotifications] Error fetching lesson details:', lessonError)
			return
		}

		// Get subject details
		const { data: subject, error: subjectError } = await supabase
			.from('subjects')
			.select('subjectname')
			.eq('id', lesson.subjectid)
			.single()

		const subjectName = subject?.subjectname || 'Unknown Subject'

		console.log('[RealtimeNotifications] Creating notification for score:', {
			score: scoreData.score,
			studentId: scoreData.student_id,
			studentName,
			subjectId: lesson.subjectid,
			subjectName,
			lessonName: lesson.lessonname,
			updated: scoreData.updated_at ? formatToLocalTime(scoreData.updated_at) : 'N/A',
		})

		// Create a database notification record
		await createScoreNotification(
			scoreData.score,
			scoreData.student_id,
			lesson.subjectid,
			lesson.lessonname
		)

		// Create notification title and message with time in user's timezone
		const title = `${action === 'updated' ? 'Updated' : 'New'} Grade for ${studentName}`

		// Format message including the timestamp in the user's timezone
		let message = `${studentName} received a score of ${scoreData.score} in ${subjectName} (${lesson.lessonname})`

		// Add update time if available
		if (scoreData.updated_at) {
			message += ` - ${formatRelativeTime(scoreData.updated_at)}`
		}

		// Show local notification with sound
		await sendLocalNotification(title, message, {
			studentId: scoreData.student_id,
			lessonId: scoreData.lesson_id,
			subjectId: lesson.subjectid,
			type: 'grade',
			updatedAt: scoreData.updated_at,
			action: action,
		})

		// Also show an alert if the app is in the foreground
		Alert.alert(title, message)
	}

	// Handler for score deletions
	const handleScoreDelete = async (payload: any, childNameMap: Record<string, string>) => {
		// For deletions, we have the old record in payload.old
		const deletedScore = payload.old

		if (!deletedScore) {
			console.error('[RealtimeNotifications] Invalid deletion payload received')
			return
		}

		// Get student name
		const studentName = childNameMap[deletedScore.student_id] || 'Your child'

		// Get lesson details
		const { data: lesson, error: lessonError } = await supabase
			.from('lessons')
			.select('lessonname, subjectid')
			.eq('id', deletedScore.lesson_id)
			.single()

		if (lessonError || !lesson) {
			console.error(
				'[RealtimeNotifications] Error fetching lesson details for deleted score:',
				lessonError
			)
			return
		}

		// Get subject details
		const { data: subject, error: subjectError } = await supabase
			.from('subjects')
			.select('subjectname')
			.eq('id', lesson.subjectid)
			.single()

		const subjectName = subject?.subjectname || 'Unknown Subject'

		// Create notification title and message
		const title = `Grade Removed for ${studentName}`
		const message = `A score of ${deletedScore.score} in ${subjectName} (${lesson.lessonname}) has been removed`

		// Show local notification
		await sendLocalNotification(title, message, {
			studentId: deletedScore.student_id,
			lessonId: deletedScore.lesson_id,
			subjectId: lesson.subjectid,
			type: 'grade',
			action: 'deleted',
		})

		// Also show alert
		Alert.alert(title, message)
	}

	// Handler for attendance inserts and updates
	const handleAttendanceInsertOrUpdate = async (
		payload: any,
		childNameMap: Record<string, string>,
		action: string
	) => {
		// Extract the data from the payload
		const attendanceData = payload.new

		if (!attendanceData) {
			console.error('[RealtimeNotifications] Invalid payload received')
			return
		}

		// Get student name from our map
		const studentName = childNameMap[attendanceData.student_id] || 'Your child'

		// Get lesson details
		const { data: lesson, error: lessonError } = await supabase
			.from('lessons')
			.select('lessonname, subjectid')
			.eq('id', attendanceData.lesson_id)
			.single()

		if (lessonError || !lesson) {
			console.error('[RealtimeNotifications] Error fetching lesson details:', lessonError)
			return
		}

		// Get subject details
		const { data: subject, error: subjectError } = await supabase
			.from('subjects')
			.select('subjectname')
			.eq('id', lesson.subjectid)
			.single()

		if (subjectError || !subject) {
			console.error('[RealtimeNotifications] Error fetching subject details:', subjectError)
			return
		}

		// Capitalize first letter of status
		const statusCapitalized =
			attendanceData.status.charAt(0).toUpperCase() + attendanceData.status.slice(1).toLowerCase()

		// Create notification title and message
		const title = `Attendance ${
			action === 'updated' ? 'Update' : 'Record'
		}: ${statusCapitalized} - ${studentName}`

		// Format message with time in user's timezone
		let message = `${studentName} was marked ${attendanceData.status.toLowerCase()} in ${
			subject.subjectname
		} (${lesson.lessonname})`

		// Add update time if available
		if (attendanceData.updated_at) {
			message += ` - ${formatRelativeTime(attendanceData.updated_at)}`
		}

		// Determine notification color based on status (for the UI feedback)
		let statusColor = '#F44336' // Default red for absent
		switch (attendanceData.status.toLowerCase()) {
			case 'present':
				statusColor = '#4CAF50' // Green
				break
			case 'late':
				statusColor = '#FF9800' // Orange
				break
			case 'excused':
				statusColor = '#2196F3' // Blue
				break
		}

		// Create a notification in the announcements table
		const { error: insertError } = await supabase.from('announcements').insert({
			title: `Attendance ${action === 'updated' ? 'Update' : 'Record'}: ${subject.subjectname}`,
			content: message,
			targetAudience: 'Parents',
			isImportant: attendanceData.status.toLowerCase() === 'absent',
			target_student_id: attendanceData.student_id,
			target_subject_id: lesson.subjectid,
		})

		if (insertError) {
			console.error('[RealtimeNotifications] Error creating attendance notification:', insertError)
		}

		// Show local notification with sound
		await sendLocalNotification(title, message, {
			studentId: attendanceData.student_id,
			lessonId: attendanceData.lesson_id,
			subjectId: lesson.subjectid,
			status: attendanceData.status,
			statusColor,
			type: 'attendance',
			updatedAt: attendanceData.updated_at,
			action: action,
		})

		// Also show an alert if the app is in the foreground
		Alert.alert(title, message)
	}

	// Handler for attendance deletions
	const handleAttendanceDelete = async (payload: any, childNameMap: Record<string, string>) => {
		// For deletions, we have the old record in payload.old
		const deletedAttendance = payload.old

		if (!deletedAttendance) {
			console.error('[RealtimeNotifications] Invalid deletion payload received')
			return
		}

		// Get student name
		const studentName = childNameMap[deletedAttendance.student_id] || 'Your child'

		// Get lesson details
		const { data: lesson, error: lessonError } = await supabase
			.from('lessons')
			.select('lessonname, subjectid')
			.eq('id', deletedAttendance.lesson_id)
			.single()

		if (lessonError || !lesson) {
			console.error(
				'[RealtimeNotifications] Error fetching lesson details for deleted attendance:',
				lessonError
			)
			return
		}

		// Get subject details
		const { data: subject, error: subjectError } = await supabase
			.from('subjects')
			.select('subjectname')
			.eq('id', lesson.subjectid)
			.single()

		if (subjectError || !subject) {
			console.error(
				'[RealtimeNotifications] Error fetching subject details for deleted attendance:',
				subjectError
			)
			return
		}

		// Create notification title and message
		const title = `Attendance Record Removed for ${studentName}`
		const message = `The attendance record (${deletedAttendance.status}) for ${subject.subjectname} (${lesson.lessonname}) has been removed`

		// Show local notification
		await sendLocalNotification(title, message, {
			studentId: deletedAttendance.student_id,
			lessonId: deletedAttendance.lesson_id,
			subjectId: lesson.subjectid,
			type: 'attendance',
			action: 'deleted',
		})

		// Also show alert
		Alert.alert(title, message)
	}

	// Handler for announcement inserts
	const handleAnnouncementInsert = async (payload: any) => {
		const announcementData = payload.new

		if (!announcementData) {
			console.error('[RealtimeNotifications] Invalid payload received')
			return
		}

		const title = announcementData.title || 'New Announcement'
		const message = announcementData.content || ''

		// Format creation time in user's timezone if available
		let formattedMessage = message
		if (announcementData.created_at) {
			formattedMessage += ` - Posted ${formatRelativeTime(announcementData.created_at)}`
		}

		// Show local notification with sound
		await sendLocalNotification(title, formattedMessage, {
			id: announcementData.id,
			isImportant: announcementData.isImportant,
			type: 'announcement',
			action: 'created',
			createdAt: announcementData.created_at,
		})

		// Also show an alert if the app is in the foreground
		Alert.alert(title, formattedMessage)
	}

	// Handler for announcement updates
	const handleAnnouncementUpdate = async (payload: any) => {
		const announcementData = payload.new

		if (!announcementData) {
			console.error('[RealtimeNotifications] Invalid payload received')
			return
		}

		const title = `Updated: ${announcementData.title || 'Announcement'}`
		const message = announcementData.content || ''

		// Format update time in user's timezone if available
		let formattedMessage = message
		if (announcementData.updated_at) {
			formattedMessage += ` - Updated ${formatRelativeTime(announcementData.updated_at)}`
		}

		// Show local notification with sound
		await sendLocalNotification(title, formattedMessage, {
			id: announcementData.id,
			isImportant: announcementData.isImportant,
			type: 'announcement',
			action: 'updated',
			updatedAt: announcementData.updated_at,
		})

		// Also show an alert if the app is in the foreground
		Alert.alert(title, formattedMessage)
	}

	// Handler for announcement deletions
	const handleAnnouncementDelete = async (payload: any) => {
		const deletedAnnouncement = payload.old

		if (!deletedAnnouncement) {
			console.error('[RealtimeNotifications] Invalid deletion payload received')
			return
		}

		const title = 'Announcement Removed'
		const message = `The announcement "${deletedAnnouncement.title}" has been removed`

		// Show local notification
		await sendLocalNotification(title, message, {
			id: deletedAnnouncement.id,
			type: 'announcement',
			action: 'deleted',
		})

		// Also show alert
		Alert.alert(title, message)
	}

	// This component doesn't render anything visible
	return null
}

export default RealtimeScoreNotifications
