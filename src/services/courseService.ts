import { supabase } from '../utils/supabase';

/**
 * Interface for course data
 */
export interface Course {
  id: number;
  subjectname: string;
  code: string;
  description: string;
  status?: string;
  color?: string;
  lessons?: Lesson[];
  teacher?: Teacher;
  teacherName?: string;
}

/**
 * Interface for teacher data
 */
export interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
}

/**
 * Interface for lesson data
 */
export interface Lesson {
  id: number;
  lessonname: string;
  description?: string;
  videourl?: string;
  uploadedat: string;
  duration?: string;
  fileurls?: string[];
  teacherid: string;
  subjectid: number;
  quarterid?: number;
  date?: string;
  subject?: {
    id: number;
    subjectname: string;
    description?: string;
    code?: string;
    status?: string;
  };
  teacher?: Teacher;
}

/**
 * Interface for class data
 */
export interface ClassInfo {
  id: number;
  classname: string;
  description?: string;
  student_count?: number;
  room?: string;
  status?: string;
}

/**
 * Fetch all courses assigned to a specific student
 * @param studentId The ID of the student
 * @returns Promise with array of courses
 */
export const getStudentCourses = async (studentId: string): Promise<Course[]> => {
  try {
    // Step 1: Find which class(es) the student is assigned to using classstudents table
    const { data: classStudentsData, error: classStudentsError } = await supabase
      .from('classstudents')
      .select(`
        classid,
        classes:classid(
          id,
          classname
        )
      `)
      .eq('studentid', studentId);

    if (classStudentsError) {
      console.error('Error fetching student classes:', classStudentsError);
      throw classStudentsError;
    }

    if (!classStudentsData || classStudentsData.length === 0) {
      console.log('Student not assigned to any class');
      return [];
    }

    // Extract class IDs
    const classIds = classStudentsData.map(item => item.classid);

    // Step 2: Get subjects assigned to those classes from classsubjects table
    // and join with teachers table to get teacher information
    const { data: classSubjectsData, error: classSubjectsError } = await supabase
      .from('classsubjects')
      .select(`
        subjectid,
        classid,
        subjects:subjectid(
          id,
          subjectname,
          code,
          description,
          status
        )
      `)
      .in('classid', classIds);

    if (classSubjectsError) {
      console.error('Error fetching class subjects:', classSubjectsError);
      throw classSubjectsError;
    }

    // Get teachers for each class
    const { data: classTeachersData, error: classTeachersError } = await supabase
      .from('classteachers')
      .select(`
        classid,
        teacherid,
        teachers:teacherid(
          id,
          firstName,
          lastName,
          email
        )
      `)
      .in('classid', classIds);

    if (classTeachersError) {
      console.error('Error fetching class teachers:', classTeachersError);
      // Continue without teacher info
    }

    // Create a map of classId to teacher data
    const teachersByClass: Record<number, any> = {};
    if (classTeachersData) {
      classTeachersData.forEach(item => {
        if (!teachersByClass[item.classid]) {
          teachersByClass[item.classid] = [];
        }
        teachersByClass[item.classid].push(item.teachers);
      });
    }

    // Extract subject IDs for lesson fetching
    const subjectIds = classSubjectsData.map(item => item.subjectid);

    // Step 3: Fetch lessons for these subjects
    const { data: lessonsData, error: lessonsError } = await supabase
      .from('lessons')
      .select('*')
      .in('subjectid', subjectIds)
      .order('uploadedat', { ascending: false });

    if (lessonsError) {
      console.error('Error fetching lessons for subjects:', lessonsError);
      // Don't throw here, just continue with subjects without lessons
    }

    // Group lessons by subjectid
    const lessonsBySubject: Record<number, Lesson[]> = {};
    if (lessonsData) {
      lessonsData.forEach(lesson => {
        if (!lessonsBySubject[lesson.subjectid]) {
          lessonsBySubject[lesson.subjectid] = [];
        }
        lessonsBySubject[lesson.subjectid].push(lesson);
      });
    }

    // Transform the nested data structure to a flat courses array
    const courses = classSubjectsData.map(item => {
      const subject = item.subjects as any;
      // Get teacher for this class (use first teacher if multiple)
      const teachersForClass = teachersByClass[item.classid] || [];
      const teacher = teachersForClass.length > 0 ? teachersForClass[0] : null;
      
      // Create a formatted teacher name for easy display
      const teacherName = teacher ? `${teacher.firstName} ${teacher.lastName}` : 'No Teacher Assigned';
      
      return {
        ...subject,
        progress: Math.floor(Math.random() * 100),
        color: ['#4A90E2', '#FF6B6B', '#8BC34A', '#FFC107', '#9C27B0'][item.subjectid % 5],
        lessons: lessonsBySubject[item.subjectid] || [],
        teacher: teacher,
        teacherName
      };
    });

    return courses as unknown as Course[];
  } catch (error) {
    console.error('Failed to fetch student courses:', error);
    throw error;
  }
};

