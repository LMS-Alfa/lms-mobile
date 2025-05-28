import ParentAssignmentDetailScreen from '../screens/parent/ParentAssignmentDetailScreen'
import ParentSubjectDetailScreen from '../screens/parent/ParentSubjectDetailScreen'

export type ParentStackParamList = {
  ParentDashboard: undefined
  ParentChildGrades: { childId: string; childName: string }
  ParentChildAttendance: { childId: string; childName: string }
  ParentChildAssignments: { childId: string; childName: string }
  ParentChildSchedule: { childId: string; childName: string }
  ParentNotifications: undefined
  ParentSettings: undefined
  ParentAssignmentDetail: { assignmentId: string; childId: string }
  SubjectDetail: { 
    childId: string; 
    parentId: string; 
    subjectId: string; 
    subjectName: string 
  }
} 