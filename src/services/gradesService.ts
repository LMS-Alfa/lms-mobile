import { supabase, handleSupabaseError } from '../utils/supabase';

// Define the structure for subject grades
export interface SubjectGrade {
  id: number;
  subjectName: string;
  teacherName: string;
  className: string;
  color: string;
  averageGrade: string;
  numericGrade: number;
  grades: GradeItem[];
  hasGrades: boolean; // Flag to check if subject has any grades
}

// Define the structure for individual grade items
export interface GradeItem {
  id: number;
  title: string;
  grade: string;
  score: number | null;  // Now can be null for attendance-only entries
  date: string;
  type: 'exam' | 'quiz' | 'assignment' | 'lab' | 'participation' | 'presentation' | 'other';
  attendance?: string; // Optional attendance status
  lessonId?: string;   // Lesson ID for reference
}

// Interface for lessons returned from the database
interface LessonData {
  id: string;
  lessonname: string;
  date: string;
  subjectid: string;
}

// Interface for a score entry
interface ScoreData {
  id: number;
  score: number;
  created_at: string;
  quarter_id?: string;
  lesson_id: string;
  lessons: LessonData;
}

// Interface for attendance data
interface AttendanceData {
  id: string;
  lesson_id: string;
  student_id: string;
  status: string;
  noted_at: string;
  quarter_id?: string;
}

/**
 * Get all subjects with grades for a student
 */
