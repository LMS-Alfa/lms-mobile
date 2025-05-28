import { RealtimeChannel } from '@supabase/supabase-js'
import * as Notifications from 'expo-notifications'
import React, { useEffect, useState } from 'react'
import { Alert } from 'react-native'
import { useAuthStore } from '../../store/authStore'
import { useNotificationStore } from '../../store/notificationStore'
import { eventEmitter, EVENTS } from '../../utils/eventEmitter'
import { supabase } from '../../utils/supabase'

// Types for real-time payloads
interface ScoreRecord {
	id: string
	student_id: string
	lesson_id: string
	score: number
	[key: string]: any
}

interface AttendanceRecord {
	id: string
	student_id: string
	date: string
	status: string
	[key: string]: any
}

interface AnnouncementRecord {
	id: number
	created_at: string
	title: string
	content: string
	targetAudience: string
	isImportant: boolean
	created_by_name: string
	[key: string]: any
}

type ScorePayload = {
	schema: string
	table: string
	commit_timestamp: string
	eventType: string
	new: ScoreRecord
	old: ScoreRecord | null
	errors: any | null
}

type AttendancePayload = {
	schema: string
	table: string
	commit_timestamp: string
	eventType: string
	new: AttendanceRecord
	old: AttendanceRecord | null
	errors: any | null
}

type AnnouncementPayload = {
	schema: string
	table: string
	commit_timestamp: string
	eventType: string
	new: AnnouncementRecord
	old: AnnouncementRecord | null
	errors: any | null
}

/**
 * Unified component that provides real-time notifications for both scores and attendance
 * for parent users. Optimized to use a single subscription with proper cleanup.
 */