/**
 * Fetch details for a specific course
 * @param courseId The ID of the course
 * @returns Promise with course details
 */
export const getCourseDetails = async (courseId: number): Promise<Course> => {
  try {
    // Fetch the course details with teacher information
    const { data: subjectData, error: subjectError } = await supabase
      .from('subjects')
      .select(`
        id,
        subjectname,
        code,
        description,
        status
      `)
      .eq('id', courseId)
      .single();

    if (subjectError) {
      console.error('Error fetching course details:', subjectError);
      throw subjectError;
    }

    // Find the teacher assigned to this subject
    // First, find which classes have this subject
    const { data: classSubjectsData, error: classSubjectsError } = await supabase
      .from('classsubjects')
      .select('classid')
      .eq('subjectid', courseId);

    if (classSubjectsError) {
      console.error('Error finding classes for subject:', classSubjectsError);
      // Continue without teacher info
    }

    let teacherInfo = null;
    if (classSubjectsData && classSubjectsData.length > 0) {
      // Find the teacher for these classes
      const classIds = classSubjectsData.map(item => item.classid);
      const { data: classTeacherData, error: classTeacherError } = await supabase
        .from('classteachers')
        .select(`
          teacherid,
          teachers:teacherid(
            id,
            firstName,
            lastName,
            email
          )
        `)
        .in('classid', classIds);

      if (classTeacherError) {
        console.error('Error fetching teacher for classes:', classTeacherError);
        // Continue without teacher info
      } else if (classTeacherData && classTeacherData.length > 0) {
        // Just take the first teacher found and ensure it's a single object, not an array
        teacherInfo = classTeacherData[0].teachers;
        // If teacherInfo is still an array, take the first element
        if (Array.isArray(teacherInfo)) {
          teacherInfo = teacherInfo[0];
        }
      }
    }

    // Fetch lessons for this course/subject
    const { data: lessonsData, error: lessonsError } = await supabase
      .from('lessons')
      .select(`
        id,
        lessonname,
        description,
        videourl,
        uploadedat,
        duration,
        fileurls,
        teacherid,
        subjectid,
        quarterid,
        date,
        teachers:teacherid(
          id,
          firstName,
          lastName,
          email
        )
      `)
      .eq('subjectid', courseId)
      .order('uploadedat', { ascending: false });

    if (lessonsError) {
      console.error('Error fetching lessons for course:', lessonsError);
      // Continue without lessons
    }

    console.log('Raw lessons data:', JSON.stringify(lessonsData)); // Debug raw lessons data

    // Process lessons to include teacher info
    const processedLessons = lessonsData ? lessonsData.map(lesson => {
      const lessonTeacher = lesson.teachers;
      console.log('Lesson teacher:', lessonTeacher); // Debug lesson teacher
      
      return {
        ...lesson,
        teacher: lessonTeacher || null
      };
    }) : [];

    console.log('Processed lessons:', JSON.stringify(processedLessons)); // Debug processed lessons

    // Format teacher name for display
    const teacherName = teacherInfo 
      ? `${teacherInfo.firstName || ''} ${teacherInfo.lastName || ''}`.trim() || 'Unknown Teacher'
      : 'No Teacher Assigned';

    console.log('Teacher data:', teacherInfo); // Debug teacher data
    console.log('Teacher name:', teacherName); // Debug teacher name
    console.log('Lessons count:', processedLessons.length); // Debug lessons count

    // Return course with lessons and teacher
    return {
      ...subjectData,
      color: ['#4A90E2', '#FF6B6B', '#8BC34A', '#FFC107', '#9C27B0'][courseId % 5],
      lessons: processedLessons as unknown as Lesson[],
      teacher: teacherInfo || null,
      teacherName
    } as unknown as Course;
  } catch (error) {
    console.error('Failed to fetch course details:', error);
    throw error;
  }
};

