import { SubjectGrade, GradeItem } from './gradesService';

// Interface for child data
export interface ChildData {
  id: string;
  firstName: string;
  lastName: string;
  grade: string;
  className: string;
  avatar?: string;
  recentAttendance: {
    present: number;
    absent: number;
    late: number;
    excused: number;
  };
  performanceSummary: {
    gpa: string;
    totalAssignments: number;
    completedAssignments: number;
    upcomingTests: number;
  };
}

// Interface for notification
export interface ParentNotification {
  id: string;
  title: string;
  message: string;
  date: string;
  type: 'grade' | 'attendance' | 'behavior' | 'announcement' | 'event';
  read: boolean;
  relatedStudentId?: string;
  relatedSubjectId?: number;
}

// Mock children data for parent
const MOCK_CHILDREN: ChildData[] = [
  {
    id: 'student1',
    firstName: 'Alex',
    lastName: 'Johnson',
    grade: '9th Grade',
    className: '9A',
    recentAttendance: {
      present: 18,
      absent: 2,
      late: 1,
      excused: 1
    },
    performanceSummary: {
      gpa: '3.8',
      totalAssignments: 12,
      completedAssignments: 10,
      upcomingTests: 2
    }
  },
  {
    id: 'student2',
    firstName: 'Sophia',
    lastName: 'Johnson',
    grade: '7th Grade',
    className: '7C',
    recentAttendance: {
      present: 16,
      absent: 3,
      late: 2,
      excused: 0
    },
    performanceSummary: {
      gpa: '3.5',
      totalAssignments: 15,
      completedAssignments: 13,
      upcomingTests: 1
    }
  }
];

// Mock notifications
const MOCK_NOTIFICATIONS: ParentNotification[] = [
  {
    id: 'notif1',
    title: 'Low Grade Alert',
    message: 'Alex received a D on the latest Math quiz.',
    date: '2023-11-01T10:30:00',
    type: 'grade',
    read: false,
    relatedStudentId: 'student1',
    relatedSubjectId: 101
  },
  {
    id: 'notif2',
    title: 'Absence Recorded',
    message: 'Sophia was absent from school on Monday, October 30.',
    date: '2023-10-30T15:45:00',
    type: 'attendance',
    read: true,
    relatedStudentId: 'student2'
  },
  {
    id: 'notif3',
    title: 'Parent-Teacher Conference',
    message: 'Upcoming parent-teacher conferences on November 15th. Please schedule a time slot.',
    date: '2023-10-28T09:15:00',
    type: 'event',
    read: false
  },
  {
    id: 'notif4',
    title: 'Excellence Award',
    message: 'Congratulations! Alex has received an excellence award in Science class.',
    date: '2023-10-25T14:20:00',
    type: 'announcement',
    read: true,
    relatedStudentId: 'student1',
    relatedSubjectId: 102
  },
  {
    id: 'notif5',
    title: 'Homework Reminder',
    message: 'Sophia has 2 upcoming assignments due this week.',
    date: '2023-10-24T11:10:00',
    type: 'announcement',
    read: false,
    relatedStudentId: 'student2'
  }
];

