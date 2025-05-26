import React, { useEffect, useState } from 'react'
import { Alert } from 'react-native'
import { createScoreNotification } from '../../services/parentSupabaseService'
import { useAuthStore } from '../../store/authStore'
import { supabase } from '../../utils/supabase'

interface ScoreNotificationProps {
	// Optional props can be added here
}

const RealtimeScoreNotifications: React.FC<ScoreNotificationProps> = () => {
	const [initialized, setInitialized] = useState(false)
	const { user } = useAuthStore()

	useEffect(() => {
		if (!user || user.role !== 'Parent') return

		let channels: any[] = []

		const setupRealtimeListener = async () => {
			try {
				console.log('[RealtimeScoreNotifications] Setting up subscription for scores')

				// Get the parent's children
				const { data: children, error: childrenError } = await supabase
					.from('users')
					.select('id')
					.eq('parent_id', user.id)
					.eq('role', 'Student')

				if (childrenError) {
					console.error('[RealtimeScoreNotifications] Error fetching children:', childrenError)
					return
				}

				if (!children || children.length === 0) {
					console.log('[RealtimeScoreNotifications] No children found for this parent')
					return
				}

				// Get array of child IDs
				const childIds = children.map(child => child.id)
				console.log('[RealtimeScoreNotifications] Found children:', childIds)

				// Subscribe to all score changes without filtering
				const allScoresChannel = supabase
					.channel('all-scores-channel')
					.on(
						'postgres_changes',
						{
							event: 'INSERT',
							schema: 'public',
							table: 'scores',
						},
						payload => {
							console.log('[RealtimeScoreNotifications] ANY score detected:', payload)

							// Check if this score is for one of the parent's children
							const studentId = payload.new?.student_id
							if (studentId && childIds.includes(studentId)) {
								// Show alert for score insert only for the parent's children
								Alert.alert(
									'New Score Added',
									`A new score of ${payload.new.score} has been recorded.`
								)
							}
						}
					)
					.subscribe(status => {
						console.log(`[RealtimeScoreNotifications] All scores subscription status:`, status)
						// Don't show alert for subscription status
					})

				channels.push(allScoresChannel)

				// Create individual subscriptions for each child
				for (const childId of childIds) {
					const channelName = `scores-channel-${childId}`
					console.log(
						`[RealtimeScoreNotifications] Creating channel ${channelName} for child ${childId}`
					)

					// For each child, try with precise eq filter
					const childChannel = supabase
						.channel(channelName)
						.on(
							'postgres_changes',
							{
								event: 'INSERT',
								schema: 'public',
								table: 'scores',
								filter: `student_id=eq.${childId}`,
							},
							async payload => {
								console.log(
									`[RealtimeScoreNotifications] New score detected for child ${childId}:`,
									payload
								)

								try {
									// Extract the data from the payload
									const newScore = payload.new

									if (!newScore) {
										console.error('[RealtimeScoreNotifications] Invalid payload received')
										return
									}

									// Get lesson details for the notification
									const { data: lesson, error: lessonError } = await supabase
										.from('lessons')
										.select('lessonname, subjectid')
										.eq('id', newScore.lesson_id)
										.single()

									if (lessonError || !lesson) {
										console.error(
											'[RealtimeScoreNotifications] Error fetching lesson details:',
											lessonError
										)
										return
									}

									console.log('[RealtimeScoreNotifications] Creating notification for score:', {
										score: newScore.score,
										studentId: newScore.student_id,
										subjectId: lesson.subjectid,
										lessonName: lesson.lessonname,
									})

									// Create a notification for this score
									await createScoreNotification(
										newScore.score,
										newScore.student_id,
										lesson.subjectid,
										lesson.lessonname
									)

									// Only show success alert if notification is created
									Alert.alert(
										'New Grade Notification',
										`Notification created for score ${newScore.score} in ${lesson.lessonname}`
									)
								} catch (error) {
									console.error(
										'[RealtimeScoreNotifications] Error processing score notification:',
										error
									)
								}
							}
						)
						.subscribe(status => {
							console.log(
								`[RealtimeScoreNotifications] Subscription status for ${channelName}:`,
								status
							)
						})

					channels.push(childChannel)
				}

				console.log('[RealtimeScoreNotifications] All subscriptions active')
				setInitialized(true)
			} catch (error) {
				console.error('[RealtimeScoreNotifications] Error setting up subscription:', error)
				Alert.alert('Realtime Error', `Failed to set up score notifications: ${error}`)
			}
		}

		setupRealtimeListener()

		// Cleanup
		return () => {
			console.log('[RealtimeScoreNotifications] Cleaning up subscriptions')
			channels.forEach(channel => {
				try {
					supabase.removeChannel(channel)
				} catch (e) {
					console.error('[RealtimeScoreNotifications] Error removing channel:', e)
				}
			})
		}
	}, [user])

	// This component doesn't render anything visible
	return null
}

export default RealtimeScoreNotifications
