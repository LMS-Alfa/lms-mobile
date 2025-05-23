import { supabase, handleSupabaseError } from '../utils/supabase';

// Assignment interfaces
export interface Assignment {
  id: number;
  title: string;
  description: string | null;
  duedate: string | null;
  classid: number | null;
  teacherid: string | null;
  createdat: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'overdue';
  maxscore: number | null;
  subject?: {
    id: number;
    subjectname: string;
    code: string;
  };
  attachments?: string[];
  submissions?: AssignmentSubmission[];
}

export interface AssignmentSubmission {
  id: number;
  assignmentid: number;
  studentid: string;
  submittedat: string;
  grade: number | null;
  feedback: string | null;
  attachments: string[] | null;
}

/**
 * Fetch all assignments for a student
 * @param studentId The ID of the student
 * @returns A promise that resolves to an array of assignments
 */
export const getStudentAssignments = async (studentId: string): Promise<Assignment[]> => {
  try {
    console.log('Fetching assignments for student:', studentId);
    
    // First, get all classes the student is enrolled in
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('classstudents')
      .select('classid')
      .eq('studentid', studentId);
    
    if (enrollmentsError) {
      throw new Error(handleSupabaseError(enrollmentsError));
    }
    
    if (!enrollments || enrollments.length === 0) {
      console.log('Student is not enrolled in any classes');
      return [];
    }
    
    const classIds = enrollments.map(e => e.classid);
    console.log('Student is enrolled in classes:', classIds);
    
    // Get all assignments for these classes
    const { data: assignments, error: assignmentsError } = await supabase
      .from('assignments')
      .select(`
        *
      `)
      .in('classid', classIds)
      .order('duedate', { ascending: false });
    
    if (assignmentsError) {
      throw new Error(handleSupabaseError(assignmentsError));
    }
    
    if (!assignments) {
      return [];
    }
    
    // Get submissions for these assignments
    const assignmentIds = assignments.map(a => a.id);
    const { data: submissions, error: submissionsError } = await supabase
      .from('submissions')
      .select('*')
      .in('assignmentid', assignmentIds)
      .eq('studentid', studentId);
    
    if (submissionsError) {
      throw new Error(handleSupabaseError(submissionsError));
    }
    
    // Create a map of submissions by assignment ID
    const submissionsByAssignment = {};
    if (submissions) {
      submissions.forEach(submission => {
        if (!submissionsByAssignment[submission.assignmentid]) {
          submissionsByAssignment[submission.assignmentid] = [];
        }
        submissionsByAssignment[submission.assignmentid].push(submission);
      });
    }
    
    // Calculate assignment status based on due date and submissions
    const now = new Date();
    const processedAssignments = assignments.map(assignment => {
      const assignmentSubmissions = submissionsByAssignment[assignment.id] || [];
      let status: 'not_started' | 'in_progress' | 'completed' | 'overdue' = 'not_started';
      
      // If there are submissions, mark as completed
      if (assignmentSubmissions.length > 0) {
        status = 'completed';
      } 
      // If due date is in the past and no submissions, mark as overdue
      else if (assignment.duedate && new Date(assignment.duedate) < now) {
        status = 'overdue';
      }
      
      return {
        ...assignment,
        status,
        submissions: assignmentSubmissions
      };
    });
    
    console.log(`Found ${processedAssignments.length} assignments for student`);
    return processedAssignments;
    
  } catch (error) {
    console.error('Error fetching student assignments:', error);
    throw error;
  }
};

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
        attachments: attachments
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(handleSupabaseError(error));
    }
    
    if (!data) {
      throw new Error('Failed to create assignment submission');
    }
    
    return data;
  } catch (error) {
    console.error('Error submitting assignment:', error);
    throw error;
  }
}; 