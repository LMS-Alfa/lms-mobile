import { handleSupabaseError, supabase } from '../utils/supabase'

// Assignment interfaces
export interface Assignment {
	id: string // Changed to string since it's a UUID
	title: string
	instructions: string | null
	duedate: string | null
	classid: string | null // Changed to string since it's a UUID
	createdby: string | null // Changed to string since it's a UUID
	createdat: string
	quarter_id: string | null // Changed to string since it's a UUID
	file_url: any[] | null // Array of file URLs
	subject_id: string | null // Changed to string since it's a UUID
	status: 'not_started' | 'in_progress' | 'completed' | 'overdue'
	maxscore: number | null
	subject?: {
		id: string
		subjectname: string
		code: string
	}
	class?: {
		id: string
		classname: string
	}
	creator?: {
		id: string
		firstName: string
		lastName: string
	}
	submissions?: Array<{
		id: number
		assignmentid: string
		studentid: string
		submittedat: string
		grade: number | null
		feedback: string | null
		file_urls: string[] | null
	}>
}

export interface AssignmentSubmission {
	id: number
	assignmentid: number
	studentid: string
	submittedat: string
	grade: number | null
	feedback: string | null
	attachments: string[] | null
}

/**
 * Fetch all assignments for a student
 * @param studentId The ID of the student
 * @returns A promise that resolves to an array of assignments
 */
export const getStudentAssignments = async (studentId: string): Promise<Assignment[]> => {
	try {
		console.log('Fetching assignments for student:', studentId)

		// First, get all classes the student is enrolled in
		const { data: enrollments, error: enrollmentsError } = await supabase
			.from('classstudents')
			.select('classid')
			.eq('studentid', studentId)

		if (enrollmentsError) {
			throw new Error(handleSupabaseError(enrollmentsError))
		}

		if (!enrollments || enrollments.length === 0) {
			console.log('Student is not enrolled in any classes')
			return []
		}

		const classIds = enrollments.map(e => e.classid)
		console.log('Student is enrolled in classes:', classIds)

		// Get all assignments for these classes
		const { data: assignments, error: assignmentsError } = await supabase
			.from('assignments')
			.select(
				`
        *
      `
			)
			.in('classid', classIds)
			.order('duedate', { ascending: false })

		if (assignmentsError) {
			throw new Error(handleSupabaseError(assignmentsError))
		}

		if (!assignments) {
			return []
		}

		// Get submissions for these assignments
		const assignmentIds = assignments.map(a => a.id)
		const { data: submissions, error: submissionsError } = await supabase
			.from('submissions')
			.select('*')
			.in('assignmentid', assignmentIds)
			.eq('studentid', studentId)

		if (submissionsError) {
			throw new Error(handleSupabaseError(submissionsError))
		}

		// Create a map of submissions by assignment ID
		const submissionsByAssignment = {}
		if (submissions) {
			submissions.forEach(submission => {
				if (!submissionsByAssignment[submission.assignmentid]) {
					submissionsByAssignment[submission.assignmentid] = []
				}
				submissionsByAssignment[submission.assignmentid].push(submission)
			})
		}

		// Calculate assignment status based on due date and submissions
		const now = new Date()
		const processedAssignments = assignments.map(assignment => {
			const assignmentSubmissions = submissionsByAssignment[assignment.id] || []
			let status: 'not_started' | 'in_progress' | 'completed' | 'overdue' = 'not_started'

			// If there are submissions, mark as completed
			if (assignmentSubmissions.length > 0) {
				status = 'completed'
			}
			// If due date is in the past and no submissions, mark as overdue
			else if (assignment.duedate && new Date(assignment.duedate) < now) {
				status = 'overdue'
			}

			return {
				...assignment,
				status,
				submissions: assignmentSubmissions,
			}
		})

		console.log(`Found ${processedAssignments.length} assignments for student`)
		return processedAssignments
	} catch (error) {
		console.error('Error fetching student assignments:', error)
		throw error
	}
}

/**
 * Submit an assignment
 * @param assignmentId The ID of the assignment
 * @param studentId The ID of the student
 * @param attachments Array of attachment URLs
 * @returns A promise that resolves to the created submission
 */
export const submitAssignment = async (
	assignmentId: number,
	studentId: string,
	attachments: string[] = []
): Promise<AssignmentSubmission> => {
	try {
		const { data, error } = await supabase
			.from('assignment_submissions')
			.insert({
				assignmentid: assignmentId,
				studentid: studentId,
				submittedat: new Date().toISOString(),
				attachments: attachments,
			})
			.select()
			.single()

		if (error) {
			throw new Error(handleSupabaseError(error))
		}

		if (!data) {
			throw new Error('Failed to create assignment submission')
		}

		return data
	} catch (error) {
		console.error('Error submitting assignment:', error)
		throw error
	}
}

/**
 * Fetch a single assignment by ID with all related data
 * @param assignmentId The ID of the assignment
 * @returns A promise that resolves to the assignment details
 */
export const getAssignmentById = async (assignmentId: string): Promise<Assignment> => {
	try {
		const { data, error } = await supabase
			.from('assignments')
			.select(
				`
        *,
        subject:subjects(
          id,
          subjectname,
          code
        ),
        class:classes(
          id,
          classname
        ),
        creator:users(
          id,
          firstName,
          lastName
        )
      `
			)
			.eq('id', assignmentId)
			.single()

		if (error) {
			throw new Error(handleSupabaseError(error))
		}

		if (!data) {
			throw new Error('Assignment not found')
		}

		// Calculate assignment status
		const now = new Date()
		let status: Assignment['status'] = 'not_started'

		if (data.duedate && new Date(data.duedate) < now) {
			status = 'overdue'
		}

		return {
			...data,
			status,
		}
	} catch (error) {
		console.error('Error fetching assignment details:', error)
		throw error
	}
}