const RealtimeNotifications: React.FC = () => {
	const { user } = useAuthStore()
	const { addNotification } = useNotificationStore()
	const [scoreChannel, setScoreChannel] = useState<RealtimeChannel | null>(null)
	const [attendanceChannel, setAttendanceChannel] = useState<RealtimeChannel | null>(null)
	const [announcementChannel, setAnnouncementChannel] = useState<RealtimeChannel | null>(null)

	// Fetch existing announcements on component mount
	useEffect(() => {
		if (user && user.role === 'parent') {
			fetchExistingAnnouncements()
		}
	}, [user])

	// Fetch existing announcements that target parents or all users
	const fetchExistingAnnouncements = async () => {
		try {
			console.log('[RealtimeNotifications] Fetching existing announcements')

			const { data, error } = await supabase
				.from('announcements')
				.select('*')
				.or('targetAudience.eq.Parent,targetAudience.eq.All')
				.order('created_at', { ascending: false })
				.limit(10)

			if (error) {
				console.error('[RealtimeNotifications] Error fetching announcements:', error)
				return
			}

			console.log(`[RealtimeNotifications] Found ${data.length} announcements`)

			// Convert each announcement to a notification
			data.forEach(announcement => {
				const { id, title, content, created_at, targetAudience, isImportant, created_by_name } = announcement

				// Add to notification store
				addNotification({
					title: title || 'New Announcement',
					message: content || '',
					type: 'announcement',
					data: {
						id,
						targetAudience,
						isImportant,
						createdBy: created_by_name,
						createdAt: created_at
					}
				})
			})
		} catch (error) {
			console.error('[RealtimeNotifications] Error in fetchExistingAnnouncements:', error)
		}
	}

	// Set up real-time listeners for parent notifications
	useEffect(() => {
		// Only set up if user is logged in and is a parent
		if (!user || user.role !== 'parent') {
			return
		}

		console.log('[RealtimeNotifications] Setting up realtime listeners for parent:', user.id)

		// Get the parent's students
		const getParentStudents = async () => {
			// Query the users table for students where parent_id equals current user's id
			console.log('[RealtimeNotifications] Fetching students for parent:', user.id)

			// First, let's check if there are any users with this parent_id to understand the structure
			const { data: allChildren, error: allError } = await supabase
				.from('users')
				.select('id, role, parent_id')
				.eq('parent_id', user.id)

			if (allError) {
				console.error('[RealtimeNotifications] Error fetching all children:', allError)
				return []
			}

			console.log('[RealtimeNotifications] All users with parent_id:', allChildren)

			// If we found children, let's use them directly without role filtering
			if (allChildren && allChildren.length > 0) {
				console.log('[RealtimeNotifications] Using all children from parent_id without role filtering')
				return allChildren.map(c => c.id)
			}

			// If we didn't find any direct children, let's try checking the students table instead
			const { data: students, error: studentsError } = await supabase
				.from('students')
				.select('id')
				.eq('parent_id', user.id)

			if (studentsError) {
				console.error('[RealtimeNotifications] Error fetching from students table:', studentsError)
				return []
			}

			if (students && students.length > 0) {
				console.log('[RealtimeNotifications] Found students in students table:', students)
				return students.map(s => s.id)
			}

			console.log('[RealtimeNotifications] No students found through any method')
			return []
		}

		// Set up the channels
		const setupRealtimeChannels = async () => {
			try {
				// Set up announcement channel for Parent and All audiences
				const announcementChannelInstance = supabase.channel('parent-announcements-' + user.id)
				announcementChannelInstance
					.on(
						'postgres_changes',
						{
							event: '*',
							schema: 'public',
							table: 'announcements',
							filter: 'targetAudience=in.(Parent,All)',
						},
						(payload: AnnouncementPayload) => {
							handleAnnouncementChange(payload)
						}
					)
					.subscribe((status, err) => {
						if (status === 'SUBSCRIBED') {
							console.log('[RealtimeNotifications] Subscribed to announcement changes')
						} else if (err) {
							console.error(
								'[RealtimeNotifications] Error subscribing to announcement changes:',
								err
							)
						} else {
							console.log('[RealtimeNotifications] Announcement subscription status:', status)
						}
					})
				setAnnouncementChannel(announcementChannelInstance)

				const studentIds = await getParentStudents()

				if (!studentIds || studentIds.length === 0) {
					console.log('[RealtimeNotifications] No students found for parent - skipping realtime setup')
					return
				}

				console.log(
					'[RealtimeNotifications] Setting up realtime for students:',
					studentIds.join(', ')
				)

				// Build the filter clause for the query
				const filterClause =
					studentIds.length === 1
						? `student_id=eq.${studentIds[0]}`
						: `student_id=in.(${studentIds.join(',')})`

				console.log('[RealtimeNotifications] Using filter clause:', filterClause)

				// Set up score channel
				const scoreChannelInstance = supabase.channel('parent-scores-' + user.id)
				scoreChannelInstance
					.on(
						'postgres_changes',
						{
							event: '*',
							schema: 'public',
							table: 'scores',
							filter: filterClause,
						},
						(payload: ScorePayload) => {
							handleScoreChange(payload, studentIds)
						}
					)
					.subscribe((status, err) => {
						if (status === 'SUBSCRIBED') {
							console.log('[RealtimeNotifications] Subscribed to score changes')
						} else if (err) {
							console.error(
								'[RealtimeNotifications] Error subscribing to score changes:',
								err
							)
						} else {
							console.log('[RealtimeNotifications] Score subscription status:', status)
						}
					})
				setScoreChannel(scoreChannelInstance)

				// Set up attendance channel
				const attendanceChannelInstance = supabase.channel('parent-attendance-' + user.id)
				attendanceChannelInstance
					.on(
						'postgres_changes',
						{
							event: '*',
							schema: 'public',
							table: 'attendance',
							filter: filterClause,
						},
						(payload: AttendancePayload) => {
							handleAttendanceChange(payload, studentIds)
						}
					)
					.subscribe((status, err) => {
						if (status === 'SUBSCRIBED') {
							console.log('[RealtimeNotifications] Subscribed to attendance changes')
						} else if (err) {
							console.error(
								'[RealtimeNotifications] Error subscribing to attendance changes:',
								err
							)
						} else {
							console.log('[RealtimeNotifications] Attendance subscription status:', status)
						}
					})
				setAttendanceChannel(attendanceChannelInstance)
			} catch (error) {
				console.error('[RealtimeNotifications] Error setting up realtime channels:', error)
			}
		}

		setupRealtimeChannels()

		// Cleanup function
		return () => {
			if (scoreChannel) {
				console.log('[RealtimeNotifications] Unsubscribing from score channel')
				scoreChannel.unsubscribe()
			}
			if (attendanceChannel) {
				console.log('[RealtimeNotifications] Unsubscribing from attendance channel')
				attendanceChannel.unsubscribe()
			}
			if (announcementChannel) {
				console.log('[RealtimeNotifications] Unsubscribing from announcement channel')
				announcementChannel.unsubscribe()
			}
		}
	}, [user])

	// Handle announcement changes
	const handleAnnouncementChange = async (payload: AnnouncementPayload) => {
		try {
			// We only care about inserts and updates
			if (payload.eventType !== 'INSERT' && payload.eventType !== 'UPDATE') {
				return
			}

			console.log(
				`[RealtimeNotifications] Announcement ${payload.eventType.toLowerCase()} detected:`,
				payload.new
			)

			const { id, title, content, targetAudience, isImportant, created_by_name } = payload.new

			// Prepare notification title and message
			const notificationTitle = title || 'New Announcement'
			const notificationMessage = content || ''

			// Send notification
			sendNotification(notificationTitle, notificationMessage, {
				type: 'announcement',
				id,
				targetAudience,
				isImportant,
				createdBy: created_by_name
			})

			// Emit event to refresh UI
			eventEmitter.emit(EVENTS.DATA_REFRESHED, {
				type: 'announcement',
				id
			})
		} catch (error) {
			console.error('[RealtimeNotifications] Error handling announcement change:', error)
		}
	}

	// Handle score changes
	const handleScoreChange = async (payload: ScorePayload, studentIds: string[]) => {
		try {
			// We only care about inserts and updates
			if (payload.eventType !== 'INSERT' && payload.eventType !== 'UPDATE') {
				return
			}

			// Check if this score is for one of our students
			if (!studentIds.includes(payload.new.student_id)) {
				return
			}

			console.log(
				`[RealtimeNotifications] Score ${payload.eventType.toLowerCase()} detected:`,
				payload.new
			)

			// Get student and lesson details for a better notification
			const [studentResponse, lessonResponse] = await Promise.all([
				supabase
					.from('students')
					.select('first_name, last_name')
					.eq('id', payload.new.student_id)
					.single(),
				supabase
					.from('lessons')
					.select('title, subject_id')
					.eq('id', payload.new.lesson_id)
					.single(),
			])

			if (studentResponse.error || lessonResponse.error) {
				console.error('[RealtimeNotifications] Error fetching details:', {
					studentError: studentResponse.error,
					lessonError: lessonResponse.error,
				})
				return
			}

			const student = studentResponse.data
			const lesson = lessonResponse.data

			// Get subject name
			const { data: subject, error: subjectError } = await supabase
				.from('subjects')
				.select('name')
				.eq('id', lesson.subject_id)
				.single()

			if (subjectError) {
				console.error('[RealtimeNotifications] Error fetching subject:', subjectError)
				return
			}

			// Create appropriate notification
			const studentName = `${student.first_name} ${student.last_name}`
			const title = `New Score for ${studentName}`
			const message = `${studentName} received a score of ${payload.new.score} in ${subject.name} - ${lesson.title}`

			// Send notification
			sendNotification(title, message, {
				type: 'grade',
				studentId: payload.new.student_id,
				lessonId: payload.new.lesson_id,
				subjectId: lesson.subject_id,
			})

			// Emit event to refresh UI
			eventEmitter.emit(EVENTS.SCORE_UPDATED, {
				studentId: payload.new.student_id,
				lessonId: payload.new.lesson_id,
			})
		} catch (error) {
			console.error('[RealtimeNotifications] Error handling score change:', error)
		}
	}

	// Handle attendance changes
	const handleAttendanceChange = async (payload: AttendancePayload, studentIds: string[]) => {
		try {
			// We only care about inserts and updates
			if (payload.eventType !== 'INSERT' && payload.eventType !== 'UPDATE') {
				return
			}

			// Check if this attendance record is for one of our students
			if (!studentIds.includes(payload.new.student_id)) {
				return
			}

			console.log(
				`[RealtimeNotifications] Attendance ${payload.eventType.toLowerCase()} detected:`,
				payload.new
			)

			// Get student details for a better notification
			const { data: student, error } = await supabase
				.from('students')
				.select('first_name, last_name')
				.eq('id', payload.new.student_id)
				.single()

			if (error) {
				console.error('[RealtimeNotifications] Error fetching student:', error)
				return
			}

			// Format date
			const formattedDate = new Date(payload.new.date).toLocaleDateString()

			// Create appropriate notification
			const studentName = `${student.first_name} ${student.last_name}`
			const statusText =
				payload.new.status === 'present'
					? 'Present'
					: payload.new.status === 'absent'
					? 'Absent'
					: payload.new.status === 'late'
					? 'Late'
					: payload.new.status
			const title = `Attendance Updated for ${studentName}`
			const message = `${studentName} was marked ${statusText} on ${formattedDate}`

			// Send notification
			sendNotification(title, message, {
				type: 'attendance',
				studentId: payload.new.student_id,
				date: payload.new.date,
				status: payload.new.status,
			})

			// Emit event to refresh UI
			eventEmitter.emit(EVENTS.ATTENDANCE_UPDATED, {
				studentId: payload.new.student_id,
				date: payload.new.date,
			})
		} catch (error) {
			console.error('[RealtimeNotifications] Error handling attendance change:', error)
		}
	}

	// Helper function to send notifications
	const sendNotification = async (title: string, message: string, data: any = {}) => {
		try {
			// Show an alert if app is in foreground
			Alert.alert(title, message)

			// Send local notification using Expo
			await Notifications.scheduleNotificationAsync({
				content: {
					title,
					body: message,
					data,
					sound: 'default',
				},
				trigger: null, // null means show immediately
			})

			// Store in notification store
			addNotification({
				title,
				message,
				type: data.type || 'general',
				data,
			})

			// Also emit an event for other components that might be listening
			eventEmitter.emit(EVENTS.DATA_REFRESHED, {
				type: data.type || 'general',
				title,
				message,
				data,
			})
		} catch (error) {
			console.error('[RealtimeNotifications] Error sending notification:', error)
			// At least show the alert if notification fails
			Alert.alert(title, message)
		}
	}

	// This is an invisible component that just sets up the listeners
	return null
}

export default RealtimeNotifications