export async function getStudentGrades(studentId: string): Promise<SubjectGrade[]> {
  try {
    // Check if studentId is valid
    if (!studentId || studentId.trim() === '') {
      console.error('Invalid student ID provided');
      return [];
    }

    console.log('Fetching grades data for student ID:', studentId);

    // Get student's classes information
    const { data: studentClasses, error: studentClassesError } = await supabase
      .from('classstudents')
      .select('classid')
      .eq('studentid', studentId);

    if (studentClassesError) {
      throw new Error(handleSupabaseError(studentClassesError));
    }

    if (!studentClasses || studentClasses.length === 0) {
      console.warn('No classes found for student ID:', studentId);
      return [];
    }

    // Extract class IDs
    const classIds = studentClasses.map(item => item.classid);
    console.log('Student is enrolled in classes:', classIds);

    // Get classes information
    const { data: classesData, error: classesError } = await supabase
      .from('classes')
      .select('id, classname, teacherid')
      .in('id', classIds);

    if (classesError) {
      throw new Error(handleSupabaseError(classesError));
    }

    // Get subjects for those classes
    const { data: classSubjectsData, error: classSubjectsError } = await supabase
      .from('classsubjects')
      .select(`
        id, 
        classid, 
        subjectid
      `)
      .in('classid', classIds);

    if (classSubjectsError) {
      throw new Error(handleSupabaseError(classSubjectsError));
    }

    if (!classSubjectsData || classSubjectsData.length === 0) {
      console.warn('No subjects found for classes:', classIds);
      return [];
    }

    // Get teacher information
    const teacherIds = classesData
      .map(c => c.teacherid)
      .filter((id, index, self) => id && self.indexOf(id) === index);

    const { data: teachersData, error: teachersError } = await supabase
      .from('users')
      .select('id, firstName, lastName')
      .in('id', teacherIds);

    if (teachersError) {
      throw new Error(handleSupabaseError(teachersError));
    }

    // Get subject details
    const subjectIds = classSubjectsData.map(cs => cs.subjectid);
    const { data: subjectsData, error: subjectsError } = await supabase
      .from('subjects')
      .select('id, subjectname')
      .in('id', subjectIds);

    if (subjectsError) {
      throw new Error(handleSupabaseError(subjectsError));
    }

    // Get all lessons data
    const { data: allLessonsData, error: lessonsError } = await supabase
      .from('lessons')
      .select('id, lessonname, date, subjectid')
      .in('subjectid', subjectIds);

    if (lessonsError) {
      console.error('Error fetching lessons data:', lessonsError);
      // Continue without all lessons if there's an error
    }

    // Get attendance data for this student
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('attendance')
      .select('*')
      .eq('student_id', studentId);

    if (attendanceError) {
      console.error('Error fetching attendance data:', attendanceError);
      // Continue without attendance data if there's an error
    }

    // Create a map of lesson_id to attendance status and lesson data for quick lookup
    const attendanceMap = new Map<string, string>();
    const lessonMap = new Map<string, LessonData>();
    
    // Map for lessons by subject
    const lessonsBySubject = new Map<string, LessonData[]>();

    // Populate lesson maps
    if (allLessonsData && allLessonsData.length > 0) {
      allLessonsData.forEach((lesson: LessonData) => {
        lessonMap.set(lesson.id, lesson);
        
        // Group lessons by subject
        if (!lessonsBySubject.has(lesson.subjectid)) {
          lessonsBySubject.set(lesson.subjectid, []);
        }
        lessonsBySubject.get(lesson.subjectid)?.push(lesson);
      });
    }

    // Populate attendance map
    if (attendanceData && attendanceData.length > 0) {
      attendanceData.forEach((attendance: AttendanceData) => {
        attendanceMap.set(attendance.lesson_id, attendance.status);
      });
    }

    // Get quarters information
    const { data: quartersData, error: quartersError } = await supabase
      .from('quarters')
      .select('*')
      .order('start_date', { ascending: true });

    if (quartersError) {
      throw new Error(handleSupabaseError(quartersError));
    }

    // Array to store our processed subjects with grades
    const subjectsWithGrades: SubjectGrade[] = [];

    // Process each subject
    for (const classSubject of classSubjectsData) {
      const subject = subjectsData.find(s => s.id === classSubject.subjectid);
      const classInfo = classesData.find(c => c.id === classSubject.classid);
      
      if (!subject || !classInfo) continue;

      const teacher = teachersData.find(t => t.id === classInfo.teacherid);
      const teacherName = teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unknown Teacher';

      // Get scores for this student and subject
      const { data: scoresData, error: scoresError } = await supabase
        .from('scores')
        .select(`
          id,
          score,
          created_at,
          quarter_id,
          lesson_id,
          lessons (
            id,
            lessonname,
            date,
            subjectid
          )
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (scoresError) {
        console.error(`Error fetching scores for subject ${subject.id}:`, scoresError);
        continue;
      }

      // Cast the scores to the correct type and filter by subject
      const scores = scoresData as unknown as ScoreData[];
      const subjectScores = scores?.filter(score => {
        // Only include scores that have lesson data and match the current subject
        return score.lessons && score.lessons.subjectid === subject.id.toString();
      });

      // Convert scores to grade items
      const gradeItems: GradeItem[] = [];
      let totalScore = 0;
      let scoreCount = 0;
      const processedLessonIds = new Set<string>();

      // First process lessons with scores
      if (subjectScores && subjectScores.length > 0) {
        subjectScores.forEach(score => {
          if (score.score !== null) {
            // Keep original 10-point scale score for display
            const originalScore = score.score;
            
            totalScore += originalScore;
            scoreCount++;

            // Look up attendance for this lesson
            const attendanceStatus = attendanceMap.get(score.lesson_id);
            processedLessonIds.add(score.lesson_id);

            gradeItems.push({
              id: score.id,
              title: score.lessons.lessonname || `Lesson ${score.lesson_id}`,
              grade: getLetterGradeFor10PointSystem(originalScore),
              score: originalScore,
              date: score.lessons.date || score.created_at,
              type: 'other', // Default type
              attendance: attendanceStatus, // Include attendance from the map
              lessonId: score.lesson_id
            });
          }
        });
      }

      // Then add lessons that only have attendance records but no scores
      // Get all lessons for this subject
      const subjectLessons = lessonsBySubject.get(subject.id.toString()) || [];
      
      // Add lessons with attendance but no scores
      subjectLessons.forEach(lesson => {
        const lessonId = lesson.id;
        
        // Skip if already processed (has a score)
        if (processedLessonIds.has(lessonId)) return;
        
        // Check if there's attendance for this lesson
        const attendanceStatus = attendanceMap.get(lessonId);
        if (attendanceStatus) {
          gradeItems.push({
            id: parseInt(lessonId), // Convert to number for ID
            title: lesson.lessonname || `Lesson ${lessonId}`,
            grade: "N/A", // No grade for lessons without scores
            score: null, // No score
            date: lesson.date,
            type: 'other',
            attendance: attendanceStatus,
            lessonId: lessonId
          });
        }
      });

      // Sort all grade items by date (descending)
      gradeItems.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      });

      // Calculate average grade on 10-point scale
      const averageScore = scoreCount > 0 ? totalScore / scoreCount : 0;
      
      // If there are no grades, display "No grades" instead of a letter grade
      const hasGrades = scoreCount > 0;
      const letterGrade = hasGrades ? getLetterGradeFor10PointSystem(averageScore) : "No grades";

      // Add subject to the array
      subjectsWithGrades.push({
        id: subject.id,
        subjectName: subject.subjectname,
        teacherName: teacherName,
        className: classInfo.classname,
        color: getSubjectColor(subject.subjectname),
        averageGrade: letterGrade,
        numericGrade: hasGrades ? Math.round(averageScore * 10) : 0, // Scale to 0-100 for GPA calculation
        grades: gradeItems,
        hasGrades: hasGrades
      });
    }

    return subjectsWithGrades;
  } catch (error) {
    console.error('Error fetching student grades:', error);
    throw error;
  }
}

/**
 * Get detailed grades for a specific subject
 */
export async function getSubjectGrades(studentId: string, subjectId: number): Promise<GradeItem[]> {
  try {
    // Get all lessons for this subject
    const { data: lessonsData, error: lessonsError } = await supabase
      .from('lessons')
      .select('id, lessonname, date, subjectid')
      .eq('subjectid', subjectId.toString())
      .order('date', { ascending: false });

    if (lessonsError) {
      console.error('Error fetching lessons:', lessonsError);
      // Continue with other data
    }

    // Create a map of lessons by ID
    const lessonMap = new Map<string, LessonData>();
    if (lessonsData && lessonsData.length > 0) {
      lessonsData.forEach((lesson: LessonData) => {
        lessonMap.set(lesson.id, lesson);
      });
    }

    // Get scores for the student
    const { data: scoresData, error: scoresError } = await supabase
      .from('scores')
      .select(`
        id,
        score,
        created_at,
        quarter_id,
        lesson_id,
        lessons (
          id,
          lessonname,
          date,
          subjectid
        )
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (scoresError) {
      throw new Error(handleSupabaseError(scoresError));
    }

    // Get attendance data for this student
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('attendance')
      .select('*')
      .eq('student_id', studentId);

    if (attendanceError) {
      console.error('Error fetching attendance data:', attendanceError);
      // Continue without attendance data if there's an error
    }

    // Create a map of lesson_id to attendance status for quick lookup
    const attendanceMap = new Map<string, string>();
    if (attendanceData && attendanceData.length > 0) {
      attendanceData.forEach((attendance: AttendanceData) => {
        attendanceMap.set(attendance.lesson_id, attendance.status);
      });
    }

    // Cast to the correct type
    const scores = scoresData as unknown as ScoreData[];

    // Filter scores by subject using the lessons' subjectid
    const subjectScores = scores.filter(score => {
      // Only include scores that have lesson data and match the requested subject
      return score.lessons && score.lessons.subjectid === subjectId.toString();
    });

    // Track processed lesson IDs to avoid duplicates
    const processedLessonIds = new Set<string>();
    const gradeItems: GradeItem[] = [];

    // First add items with scores
    subjectScores.forEach(score => {
      // Keep original 10-point score
      const originalScore = score.score;
      
      // Look up attendance for this lesson
      const attendanceStatus = attendanceMap.get(score.lesson_id);
      processedLessonIds.add(score.lesson_id);
      
      gradeItems.push({
        id: score.id,
        title: score.lessons.lessonname || `Lesson ${score.lesson_id}`,
        grade: getLetterGradeFor10PointSystem(originalScore),
        score: originalScore,
        date: score.lessons.date || score.created_at,
        type: 'other', // Default type
        attendance: attendanceStatus, // Include attendance from the map
        lessonId: score.lesson_id
      });
    });

    // Then add lessons with attendance but no scores
    if (lessonsData) {
      lessonsData.forEach(lesson => {
        const lessonId = lesson.id;
        
        // Skip if already processed (has a score)
        if (processedLessonIds.has(lessonId)) return;
        
        // Check if there's attendance for this lesson
        const attendanceStatus = attendanceMap.get(lessonId);
        if (attendanceStatus) {
          gradeItems.push({
            id: parseInt(lessonId), // Convert to number for ID
            title: lesson.lessonname || `Lesson ${lessonId}`,
            grade: "N/A", // No grade for lessons without scores
            score: null, // No score
            date: lesson.date,
            type: 'other',
            attendance: attendanceStatus,
            lessonId: lessonId
          });
        }
      });
    }

    // Sort all grade items by date (descending)
    gradeItems.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });

    return gradeItems;
  } catch (error) {
    console.error(`Error fetching grades for subject ${subjectId}:`, error);
    throw error;
  }
}

