import { ClassItem } from '../screens/student/ScheduleScreen'; // Import the ClassItem interface
import { supabase } from '@/utils/supabase';

// Helper to get a color (can be more sophisticated or use subject colors from DB)
const getRandomColor = (str: string): string => {
  if (!str) return '#CCCCCC';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
};

const daysOfWeekMap: { [key: number]: string } = {
  0: 'Sunday', 
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};


export const fetchMobileStudentSchedule = async (studentId: string): Promise<ClassItem[]> => {
  if (!studentId) {
    console.warn('fetchMobileStudentSchedule: studentId is required');
    return [];
  }

  try {
    const { data: studentClassesData, error: studentClassesError } = await supabase
      .from('classstudents') 
      .select('classid')      
      .eq('studentid', studentId);

    if (studentClassesError) {
      console.error('Error fetching student classes for mobile:', studentClassesError);
      throw studentClassesError;
    }
    if (!studentClassesData || studentClassesData.length === 0) {
      console.log(`No active classes found for student ${studentId} (mobile)`);
      return [];
    }

    const studentClassIds = studentClassesData.map(sc => sc.classid);

    const { data: timetableData, error: timetableError } = await supabase
      .from('timetable')
      .select(`
        id, 
        title, 
        start_time, 
        end_time, 
        start_minute, 
        end_minute, 
        day,            location,
        subjectId, 
        classId,
        subjects ( id, subjectname),
        classes ( id, classname, teacherid (
          id, firstName, lastName
        ))
      `)
      .in('classId', studentClassIds);

    if (timetableError) {
      console.error('Error fetching timetable data for mobile:', timetableError);
      throw timetableError;
    }
    if (!timetableData) return [];
    
    console.log("Raw timetable data for student (mobile):", timetableData);

    const formattedClasses: ClassItem[] = timetableData.map((item: any, index: number) => {
      const subjectName = item.subjects?.subjectname || 'Unknown Subject';
      const className = item.classes?.classname || 'Unknown Class';
      const teacherFirstName = item.classes?.teacherid?.firstName || 'N/A';
      const teacherLastName = item.classes?.teacherid?.lastName || '';
      const teacherFullName = `${teacherFirstName} ${teacherLastName}`.trim() || 'Teacher Not Assigned';
      
      const formatTimeToString = (hour: number, minute: number = 0): string => {
        const h = String(hour).padStart(2, '0');
        const m = String(minute).padStart(2, '0');
        return `${h}:${m}`;
      };

      const entryDayName = daysOfWeekMap[item.day] || 'Unknown Day';

      return {
        id: item.id, 
        subject: item.title || subjectName, 
        courseCode: subjectName, 
        teacher: teacherFullName,
        room: item.location || 'N/A',
        days: [entryDayName], 
        startTime: formatTimeToString(item.start_time, item.start_minute),
        endTime: formatTimeToString(item.end_time, item.end_minute),
        color: item.subjects?.color || getRandomColor(subjectName),
      };
    });
    console.log("Formatted student schedule for mobile:", formattedClasses);
    return formattedClasses;

  } catch (error) {
    console.error('Error fetching student schedule for mobile:', error);
    return []; 
  }
};

// TODO: Create a function fetchMobileStudentEvents if the "Upcoming Events" 
// section needs to be populated from a separate Supabase table. 