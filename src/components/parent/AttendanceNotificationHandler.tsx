import { RealtimeChannel } from '@supabase/supabase-js'
import React, { useEffect, useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { formatRelativeTime } from '../../utils/dateUtils'
import { sendLocalNotification } from '../../utils/notificationSetup'
import { supabase } from '../../utils/supabase'

interface AttendanceNotificationHandlerProps {
	onNewNotification?: (notification: any) => void
}

// Fixed channel name for attendance
const ATTENDANCE_CHANNEL = 'attendance-channel-fixed'

/**
 * Component that listens specifically for attendance changes in the database
 */
const AttendanceNotificationHandler: React.FC<AttendanceNotificationHandlerProps> = ({
	onNewNotification,
}) => {
	const [channel, setChannel] = useState<RealtimeChannel | null>(null)
	const { user } = useAuthStore()

	useEffect(() => {
		if (!user || user.role !== 'Parent') return

		const setupAttendanceListener = async () => {
			try {
				console.log('[AttendanceNotifications] Setting up attendance listener')

				// Clean up existing channel if any
				if (channel) {
					console.log('[AttendanceNotifications] Cleaning up existing channel')
					supabase.removeChannel(channel)
					setChannel(null)
				}

				// Get the parent's children
				const { data: children, error: childrenError } = await supabase
					.from('users')
					.select('id, firstName, lastName')
					.eq('parent_id', user.id)
					.eq('role', 'Student')

				if (childrenError) {
					console.error('[AttendanceNotifications] Error fetching children:', childrenError)
					return
				}

				if (!children || children.length === 0) {
					console.log('[AttendanceNotifications] No children found for this parent')
					return
				}

				// Get array of child IDs
				const childIds = children.map(child => child.id)
				console.log('[AttendanceNotifications] Found children:', childIds)

				// Create a map of child IDs to names for better notifications
				const childNameMap = children.reduce((acc, child) => {
					acc[child.id] = `${child.firstName} ${child.lastName}`
					return acc
				}, {} as Record<string, string>)

				// Create a channel for attendance with specific filter
				const attendanceChannel = supabase
					.channel(ATTENDANCE_CHANNEL)
					.on(
						'postgres_changes',
						{
							event: '*', // Listen for all events (INSERT, UPDATE, DELETE)
							schema: 'public',
							table: 'attendance',
							filter: `student_id=in.(${childIds.join(',')})`, // No limit, fetch all attendance records
						},
						async payload => {
							console.log('[AttendanceNotifications] Attendance change detected:', payload)

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
											`[AttendanceNotifications] Unhandled event type: ${payload.eventType}`
										)
								}
							} catch (error) {
								console.error(
									'[AttendanceNotifications] Error processing attendance notification:',
									error
								)
							}
						}
					)
					.subscribe(status => {
						console.log(`[AttendanceNotifications] Subscription status:`, status)
					})

				// Store channel for cleanup
				setChannel(attendanceChannel)
				console.log('[AttendanceNotifications] Listener active')
			} catch (error) {
				console.error('[AttendanceNotifications] Error setting up listener:', error)
			}
		}

		setupAttendanceListener()

		// Cleanup on unmount
		return () => {
			console.log('[AttendanceNotifications] Cleaning up subscription')
			if (channel) {
				try {
					supabase.removeChannel(channel)
				} catch (e) {
					console.error('[AttendanceNotifications] Error removing channel:', e)
				}
			}
		}
	}, [user])

	// Handler for attendance inserts and updates
	const handleAttendanceInsertOrUpdate = async (
		payload: any,
		childNameMap: Record<string, string>,
		action: string
	) => {
		try {
			// Extract the data from the payload
			const attendanceData = payload.new

			if (!attendanceData) {
				console.error('[AttendanceNotifications] Invalid payload received')
				return
			}

			// Get student name
			const studentName = childNameMap[attendanceData.student_id] || 'Your child'

			// Get lesson details
			const { data: lesson, error: lessonError } = await supabase
				.from('lessons')
				.select('lessonname, subjectid')
				.eq('id', attendanceData.lesson_id)
				.single()

			if (lessonError || !lesson) {
				console.error('[AttendanceNotifications] Error fetching lesson details:', lessonError)
				return
			}

			// Get subject details
			const { data: subject, error: subjectError } = await supabase
				.from('subjects')
				.select('subjectname')
				.eq('id', lesson.subjectid)
				.single()

			if (subjectError || !subject) {
				console.error('[AttendanceNotifications] Error fetching subject details:', subjectError)
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

			// Add update time if available (checking only noted_at since updated_at doesn't exist)
			const timeField = attendanceData.noted_at
			if (timeField) {
				message += ` - ${formatRelativeTime(timeField)}`
			}

			// Determine notification color based on status
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
				console.error(
					'[AttendanceNotifications] Error creating attendance notification:',
					insertError
				)
			}

			// Notification data
			const notificationData = {
				id: `attendance-${attendanceData.id}`,
				title,
				message,
				date: attendanceData.noted_at || new Date().toISOString(), // Only use noted_at, updated_at doesn't exist
				type: 'attendance',
				read: false,
				relatedStudentId: attendanceData.student_id,
				relatedSubjectId: lesson.subjectid,
				studentName,
				subjectName: subject.subjectname,
				status: attendanceData.status,
				statusColor,
				lessonName: lesson.lessonname,
				action,
			}

			// Show local notification
			await sendLocalNotification(title, message, {
				...notificationData,
				data: attendanceData,
			})

			// Call callback if provided
			if (onNewNotification) {
				onNewNotification(notificationData)
			}
		} catch (error) {
			console.error('[AttendanceNotifications] Error processing notification:', error)
		}
	}

	// Handler for attendance deletions
	const handleAttendanceDelete = async (payload: any, childNameMap: Record<string, string>) => {
		try {
			// For deletions, we have the old record in payload.old
			const deletedAttendance = payload.old

			if (!deletedAttendance) {
				console.error('[AttendanceNotifications] Invalid deletion payload received')
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
					'[AttendanceNotifications] Error fetching lesson details for deleted attendance:',
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
					'[AttendanceNotifications] Error fetching subject details for deleted attendance:',
					subjectError
				)
				return
			}

			// Create notification title and message
			const title = `Attendance Record Removed for ${studentName}`
			const message = `The attendance record (${deletedAttendance.status}) for ${subject.subjectname} (${lesson.lessonname}) has been removed`

			// Notification data
			const notificationData = {
				id: `attendance-deleted-${deletedAttendance.id}`,
				title,
				message,
				date: new Date().toISOString(),
				type: 'attendance',
				read: false,
				relatedStudentId: deletedAttendance.student_id,
				relatedSubjectId: lesson.subjectid,
				studentName,
				subjectName: subject.subjectname,
				status: deletedAttendance.status,
				lessonName: lesson.lessonname,
				action: 'deleted',
			}

			// Show local notification
			await sendLocalNotification(title, message, {
				...notificationData,
				data: deletedAttendance,
			})

			// Call callback if provided
			if (onNewNotification) {
				onNewNotification(notificationData)
			}
		} catch (error) {
			console.error('[AttendanceNotifications] Error processing deletion:', error)
		}
	}

	// This component doesn't render anything visible
	return null
}

export default AttendanceNotificationHandler
