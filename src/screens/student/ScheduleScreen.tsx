import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

// Mock data for schedule
const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const mockClasses = [
  {
    id: 1,
    subject: 'Mathematics',
    courseCode: 'MATH 101',
    teacher: 'Dr. Robert Chen',
    room: 'A-204',
    days: ['Monday', 'Wednesday', 'Friday'],
    startTime: '09:00',
    endTime: '10:15',
    color: '#4A90E2'
  },
  {
    id: 2,
    subject: 'Physics',
    courseCode: 'PHYS 201',
    teacher: 'Prof. Sarah Johnson',
    room: 'B-108',
    days: ['Tuesday', 'Thursday'],
    startTime: '11:00',
    endTime: '12:30',
    color: '#FF6B6B'
  },
  {
    id: 3,
    subject: 'English Literature',
    courseCode: 'ENGL 210',
    teacher: 'Dr. Emily Thompson',
    room: 'C-305',
    days: ['Monday', 'Wednesday'],
    startTime: '13:00',
    endTime: '14:15',
    color: '#66BB6A'
  },
  {
    id: 4,
    subject: 'Chemistry',
    courseCode: 'CHEM 150',
    teacher: 'Dr. Lisa Rodriguez',
    room: 'LAB-220',
    days: ['Tuesday', 'Thursday'],
    startTime: '14:30',
    endTime: '16:00',
    color: '#9C27B0'
  },
  {
    id: 5,
    subject: 'History',
    courseCode: 'HIST 120',
    teacher: 'Prof. Michael Brown',
    room: 'D-110',
    days: ['Monday', 'Friday'],
    startTime: '15:30',
    endTime: '16:45',
    color: '#FFC107'
  }
];

const mockEvents = [
  {
    id: 1,
    title: 'Mathematics Midterm Exam',
    date: '2023-05-25',
    startTime: '09:00',
    endTime: '11:00',
    location: 'Hall A',
    description: 'Midterm exam covering Chapters 1-5',
    course: 'Mathematics',
    type: 'exam'
  },
  {
    id: 2,
    title: 'Physics Lab Session',
    date: '2023-05-23',
    startTime: '14:30',
    endTime: '16:30',
    location: 'Lab B-108',
    description: 'Special lab session on wave properties',
    course: 'Physics',
    type: 'lab'
  },
  {
    id: 3,
    title: 'English Literature Essay Deadline',
    date: '2023-05-30',
    startTime: '23:59',
    endTime: '23:59',
    location: 'Online Submission',
    description: 'Final deadline for Macbeth essay',
    course: 'English Literature',
    type: 'deadline'
  },
  {
    id: 4,
    title: 'Study Group - Chemistry',
    date: '2023-05-24',
    startTime: '18:00',
    endTime: '20:00',
    location: 'Library Study Room 3',
    description: 'Preparation for upcoming quiz',
    course: 'Chemistry',
    type: 'study'
  },
  {
    id: 5,
    title: 'History Department Guest Lecture',
    date: '2023-05-26',
    startTime: '16:00',
    endTime: '17:30',
    location: 'Auditorium',
    description: 'Special lecture on Ancient Civilizations',
    course: 'History',
    type: 'lecture'
  }
];

// Helper function to format time
const formatTime = (timeString) => {
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours, 10);
  const amPm = hour >= 12 ? 'PM' : 'AM';
  const formattedHour = hour % 12 || 12;
  return `${formattedHour}:${minutes} ${amPm}`;
};

// Helper function to format date
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
};

// Helper function to get event icon
const getEventIcon = (type) => {
  switch (type) {
    case 'exam': return 'edit-3';
    case 'lab': return 'flask';
    case 'deadline': return 'clock';
    case 'study': return 'book';
    case 'lecture': return 'mic';
    default: return 'calendar';
  }
};

// Helper function to get current day of week
const getCurrentDayOfWeek = () => {
  const today = new Date();
  const dayIndex = today.getDay();
  return dayIndex === 0 ? 6 : dayIndex - 1; // Convert Sunday (0) to 6, and rest to 0-5
};