/**
 * Enroll a student in a course
 * @param studentId The ID of the student
 * @param courseId The ID of the course
 * @returns Promise with enrollment result
 */
export const enrollStudentInCourse = async (studentId: string, courseId: number): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('student_courses')
      .insert([
        { student_id: studentId, course_id: courseId }
      ]);

    if (error) {
      console.error('Error enrolling student in course:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Failed to enroll student in course:', error);
    throw error;
  }
};

/**
 * Fetch all lessons for a specific student
 * @param studentId The ID of the student
 * @returns Promise with array of lessons with subject information
 */
export const getStudentLessons = async (studentId: string): Promise<Lesson[]> => {
  try {
    // Step 1: Find the class(es) in which the student is enrolled
    const { data: classStudentsData, error: classStudentsError } = await supabase
      .from('classstudents')
      .select(`
        id, 
        classid,
        studentid,
        assignedat,
        classes:classid (
          id,
          classname,
          subjectid,
          teacherid,
          createdby,
          createdat,
          description,
          "attendanceDays",
          "attendanceTimes",
          category_id,
          level_id,
          student_count,
          room,
          status,
          language_id
        )
      `)
      .eq('studentid', studentId);

    if (classStudentsError) {
      console.error('Error fetching student classes:', classStudentsError);
      throw classStudentsError;
    }

    if (!classStudentsData || classStudentsData.length === 0) {
      console.log('Student not enrolled in any classes');
      return [];
    }

    // Extract class IDs
    const classIds = classStudentsData.map(item => item.classid);

    // Step 2: Fetch all subjects assigned to those classes
    const { data: classSubjectsData, error: classSubjectsError } = await supabase
      .from('classsubjects')
      .select(`
        id,
        classid,
        subjectid,
        subjects:subjectid (
          id,
          subjectname,
          description,
          createdat,
          code,
          status
        )
      `)
      .in('classid', classIds);

    if (classSubjectsError) {
      console.error('Error fetching class subjects:', classSubjectsError);
      throw classSubjectsError;
    }

    if (!classSubjectsData || classSubjectsData.length === 0) {
      console.log('No subjects assigned to student classes');
      return [];
    }

    // Create a map of subjectId to subject data for later use
    const subjectMap: Record<number, any> = classSubjectsData.reduce((map: Record<number, any>, item) => {
      if (item.subjects) {
        map[item.subjectid] = item.subjects;
      }
      return map;
    }, {});

    // Step 3: Fetch all lessons related to those subjects
    const { data: lessonsData, error: lessonsError } = await supabase
      .from('lessons')
      .select(`
        id,
        lessonname,
        videourl,
        description,
        uploadedat,
        subjectid,
        teacherid,
        duration,
        fileurls,
        quarterid,
        date
      `)
      .in('subjectid', classSubjectsData.map(item => item.subjectid))
      .order('uploadedat', { ascending: false });

    if (lessonsError) {
      console.error('Error fetching lessons for subjects:', lessonsError);
      throw lessonsError;
    }

    if (!lessonsData || lessonsData.length === 0) {
      console.log('No lessons found for student subjects');
      return [];
    }

    // Combine lessons with their subject information
    const lessonsWithSubjectInfo = lessonsData.map(lesson => ({
      ...lesson,
      subject: subjectMap[lesson.subjectid]
    }));

    return lessonsWithSubjectInfo as unknown as Lesson[];
  } catch (error) {
    console.error('Failed to fetch student lessons:', error);
    throw error;
  }
};