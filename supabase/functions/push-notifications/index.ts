// Follow this setup guide to integrate the Deno runtime into your application:
// https://deno.land/manual/examples/deploy_supabase_deno

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface PushNotificationPayload {
	type: 'score' | 'attendance'
	recordId: string
	studentId: string
	tableSchema?: string
	tableName?: string
}

interface PushToken {
	token: string
	user_id: string
}

// Expo push notification API URL
const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send'

serve(async req => {
	try {
		// Create a Supabase client with the Auth context of the function
		const supabaseClient = createClient(
			// Supabase API URL - env var exported by default.
			Deno.env.get('SUPABASE_URL') ?? '',
			// Supabase API ANON KEY - env var exported by default.
			Deno.env.get('SUPABASE_ANON_KEY') ?? '',
			// Create client with Auth context of the user that called the function.
			{
				global: {
					headers: { Authorization: req.headers.get('Authorization')! },
				},
			}
		)

		// Get the payload from the request
		const payload: PushNotificationPayload = await req.json()

		// Verify required fields
		if (!payload.type || !payload.recordId || !payload.studentId) {
			return new Response(JSON.stringify({ error: 'Missing required fields' }), {
				headers: { 'Content-Type': 'application/json' },
				status: 400,
			})
		}

		console.log(`Processing ${payload.type} notification for student ${payload.studentId}`)

		// Get details about the event based on type
		let notificationData
		if (payload.type === 'score') {
			// Get score details
			const { data: score, error: scoreError } = await supabaseClient
				.from('scores')
				.select('*, students:student_id(name, id), subjects:subject_id(name)')
				.eq('id', payload.recordId)
				.single()

			if (scoreError || !score) {
				console.error('Error fetching score:', scoreError)
				return new Response(JSON.stringify({ error: 'Score not found' }), {
					headers: { 'Content-Type': 'application/json' },
					status: 404,
				})
			}

			notificationData = {
				title: `New Grade: ${score.subjects.name}`,
				body: `${score.students.name} received a grade of ${score.score}`,
				data: { type: 'score', scoreId: payload.recordId, studentId: payload.studentId },
			}
		} else if (payload.type === 'attendance') {
			// Get attendance details
			const { data: attendance, error: attendanceError } = await supabaseClient
				.from('attendance')
				.select('*, students:student_id(name, id), classes:class_id(name)')
				.eq('id', payload.recordId)
				.single()

			if (attendanceError || !attendance) {
				console.error('Error fetching attendance:', attendanceError)
				return new Response(JSON.stringify({ error: 'Attendance record not found' }), {
					headers: { 'Content-Type': 'application/json' },
					status: 404,
				})
			}

			notificationData = {
				title: `Attendance Update: ${attendance.classes.name}`,
				body: `${attendance.students.name} was marked ${attendance.status}`,
				data: { type: 'attendance', attendanceId: payload.recordId, studentId: payload.studentId },
			}
		} else {
			return new Response(JSON.stringify({ error: 'Invalid notification type' }), {
				headers: { 'Content-Type': 'application/json' },
				status: 400,
			})
		}

		// Find the parents of this student
		const { data: parents, error: parentsError } = await supabaseClient
			.from('parent_student')
			.select('parent_id')
			.eq('student_id', payload.studentId)

		if (parentsError) {
			console.error('Error fetching parents:', parentsError)
			return new Response(JSON.stringify({ error: 'Error fetching parents' }), {
				headers: { 'Content-Type': 'application/json' },
				status: 500,
			})
		}

		if (!parents || parents.length === 0) {
			console.log(`No parents found for student ${payload.studentId}`)
			return new Response(JSON.stringify({ message: 'No parents to notify' }), {
				headers: { 'Content-Type': 'application/json' },
				status: 200,
			})
		}

		// Get parent IDs
		const parentIds = parents.map(p => p.parent_id)
		console.log(`Found ${parentIds.length} parents to notify`)

		// Get push tokens for these parents
		const { data: tokens, error: tokensError } = await supabaseClient
			.from('push_tokens')
			.select('token, user_id')
			.in('user_id', parentIds)

		if (tokensError) {
			console.error('Error fetching push tokens:', tokensError)
			return new Response(JSON.stringify({ error: 'Error fetching push tokens' }), {
				headers: { 'Content-Type': 'application/json' },
				status: 500,
			})
		}

		if (!tokens || tokens.length === 0) {
			console.log('No push tokens found for parents')
			return new Response(JSON.stringify({ message: 'No push tokens found' }), {
				headers: { 'Content-Type': 'application/json' },
				status: 200,
			})
		}

		console.log(`Found ${tokens.length} push tokens to send notifications to`)

		// Send push notifications through Expo API
		const messages = tokens.map((tokenData: PushToken) => ({
			to: tokenData.token,
			sound: 'default',
			title: notificationData.title,
			body: notificationData.body,
			data: notificationData.data,
		}))

		// Send notifications in batches if needed (Expo has a limit of 100 per request)
		const chunkSize = 100
		const results = []

		for (let i = 0; i < messages.length; i += chunkSize) {
			const chunk = messages.slice(i, i + chunkSize)

			const response = await fetch(EXPO_PUSH_API, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(chunk),
			})

			const result = await response.json()
			results.push(result)

			console.log(`Sent ${chunk.length} notifications, batch ${i / chunkSize + 1}`)
		}

		// Return success response with results
		return new Response(JSON.stringify({ success: true, results }), {
			headers: { 'Content-Type': 'application/json' },
			status: 200,
		})
	} catch (error) {
		console.error('Error processing push notification:', error)

		return new Response(JSON.stringify({ error: error.message }), {
			headers: { 'Content-Type': 'application/json' },
			status: 500,
		})
	}
})