const ScheduleScreen = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [classes, setClasses] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedDay, setSelectedDay] = useState(getCurrentDayOfWeek());
  
  // Simulate loading schedule data
  useEffect(() => {
    const loadSchedule = () => {
      // Simulate API call
      setTimeout(() => {
        setClasses(mockClasses);
        setEvents(mockEvents);
        setLoading(false);
      }, 1000);
    };

    loadSchedule();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate refreshing data
    setTimeout(() => {
      setClasses(mockClasses);
      setEvents(mockEvents);
      setRefreshing(false);
    }, 1500);
  };

  // Filter classes for selected day
  const getClassesForDay = (day) => {
    return classes.filter(cls => cls.days.includes(daysOfWeek[day]));
  };

  // Sort classes by start time
  const sortedClasses = getClassesForDay(selectedDay).sort((a, b) => {
    return a.startTime.localeCompare(b.startTime);
  });

  // Sort events by date and time
  const sortedEvents = [...events].sort((a, b) => {
    return a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime);
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading your schedule...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Day Selector */}
      <View style={styles.daySelector}>
        {daysOfWeek.map((day, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.dayButton,
              selectedDay === index && styles.selectedDayButton
            ]}
            onPress={() => setSelectedDay(index)}
          >
            <Text style={[
              styles.dayButtonText,
              selectedDay === index && styles.selectedDayButtonText
            ]}>
              {day.substring(0, 3)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Today's Schedule */}
      <View style={styles.scheduleContainer}>
        <Text style={styles.sectionTitle}>{daysOfWeek[selectedDay]}'s Schedule</Text>
        
        {sortedClasses.length > 0 ? (
          sortedClasses.map(cls => (
            <View key={cls.id} style={styles.classCard}>
              <View style={[styles.classTimeIndicator, { backgroundColor: cls.color }]} />
              
              <View style={styles.classTimeContainer}>
                <Text style={styles.classTime}>{formatTime(cls.startTime)}</Text>
                <Text style={styles.classTime}>{formatTime(cls.endTime)}</Text>
              </View>
              
              <View style={styles.classDetailsContainer}>
                <Text style={styles.classSubject}>{cls.subject}</Text>
                <Text style={styles.classCode}>{cls.courseCode}</Text>
                <View style={styles.classInfoRow}>
                  <Icon name="user" size={14} color="#666" style={styles.classInfoIcon} />
                  <Text style={styles.classInfoText}>{cls.teacher}</Text>
                </View>
                <View style={styles.classInfoRow}>
                  <Icon name="map-pin" size={14} color="#666" style={styles.classInfoIcon} />
                  <Text style={styles.classInfoText}>{cls.room}</Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptySchedule}>
            <Icon name="calendar" size={40} color="#ccc" />
            <Text style={styles.emptyText}>No classes scheduled for {daysOfWeek[selectedDay]}</Text>
          </View>
        )}
      </View>
      
      {/* Upcoming Events */}
      <View style={styles.eventsContainer}>
        <Text style={styles.sectionTitle}>Upcoming Events</Text>
        
        {sortedEvents.length > 0 ? (
          sortedEvents.map(event => (
            <View key={event.id} style={styles.eventCard}>
              <View style={styles.eventDateContainer}>
                <Text style={styles.eventDate}>{formatDate(event.date)}</Text>
              </View>
              
              <View style={styles.eventContent}>
                <View style={styles.eventHeader}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <View style={[styles.eventTypeBadge, getEventTypeBadgeStyle(event.type)]}>
                    <Icon name={getEventIcon(event.type)} size={12} color="#FFF" />
                    <Text style={styles.eventTypeText}>{event.type.charAt(0).toUpperCase() + event.type.slice(1)}</Text>
                  </View>
                </View>
                
                <Text style={styles.eventDescription}>{event.description}</Text>
                
                <View style={styles.eventDetailRow}>
                  <View style={styles.eventDetail}>
                    <Icon name="clock" size={14} color="#666" style={styles.eventDetailIcon} />
                    <Text style={styles.eventDetailText}>
                      {formatTime(event.startTime)} - {formatTime(event.endTime)}
                    </Text>
                  </View>
                  
                  <View style={styles.eventDetail}>
                    <Icon name="map-pin" size={14} color="#666" style={styles.eventDetailIcon} />
                    <Text style={styles.eventDetailText}>{event.location}</Text>
                  </View>
                </View>
                
                <View style={styles.eventCourse}>
                  <Text style={styles.eventCourseText}>{event.course}</Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptySchedule}>
            <Icon name="calendar" size={40} color="#ccc" />
            <Text style={styles.emptyText}>No upcoming events</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

// Helper function to get event type badge style
const getEventTypeBadgeStyle = (type) => {
  switch (type) {
    case 'exam':
      return { backgroundColor: '#F44336' }; // Red
    case 'lab':
      return { backgroundColor: '#9C27B0' }; // Purple
    case 'deadline':
      return { backgroundColor: '#FF9800' }; // Orange
    case 'study':
      return { backgroundColor: '#4CAF50' }; // Green
    case 'lecture':
      return { backgroundColor: '#2196F3' }; // Blue
    default:
      return { backgroundColor: '#757575' }; // Grey
  }
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  daySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dayButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F5F7FA',
    width: (width - 64) / 5,
    alignItems: 'center',
  },
  selectedDayButton: {
    backgroundColor: '#4A90E2',
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  selectedDayButtonText: {
    color: '#FFFFFF',
  },
  scheduleContainer: {
    margin: 16,
    marginTop: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  classCard: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    overflow: 'hidden',
  },
  classTimeIndicator: {
    width: 6,
    backgroundColor: '#4A90E2',
  },
  classTimeContainer: {
    padding: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
    width: 80,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  classTime: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  classDetailsContainer: {
    flex: 1,
    padding: 12,
    paddingLeft: 16,
  },
  classSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  classCode: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  classInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  classInfoIcon: {
    marginRight: 6,
  },
  classInfoText: {
    fontSize: 12,
    color: '#666',
  },
  emptySchedule: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
  },
  eventsContainer: {
    margin: 16,
    marginTop: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  eventCard: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    overflow: 'hidden',
  },
  eventDateContainer: {
    width: 80,
    backgroundColor: 'rgba(0,0,0,0.02)',
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventDate: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    textAlign: 'center',
  },
  eventContent: {
    flex: 1,
    padding: 12,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  eventTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#757575',
  },
  eventTypeText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  eventDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    lineHeight: 18,
  },
  eventDetailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  eventDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  eventDetailIcon: {
    marginRight: 4,
  },
  eventDetailText: {
    fontSize: 12,
    color: '#666',
  },
  eventCourse: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  eventCourseText: {
    fontSize: 10,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});

export default ScheduleScreen; 