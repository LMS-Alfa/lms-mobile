import { SubjectGrade } from './gradesService'
import {
	fetchChildGrades,
	fetchParentChildAttendance,
	fetchParentChildren,
	fetchParentChildrenWithResults,
	fetchParentChildSubjectGradesForSubject,
	fetchParentNotifications,
	markParentNotificationAsRead,
} from './parentSupabaseService'

// Interface for child data
export interface ChildData {
	id: string
	firstName: string
	lastName: string
	grade: string
	className: string
	avatar?: string
	recentAttendance: {
		present: number
		absent: number
		late: number
		excused: number
	}
	performanceSummary: {
		gpa: string
		totalAssignments: number
		completedAssignments: number
		upcomingTests: number
	}
}

// Interface for notification
export interface ParentNotification {
	id: string
	title: string
	message: string
	date: string
	created_at?: string
	updated_at?: string
	type: 'grade' | 'attendance' | 'behavior' | 'announcement' | 'event'
	read: boolean
	relatedStudentId?: string
	relatedSubjectId?: number
}

// Get children information for parent - now uses real data
export async function getParentChildren(parentId: string): Promise<ChildData[]> {
	return fetchParentChildren(parentId)
}

// Get notifications for parent - now uses real data
export async function getParentNotifications(parentId: string): Promise<ParentNotification[]> {
	return fetchParentNotifications(parentId)
}

// Mark notification as read - now uses real data
export async function markNotificationAsRead(notificationId: string): Promise<void> {
	return markParentNotificationAsRead(notificationId)
}

// Get grades for a child - now uses real data
export async function getChildGrades(childId: string): Promise<SubjectGrade[]> {
	return fetchChildGrades(childId)
}

// Get grades for a specific subject - now uses real data
export async function getChildSubjectGrades(
	childId: string,
	subjectId: string,
	parentId: string
): Promise<SubjectGrade | null> {
	return fetchParentChildSubjectGradesForSubject(childId, parentId, subjectId)
}

// Get attendance summary for a child - now uses real data
export async function getChildAttendanceSummary(childId: string, parentId: string) {
	const result = await fetchParentChildAttendance(childId, parentId)
	return result.statistics
}

// Get performance summary for a child - now uses real data
export async function getChildPerformanceSummary(childId: string, parentId: string) {
	const children = await fetchParentChildrenWithResults(parentId)
	const child = children.find(c => c.id === childId)
	return (
		child?.performanceSummary || {
			gpa: '0.0',
			totalAssignments: 0,
			completedAssignments: 0,
			upcomingTests: 0,
		}
	)
}