/**
 * Get letter grade from numeric score for 10-point system
 * 10 points = 100% = A+
 */
export function getLetterGradeFor10PointSystem(score: number): string {
  if (score >= 10) return 'A+';     // 100%
  if (score >= 9.5) return 'A';     // 95%
  if (score >= 9.0) return 'A-';    // 90%
  if (score >= 8.5) return 'B+';    // 85%
  if (score >= 8.0) return 'B';     // 80%
  if (score >= 7.5) return 'B-';    // 75%
  if (score >= 7.0) return 'C+';    // 70%
  if (score >= 6.5) return 'C';     // 65%
  if (score >= 6.0) return 'C-';    // 60%
  if (score >= 5.5) return 'D+';    // 55%
  if (score >= 5.0) return 'D';     // 50%
  if (score >= 4.5) return 'D-';    // 45%
  return 'F';                       // Below 45%
}

/**
 * Get letter grade from numeric score (percentage-based)
 */
export function getLetterGrade(score: number): string {
  if (score >= 97) return 'A+';
  if (score >= 93) return 'A';
  if (score >= 90) return 'A-';
  if (score >= 87) return 'B+';
  if (score >= 83) return 'B';
  if (score >= 80) return 'B-';
  if (score >= 77) return 'C+';
  if (score >= 73) return 'C';
  if (score >= 70) return 'C-';
  if (score >= 67) return 'D+';
  if (score >= 63) return 'D';
  if (score >= 60) return 'D-';
  return 'F';
}