// Mock grades data for a specific child
const MOCK_SUBJECT_GRADES: {[key: string]: SubjectGrade[]} = {
  'student1': [
    {
      id: 101,
      subjectName: 'Mathematics',
      teacherName: 'Dr. Robert Smith',
      className: '9A',
      color: '#4A90E2',
      averageGrade: 'B+',
      numericGrade: 87,
      hasGrades: true,
      grades: [
        {
          id: 1001,
          title: 'Algebra Quiz',
          grade: 'B+',
          score: 8.5,
          date: '2023-10-15',
          type: 'quiz',
          attendance: 'present'
        },
        {
          id: 1002,
          title: 'Geometry Test',
          grade: 'A-',
          score: 9.0,
          date: '2023-10-05',
          type: 'exam',
          attendance: 'present'
        },
        {
          id: 1003,
          title: 'Probability Assignment',
          grade: 'B',
          score: 8.0,
          date: '2023-09-28',
          type: 'assignment',
          attendance: 'present'
        }
      ]
    },
    {
      id: 102,
      subjectName: 'Science',
      teacherName: 'Ms. Sarah Johnson',
      className: '9A',
      color: '#66BB6A',
      averageGrade: 'A',
      numericGrade: 95,
      hasGrades: true,
      grades: [
        {
          id: 2001,
          title: 'Chemistry Lab',
          grade: 'A+',
          score: 10.0,
          date: '2023-10-18',
          type: 'lab',
          attendance: 'present'
        },
        {
          id: 2002,
          title: 'Physics Test',
          grade: 'A',
          score: 9.5,
          date: '2023-10-08',
          type: 'exam',
          attendance: 'present'
        },
        {
          id: 2003,
          title: 'Biology Report',
          grade: 'A-',
          score: 9.0,
          date: '2023-09-30',
          type: 'assignment',
          attendance: 'present'
        }
      ]
    },
    {
      id: 103,
      subjectName: 'English',
      teacherName: 'Mr. James Williams',
      className: '9A',
      color: '#FF6B6B',
      averageGrade: 'B',
      numericGrade: 85,
      hasGrades: true,
      grades: [
        {
          id: 3001,
          title: 'Essay Writing',
          grade: 'B+',
          score: 8.7,
          date: '2023-10-20',
          type: 'assignment',
          attendance: 'present'
        },
        {
          id: 3002,
          title: 'Literature Quiz',
          grade: 'B-',
          score: 7.8,
          date: '2023-10-10',
          type: 'quiz',
          attendance: 'present'
        },
        {
          id: 3003,
          title: 'Reading Comprehension',
          grade: 'B',
          score: 8.0,
          date: '2023-10-01',
          type: 'exam',
          attendance: 'present'
        }
      ]
    }
  ],
  'student2': [
    {
      id: 201,
      subjectName: 'Mathematics',
      teacherName: 'Mrs. Lisa Moore',
      className: '7C',
      color: '#4A90E2',
      averageGrade: 'B',
      numericGrade: 82,
      hasGrades: true,
      grades: [
        {
          id: 4001,
          title: 'Fractions Quiz',
          grade: 'B-',
          score: 7.5,
          date: '2023-10-17',
          type: 'quiz',
          attendance: 'present'
        },
        {
          id: 4002,
          title: 'Decimals Test',
          grade: 'B',
          score: 8.0,
          date: '2023-10-07',
          type: 'exam',
          attendance: 'present'
        },
        {
          id: 4003,
          title: 'Problem Solving',
          grade: 'B+',
          score: 8.5,
          date: '2023-09-29',
          type: 'assignment',
          attendance: 'present'
        }
      ]
    },
    {
      id: 202,
      subjectName: 'History',
      teacherName: 'Mr. David Thompson',
      className: '7C',
      color: '#9C27B0',
      averageGrade: 'A-',
      numericGrade: 90,
      hasGrades: true,
      grades: [
        {
          id: 5001,
          title: 'Ancient Civilizations',
          grade: 'A',
          score: 9.5,
          date: '2023-10-19',
          type: 'assignment',
          attendance: 'present'
        },
        {
          id: 5002,
          title: 'World War II Quiz',
          grade: 'B+',
          score: 8.7,
          date: '2023-10-09',
          type: 'quiz',
          attendance: 'present'
        },
        {
          id: 5003,
          title: 'Medieval Europe Test',
          grade: 'A-',
          score: 9.0,
          date: '2023-10-02',
          type: 'exam',
          attendance: 'present'
        }
      ]
    },
    {
      id: 203,
      subjectName: 'Art',
      teacherName: 'Ms. Emily White',
      className: '7C',
      color: '#F06292',
      averageGrade: 'A+',
      numericGrade: 98,
      hasGrades: true,
      grades: [
        {
          id: 6001,
          title: 'Watercolor Painting',
          grade: 'A+',
          score: 10.0,
          date: '2023-10-16',
          type: 'assignment',
          attendance: 'present'
        },
        {
          id: 6002,
          title: 'Art History Quiz',
          grade: 'A',
          score: 9.5,
          date: '2023-10-06',
          type: 'quiz',
          attendance: 'present'
        },
        {
          id: 6003,
          title: 'Portfolio Presentation',
          grade: 'A+',
          score: 10.0,
          date: '2023-09-27',
          type: 'presentation',
          attendance: 'present'
        }
      ]
    }
  ]
};

// Get children information for parent
export function getParentChildren(): ChildData[] {
  return MOCK_CHILDREN;
}

// Get notifications for parent
export function getParentNotifications(): ParentNotification[] {
  return MOCK_NOTIFICATIONS;
}

// Mark notification as read
export function markNotificationAsRead(notificationId: string): ParentNotification[] {
  const updatedNotifications = MOCK_NOTIFICATIONS.map(notification => {
    if (notification.id === notificationId) {
      return { ...notification, read: true };
    }
    return notification;
  });
  
  return updatedNotifications;
}

// Get child's grades
export function getChildGrades(childId: string): SubjectGrade[] {
  return MOCK_SUBJECT_GRADES[childId] || [];
}

// Get detailed subject grades for a child
export function getChildSubjectGrades(childId: string, subjectId: number): GradeItem[] {
  const subjects = MOCK_SUBJECT_GRADES[childId] || [];
  const subject = subjects.find(s => s.id === subjectId);
  
  return subject ? subject.grades : [];
}

// Get child attendance summary
export function getChildAttendanceSummary(childId: string) {
  const child = MOCK_CHILDREN.find(c => c.id === childId);
  return child ? child.recentAttendance : null;
}

// Get child performance summary
export function getChildPerformanceSummary(childId: string) {
  const child = MOCK_CHILDREN.find(c => c.id === childId);
  return child ? child.performanceSummary : null;
} 