import { RealtimeChannel } from '@supabase/supabase-js'
import React, { useEffect, useState } from 'react'
import { createScoreNotification } from '../../services/parentSupabaseService'
import { useAuthStore } from '../../store/authStore'
import { formatRelativeTime } from '../../utils/dateUtils'
import { sendLocalNotification } from '../../utils/notificationSetup'
import { supabase } from '../../utils/supabase'

interface ScoreNotificationHandlerProps {
	onNewNotification?: (notification: any) => void
}

// Fixed channel name for scores
const SCORES_CHANNEL = 'scores-channel-fixed'

/**
 * Component that listens specifically for score changes in the database
 */
const ScoreNotificationHandler: React.FC<ScoreNotificationHandlerProps> = ({
	onNewNotification,
}) => {
	const [channel, setChannel] = useState<RealtimeChannel | null>(null)
	const { user } = useAuthStore()

	useEffect(() => {
		if (!user || user.role !== 'Parent') return

		const setupScoreListener = async () => {
			try {
				console.log('[ScoreNotifications] Setting up score listener')

				// Clean up existing channel if any
				if (channel) {
					console.log('[ScoreNotifications] Cleaning up existing channel')
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
					console.error('[ScoreNotifications] Error fetching children:', childrenError)
					return
				}

				if (!children || children.length === 0) {
					console.log('[ScoreNotifications] No children found for this parent')
					return
				}

				// Get array of child IDs
				const childIds = children.map(child => child.id)
				console.log('[ScoreNotifications] Found children:', childIds)

				// Create a map of child IDs to names for better notifications
				const childNameMap = children.reduce((acc, child) => {
					acc[child.id] = `${child.firstName} ${child.lastName}`
					return acc
				}, {} as Record<string, string>)

				// Create a channel for scores with specific filter
				const scoresChannel = supabase
					.channel(SCORES_CHANNEL)
					.on(
						'postgres_changes',
						{
							event: '*', // Listen for all events (INSERT, UPDATE, DELETE)
							schema: 'public',
							table: 'scores',
							filter: `student_id=in.(${childIds.join(',')})`, // No limit on scores, fetch all
						},
						async payload => {
							console.log('[ScoreNotifications] Score change detected:', payload)

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
										console.log(`[ScoreNotifications] Unhandled event type: ${payload.eventType}`)
								}
							} catch (error) {
								console.error('[ScoreNotifications] Error processing score notification:', error)
							}
						}
					)
					.subscribe(status => {
						console.log(`[ScoreNotifications] Subscription status:`, status)
					})

				// Store channel for cleanup
				setChannel(scoresChannel)
				console.log('[ScoreNotifications] Listener active')
			} catch (error) {
				console.error('[ScoreNotifications] Error setting up listener:', error)
			}
		}

		setupScoreListener()

		// Cleanup on unmount
		return () => {
			console.log('[ScoreNotifications] Cleaning up subscription')
			if (channel) {
				try {
					supabase.removeChannel(channel)
				} catch (e) {
					console.error('[ScoreNotifications] Error removing channel:', e)
				}
			}
		}
	}, [user])

	// Handler for score inserts and updates
	const handleScoreInsertOrUpdate = async (
		payload: any,
		childNameMap: Record<string, string>,
		action: string
	) => {
		try {
			// Extract the data from the payload
			const scoreData = payload.new

			if (!scoreData) {
				console.error('[ScoreNotifications] Invalid payload received')
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
				console.error('[ScoreNotifications] Error fetching lesson details:', lessonError)
				return
			}

			// Get subject details
			const { data: subject, error: subjectError } = await supabase
				.from('subjects')
				.select('subjectname')
				.eq('id', lesson.subjectid)
				.single()

			const subjectName = subject?.subjectname || 'Unknown Subject'

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

			// Notification data
			const notificationData = {
				id: `score-${scoreData.id}`,
				title,
				message,
				date: scoreData.updated_at || new Date().toISOString(), // Prioritize updated_at
				type: 'grade',
				read: false,
				relatedStudentId: scoreData.student_id,
				relatedSubjectId: lesson.subjectid,
				studentName,
				subjectName,
				score: scoreData.score,
				lessonName: lesson.lessonname,
				action,
			}

			// Show local notification
			await sendLocalNotification(title, message, {
				...notificationData,
				data: scoreData,
			})

			// Call callback if provided
			if (onNewNotification) {
				onNewNotification(notificationData)
			}
		} catch (error) {
			console.error('[ScoreNotifications] Error processing notification:', error)
		}
	}

	// Handler for score deletions
	const handleScoreDelete = async (payload: any, childNameMap: Record<string, string>) => {
		try {
			// For deletions, we have the old record in payload.old
			const deletedScore = payload.old

			if (!deletedScore) {
				console.error('[ScoreNotifications] Invalid deletion payload received')
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
					'[ScoreNotifications] Error fetching lesson details for deleted score:',
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

			// Notification data
			const notificationData = {
				id: `score-deleted-${deletedScore.id}`,
				title,
				message,
				date: new Date().toISOString(),
				type: 'grade',
				read: false,
				relatedStudentId: deletedScore.student_id,
				relatedSubjectId: lesson.subjectid,
				studentName,
				subjectName,
				score: deletedScore.score,
				lessonName: lesson.lessonname,
				action: 'deleted',
			}

			// Show local notification
			await sendLocalNotification(title, message, {
				...notificationData,
				data: deletedScore,
			})

			// Call callback if provided
			if (onNewNotification) {
				onNewNotification(notificationData)
			}
		} catch (error) {
			console.error('[ScoreNotifications] Error processing deletion:', error)
		}
	}

	// This component doesn't render anything visible
	return null
}

export default ScoreNotificationHandler
