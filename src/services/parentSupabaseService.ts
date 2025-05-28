import { TimetableEntry } from '../screens/parent/ParentScheduleScreen'
import { handleSupabaseError, supabase } from '../utils/supabase'
import {
	GradeItem as ExportedGradeItem,
	SubjectGrade as ExportedSubjectGrade,
} from './gradesService'
import { ChildData, ParentNotification } from './parentService'

// Define interfaces locally since they're not exported from parentService
export interface GradeItem extends Omit<ExportedGradeItem, 'id' | 'type'> {
	id: string | number
	type?: string
	lessonId?: any // Added to match usage in fetchChildGrades & fetchParentChildSubjectGrades
	feedback?: string | undefined // Changed from string | null | undefined
	attendance?: string | undefined // Allow null for attendance again
}

export interface SubjectGrade extends Omit<ExportedSubjectGrade, 'grades' | 'id'> {
	// Omitted 'id' here
	id: string // Changed from number to string
	subjectName: string
	teacherName: string
	className: string
	color: string
	averageGrade: string
	numericGrade: number
	hasGrades: boolean
	grades: GradeItem[]
}

// Define types for the Supabase responses to help with TypeScript
interface StudentClass {
	class:
		| {
				id: string
				classname: string
				grade?: {
					name: string
				} | null
				subjects?: Array<{
					id: string
					subjectname: string
					teacher?: {
						firstName: string
						lastName: string
					} | null
				}> | null
		  }
		| null[]
		| null // Can be object, array of objects, or null
}

interface StudentRecord {
	id: string
	firstName: string
	lastName: string
	classes: StudentClass[]
}

interface ScoreRecord {
	id: string
	score: number
	comment?: string | null // Added comment here as it's selected in fetchChildGrades
	created_at: string
	lessons: {
		lessonname: string
		type: string
		subjectid?: string // Added from usage
	} | null
	attendance: {
		status: string
	} | null
}

// Define more specific types for Supabase responses based on common errors
interface LessonFromSupabase {
	id: any
	lessonname: any
	date?: any // Make optional if not always present
	subjectid?: any // Make optional
	subject?: { id: any; subjectname: any }[] | { id: any; subjectname: any } | null
}

interface QuarterFromSupabase {
	id: any
	name: any
}

interface AssignmentSubjectFromSupabase {
	id: any
	subjectname: any
}

interface AssignmentFromSupabase {
	id: any
	title: any
	duedate: any
	subjectid?: any
	subject_id?: any
	subject: AssignmentSubjectFromSupabase | AssignmentSubjectFromSupabase[] | null
}

interface UserFromSupabase {
	id: any
	firstName: any
	lastName: any
	email: string
}

interface ClassFromSupabase {
	id: string
	classname: string
	grade?: { name: string } | null
}

// Represents an entry from the 'classstudents' table join
interface ClassStudentEntry {
	studentid: string
	classid: string
	class: ClassFromSupabase | ClassFromSupabase[] | null
}

// Define assignment interface
export interface ChildAssignment {
	id: string
	title: string
	subjectName: string
	dueDate: string
	isCompleted: boolean
	isPastDue: boolean
	score?: number
	feedback?: string
}

// Define the raw assignment data structure from Supabase
interface RawAssignmentData {
	id: string
	title: string
	instructions?: string
	duedate: string
	subject_id?: string
	classid?: string
	subject?: { id: string; subjectname: string } | { id: string; subjectname: string }[] // Allow single object or array
}

// Interface for the combined details to be returned by the new function
// This should align with what ParentAssignmentDetailScreen expects
export interface ParentDetailedAssignment {
	id: string
	title: string
	instructions?: string
	dueDate: string
	subjectName?: string
	// Submission specific
	submittedAt?: string | null
	grade?: number | null
	feedback?: string | null
	isCompleted: boolean
	isPastDue: boolean
	statusText: string
	// attachments?: Array<{ name: string; url: string }>; // For assignment materials
	// submittedFiles?: Array<{ name: string; url: string }>; // For student submitted files
}

// Interface for a child user entry
export interface ParentChildListItem {
	id: string
	fullName: string // Assuming 'full_name' or similar. Adjust if needed.
	// Add other relevant child details if necessary, e.g., class, profile picture
}

