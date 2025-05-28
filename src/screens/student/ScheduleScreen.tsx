import React, { useState, useEffect, useCallback } from 'react';
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
import { useAuthStore } from '../../store/authStore'; // Import auth store
import { fetchMobileStudentSchedule } from '../../services/studentSupabaseService'; // Import fetch function
import { useAppTheme } from '../../contexts/ThemeContext'; // Added ThemeContext

// Define interfaces for your data structures
export interface ClassItem {
  id: number | string; // Allow string if DB ID is UUID
  subject: string;
  courseCode: string;
  teacher: string;
  room: string;
  days: string[]; // This will now hold a single day name like ['Monday'] from the service
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  color: string;
}

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Helper functions (typed previously)
const formatTime = (timeString: string): string => {
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours, 10);
  const amPm = hour >= 12 ? 'PM' : 'AM';
  const formattedHour = hour % 12 || 12;
  return `${formattedHour}:${minutes} ${amPm}`;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
};

const getCurrentDayOfWeek = (): number => {
  const today = new Date();
  const dayIndex = today.getDay(); // Sunday - 0, Monday - 1, ..., Saturday - 6
  // Map to daysOfWeek array: Monday (0) to Sunday (6)
  return dayIndex === 0 ? 6 : dayIndex - 1; 
};

const ScheduleScreen = () => {
  const { theme } = useAppTheme(); // Added
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedDay, setSelectedDay] = useState(getCurrentDayOfWeek());
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const loadScheduleData = useCallback(async (isRefresh = false) => {
    if (!user || !user.id) {
      setScheduleError('User not found. Cannot load schedule.');
      setClasses([]);
      setLoading(false);
      if (isRefresh) setRefreshing(false);
      return;
    }

    if (!isRefresh) setLoading(true);
    setScheduleError(null);

    try {
      console.log(`Fetching schedule for student ID: ${user.id}`);
      const fetchedClasses = await fetchMobileStudentSchedule(user.id);
      setClasses(fetchedClasses);
    } catch (error) {
      console.error('Failed to load student schedule:', error);
      setScheduleError(error instanceof Error ? error.message : 'An unknown error occurred while fetching schedule.');
      setClasses([]); // Clear classes on error
    } finally {
      if (!isRefresh) setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadScheduleData();
  }, [loadScheduleData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadScheduleData(true);
  }, [loadScheduleData]);

  // Filter classes for selected day
  // Now uses the `days` array which contains a single day name string from the service
  const getClassesForDay = (dayIndex: number): ClassItem[] => {
    const targetDayName = daysOfWeek[dayIndex];
    return classes.filter(cls => cls.days.includes(targetDayName));
  };

  const sortedClasses = getClassesForDay(selectedDay).sort((a, b) => {
    return a.startTime.localeCompare(b.startTime);
  });

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading your schedule...</Text>
      </View>
    );
  }
  
  if (scheduleError) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <Icon name="alert-circle" size={40} color={theme.danger} />
        <Text style={[styles.errorText, { color: theme.danger }]}>Error: {scheduleError}</Text>
        <TouchableOpacity onPress={onRefresh} style={[styles.retryButton, { backgroundColor: theme.primary }]}>
            <Text style={[styles.retryButtonText, { color: theme.cardBackground }]}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary}/>
      }
    >
      {/* Day Selector */}
      <View style={[styles.daySelector, { backgroundColor: theme.cardBackground, shadowColor: theme.text }]}>
        {daysOfWeek.map((day, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.dayButton,
              { backgroundColor: selectedDay === index ? theme.primary : theme.background },
              selectedDay === index && styles.selectedDayButton
            ]}
            onPress={() => setSelectedDay(index)}
          >
            <Text style={[
              styles.dayButtonText,
              { color: selectedDay === index ? theme.cardBackground : theme.textSecondary },
              selectedDay === index && styles.selectedDayButtonText
            ]}>
              {day.substring(0, 3).toUpperCase()} {/* Display MON, TUE etc. */}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Today's Schedule */}
      <View style={[styles.scheduleContainer, { backgroundColor: theme.cardBackground, shadowColor: theme.text }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{daysOfWeek[selectedDay]}'s Schedule</Text>
        
        {sortedClasses.length > 0 ? (
          sortedClasses.map(cls => (
            <View key={cls.id} style={[styles.classCard, { borderLeftColor: cls.color, backgroundColor: theme.background, shadowColor: theme.text }]}>
              <View style={styles.classTimeContainer}>
                <Text style={[styles.classTime, { color: theme.textSecondary }]}>{formatTime(cls.startTime)}</Text>
                <Text style={[styles.classTime, { color: theme.textSecondary }]}>{formatTime(cls.endTime)}</Text>
              </View>
              
              <View style={styles.classDetailsContainer}>
                <Text style={[styles.classSubject, { color: theme.text }]}>{cls.subject}</Text>
                <Text style={[styles.classCode, { color: theme.primary }]}>{cls.courseCode}</Text>
                <View style={styles.classInfoRow}>
                  <Icon name="user" size={14} color={theme.textSecondary} style={styles.classInfoIcon} />
                  <Text style={[styles.classInfoText, { color: theme.textSecondary }]}>{cls.teacher}</Text>
                </View>
                <View style={styles.classInfoRow}>
                  <Icon name="map-pin" size={14} color={theme.textSecondary} style={styles.classInfoIcon} />
                  <Text style={[styles.classInfoText, { color: theme.textSecondary }]}>{cls.room}</Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptySchedule}>
            <Icon name="calendar" size={40} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No classes scheduled for {daysOfWeek[selectedDay]}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  daySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dayButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 20,
    minWidth: (width - 24 * 2 - 10 * (daysOfWeek.length -1) ) / daysOfWeek.length,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  selectedDayButton: {
  },
  dayButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  selectedDayButtonText: {
  },
  scheduleContainer: {
    marginHorizontal: 16,
    marginTop: 0,
    borderRadius: 10,
    padding: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  classCard: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 5,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  classTimeContainer: {
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  classTime: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  classDetailsContainer: {
    flex: 1,
  },
  classSubject: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  classCode: {
    fontSize: 13,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  classInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  classInfoIcon: {
    marginRight: 6,
  },
  classInfoText: {
  },
  emptySchedule: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    minHeight: 150,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default ScheduleScreen; 