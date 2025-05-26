import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, FlatList, TouchableOpacity } from 'react-native';
import { RouteProp, useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { fetchChildTimetable, fetchParentChildrenList, ParentChildListItem } from '../../services/parentSupabaseService'; 
import { ParentHomeStackParamList } from '../../navigators/ParentTabNavigator';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuthStore } from '../../store/authStore';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '../../contexts/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

// Define timetable entry interface
export interface TimetableEntry {
  id: string; 
  dayOfWeek: string; 
  startTime: string; 
  endTime: string;   
  subjectName: string;
  teacherName?: string;
  room?: string;
  color?: string; // Added color field
  // title?: string; // Optional: if you want to use the specific timetable title separately
}

// Route prop now primarily expects params if navigated from Home stack
type ParentScheduleScreenRouteProp = RouteProp<ParentHomeStackParamList, 'ParentSchedule'>;

// Navigation prop for stack actions
type NavigationProps = StackNavigationProp<ParentHomeStackParamList>; 

const ParentScheduleScreen: React.FC = () => {
  const route = useRoute<ParentScheduleScreenRouteProp>();
  const navigation = useNavigation<NavigationProps>();
  const { user } = useAuthStore();
  const { theme } = useAppTheme();

  // Attempt to get childId and childName from route params if available
  const initialChildId = route.params?.childId;
  const initialChildName = route.params?.childName;

  const [selectedChildId, setSelectedChildId] = useState<string | undefined>(initialChildId);
  const [selectedChildName, setSelectedChildName] = useState<string | undefined>(initialChildName);
  
  const [childrenList, setChildrenList] = useState<ParentChildListItem[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeDayFilter, setActiveDayFilter] = useState<string | null>(null); // null means show all days

  const loadData = async (childIdToLoad?: string) => {
    setLoading(true);
    setError(null);
    setTimetable([]); 

    const currentParentId = user?.id;
    if (!currentParentId) {
      setError('Parent user not found. Please login again.');
      setLoading(false);
      return;
    }

    let targetChildId = childIdToLoad || selectedChildId;
    let targetChildName = selectedChildName;

    if (!targetChildId) { 
      setLoadingChildren(true);
      try {
        const fetchedChildren = await fetchParentChildrenList(currentParentId);
        setChildrenList(fetchedChildren);
        if (fetchedChildren.length === 1) {
          targetChildId = fetchedChildren[0].id;
          targetChildName = fetchedChildren[0].fullName;
          setSelectedChildId(targetChildId);
          setSelectedChildName(targetChildName);
        } else if (fetchedChildren.length > 1) {
          setError('Please select a child to view their schedule.'); 
          setLoading(false);
          setLoadingChildren(false);
          return;
        } else { 
          setError('No children found for your account.');
          setLoading(false);
          setLoadingChildren(false);
          return;
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch children list.');
        setLoading(false);
        setLoadingChildren(false);
        return;
      } finally {
        setLoadingChildren(false);
      }
    }

    if (targetChildId) {
      try {
        console.log(`[ParentScheduleScreen] Fetching timetable for child: ${targetChildId}`);
        const data = await fetchChildTimetable(targetChildId);
        setTimetable(data);
        if (!selectedChildName && childrenList.length > 0 && targetChildId) {
          const currentChild = childrenList.find(c => c.id === targetChildId);
          if (currentChild) setSelectedChildName(currentChild.fullName);
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load timetable.');
      } finally {
        setLoading(false);
      }
    } else {
      setError('Please select a child to view their schedule.');
      setLoading(false);
    }
  };
  
  useEffect(() => {
    setSelectedChildId(initialChildId);
    setSelectedChildName(initialChildName);
    loadData(initialChildId); 
  }, [initialChildId, initialChildName, user?.id]);

  useFocusEffect(
    React.useCallback(() => {
      if (!selectedChildId || initialChildId !== selectedChildId) {
         setSelectedChildId(initialChildId); 
         setSelectedChildName(initialChildName);
         loadData(initialChildId); 
      }
    }, [initialChildId, initialChildName, user?.id]) 
  );

  const handleChildSelection = (child: ParentChildListItem) => {
    setSelectedChildId(child.id);
    setSelectedChildName(child.fullName);
    setError(null); 
    setChildrenList([]); 
    setActiveDayFilter(null); 
    loadData(child.id); 
  };

  const filteredTimetable = activeDayFilter 
    ? timetable.filter(entry => entry.dayOfWeek === activeDayFilter)
    : timetable;

  const groupedTimetable = filteredTimetable.reduce((acc, entry) => {
    (acc[entry.dayOfWeek] = acc[entry.dayOfWeek] || []).push(entry);
    return acc;
  }, {} as Record<string, TimetableEntry[]>);

  const renderItem = ({ item }: { item: TimetableEntry }) => (
    <View style={[
      styles.timetableItem, 
      { 
        borderLeftColor: item.color || theme.primary,
        backgroundColor: theme.cardBackground
      }
    ]}>
      <View style={styles.itemTiming}>
        <MaterialCommunityIcons name="clock-outline" size={16} color={theme.textSecondary} style={styles.itemIcon} />
        <Text style={[styles.itemTimeText, { color: theme.text }]}>{item.startTime} - {item.endTime}</Text>
      </View>
      <Text style={[styles.itemSubjectText, { color: theme.text }]}>{item.subjectName}</Text>
      {item.teacherName && item.teacherName !== 'N/A' && (
        <View style={styles.itemDetailRow}>
          <MaterialCommunityIcons name="teach" size={16} color={theme.textSecondary} style={styles.itemIcon} />
          <Text style={[styles.itemDetailText, { color: theme.textSecondary }]}>{item.teacherName}</Text>
        </View>
      )}
      <View style={styles.itemDetailRow}>
        <MaterialCommunityIcons name="map-marker-outline" size={16} color={theme.textSecondary} style={styles.itemIcon} />
        <Text style={[styles.itemDetailText, { color: theme.textSecondary }]}>{item.room || 'N/A'}</Text>
      </View>
    </View>
  );

  const renderDayChip = (day: string) => (
    <TouchableOpacity
      key={day}
      style={[
        styles.dayChip,
        {
          backgroundColor: activeDayFilter === day ? theme.primary : theme.cardBackground,
          borderColor: theme.border
        }
      ]}
      onPress={() => setActiveDayFilter(activeDayFilter === day ? null : day)}
    >
      <Text
        style={[
          styles.dayChipText,
          { color: activeDayFilter === day ? '#FFFFFF' : theme.text }
        ]}
      >
        {day.substring(0, 3)}
      </Text>
    </TouchableOpacity>
  );

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const renderTimetableForDay = (day: string, entries: TimetableEntry[]) => (
    <View key={day} style={styles.daySection}>
      <Text style={[styles.daySectionHeader, { color: theme.text }]}>{day}</Text>
      {entries.map(entry => renderItem({ item: entry }))}
    </View>
  );

  const renderChildSelector = () => (
    <View style={styles.childSelector}>
      <Text style={[styles.selectorLabel, { color: theme.textSecondary }]}>Select Child:</Text>
      <FlatList
        data={childrenList}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.childChip,
              { 
                backgroundColor: selectedChildId === item.id ? theme.primary : theme.cardBackground,
                borderColor: theme.border
              }
            ]}
            onPress={() => handleChildSelection(item)}
          >
            <Text
              style={[
                styles.childChipText,
                { color: selectedChildId === item.id ? '#FFFFFF' : theme.text }
              ]}
            >
              {item.fullName}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right', 'bottom']}>
        <View style={[styles.centeredContainer, { backgroundColor: theme.background }]}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading schedule...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && (!childrenList.length || !selectedChildId)) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right', 'bottom']}>
        <View style={[styles.centeredContainer, { backgroundColor: theme.background }]}>
          <MaterialCommunityIcons name="alert-circle-outline" size={50} color={theme.danger} />
          <Text style={[styles.errorText, { color: theme.textSecondary }]}>{error}</Text>
          {childrenList.length > 0 && renderChildSelector()}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {selectedChildName ? `${selectedChildName}'s Schedule` : 'Schedule'}
        </Text>
      </View>

      <View style={styles.content}>
        {childrenList.length > 1 && renderChildSelector()}

        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {days.map(day => renderDayChip(day))}
          </ScrollView>
        </View>

        <ScrollView style={styles.scrollView}>
          {Object.keys(groupedTimetable).length > 0 ? (
            Object.entries(groupedTimetable).map(([day, entries]) => 
              renderTimetableForDay(day, entries)
            )
          ) : (
            <View style={styles.noScheduleContainer}>
              <MaterialCommunityIcons name="calendar-blank" size={50} color={theme.textSecondary} />
              <Text style={[styles.noScheduleText, { color: theme.textSecondary }]}>
                {activeDayFilter 
                  ? `No classes scheduled for ${activeDayFilter}` 
                  : 'No classes scheduled'}
              </Text>
            </View>
          )}
          <View style={{ height: 30 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  childSelector: {
    padding: 16,
    paddingBottom: 8,
  },
  selectorLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  childChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  childChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  dayChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  dayChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  daySection: {
    marginBottom: 24,
  },
  daySectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  timetableItem: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemTiming: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemIcon: {
    marginRight: 6,
  },
  itemTimeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  itemSubjectText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  itemDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  itemDetailText: {
    fontSize: 14,
  },
  noScheduleContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noScheduleText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
});

export default ParentScheduleScreen; 