// Fetch children data for a parent
export const fetchParentChildren = async (parentId: string): Promise<ChildData[]> => {
	try {
		console.log(`Fetching children data for parent: ${parentId}`)

		// Get students where parent_id matches the current parent
		const { data: students, error: studentsError } = await supabase
			.from('users')
			.select(
				`
        id,
        firstName,
        lastName,
        parent_id,
        classes:classstudents(
          studentid,
          classid,
          class:classes(
            id,
            classname,
            grade:levels(name)
          )
        )
      `
			)
			.eq('parent_id', parentId)
			.eq('role', 'Student')

		if (studentsError) {
			console.error('Error fetching students:', studentsError)
			throw studentsError
		}

		console.log(`Found ${students?.length || 0} students for parent ${parentId}`)
		console.log('Students data sample:', students?.slice(0, 1))

		if (!students || students.length === 0) return []

		// Format the data
		const childrenData: ChildData[] = await Promise.all(
			students.map(async (student: any) => {
				// Get attendance data for this student
				const { data: attendance, error: attendanceError } = await supabase
					.from('attendance')
					.select('status')
					.eq('student_id', student.id)
					.gte('noted_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days

				if (attendanceError) {
					console.error('Error fetching attendance:', attendanceError)
					throw attendanceError
				}

				console.log(`Found ${attendance?.length || 0} attendance records for student ${student.id}`)

				// Calculate attendance statistics
				const recentAttendance = {
					present: attendance?.filter(a => a.status === 'present').length || 0,
					absent: attendance?.filter(a => a.status === 'absent').length || 0,
					late: attendance?.filter(a => a.status === 'late').length || 0,
					excused: attendance?.filter(a => a.status === 'excused').length || 0,
				}

				// Get assignment data
				const { data: assignmentsData, error: assignmentsError } = await supabase
					.from('submissions')
					.select('grade')
					.eq('studentid', student.id)

				if (assignmentsError) {
					console.error('Error fetching submissions:', assignmentsError)
					throw assignmentsError
				}

				console.log(`Found ${assignmentsData?.length || 0} submissions for student ${student.id}`)
				console.log('Submissions data sample:', assignmentsData?.slice(0, 2))

				const totalAssignments = assignmentsData?.length || 0
				// Since we don't have status field in submissions, we'll assume all submissions are complete
				const completedAssignments = totalAssignments

				// Calculate GPA if grades are available
				let gpa = '0.0'
				if (assignmentsData && assignmentsData.length > 0) {
					const grades = assignmentsData.filter(a => a.grade !== null).map(a => a.grade)
					if (grades.length > 0) {
						const average = grades.reduce((a, b) => a + b, 0) / grades.length
						gpa = (average / 2.5).toFixed(1) // Convert from 10-point scale to 4.0 scale
					}
				}

				// Count upcoming tests
				const { data: upcomingTests, error: testsError } = await supabase
					.from('assignments')
					.select('id')
					.gt('duedate', new Date().toISOString())
					.order('duedate', { ascending: true })
					.limit(5)

				if (testsError) {
					console.error('Error fetching upcoming tests:', testsError)
					throw testsError
				}

				console.log(`Found ${upcomingTests?.length || 0} upcoming tests`)

				// Safely extract class data with proper null checks
				let grade = 'Unknown Grade'
				let className = 'Unknown Class'

				try {
					if (student.classes && Array.isArray(student.classes) && student.classes.length > 0) {
						const classData = student.classes[0].class
						if (classData) {
							className = classData.classname || 'Unknown Class'
							if (classData.grade) {
								grade = classData.grade.name || 'Unknown Grade'
							}
						}
					}
				} catch (e) {
					console.error('Error parsing class data:', e)
				}

				return {
					id: student.id,
					firstName: student.firstName,
					lastName: student.lastName,
					grade,
					className,
					recentAttendance,
					performanceSummary: {
						gpa,
						totalAssignments,
						completedAssignments,
						upcomingTests: upcomingTests?.length || 0,
					},
				}
			})
		)

		console.log(`Returning ${childrenData.length} children data`)

		// Add dummy data if no children found
		if (childrenData.length === 0) {
			console.log('No children found, adding dummy data for debugging')
			childrenData.push({
				id: 'dummy-child',
				firstName: 'No',
				lastName: 'Children Found',
				grade: 'Check Database',
				className: 'Database Error',
				recentAttendance: {
					present: 0,
					absent: 0,
					late: 0,
					excused: 0,
				},
				performanceSummary: {
					gpa: '0.0',
					totalAssignments: 0,
					completedAssignments: 0,
					upcomingTests: 0,
				},
			})
		}

		return childrenData
	} catch (error) {
		console.error('Error fetching parent children:', error)
		throw new Error(handleSupabaseError(error))
	}
}

// Fetch notifications for a parent using announcements table
export const fetchParentNotifications = async (parentId: string): Promise<ParentNotification[]> => {
	try {
		// Get announcements for ALL or Parents/Parent
		const { data: announcements, error: announcementsError } = await supabase
			.from('announcements')
			.select('*')
			.or(`targetAudience.eq.ALL,targetAudience.eq.Parents,targetAudience.eq.Parent`)
			.order('created_at', { ascending: false }) // Sort by created_at for announcements, newest first
		// No limit here, fetch all announcements

		if (announcementsError) {
			throw announcementsError
		}

		// Map announcements to notification format
		const notifications: ParentNotification[] = announcements.map(announcement => ({
			id: announcement.id.toString(),
			title: announcement.title || 'Announcement',
			message: announcement.content || '',
			date: announcement.created_at || new Date().toISOString(),
			type: 'announcement',
			read: false, // Will be updated from AsyncStorage later
			relatedStudentId: announcement.target_student_id || undefined,
			relatedSubjectId: announcement.target_subject_id || undefined,
		}))

		return notifications
	} catch (error) {
		console.error('Error fetching parent notifications:', error)
		return []
	}
}

// Mark notification as read (this will need a custom solution)
export const markParentNotificationAsRead = async (notificationId: string): Promise<void> => {
	try {
		// Since we're using announcements, we would need a separate table to track which announcements
		// have been read by which parents. For now, we'll just handle this client-side.

		// In a real implementation, you would add a record to a table like parent_viewed_announcements
		// const { error } = await supabase
		//   .from('parent_viewed_announcements')
		//   .insert({ parent_id: parentId, announcement_id: notificationId });

		// if (error) throw error;

		// For now, we'll just return successfully
		return
	} catch (error) {
		console.error('Error marking notification as read:', error)
		throw new Error(handleSupabaseError(error))
	}
}

// Get child's subject grades
export const fetchChildGrades = async (childId: string): Promise<SubjectGrade[]> => {
	try {
		console.log(`Fetching grades for child ${childId}`)

		// First get the classes the child is enrolled in
		const { data: enrollments, error: enrollmentsError } = await supabase
			.from('classstudents')
			.select(
				`
        studentid,
        classid,
        class:classes(
          id,
          classname
        )
      `
			)
			.eq('studentid', childId)

		if (enrollmentsError) {
			console.error('Error fetching enrollments:', enrollmentsError)
			throw enrollmentsError
		}

		console.log(`Found ${enrollments?.length || 0} class enrollments for child ${childId}`)

		if (!enrollments || enrollments.length === 0) return []

		// Get class IDs to fetch subjects
		const classIds = enrollments.map(enrollment => enrollment.classid)

		// Fetch subjects for these classes separately
		const { data: classSubjects, error: subjectsError } = await supabase
			.from('classsubjects')
			.select(
				`
        classid,
        subjectid,
        subject:subjects(
          id,
          subjectname
        )
      `
			)
			.in('classid', classIds)

		if (subjectsError) {
			console.error('Error fetching class subjects:', subjectsError)
			throw subjectsError
		}

		console.log(`Found ${classSubjects?.length || 0} subject relationships`)

		// Fetch teachers for these classes
		const { data: classTeachers, error: teachersError } = await supabase
			.from('classteachers')
			.select(
				`
        classid,
        subjectid,
        teacher:users(
          id,
          firstName,
          lastName
        )
      `
			)
			.in('classid', classIds)

		if (teachersError) {
			console.error('Error fetching class teachers:', teachersError)
			throw teachersError
		}

		console.log(`Found ${classTeachers?.length || 0} teacher relationships`)

		// Process the data to create subject grades
		// Group subjects by their ID
		const subjectMap = new Map()

		// Process class subjects
		if (classSubjects && classSubjects.length > 0) {
			for (const subjectRelation of classSubjects) {
				const subject = subjectRelation.subject as any
				if (!subject) continue

				// Find enrollment with matching classId to get class name
				const enrollment = enrollments.find(e => e.classid === subjectRelation.classid)
				if (!enrollment || !enrollment.class) continue

				const classObj = enrollment.class as any
				const className = classObj.classname || 'Unknown Class'

				// Find teacher for this subject
				let teacherName = 'Unknown Teacher'
				const teacherInfo = classTeachers?.find(
					ct => ct.classid === subjectRelation.classid && ct.subjectid === subjectRelation.subjectid
				)

				if (teacherInfo && teacherInfo.teacher) {
					const teacher = teacherInfo.teacher as any
					const firstName = teacher.firstName || ''
					const lastName = teacher.lastName || ''
					teacherName = `${firstName} ${lastName}`.trim() || 'Unknown Teacher'
				}

				// Store in map to avoid duplicates
				const subjectId = subject.id
				if (!subjectMap.has(subjectId)) {
					subjectMap.set(subjectId, {
						id: subject.id as string, // Ensure id is string
						subjectName: subject.subjectname || 'Unknown Subject',
						teacherName,
						className,
						color: '#4A90E2',
						hasGrades: false,
						averageGrade: 'N/A',
						numericGrade: 0,
						grades: [],
					})
				}
			}
		}

		// Fetch all grades for this student
		const { data: grades, error: gradesError } = await supabase
			.from('scores')
			.select(
				`
        id,
        score,
        comment,
        created_at,
        lesson_id,
        lesson:lessons(
          id,
          lessonname,
          subjectid
        )
      `
			)
			.eq('student_id', childId)

		if (gradesError) {
			console.error(`Error fetching grades:`, gradesError)
			throw new Error(handleSupabaseError(gradesError))
		}

		console.log(`Found ${grades?.length || 0} total scores for student ${childId}`)

		// Fetch all attendance records for this student
		const { data: attendanceRecords, error: attendanceError } = await supabase
			.from('attendance')
			.select(
				`
        id,
        status,
        noted_at,
        lesson_id,
        lesson:lessons(
          id,
          lessonname,
          subjectid
        )
      `
			)
			.eq('student_id', childId)

		if (attendanceError) {
			console.error(`Error fetching attendance:`, attendanceError)
			throw new Error(handleSupabaseError(attendanceError))
		}

		console.log(
			`Found ${attendanceRecords?.length || 0} total attendance records for student ${childId}`
		)

		// Process grades and add them to subjects
		if (grades && grades.length > 0) {
			for (const grade of grades) {
				try {
					// Correctly handle if lesson is an array or single object based on actual Supabase response for this query
					let lessonDetails: { id: any; lessonname: string; subjectid: string } | null = null
					if (Array.isArray(grade.lesson)) {
						lessonDetails = grade.lesson[0] || null
					} else {
						lessonDetails =
							(grade.lesson as { id: any; lessonname: string; subjectid: string }) || null
					}

					if (!lessonDetails || !lessonDetails.subjectid) continue

					const subjectId = lessonDetails.subjectid
					if (!subjectMap.has(subjectId)) continue // Skip if subject not found

					const subjectGrade = subjectMap.get(subjectId)

					// Add grade to the subject
					const gradeItem: GradeItem = {
						id: grade.id || '',
						title: lessonDetails.lessonname || 'Unnamed Assignment',
						grade: convertScoreToLetterGrade(grade.score || 0),
						score: grade.score || 0,
						date: grade.created_at || new Date().toISOString(),
						type: 'assignment',
						attendance: undefined, // Explicitly undefined, or map from a source if available
						lessonId: grade.lesson_id,
						feedback: grade.comment === null ? undefined : grade.comment, // Assuming comment is feedback here
					}

					subjectGrade.grades.push(gradeItem)
					subjectGrade.hasGrades = true
				} catch (e) {
					console.error('Error processing grade:', e)
				}
			}
		}

		// Process attendance records and either add them to existing grade entries
		// or create new entries for lessons that only have attendance
		if (attendanceRecords && attendanceRecords.length > 0) {
			// Create a map of existing grades by lesson_id for quick lookup
			const gradesByLessonId = new Map<any, GradeItem>() // Ensure GradeItem is used here

			for (const subject of subjectMap.values()) {
				for (const grade of subject.grades) {
					if (grade.lessonId) {
						gradesByLessonId.set(grade.lessonId, grade)
					}
				}
			}

			for (const attendance of attendanceRecords) {
				try {
					// Correctly handle if lesson is an array or single object
					let lessonDetails: { id: any; lessonname: string; subjectid: string } | null = null
					if (Array.isArray(attendance.lesson)) {
						lessonDetails = attendance.lesson[0] || null
					} else {
						lessonDetails =
							(attendance.lesson as { id: any; lessonname: string; subjectid: string }) || null
					}

					if (!lessonDetails || !lessonDetails.subjectid) continue

					const subjectId = lessonDetails.subjectid
					if (!subjectMap.has(subjectId)) continue // Skip if subject not found

					const subjectGrade = subjectMap.get(subjectId)

					// Check if this lesson already has a grade entry
					const existingGrade = gradesByLessonId.get(attendance.lesson_id)

					if (existingGrade) {
						// Update the existing grade with attendance info
						existingGrade.attendance = attendance.status === null ? undefined : attendance.status
					} else {
						// Create a new entry for lessons with only attendance
						const attendanceItem: GradeItem = {
							id: attendance.id || '',
							title: lessonDetails.lessonname || 'Class Attendance',
							grade: '',
							score: null,
							date: attendance.noted_at || new Date().toISOString(),
							type: 'attendance',
							attendance: attendance.status === null ? undefined : attendance.status, // Map null to undefined
							lessonId: attendance.lesson_id,
						}

						subjectGrade.grades.push(attendanceItem)
						subjectGrade.hasGrades = true
					}
				} catch (e) {
					console.error('Error processing attendance record:', e)
				}
			}
		}

		// Calculate average grades
		for (const [_, subjectGrade] of subjectMap.entries()) {
			if (subjectGrade.grades.length > 0) {
				const scores = subjectGrade.grades
					.filter((g: GradeItem) => g.score !== null && g.score !== undefined)
					.map((g: GradeItem) => g.score || 0)

				if (scores.length > 0) {
					subjectGrade.numericGrade =
						scores.reduce((a: number, b: number) => a + b, 0) / scores.length
					subjectGrade.averageGrade = convertScoreToLetterGrade(subjectGrade.numericGrade)
				}
			}

			// Sort grades by date (most recent first)
			subjectGrade.grades.sort((a: GradeItem, b: GradeItem) => {
				return new Date(b.date).getTime() - new Date(a.date).getTime()
			})
		}

		// Convert map to array
		const subjects = Array.from(subjectMap.values()) as SubjectGrade[]

		console.log(`Returning ${subjects.length} subjects with grades`)

		// Add dummy data if nothing found
		if (subjects.length === 0) {
			subjects.push({
				id: '-1', // Use string ID for dummy data
				subjectName: 'No Subjects Found',
				teacherName: 'Check Database',
				className: 'Database Error',
				color: '#FF0000',
				averageGrade: 'N/A',
				numericGrade: 0,
				hasGrades: false,
				grades: [],
			})
		}

		return subjects
	} catch (error) {
		console.error('Error fetching child grades:', error)
		throw new Error(handleSupabaseError(error))
	}
}

// Helper function to convert score to letter grade
const convertScoreToLetterGrade = (score: number): string => {
	if (score >= 9) return 'A'
	if (score >= 7) return 'B'
	if (score >= 5) return 'C'
	if (score >= 3) return 'D'
	return 'F'
}

// Helper function to map announcement target to notification type
const mapAnnouncementToNotificationType = (
	targetAudience: string
): 'grade' | 'attendance' | 'behavior' | 'announcement' | 'event' => {
	switch (targetAudience?.toUpperCase()) {
		case 'PARENTS':
		case 'PARENT':
			return 'announcement'
		case 'CLASS_SPECIFIC': // Assuming this was a potential target
			return 'grade' // Or 'announcement' if more appropriate for class-wide news
		default:
			return 'announcement'
	}
}

// Fetch subjects for a student
export const fetchStudentSubjects = async (studentId: string) => {
	try {
		console.log(`Fetching subjects for student: ${studentId}`)

		// First get the student's classes
		const { data: enrollments, error: enrollmentsError } = await supabase
			.from('classstudents')
			.select(
				`
        studentid,
        classid,
        class:classes(
          id,
          classname
        )
      `
			)
			.eq('studentid', studentId)

		if (enrollmentsError) {
			console.error('Error fetching student enrollments:', enrollmentsError)
			throw new Error(handleSupabaseError(enrollmentsError))
		}

		if (!enrollments || enrollments.length === 0) {
			return []
		}

		// Get class IDs
		const classIds = enrollments.map(e => e.classid)

		// Get subjects for these classes
		const { data: classSubjects, error: subjectsError } = await supabase
			.from('classsubjects')
			.select(
				`
        classid,
        subjectid,
        subject:subjects(
          id,
          subjectname
        )
      `
			)
			.in('classid', classIds)

		if (subjectsError) {
			console.error('Error fetching class subjects:', subjectsError)
			throw new Error(handleSupabaseError(subjectsError))
		}

		// Get teachers for these subjects
		const { data: classTeachers, error: teachersError } = await supabase
			.from('classteachers')
			.select(
				`
        classid,
        subjectid,
        teacher:users(
          id,
          firstName,
          lastName
        )
      `
			)
			.in('classid', classIds)

		if (teachersError) {
			console.error('Error fetching class teachers:', teachersError)
			throw new Error(handleSupabaseError(teachersError))
		}

		console.log(`Found ${classSubjects?.length || 0} subject relationships`)

		// Process and format the data
		const subjectsResult = []

		for (const subjectRelation of classSubjects || []) {
			try {
				const subject = subjectRelation.subject as any
				if (!subject) continue

				// Find the class info
				const enrollment = enrollments.find(e => e.classid === subjectRelation.classid)
				if (!enrollment || !enrollment.class) continue

				const classInfo = enrollment.class as any

				// Find teacher for this subject
				const teacherInfo = classTeachers?.find(
					t => t.classid === subjectRelation.classid && t.subjectid === subjectRelation.subjectid
				)

				const teacher = teacherInfo?.teacher as any

				subjectsResult.push({
					id: subject.id,
					name: subject.subjectname,
					className: classInfo.classname,
					classId: subjectRelation.classid,
					teacherName: teacher
						? `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim()
						: 'Unknown Teacher',
				})
			} catch (e) {
				console.error('Error processing subject:', e)
			}
		}

		return subjectsResult
	} catch (error) {
		console.error('Error in fetchStudentSubjects:', error)
		throw new Error(handleSupabaseError(error))
	}
}

// Fetch grades for a student
export const fetchStudentGrades = async (studentId: string) => {
	try {
		// Get grades for a student and join lesson and subject details
		const { data, error } = await supabase
			.from('scores')
			.select(
				`
        id,
        score,
        created_at,
        updated_at,
        student_id,
        lesson_id,
        lessons:lesson_id (
          id,
          lessonname,
          subjectid
        )
      `
			)
			.eq('student_id', studentId)
			.order('updated_at', { ascending: false }) // Sort by updated_at, newest first
		// No limit, fetch all grades

		if (error) throw error

		if (!data || data.length === 0) return []

		// Format data with subject names
		const formattedGrades = await Promise.all(
			data.map(async grade => {
				try {
					// If lessons data not available
					if (!grade.lessons) {
						return {
							id: grade.id,
							score: grade.score || 0,
							date: grade.updated_at || grade.created_at || new Date().toISOString(), // Use updated_at for consistent sorting
							created_at: grade.created_at,
							updated_at: grade.updated_at,
							student_id: grade.student_id,
							lessonId: grade.lesson_id,
							lessonName: 'Unknown Lesson',
							subjectId: 0,
							subjectName: 'Unknown Subject',
						}
					}

					// Get subject details
					const { data: subjectData, error: subjectError } = await supabase
						.from('subjects')
						.select('id, subjectname')
						.eq('id', grade.lessons.subjectid)
						.single()

					return {
						id: grade.id,
						score: grade.score || 0,
						date: grade.updated_at || grade.created_at || new Date().toISOString(), // Use updated_at for consistent sorting
						created_at: grade.created_at,
						updated_at: grade.updated_at,
						student_id: grade.student_id,
						lessonId: grade.lesson_id,
						lessonName: grade.lessons.lessonname || 'Unknown Lesson',
						subjectId: grade.lessons.subjectid || 0,
						subjectName: subjectData?.subjectname || 'Unknown Subject',
					}
				} catch (e) {
					console.error('Error processing grade:', e)
					return null
				}
			})
		)

		return formattedGrades.filter(Boolean) // Filter out null values
	} catch (error) {
		console.error('Error fetching student grades:', error)
		return []
	}
}

// Fetch assignments for a student's class
export const fetchStudentAssignments = async (studentId: string) => {
	try {
		console.log(`Fetching assignments for student: ${studentId}`)

		// First get the student's class
		const { data: enrollments, error: enrollmentError } = await supabase
			.from('classstudents')
			.select('classid')
			.eq('studentid', studentId)

		if (enrollmentError) {
			console.error('Error fetching student enrollments:', enrollmentError)
			throw new Error(handleSupabaseError(enrollmentError))
		}

		if (!enrollments || enrollments.length === 0) {
			return []
		}

		// Get class IDs
		const classIds = enrollments.map(e => e.classid)
		console.log(`Student is enrolled in ${classIds.length} classes`)

		// Get assignments for these classes
		const { data, error } = await supabase
			.from('assignments')
			.select(
				`
        id,
        title,
        instructions,
        duedate,
        subjectid,
        classid,
        createdby,
        created_at,
        subject:subjects(id, subjectname)
      `
			)
			.in('classid', classIds)
			.order('duedate', { ascending: true })

		if (error) {
			console.error('Error fetching assignments:', error)
			throw new Error(handleSupabaseError(error))
		}

		console.log(`Found ${data?.length || 0} assignments for student's classes`)

		// Get submissions for these assignments to check if completed
		const assignmentIds = data?.map(a => a.id) || []
		const { data: submissions, error: submissionsError } = await supabase
			.from('submissions')
			.select('assignmentid, grade')
			.eq('studentid', studentId)
			.in('assignmentid', assignmentIds)

		if (submissionsError) {
			console.error('Error fetching submissions:', submissionsError)
		}

		// Process and format the data
		const assignmentsResult =
			data?.map(assignment => {
				// Find matching submission if any
				const submission = submissions?.find(s => s.assignmentid === assignment.id)
				const subjectData = Array.isArray(assignment.subject)
					? (assignment.subject[0] as AssignmentSubjectFromSupabase | null)
					: (assignment.subject as AssignmentSubjectFromSupabase | null)
				let subjectNameStr = 'Unknown Subject'
				// No need to check Array.isArray again, already handled
				if (subjectData) {
					subjectNameStr = subjectData.subjectname || 'Unknown Subject'
				}

				return {
					id: assignment.id,
					title: assignment.title,
					instructions: assignment.instructions,
					dueDate: assignment.duedate,
					subjectId: assignment.subjectid,
					subjectName: subjectNameStr,
					subjectColor: '#4A90E2',
					classId: assignment.classid,
					isSubmitted: !!submission,
					grade: submission?.grade || null,
					isPastDue: new Date(assignment.duedate) < new Date(),
					createdAt: assignment.created_at,
				}
			}) || []

		return assignmentsResult
	} catch (error) {
		console.error('Error in fetchStudentAssignments:', error)
		throw new Error(handleSupabaseError(error))
	}
}

// Fetch submissions made by a student
export const fetchStudentSubmissions = async (studentId: string) => {
	try {
		console.log(`Fetching submissions for student: ${studentId}`)

		const { data, error } = await supabase
			.from('submissions')
			.select(
				`
        id,
        assignmentid,
        studentid,
        fileurl,
        submittedat,
        grade,
        feedback,
        assignment:assignments(
          id,
          title,
          duedate,
          subjectid,
          subject_id,
          subject:subjects(
            id,
            subjectname
          )
        )
      `
			)
			.eq('studentid', studentId)
			.order('submittedat', { ascending: false })

		if (error) {
			console.error('Error fetching student submissions:', error)
			throw new Error(handleSupabaseError(error))
		}

		console.log(`Found ${data?.length || 0} submissions for student`)

		// Process and format the data
		const submissionsResult =
			data?.map(submission => {
				const assignmentData = submission.assignment?.[0] as AssignmentFromSupabase | null
				const subjectData = assignmentData?.subject
				let subjectNameStr = 'Unknown Subject'

				if (Array.isArray(subjectData)) {
					subjectNameStr = subjectData[0]?.subjectname || 'Unknown Subject'
				} else if (subjectData) {
					subjectNameStr = (subjectData as { subjectname: string }).subjectname || 'Unknown Subject'
				}

				return {
					id: submission.id,
					assignmentId: submission.assignmentid,
					assignmentTitle: assignmentData?.title || 'Unknown Assignment',
					fileUrl: submission.fileurl,
					submittedAt: submission.submittedat,
					grade: submission.grade,
					letterGrade: submission.grade ? convertScoreToLetterGrade(submission.grade) : 'N/A',
					feedback: submission.feedback,
					dueDate: assignmentData?.duedate,
					isLate:
						submission.submittedat && assignmentData?.duedate
							? new Date(submission.submittedat) > new Date(assignmentData.duedate)
							: false,
					subjectName: subjectNameStr,
					subjectColor: '#4A90E2',
				}
			}) || []

		return submissionsResult
	} catch (error) {
		console.error('Error in fetchStudentSubmissions:', error)
		throw new Error(handleSupabaseError(error))
	}
}

// Fetch attendance records for a student
export const fetchStudentAttendance = async (studentId: string) => {
	try {
		console.log(`Fetching attendance for student: ${studentId}`)

		const { data, error } = await supabase
			.from('attendance')
			.select(
				`
        id,
        status,
        noted_at,
        student_id,
        lessonid,
        lesson: lessons!lessonid (
          id,
          lessonname,
          date,
          subjectid,
          subject: subjects!subjectid (
            id,
            subjectname
          )
        )
      `
			)
			.eq('student_id', studentId)
			.order('noted_at', { ascending: false })

		if (error) {
			console.error('Error fetching student attendance:', error)
			throw new Error(handleSupabaseError(error))
		}

		console.log(`Found ${data?.length || 0} attendance records for student`)

		// Process and format the data
		const attendanceResult =
			data?.map(record => {
				const lessonData = Array.isArray(record.lesson)
					? record.lesson[0]
					: (record.lesson as LessonFromSupabase | null)
				const subjectData = lessonData?.subject
				let finalSubjectName = 'Unknown Subject'
				if (Array.isArray(subjectData)) {
					finalSubjectName = subjectData[0]?.subjectname || 'Unknown Subject'
				} else if (subjectData) {
					finalSubjectName =
						(subjectData as { subjectname: string }).subjectname || 'Unknown Subject'
				}

				return {
					id: record.id,
					status: record.status,
					date: record.noted_at,
					lessonId: record.lessonid,
					lessonName: lessonData?.lessonname || 'Unknown Lesson',
					lessonDate: lessonData?.date,
					subjectId: lessonData?.subjectid, // Now correctly accessed
					subjectName: finalSubjectName, // Use derived name (fixed typo, was subjectName)
					subjectColor: '#4A90E2',
				}
			}) || []

		// Calculate attendance statistics
		const statistics = {
			total: attendanceResult.length,
			present: attendanceResult.filter(r => r.status === 'present').length,
			absent: attendanceResult.filter(r => r.status === 'absent').length,
			late: attendanceResult.filter(r => r.status === 'late').length,
			excused: attendanceResult.filter(r => r.status === 'excused').length,
			presentPercentage:
				attendanceResult.length > 0
					? (attendanceResult.filter(r => r.status === 'present').length /
							attendanceResult.length) *
					  100
					: 0,
		}

		return {
			records: attendanceResult,
			statistics,
		}
	} catch (error) {
		console.error('Error in fetchStudentAttendance:', error)
		throw new Error(handleSupabaseError(error))
	}
}

// Fetch complete student profile with all data
export const fetchStudentProfile = async (studentId: string) => {
	try {
		console.log(`Fetching complete profile for student: ${studentId}`)

		// Get basic student info
		const { data: student, error: studentError } = await supabase
			.from('users')
			.select(
				`
        id,
        firstName,
        lastName,
        email,
        role,
        parent_id,
        parent:users!parent_id(
          id,
          firstName,
          lastName,
          email
        )
      `
			)
			.eq('id', studentId)
			.single()

		if (studentError) {
			console.error('Error fetching student profile:', studentError)
			throw new Error(handleSupabaseError(studentError))
		}

		if (!student) {
			throw new Error('Student not found')
		}

		// Adjust for parent potentially being an array from the join
		const studentParentArray = student.parent as UserFromSupabase[] | null
		const studentParentData = studentParentArray?.[0] || null

		return {
			profile: {
				id: student.id,
				firstName: student.firstName,
				lastName: student.lastName,
				email: student.email,
				fullName: `${student.firstName || ''} ${student.lastName || ''}`.trim(),
				parent: studentParentData
					? {
							id: studentParentData.id,
							name: `${studentParentData.firstName || ''} ${
								studentParentData.lastName || ''
							}`.trim(),
							email: studentParentData.email,
					  }
					: null,
			},
			subjects: await fetchStudentSubjects(studentId),
			grades: await fetchStudentGrades(studentId),
			assignments: await fetchStudentAssignments(studentId),
			submissions: await fetchStudentSubmissions(studentId),
			attendance: await fetchStudentAttendance(studentId),
		}
	} catch (error) {
		console.error('Error in fetchStudentProfile:', error)
		throw new Error(handleSupabaseError(error))
	}
}

// Fetch all children for a parent with their academic data
export const fetchParentChildrenWithResults = async (parentId: string) => {
	try {
		console.log(`Fetching all children and their results for parent: ${parentId}`)

		// Get students where parent_id matches the current parent
		const { data: students, error: studentsError } = await supabase
			.from('users')
			.select(
				`
        id,
        firstName,
        lastName,
        role,
        classes:classstudents(
          classid,
          class:classes(
            id,
            classname,
            grade:levels(name)
          )
        )
      `
			)
			.eq('parent_id', parentId)
			.eq('role', 'Student')

		if (studentsError) {
			console.error("Error fetching parent's children:", studentsError)
			throw new Error(handleSupabaseError(studentsError))
		}

		if (!students || students.length === 0) {
			return []
		}

		console.log(`Found ${students.length} children for parent ${parentId}`)

		// Get complete results for each child
		const childrenWithResultsPromises = students.map(async student => {
			try {
				const studentId = student.id

				// Fetch attendance data
				const { data: attendance, error: attendanceError } = await supabase
					.from('attendance')
					.select('status')
					.eq('student_id', studentId)
					.gte('noted_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days

				if (attendanceError) {
					console.error('Error fetching attendance:', attendanceError)
				}

				// Calculate attendance statistics
				const recentAttendance = {
					present: attendance?.filter(a => a.status === 'present').length || 0,
					absent: attendance?.filter(a => a.status === 'absent').length || 0,
					late: attendance?.filter(a => a.status === 'late').length || 0,
					excused: attendance?.filter(a => a.status === 'excused').length || 0,
				}

				// Get grades data
				const { data: grades, error: gradesError } = await supabase
					.from('scores')
					.select('score')
					.eq('student_id', studentId)

				if (gradesError) {
					console.error('Error fetching grades:', gradesError)
				}

				// Calculate GPA
				let gpa = '0.0'
				if (grades && grades.length > 0) {
					const validScores = grades.filter(g => g.score != null).map(g => g.score)
					if (validScores.length > 0) {
						const average = validScores.reduce((a, b) => a + b, 0) / validScores.length
						gpa = (average / 2.5).toFixed(1) // Convert to 4.0 scale assuming 10-point system
					}
				}

				// Get assignments and submissions data
				const { data: submissions, error: submissionsError } = await supabase
					.from('submissions')
					.select('id, grade')
					.eq('studentid', studentId)

				if (submissionsError) {
					console.error('Error fetching submissions:', submissionsError)
				}

				// Get upcoming tests
				const { data: upcomingTests, error: testsError } = await supabase
					.from('assignments')
					.select('id')
					.gt('duedate', new Date().toISOString())
					.order('duedate', { ascending: true })
					.limit(5)

				if (testsError) {
					console.error('Error fetching upcoming tests:', testsError)
				}

				// Get class and grade info
				let className = 'Unknown Class'
				let gradeLevel = 'Unknown Grade'

				// Ensure student.classes is an array and has elements before accessing
				if (student.classes && Array.isArray(student.classes) && student.classes.length > 0) {
					const classStudentEntry = student.classes[0] as ClassStudentEntry | null
					const classDataArray = classStudentEntry?.class // This could be ClassFromSupabase | ClassFromSupabase[] | null

					let classDetails: ClassFromSupabase | null = null
					if (Array.isArray(classDataArray)) {
						classDetails = classDataArray[0] as ClassFromSupabase | null
					} else {
						classDetails = classDataArray as ClassFromSupabase | null
					}

					if (classDetails) {
						className = classDetails.classname || 'Unknown Class'
						gradeLevel = classDetails.grade?.name || 'Unknown Grade'
					}
				}

				return {
					id: studentId,
					firstName: student.firstName,
					lastName: student.lastName,
					fullName: `${student.firstName || ''} ${student.lastName || ''}`.trim(),
					grade: gradeLevel,
					className,
					recentAttendance,
					performanceSummary: {
						gpa,
						totalAssignments: submissions?.length || 0,
						completedAssignments: submissions?.length || 0,
						upcomingTests: upcomingTests?.length || 0,
					},
				}
			} catch (error) {
				console.error(`Error processing results for child ${student.id}:`, error)
				return null
			}
		})

		// Filter out null values from errors
		const childrenWithResults = (await Promise.all(childrenWithResultsPromises)).filter(Boolean)
		return childrenWithResults
	} catch (error) {
		console.error('Error in fetchParentChildrenWithResults:', error)
		throw new Error(handleSupabaseError(error))
	}
}

// Fetch detailed subject grades for a specific child of a parent
export const fetchParentChildSubjectGrades = async (
	childId: string,
	parentId: string,
	subjectId?: string
) => {
	try {
		console.log(
			`Fetching subject grades for child ${childId} of parent ${parentId}${
				subjectId ? ` for subject ${subjectId}` : ''
			}`
		)

		// First verify this child belongs to the parent
		const { data: child, error: childError } = await supabase
			.from('users')
			.select('id')
			.eq('id', childId)
			.eq('parent_id', parentId)
			.single()

		if (childError || !child) {
			console.error('Error verifying child belongs to parent:', childError)
			throw new Error("This child doesn't belong to the specified parent")
		}

		// First get the classes the child is enrolled in
		const { data: enrollments, error: enrollmentsError } = await supabase
			.from('classstudents')
			.select(
				`
        studentid,
        classid,
        class:classes(
          id,
          classname
        )
      `
			)
			.eq('studentid', childId)

		if (enrollmentsError) {
			console.error('Error fetching enrollments:', enrollmentsError)
			throw new Error(handleSupabaseError(enrollmentsError))
		}

		if (!enrollments || enrollments.length === 0) return []

		// Get class IDs to fetch subjects
		const classIds = enrollments.map(enrollment => enrollment.classid)

		// Create subjects query based on whether a specific subject is requested
		let classSubjectsQuery = supabase
			.from('classsubjects')
			.select(
				`
        classid,
        subjectid,
        subject:subjects(
          id,
          subjectname
        )
      `
			)
			.in('classid', classIds)

		// Apply subject filter if provided
		if (subjectId) {
			classSubjectsQuery = classSubjectsQuery.eq('subjectid', subjectId)
		}

		// Fetch subjects for these classes separately
		const { data: classSubjects, error: subjectsError } = await classSubjectsQuery

		if (subjectsError) {
			console.error('Error fetching class subjects:', subjectsError)
			throw new Error(handleSupabaseError(subjectsError))
		}

		console.log(`Found ${classSubjects?.length || 0} subject relationships`)

		// Fetch teachers for these classes
		const { data: classTeachers, error: teachersError } = await supabase
			.from('classteachers')
			.select(
				`
        classid,
        subjectid,
        teacher:users(
          id,
          firstName,
          lastName
        )
      `
			)
			.in('classid', classIds)

		if (teachersError) {
			console.error('Error fetching class teachers:', teachersError)
			throw new Error(handleSupabaseError(teachersError))
		}

		console.log(`Found ${classTeachers?.length || 0} teacher relationships`)

		// Create subjects map
		const subjectMap = new Map()

		// Process class subjects
		if (classSubjects && classSubjects.length > 0) {
			for (const subjectRelation of classSubjects) {
				const subject = subjectRelation.subject as any
				if (!subject) continue

				// Find enrollment with matching classId to get class name
				const enrollment = enrollments.find(e => e.classid === subjectRelation.classid)
				if (!enrollment || !enrollment.class) continue

				const classObj = enrollment.class as any
				const className = classObj.classname || 'Unknown Class'

				// Find teacher for this subject
				let teacherName = 'Unknown Teacher'
				const teacherInfo = classTeachers?.find(
					ct => ct.classid === subjectRelation.classid && ct.subjectid === subjectRelation.subjectid
				)

				if (teacherInfo) {
					const teacher = teacherInfo.teacher as any
					if (teacher) {
						const firstName = teacher.firstName || ''
						const lastName = teacher.lastName || ''
						teacherName = `${firstName} ${lastName}`.trim() || 'Unknown Teacher'
					}
				}

				// Store in map to avoid duplicates
				const subjectId = subject.id
				if (!subjectMap.has(subjectId)) {
					subjectMap.set(subjectId, {
						id: subject.id as string, // Ensure id is string
						subjectName: subject.subjectname || 'Unknown Subject',
						teacherName,
						className,
						color: '#4A90E2',
						hasGrades: false,
						averageGrade: 'N/A',
						numericGrade: 0,
						grades: [],
					})
				}
			}
		}

		// Create grades query
		let gradesQuery = supabase
			.from('scores')
			.select(
				`
        id,
        score,
        comment,
        created_at,
        lesson_id,
        lesson:lessons(
          id,
          lessonname,
          subjectid
        )
      `
			)
			.eq('student_id', childId) // Fixed field name to match database schema

		// Fetch all grades for this student
		const { data: grades, error: gradesError } = await gradesQuery

		if (gradesError) {
			console.error(`Error fetching grades:`, gradesError)
			throw new Error(handleSupabaseError(gradesError))
		}

		console.log(`Found ${grades?.length || 0} total scores for student ${childId}`)

		// Fetch all attendance records for this student
		const { data: attendanceRecords, error: attendanceError } = await supabase
			.from('attendance')
			.select(
				`
        id,
        status,
        noted_at,
        lesson_id,
        lesson:lessons(
          id,
          lessonname,
          subjectid
        )
      `
			)
			.eq('student_id', childId) // Fixed field name to match database schema

		if (attendanceError) {
			console.error(`Error fetching attendance:`, attendanceError)
		}

		console.log(
			`Found ${attendanceRecords?.length || 0} total attendance records for student ${childId}`
		)

		// Process grades and add them to subjects
		if (grades && grades.length > 0) {
			for (const grade of grades) {
				try {
					// Correctly handle if lesson is an array or single object based on actual Supabase response for this query
					let lessonDetails: { id: any; lessonname: string; subjectid: string } | null = null
					if (Array.isArray(grade.lesson)) {
						lessonDetails = grade.lesson[0] || null
					} else {
						lessonDetails =
							(grade.lesson as { id: any; lessonname: string; subjectid: string }) || null
					}

					if (!lessonDetails || !lessonDetails.subjectid) continue

					const subjectId = lessonDetails.subjectid
					if (!subjectMap.has(subjectId)) continue // Skip if subject not found

					const subjectGrade = subjectMap.get(subjectId)

					// Add grade to the subject
					const gradeItem: GradeItem = {
						id: grade.id || '',
						title: lessonDetails.lessonname || 'Unnamed Assignment',
						grade: convertScoreToLetterGrade(grade.score || 0),
						score: grade.score || 0,
						date: grade.created_at || new Date().toISOString(),
						type: 'assignment',
						attendance: undefined, // Explicitly undefined, or map from a source if available
						lessonId: grade.lesson_id,
						feedback: grade.comment === null ? undefined : grade.comment, // Assuming comment is feedback here
					}

					subjectGrade.grades.push(gradeItem)
					subjectGrade.hasGrades = true
				} catch (e) {
					console.error('Error processing grade:', e)
				}
			}
		}

		// Process attendance records and either add them to existing grade entries
		// or create new entries for lessons that only have attendance
		if (attendanceRecords && attendanceRecords.length > 0) {
			// Create a map of existing grades by lesson_id for quick lookup
			const gradesByLessonId = new Map<any, GradeItem>() // Ensure GradeItem is used here

			for (const subject of subjectMap.values()) {
				for (const grade of subject.grades) {
					if (grade.lessonId) {
						gradesByLessonId.set(grade.lessonId, grade)
					}
				}
			}

			for (const attendance of attendanceRecords) {
				try {
					// Correctly handle if lesson is an array or single object
					let lessonDetails: { id: any; lessonname: string; subjectid: string } | null = null
					if (Array.isArray(attendance.lesson)) {
						lessonDetails = attendance.lesson[0] || null
					} else {
						lessonDetails =
							(attendance.lesson as { id: any; lessonname: string; subjectid: string }) || null
					}

					if (!lessonDetails || !lessonDetails.subjectid) continue

					const subjectId = lessonDetails.subjectid
					if (!subjectMap.has(subjectId)) continue // Skip if subject not found

					const subjectGrade = subjectMap.get(subjectId)

					// Check if this lesson already has a grade entry
					const existingGrade = gradesByLessonId.get(attendance.lesson_id)

					if (existingGrade) {
						// Update the existing grade with attendance info
						existingGrade.attendance = attendance.status === null ? undefined : attendance.status
					} else {
						// Create a new entry for lessons with only attendance
						const attendanceItem: GradeItem = {
							id: attendance.id || '',
							title: lessonDetails.lessonname || 'Class Attendance',
							grade: '',
							score: null,
							date: attendance.noted_at || new Date().toISOString(),
							type: 'attendance',
							attendance: attendance.status === null ? undefined : attendance.status, // Map null to undefined
							lessonId: attendance.lesson_id,
						}

						subjectGrade.grades.push(attendanceItem)
						subjectGrade.hasGrades = true
					}
				} catch (e) {
					console.error('Error processing attendance record:', e)
				}
			}
		}

		// Calculate average grades
		for (const [_, subjectGrade] of subjectMap.entries()) {
			if (subjectGrade.grades.length > 0) {
				const scores = subjectGrade.grades
					.filter((g: GradeItem) => g.score !== null && g.score !== undefined)
					.map((g: GradeItem) => g.score || 0)

				if (scores.length > 0) {
					subjectGrade.numericGrade =
						scores.reduce((a: number, b: number) => a + b, 0) / scores.length
					subjectGrade.averageGrade = convertScoreToLetterGrade(subjectGrade.numericGrade)
				}
			}

			// Sort grades by date (most recent first)
			subjectGrade.grades.sort((a: GradeItem, b: GradeItem) => {
				return new Date(b.date).getTime() - new Date(a.date).getTime()
			})
		}

		// Convert map to array
		const subjects = Array.from(subjectMap.values()) as SubjectGrade[]

		console.log(`Returning ${subjects.length} subjects with grades`)

		// Add dummy data if nothing found
		if (subjects.length === 0) {
			subjects.push({
				id: '-1', // Use string ID for dummy data
				subjectName: 'No Subjects Found',
				teacherName: 'Check Database',
				className: 'Database Error',
				color: '#FF0000',
				averageGrade: 'N/A',
				numericGrade: 0,
				hasGrades: false,
				grades: [],
			})
		}

		return subjects
	} catch (error) {
		console.error('Error in fetchParentChildSubjectGrades:', error)
		throw new Error(handleSupabaseError(error))
	}
}

// New function to fetch grades for a specific subject
export const fetchParentChildSubjectGradesForSubject = async (
	childId: string,
	parentId: string,
	subjectId: string
): Promise<SubjectGrade | null> => {
	try {
		console.log(
			`Fetching grades for child ${childId} of parent ${parentId} for subject ${subjectId}`
		)

		// Validate subjectId to ensure it's not "0" or an invalid UUID
		if (!subjectId || subjectId === '0') {
			console.error(`Invalid subjectId provided: ${subjectId}`)
			throw new Error('Invalid subject ID provided')
		}

		// Use the existing function with the subjectId parameter
		const subjectResults = await fetchParentChildSubjectGrades(childId, parentId, subjectId)

		if (!subjectResults || subjectResults.length === 0) {
			console.log(`No subject grades found for subject ${subjectId}`)
			return null
		}

		// Return the first (and should be only) subject in the result
		return subjectResults[0]
	} catch (error) {
		console.error(`Error fetching grades for subject ${subjectId}:`, error)
		throw new Error(handleSupabaseError(error))
	}
}

// Fetch assignments for a specific subject
export const fetchParentChildAssignmentsForSubject = async (
	childId: string,
	parentId: string,
	subjectId: string
): Promise<ChildAssignment[]> => {
	try {
		// Validate subjectId to ensure it's not "0" or an invalid UUID
		if (!subjectId || subjectId === '0') {
			console.error(`Invalid subjectId provided: ${subjectId}`)
			throw new Error('Invalid subject ID provided')
		}

		// First, ensure the child belongs to the parent
		const { data: childRelation, error: childRelationError } = await supabase
			.from('users')
			.select('id')
			.eq('id', childId)
			.eq('parent_id', parentId)
			.single()

		if (childRelationError || !childRelation) {
			console.error(
				'Child does not belong to parent or error fetching relation:',
				childRelationError
			)
			throw new Error("This child doesn't belong to the specified parent")
		}

		// Get the class(es) the student is enrolled in
		const { data: enrollments, error: enrollmentError } = await supabase
			.from('classstudents')
			.select('classid')
			.eq('studentid', childId)

		if (enrollmentError) {
			console.error(`Error fetching enrollments for student ${childId}:`, enrollmentError)
			throw enrollmentError
		}

		if (!enrollments || enrollments.length === 0) {
			console.log(`Student ${childId} is not enrolled in any classes.`)
			return []
		}

		const classIds = enrollments.map(e => e.classid)

		// Get assignments for these classes, filtered by subjectId
		const { data: assignmentsData, error: assignmentsError } = await supabase
			.from('assignments')
			.select(
				`
				id,
				title,
				instructions,
				duedate,
				subject_id,
				classid,
				subject:subjects(id, subjectname)
			`
			)
			.in('classid', classIds)
			.eq('subject_id', subjectId) // Filter by subject_id

		if (assignmentsError) {
			console.error('Error fetching assignments for subject:', subjectId, assignmentsError)
			throw assignmentsError
		}

		if (!assignmentsData || assignmentsData.length === 0) {
			console.log('No assignments found for the subject:', subjectId)
			return []
		}

		const assignmentIds = assignmentsData.map(a => a.id)

		// Fetch submissions for these assignments specifically for this student
		const { data: submissionsData, error: submissionsError } = await supabase
			.from('submissions')
			.select('assignmentid, grade, feedback')
			.eq('studentid', childId)
			.in('assignmentid', assignmentIds)

		if (submissionsError) {
			console.error('Error fetching submissions for student:', childId, submissionsError)
			throw submissionsError
		}

		const submissionsMap = new Map()
		if (submissionsData) {
			submissionsData.forEach(sub => {
				submissionsMap.set(sub.assignmentid, sub)
			})
		}

		return (assignmentsData as RawAssignmentData[]).map(item => {
			const submission = submissionsMap.get(item.id)
			const isCompleted = !!submission

			const dueDate = new Date(item.duedate)
			const isPastDue = dueDate < new Date() && !isCompleted

			let subjectName = 'Unknown Subject'
			// Handle if item.subject is an array or single object
			const subjectField = item.subject
			if (subjectField) {
				if (Array.isArray(subjectField)) {
					subjectName = subjectField[0]?.subjectname || 'Unknown Subject'
				} else {
					// It's a single object
					subjectName = subjectField.subjectname || 'Unknown Subject'
				}
			}

			return {
				id: item.id,
				title: item.title,
				subjectName: subjectName,
				dueDate: item.duedate,
				isCompleted: isCompleted,
				isPastDue,
				score: submission?.grade,
				feedback: submission?.feedback === null ? undefined : submission?.feedback,
			}
		})
	} catch (err) {
		console.error('Error in fetchParentChildAssignmentsForSubject:', err)
		throw new Error(handleSupabaseError(err))
	}
}

// Fetch attendance records for a specific subject
export const fetchParentChildAttendanceForSubject = async (
	childId: string,
	parentId: string,
	subjectId: string
) => {
	try {
		console.log(
			`Fetching attendance for child ${childId} of parent ${parentId} for subject ${subjectId}`
		)

		// Validate subjectId to ensure it's not "0" or an invalid UUID
		if (!subjectId || subjectId === '0') {
			console.error(`Invalid subjectId provided: ${subjectId}`)
			throw new Error('Invalid subject ID provided')
		}

		// Verify parent relationship
		const { data: childVerify, error: childErrorVerify } = await supabase
			.from('users')
			.select('id')
			.eq('id', childId)
			.eq('parent_id', parentId)
			.single()

		if (childErrorVerify || !childVerify) {
			console.error('Error verifying child belongs to parent:', childErrorVerify)
			throw new Error("This child doesn't belong to the specified parent")
		}

		// Get attendance records filtered by subject
		const { data, error } = await supabase
			.from('attendance')
			.select(
				`
				id,
				status,
				noted_at,
				student_id,
				lesson_id,
				lesson: lessons!lesson_id (
					id,
					lessonname,
					date,
					subjectid,
					subject: subjects!subjectid (
						id,
						subjectname
					)
				)
			`
			)
			.eq('student_id', childId)
			.order('noted_at', { ascending: false })

		if (error) {
			console.error('Error fetching attendance records:', error)
			throw new Error(handleSupabaseError(error))
		}

		// Filter attendance records by subject ID
		const attendanceRecords =
			data
				?.filter(record => {
					let lessonData: any = null
					if (Array.isArray(record.lesson)) {
						lessonData = record.lesson[0] || null
					} else {
						lessonData = record.lesson || null
					}

					return lessonData && lessonData.subjectid === subjectId
				})
				.map(record => {
					// Based on linter, record.lesson could be an array of lessons
					let lessonData: {
						id: any
						lessonname: string
						date: string
						subjectid: string
						subject:
							| { id: string; subjectname: string }[]
							| { id: string; subjectname: string }
							| null
					} | null = null

					if (Array.isArray(record.lesson)) {
						lessonData = record.lesson[0] || null
					} else {
						lessonData = (record.lesson as any) || null
					}

					let finalSubjectName = 'Unknown Subject'
					if (lessonData?.subject) {
						if (Array.isArray(lessonData.subject)) {
							finalSubjectName = lessonData.subject[0]?.subjectname || 'Unknown Subject'
						} else if (lessonData.subject) {
							finalSubjectName = lessonData.subject.subjectname || 'Unknown Subject'
						}
					}

					return {
						id: record.id,
						status: record.status,
						date: record.noted_at,
						lessonName: lessonData?.lessonname || 'Unknown Lesson',
						lessonDate: lessonData?.date,
						subjectName: finalSubjectName,
					}
				}) || []

		// Calculate statistics
		const statistics = {
			total: attendanceRecords.length,
			present: attendanceRecords.filter(r => r.status === 'present').length,
			absent: attendanceRecords.filter(r => r.status === 'absent').length,
			late: attendanceRecords.filter(r => r.status === 'late').length,
			excused: attendanceRecords.filter(r => r.status === 'excused').length,
		}

		return {
			records: attendanceRecords,
			statistics,
		}
	} catch (error) {
		console.error('Error in fetchParentChildAttendanceForSubject:', error)
		throw new Error(handleSupabaseError(error))
	}
}

// Fetch a child's attendance records for the parent
export const fetchParentChildAttendance = async (childId: string, parentId: string) => {
	try {
		console.log(`Fetching attendance for child ${childId} of parent ${parentId}`)

		// Verify parent relationship
		const { data: childVerify, error: childErrorVerify } = await supabase // Renamed to avoid conflict
			.from('users')
			.select('id')
			.eq('id', childId)
			.eq('parent_id', parentId)
			.single()

		if (childErrorVerify || !childVerify) {
			console.error('Error verifying child belongs to parent:', childErrorVerify)
			throw new Error("This child doesn't belong to the specified parent")
		}

		// Get attendance records
		const { data, error } = await supabase
			.from('attendance')
			.select(
				`
        id,
        status,
        noted_at,
        student_id,
        lesson_id,
        lesson: lessons!lesson_id (
          id,
          lessonname,
          date,
          subjectid,
          subject: subjects!subjectid (
            id,
            subjectname
          )
        )
      `
			)
			.eq('student_id', childId)
			.order('noted_at', { ascending: false })

		if (error) {
			console.error('Error fetching attendance records:', error)
			throw new Error(handleSupabaseError(error))
		}

		// Format the attendance data
		const attendanceRecords =
			data?.map(record => {
				// Based on linter, record.lesson could be an array of lessons
				let lessonData: {
					id: any
					lessonname: string
					date: string
					subjectid: string
					subject:
						| { id: string; subjectname: string }[]
						| { id: string; subjectname: string }
						| null
				} | null = null

				if (Array.isArray(record.lesson)) {
					lessonData = record.lesson[0] || null
				} else {
					lessonData = (record.lesson as any) || null // Cast to any to simplify if type is complex or varies
				}

				let finalSubjectName = 'Unknown Subject'
				if (lessonData?.subject) {
					if (Array.isArray(lessonData.subject)) {
						finalSubjectName = lessonData.subject[0]?.subjectname || 'Unknown Subject'
					} else if (lessonData.subject) {
						// Check if it's not null
						// It's already the single object { id: string; subjectname: string; }
						finalSubjectName = lessonData.subject.subjectname || 'Unknown Subject'
					}
				}

				return {
					id: record.id,
					status: record.status,
					date: record.noted_at,
					lessonName: lessonData?.lessonname || 'Unknown Lesson',
					lessonDate: lessonData?.date,
					subjectName: finalSubjectName,
				}
			}) || []

		// Calculate statistics
		const statistics = {
			total: attendanceRecords.length,
			present: attendanceRecords.filter(r => r.status === 'present').length,
			absent: attendanceRecords.filter(r => r.status === 'absent').length,
			late: attendanceRecords.filter(r => r.status === 'late').length,
			excused: attendanceRecords.filter(r => r.status === 'excused').length,
		}

		return {
			records: attendanceRecords,
			statistics,
		}
	} catch (error) {
		console.error('Error in fetchParentChildAttendance:', error)
		throw new Error(handleSupabaseError(error))
	}
}

// Fetch assignments for a child
export const fetchParentChildAssignments = async (
	childId: string,
	parentId: string
): Promise<ChildAssignment[]> => {
	try {
		// First, ensure the child belongs to the parent (optional, but good practice if parentId is available)
		// This part can be kept if your schema supports it and it's deemed necessary.
		// For now, focusing on the assignment logic.
		// const { data: childRelation, error: childRelationError } = await supabase
		//   .from('users') // Assuming 'users' table has parent_id
		//   .select('id')
		//   .eq('id', childId)
		//   .eq('parent_id', parentId)
		//   .single();

		// if (childRelationError || !childRelation) {
		//   console.error('Child does not belong to parent or error fetching relation:', childRelationError);
		//   // Depending on strictness, either throw error or return []
		//   // For now, let's proceed assuming childId is valid for the context it's used in.
		// }

		// 1. Get the class(es) the student is enrolled in
		const { data: enrollments, error: enrollmentError } = await supabase
			.from('classstudents')
			.select('classid')
			.eq('studentid', childId)

		if (enrollmentError) {
			console.error(`Error fetching enrollments for student ${childId}:`, enrollmentError)
			throw enrollmentError
		}

		if (!enrollments || enrollments.length === 0) {
			console.log(`Student ${childId} is not enrolled in any classes.`)
			return []
		}

		const classIds = enrollments.map(e => e.classid)

		// 2. Get assignments for these classes
		const { data: assignmentsData, error: assignmentsError } = await supabase
			.from('assignments')
			.select(
				`
        id,
        title,
        instructions,
        duedate,
        subject_id,
        classid,
        subject:subjects(id, subjectname)
      `
			)
			.in('classid', classIds)

		if (assignmentsError) {
			console.error('Error fetching assignments for classes:', classIds, assignmentsError)
			throw assignmentsError
		}

		if (!assignmentsData || assignmentsData.length === 0) {
			console.log('No assignments found for the classes:', classIds)
			return []
		}

		const assignmentIds = assignmentsData.map(a => a.id)

		// 3. Fetch submissions for these assignments specifically for this student
		const { data: submissionsData, error: submissionsError } = await supabase
			.from('submissions')
			.select('assignmentid, grade')
			.eq('studentid', childId)
			.in('assignmentid', assignmentIds)

		if (submissionsError) {
			console.error('Error fetching submissions for student:', childId, submissionsError)
			throw submissionsError
		}

		const submissionsMap = new Map()
		if (submissionsData) {
			submissionsData.forEach(sub => {
				submissionsMap.set(sub.assignmentid, sub)
			})
		}

		return (assignmentsData as RawAssignmentData[]).map(item => {
			const submission = submissionsMap.get(item.id)
			const isCompleted = !!submission

			const dueDate = new Date(item.duedate)
			const isPastDue = dueDate < new Date() && !isCompleted

			let subjectName = 'Unknown Subject'
			// Handle if item.subject is an array or single object
			const subjectField = item.subject // item.subject is: { id: string; subjectname: string }[] | { id: string; subjectname: string } | null
			if (subjectField) {
				if (Array.isArray(subjectField)) {
					subjectName = subjectField[0]?.subjectname || 'Unknown Subject'
				} else {
					// It's a single object
					subjectName = subjectField.subjectname || 'Unknown Subject'
				}
			}

			return {
				id: item.id,
				title: item.title,
				subjectName: subjectName,
				dueDate: item.duedate,
				isCompleted: isCompleted,
				isPastDue,
				score: submission?.grade,
				feedback: submission?.feedback === null ? undefined : submission?.feedback, // Map null to undefined
			}
		})
	} catch (err) {
		console.error('Error in fetchParentChildAssignments:', err)
		return []
	}
}

// Fetch the parent dashboard data (overview of all children)
export const fetchParentDashboard = async (parentId: string) => {
	try {
		console.log(`Fetching dashboard data for parent ${parentId}`)

		// Get all children with their summary data
		const children = await fetchParentChildrenWithResults(parentId)

		// Get recent notifications
		const notifications = await fetchParentNotifications(parentId)

		// Calculate summary data across all children
		const validChildren = children.filter(
			(child): child is NonNullable<typeof child> => child !== null
		)

		const childrenCount = validChildren.length
		const avgGpa =
			validChildren.length > 0
				? validChildren.reduce(
						(sum: number, child) => sum + parseFloat(child.performanceSummary.gpa),
						0
				  ) / validChildren.length
				: 0

		const upcomingTestsCount = validChildren.reduce(
			(sum: number, child) => sum + child.performanceSummary.upcomingTests,
			0
		)

		const recentAbsences = validChildren.reduce(
			(sum: number, child) => sum + child.recentAttendance.absent,
			0
		)

		return {
			children,
			notifications,
			summary: {
				childrenCount,
				avgGpa: avgGpa.toFixed(1),
				upcomingTestsCount,
				recentAbsences,
			},
		}
	} catch (error) {
		console.error('Error in fetchParentDashboard:', error)
		throw new Error(handleSupabaseError(error))
	}
}

// Helper function to get attendance text
const getAttendanceText = (attendance?: string) => {
	if (!attendance) return ''

	switch (attendance.toLowerCase()) {
		case 'present':
			return 'Present'
		case 'absent':
			return 'Absent'
		case 'late':
			return 'Late'
		case 'excused':
			return 'Excused'
		default:
			return attendance
	}
}

export const fetchChildAssignmentDetails = async (
	childId: string,
	assignmentId: string
): Promise<ParentDetailedAssignment | null> => {
	try {
		console.log(`Fetching details for assignment ${assignmentId} for child ${childId}`)

		// 1. Fetch the assignment details
		const { data: assignment, error: assignmentError } = await supabase
			.from('assignments')
			.select(
				`
        id,
        title,
        instructions,
        duedate,
        subject_id,
        classid,
        subject:subjects(id, subjectname)
      `
			)
			.eq('id', assignmentId)
			.single() // Assuming assignmentId is unique and we expect one record

		if (assignmentError) {
			console.error(`Error fetching assignment ${assignmentId}:`, assignmentError)
			// If error is because row not found, it might not be a critical throw,
			// but for now, let's throw to indicate failure.
			throw new Error(`Failed to fetch assignment: ${assignmentError.message}`)
		}

		if (!assignment) {
			console.warn(`Assignment ${assignmentId} not found.`)
			return null
		}

		// 2. Fetch the child's submission for this assignment
		const { data: submission, error: submissionError } = await supabase
			.from('submissions')
			.select('submittedat, grade, feedback') // Add fileurl if you handle submitted files
			.eq('studentid', childId)
			.eq('assignmentid', assignmentId)
			.maybeSingle() // Use maybeSingle as a student might not have a submission

		if (submissionError) {
			console.error(
				`Error fetching submission for assignment ${assignmentId}, child ${childId}:`,
				submissionError
			)
			// Decide if this is a critical error. A student not having a submission is normal.
			// For now, let's not throw an error here unless it's not a 'PGRST116' (row not found) style error.
			if (submissionError.code !== 'PGRST116') {
				// PGRST116: Row not found (expected if no submission)
				throw new Error(`Failed to fetch submission: ${submissionError.message}`)
			}
		}

		// 3. Combine and determine status
		const dueDate = new Date(assignment.duedate)
		const isCompleted = !!submission // Basic check: completed if submission exists
		const isPastDue = dueDate < new Date() && !isCompleted

		let statusText = 'Upcoming'
		if (isCompleted) {
			statusText =
				submission?.grade !== null && submission?.grade !== undefined ? 'Graded' : 'Submitted'
		} else if (isPastDue) {
			statusText = 'Overdue'
		} else {
			// More nuanced status based on due date proximity can be added here
			const daysRemaining = (dueDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24)
			if (daysRemaining <= 3) statusText = 'Due Soon'
			// else statusText = 'Upcoming'; // already default
		}

		let subjectNameStr = 'Unknown Subject'
		if (
			assignment.subject &&
			Array.isArray(assignment.subject) &&
			assignment.subject.length > 0 &&
			assignment.subject[0]
		) {
			subjectNameStr = assignment.subject[0].subjectname || 'Unknown Subject'
		} else if (assignment.subject && !Array.isArray(assignment.subject)) {
			subjectNameStr =
				(assignment.subject as { subjectname: string }).subjectname || 'Unknown Subject'
		}

		return {
			id: assignment.id,
			title: assignment.title,
			instructions: assignment.instructions,
			dueDate: assignment.duedate,
			subjectName: subjectNameStr,
			submittedAt: submission?.submittedat || null,
			grade: submission?.grade !== undefined ? submission.grade : null,
			feedback: submission?.feedback || null,
			isCompleted,
			isPastDue,
			statusText,
		}
	} catch (error: any) {
		console.error('Error in fetchChildAssignmentDetails:', error)
		// Depending on how you want to handle errors in the UI,
		// you might rethrow, or return null/specific error object.
		// For now, rethrowing to be caught by the screen.
		throw error
	}
}

// Helper function to convert day integer (0-6 or 1-7) to day name
const getDayName = (dayInt?: number): string => {
	if (dayInt === undefined || dayInt === null) return 'Unknown Day'
	// Assuming 0 = Sunday, 1 = Monday ... 6 = Saturday (adjust if your db uses a different convention e.g. 1-7 Mon-Sun)
	const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
	return days[dayInt] || 'Invalid Day'
}

// Helper function to format time from hours and minutes
const formatTime = (hour?: number, minute?: number): string => {
	if (hour === undefined || hour === null || minute === undefined || minute === null) return 'N/A'
	// Ensure minute is treated as a number and defaults to 0 if undefined in a way that satisfies TypeScript
	const mVal = minute ?? 0
	const h = hour.toString().padStart(2, '0')
	const m = mVal.toString().padStart(2, '0')
	return `${h}:${m}`
}

export const fetchChildTimetable = async (childId: string): Promise<TimetableEntry[]> => {
	try {
		console.log(`[ParentScheduleScreen] Fetching timetable for child ${childId} using new schema`)

		const { data: enrollments, error: enrollmentError } = await supabase
			.from('classstudents')
			.select('classid')
			.eq('studentid', childId)

		if (enrollmentError) {
			console.error(`Error fetching enrollments for timetable, child ${childId}:`, enrollmentError)
			throw new Error(`Failed to fetch enrollments: ${enrollmentError.message}`)
		}

		if (!enrollments || enrollments.length === 0) {
			console.log(`Child ${childId} has no class enrollments for timetable.`)
			return []
		}

		const classIds = enrollments.map(e => e.classid)

		const { data: timetableEntriesData, error: timetableError } = await supabase
			.from('timetable')
			.select(
				`
        id,
        day,
        start_time,
        start_minute,
        end_time,
        end_minute,
        location,
        title,
        color,
        classId,
        subjectId,
        subject:subjects!subjectId (id, subjectname)
      `
			)
			.in('classId', classIds)

		if (timetableError) {
			console.error(`Error fetching timetable for classes ${classIds.join(', ')}:`, timetableError)
			throw new Error(`Failed to fetch timetable: ${timetableError.message}`)
		}

		if (!timetableEntriesData || timetableEntriesData.length === 0) {
			return []
		}

		// Extract unique subject IDs for fetching relevant teacher assignments
		const uniqueSubjectIds = Array.from(
			new Set(timetableEntriesData.map(entry => entry.subjectId).filter(id => id !== null))
		) as string[]

		let teacherAssignmentsMap: Map<string, { firstName?: string; lastName?: string }> = new Map()

		if (uniqueSubjectIds.length > 0) {
			const { data: classTeacherData, error: ctError } = await supabase
				.from('classteachers')
				.select(
					`
            classid,
            subjectid,
            teacher:users!teacherid (firstName, lastName)
          `
				)
				.in('classid', classIds)
				.in('subjectid', uniqueSubjectIds)

			if (ctError) {
				console.warn(`Could not fetch teacher assignments: ${ctError.message}`)
			} else if (classTeacherData) {
				classTeacherData.forEach((assignment: any) => {
					const key = `${assignment.classid}-${assignment.subjectid}`
					if (assignment.teacher) {
						// teacher should be an object due to !teacherid syntax
						const teacherData = assignment.teacher as { firstName?: string; lastName?: string }
						teacherAssignmentsMap.set(key, {
							firstName: teacherData.firstName,
							lastName: teacherData.lastName,
						})
					}
				})
			}
		}

		return timetableEntriesData.map((entry: any) => {
			const startTimeStr = formatTime(entry.start_time, entry.start_minute)
			const endTimeStr = formatTime(entry.end_time, entry.end_minute)

			const subjectData = entry.subject as { id: string; subjectname: string } | null // Expect single object or null
			const subjectName = subjectData?.subjectname || 'N/A'

			let teacherName = 'N/A'
			const teacherMapKey = `${entry.classId}-${entry.subjectId}`
			const assignedTeacher = teacherAssignmentsMap.get(teacherMapKey)
			if (assignedTeacher) {
				teacherName =
					`${assignedTeacher.firstName || ''} ${assignedTeacher.lastName || ''}`.trim() || 'N/A'
			}

			return {
				id: entry.id.toString(),
				dayOfWeek: getDayName(entry.day),
				startTime: startTimeStr,
				endTime: endTimeStr,
				subjectName: entry.title || subjectName,
				teacherName: teacherName,
				room: entry.location || undefined,
				color: entry.color || undefined,
			}
		})
	} catch (error: any) {
		console.error('Error in fetchChildTimetable:', error)
		throw error
	}
}

// Fetch a list of children for a given parent
export const fetchParentChildrenList = async (parentId: string): Promise<ParentChildListItem[]> => {
	try {
		console.log(`[parentSupabaseService] Fetching children list for parent: ${parentId}`)
		// Assuming students have parent_id field in the 'users' table
		// And a role, e.g., 'student'
		// Adjust 'full_name' if your name column is different (e.g., 'name', 'username')
		const { data, error } = await supabase
			.from('users')
			.select('id, fullName') // Corrected to full_name, assuming this is the DB column
			.eq('parent_id', parentId)
			.eq('role', 'Student') // Changed to 'Student' (capitalized) for consistency

		if (error) {
			console.error(
				`[parentSupabaseService] Error fetching children for parent ${parentId}:`,
				error
			)
			throw new Error(`Failed to fetch children: ${error.message}`)
		}

		if (!data) {
			console.log(`[parentSupabaseService] No children found for parent ${parentId}.`)
			return []
		}

		const childrenList: ParentChildListItem[] = data.map(child => ({
			id: child.id,
			fullName: child.fullName || 'N/A', // Map from full_name
		}))

		console.log(
			`[parentSupabaseService] Successfully fetched ${childrenList.length} children for parent ${parentId}.`
		)
		return childrenList
	} catch (e: any) {
		console.error(
			`[parentSupabaseService] Exception in fetchParentChildrenList for parent ${parentId}:`,
			e
		)
		throw e // Re-throw the error to be caught by the caller
	}
}

// Fetch message for a specific score value
export const fetchScoreMessage = async (score: number): Promise<string | null> => {
	try {
		// Find the closest score message
		const { data, error } = await supabase
			.from('score_messages')
			.select('message, score')
			.order('score', { ascending: false })

		if (error) throw error

		if (!data || data.length === 0) return null

		// Find the appropriate message based on the score
		// We want to find the highest score that is less than or equal to the given score
		let bestMatch = null
		for (const item of data) {
			if (item.score !== null && item.score <= score) {
				bestMatch = item.message
				break
			}
		}

		return bestMatch
	} catch (error) {
		console.error('Error fetching score message:', error)
		return null
	}
}

// Create a grade notification when a new score is added
export const createScoreNotification = async (
	score: number,
	studentId: string,
	subjectId: string,
	lessonName: string
): Promise<void> => {
	try {
		// First, find the parent of this student
		const { data: student, error: studentError } = await supabase
			.from('users')
			.select('parent_id, firstName, lastName')
			.eq('id', studentId)
			.single()

		if (studentError || !student || !student.parent_id) {
			console.error('Error finding parent for student:', studentError || 'No parent found')
			return
		}

		// Get the subject name
		const { data: subject, error: subjectError } = await supabase
			.from('subjects')
			.select('subjectname')
			.eq('id', subjectId)
			.single()

		if (subjectError || !subject) {
			console.error('Error finding subject:', subjectError || 'No subject found')
			return
		}

		// Get encouraging message for this score
		const scoreMessage = await fetchScoreMessage(score)

		// Convert score to letter grade
		const letterGrade = convertScoreToLetterGrade(score)

		// Create a title and message for the notification
		const title = `New Grade: ${letterGrade} in ${subject.subjectname}`
		const message = `${student.firstName} received a score of ${score} on ${lessonName}. ${
			scoreMessage || ''
		}`

		// Create the notification in the announcements table
		// Note: In a production app, you'd create a dedicated notifications table
		const { error: insertError } = await supabase.from('announcements').insert({
			title,
			content: message,
			targetAudience: 'Parents', // Target just parents
			isImportant: score < 6, // Mark as important if score is low
			target_student_id: studentId, // Add student reference
			target_subject_id: subjectId, // Add subject reference
		})

		if (insertError) {
			console.error('Error creating score notification:', insertError)
			return
		}

		console.log('Score notification created successfully')
	} catch (error) {
		console.error('Error creating score notification:', error)
	}
}

// Find the fetchLatestScoreForStudent function and update it to sort by updated_at
export const fetchLatestScoreForStudent = async (studentId: string) => {
	try {
		// Get latest score for a student
		const { data, error } = await supabase
			.from('scores')
			.select(
				`
        id,
        score,
        updated_at,
        created_at,
        student_id,
        lesson_id,
        lessons:lesson_id (
          id,
          lessonname,
          subjectid
        )
      `
			)
			.eq('student_id', studentId)
			.order('updated_at', { ascending: false }) // Sort by updated_at, newest first
			.limit(1) // Get only the latest one for the dashboard

		if (error) throw error

		if (!data || data.length === 0) return null

		const score = data[0]

		// Get subject details
		const { data: subjectData, error: subjectError } = await supabase
			.from('subjects')
			.select('id, subjectname')
			.eq('id', score.lessons?.subjectid)
			.single()

		if (subjectError) {
			console.error('Error fetching subject details:', subjectError)
		}

		return {
			id: score.id,
			score: score.score,
			updated_at: score.updated_at,
			created_at: score.created_at,
			student_id: score.student_id,
			lesson_id: score.lesson_id,
			lesson: score.lessons?.lessonname || 'Unknown Lesson',
			subject: subjectData?.subjectname || 'Unknown Subject',
			subjectId: score.lessons?.subjectid || 0,
		}
	} catch (error) {
		console.error('Error fetching latest score:', error)
		return null
	}
}

// Find the fetchLatestAttendanceForStudent function and update it to sort by noted_at
export const fetchLatestAttendanceForStudent = async (studentId: string) => {
	try {
		// Get latest attendance record for a student
		const { data, error } = await supabase
			.from('attendance')
			.select(
				`
        id,
        status,
        noted_at,
        student_id,
        lesson_id,
        lessons:lesson_id (
          id,
          lessonname,
          subjectid
        )
      `
			)
			.eq('student_id', studentId)
			.order('noted_at', { ascending: false }) // Sort by noted_at, newest first
			.limit(1) // Get only the latest one for the dashboard

		if (error) throw error

		if (!data || data.length === 0) return null

		const attendance = data[0]

		// Get subject details
		const { data: subjectData, error: subjectError } = await supabase
			.from('subjects')
			.select('id, subjectname')
			.eq('id', attendance.lessons?.subjectid)
			.single()

		if (subjectError) {
			console.error('Error fetching subject details:', subjectError)
		}

		return {
			id: attendance.id,
			status: attendance.status,
			noted_at: attendance.noted_at || new Date().toISOString(), // Only use noted_at
			student_id: attendance.student_id,
			lesson_id: attendance.lesson_id,
			lessonName: attendance.lessons?.lessonname || 'Unknown Lesson',
			subject: subjectData?.subjectname || 'Unknown Subject',
			subjectId: attendance.lessons?.subjectid || 0,
		}
	} catch (error) {
		console.error('Error fetching latest attendance:', error)
		return null
	}
}

// Interface for unified notification item
import { NotificationItem } from '../components/parent/UnifiedNotificationHandler'

/**
 * Fetch unified notifications from multiple sources:
 * - Scores (grades) for the parent's children
 * - Attendance records for the parent's children
 * - Announcements targeted to parents
 *
 * @param parentId The ID of the parent user
 * @returns Array of unified notifications
 */
export const fetchUnifiedNotifications = async (parentId: string): Promise<NotificationItem[]> => {
	try {
		console.log(`[fetchUnifiedNotifications] Fetching notifications for parent: ${parentId}`)
		const notifications: NotificationItem[] = []

		// Step 1: Get the parent's children
		const { data: childrenData, error: childrenError } = await supabase
			.from('users')
			.select('id, firstName, lastName')
			.eq('parent_id', parentId)
			.eq('role', 'Student')

		if (childrenError) {
			console.error('[fetchUnifiedNotifications] Error fetching children:', childrenError)
			throw childrenError
		}

		const childIds = childrenData.map(child => child.id)
		console.log(`[fetchUnifiedNotifications] Found ${childIds.length} children:`, childIds)

		if (childIds.length === 0) {
			console.log('[fetchUnifiedNotifications] No children found, only fetching announcements')
		} else {
			// Step 2: Fetch scores for all children
			const { data: scoresData, error: scoresError } = await supabase
				.from('scores')
				.select(
					`
					id,
					student_id,
					lesson_id,
					score,
					comment,
					created_at,
					updated_at,
					lessons:lesson_id(
						id,
						lessonname,
						subjectid,
						subjects:subjectid(
							id,
							subjectname
						)
					)
				`
				)
				.in('student_id', childIds)
				.order('created_at', { ascending: false })
				.limit(50) // Limit to the most recent 50 scores

			if (scoresError) {
				console.error('[fetchUnifiedNotifications] Error fetching scores:', scoresError)
			} else if (scoresData && scoresData.length > 0) {
				console.log(`[fetchUnifiedNotifications] Found ${scoresData.length} scores`)

				// Process each score into a notification item
				for (const score of scoresData) {
					try {
						// Find the student from our childrenData
						const student = childrenData.find(child => child.id === score.student_id)
						if (!student) continue

						const studentName = `${student.firstName} ${student.lastName}`

						// Get subject name from the lesson
						let subjectName = 'Unknown Subject'
						let lessonName = 'Unknown Lesson'

						if (score.lessons) {
							lessonName = score.lessons.lessonname || 'Unknown Lesson'

							if (score.lessons.subjects) {
								subjectName = score.lessons.subjects.subjectname || 'Unknown Subject'
							}
						}

						const notification: NotificationItem = {
							id: `score-${score.id}`,
							type: 'score',
							content: `${studentName} received a score of ${
								score.score
							} in ${subjectName} (${lessonName})${score.comment ? ` - ${score.comment}` : ''}`,
							timestamp: score.updated_at || score.created_at,
							studentId: score.student_id,
							read: false, // Will be updated from store
						}

						notifications.push(notification)
					} catch (err) {
						console.error('[fetchUnifiedNotifications] Error processing score:', err)
					}
				}
			}

			// Step 3: Fetch attendance records for all children
			const { data: attendanceData, error: attendanceError } = await supabase
				.from('attendance')
				.select(
					`
					id,
					student_id,
					lesson_id,
					status,
					noted_at,
					lessons:lesson_id(
						id,
						lessonname,
						subjectid,
						subjects:subjectid(
							id,
							subjectname
						)
					)
				`
				)
				.in('student_id', childIds)
				.order('noted_at', { ascending: false })
				.limit(50) // Limit to the most recent 50 attendance records

			if (attendanceError) {
				console.error('[fetchUnifiedNotifications] Error fetching attendance:', attendanceError)
			} else if (attendanceData && attendanceData.length > 0) {
				console.log(`[fetchUnifiedNotifications] Found ${attendanceData.length} attendance records`)

				// Process each attendance record into a notification item
				for (const record of attendanceData) {
					try {
						// Find the student from our childrenData
						const student = childrenData.find(child => child.id === record.student_id)
						if (!student) continue

						const studentName = `${student.firstName} ${student.lastName}`
						const status = record.status
							? record.status.charAt(0).toUpperCase() + record.status.slice(1)
							: 'Unknown'

						// Get subject name from the lesson
						let subjectName = 'Unknown Subject'
						let lessonName = 'Unknown Lesson'

						if (record.lessons) {
							lessonName = record.lessons.lessonname || 'Unknown Lesson'

							if (record.lessons.subjects) {
								subjectName = record.lessons.subjects.subjectname || 'Unknown Subject'
							}
						}

						const notification: NotificationItem = {
							id: `attendance-${record.id}`,
							type: 'attendance',
							content: `${studentName} was marked ${status} in ${subjectName} (${lessonName})`,
							timestamp: record.noted_at,
							studentId: record.student_id,
							read: false, // Will be updated from store
						}

						notifications.push(notification)
					} catch (err) {
						console.error('[fetchUnifiedNotifications] Error processing attendance:', err)
					}
				}
			}
		}

		// Step 4: Fetch announcements (for all parents)
		const { data: announcementsData, error: announcementsError } = await supabase
			.from('announcements')
			.select('*')
			.or('targetAudience.eq.ALL,targetAudience.eq.Parents,targetAudience.eq.Parent')
			.order('created_at', { ascending: false })
			.limit(50) // Limit to the most recent 50 announcements

		if (announcementsError) {
			console.error('[fetchUnifiedNotifications] Error fetching announcements:', announcementsError)
		} else if (announcementsData && announcementsData.length > 0) {
			console.log(`[fetchUnifiedNotifications] Found ${announcementsData.length} announcements`)

			// Process each announcement into a notification item
			for (const announcement of announcementsData) {
				try {
					const title = announcement.title || 'New Announcement'
					const content = announcement.content || ''

					const notification: NotificationItem = {
						id: `announcement-${announcement.id}`,
						type: 'announcement',
						content: `${title}: ${content}`,
						timestamp: announcement.updated_at || announcement.created_at,
						read: false, // Will be updated from store
					}

					notifications.push(notification)
				} catch (err) {
					console.error('[fetchUnifiedNotifications] Error processing announcement:', err)
				}
			}
		}

		// Step 5: Sort all notifications by timestamp (newest first)
		notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

		console.log(`[fetchUnifiedNotifications] Returning ${notifications.length} total notifications`)
		return notifications
	} catch (error) {
		console.error('[fetchUnifiedNotifications] Error fetching unified notifications:', error)
		return []
	}
}