/**
 * Get color for a subject based on its name
 */
export function getSubjectColor(subjectName: string): string {
  const colors = [
    '#4A90E2', // Blue
    '#FF6B6B', // Red
    '#66BB6A', // Green
    '#9C27B0', // Purple
    '#FFC107', // Amber
    '#F06292', // Pink
    '#4DB6AC', // Teal
    '#FF9800', // Orange
    '#5C6BC0', // Indigo
    '#8D6E63'  // Brown
  ];
  
  // Use first letter of subject name to deterministically choose a color
  const firstChar = subjectName.charAt(0).toUpperCase();
  const index = firstChar.charCodeAt(0) % colors.length;
  
  return colors[index];
}

/**
 * Calculate GPA from an array of subjects
 */
export function calculateGPA(subjects: SubjectGrade[]): string {
  // Only include subjects that have grades when calculating GPA
  const subjectsWithGrades = subjects.filter(subject => subject.hasGrades);
  
  if (!subjectsWithGrades || subjectsWithGrades.length === 0) return '0.00';
  
  const totalPoints = subjectsWithGrades.reduce((sum, subject) => sum + subject.numericGrade, 0);
  return (totalPoints / subjectsWithGrades.length / 10).toFixed(2); // Divide by 10 to convert back to 10-point scale
} 