import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, FlatList, TouchableOpacity, SafeAreaView } from 'react-native';
import { RouteProp, useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { fetchChildTimetable, fetchParentChildrenList, ParentChildListItem } from '../../services/parentSupabaseService'; 
import { ParentHomeStackParamList } from '../../navigators/ParentTabNavigator';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuthStore } from '../../store/authStore';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// Mock theme (remains the same)
const mockTheme = {
  colors: {
    background: '#F0F4F8', // Light grey-blue background
    text: '#2C3E50', // Darker, more saturated text color
    textSecondary: '#7F8C8D', // Softer grey for secondary text
    primary: '#3498DB', // Brighter, more modern blue
    error: '#E74C3C', // Softer red for errors
    cardBackground: '#FFFFFF',
    borderColor: '#BDC3C7', // Softer grey for borders
    headerRow: '#ECF0F1', // Lighter header row
    evenRow: '#FFFFFF',
    oddRow: '#F8F9FA', // Very light grey for odd rows
    buttonBackground: '#3498DB', // Consistent with primary
    buttonText: '#FFFFFF',
    listItemHover: '#E9ECEF', // Kept for consistency if used elsewhere
    dayChipActive: '#3498DB', // Consistent with primary
    dayChipInactive: '#E0E0E0',
    dayChipTextActive: '#FFFFFF',
    dayChipTextInactive: '#333333',
    timetableItemBorder: '#DAE4E5', // Light border for items
  },
  spacing: { small: 8, medium: 16, large: 24, extraSmall: 4, cardPadding: 12, itemPadding: 10 },
  fontSize: { small: 12, medium: 14, large: 16, xlarge: 22, button: 16, item: 16, dayHeader: 18 }, // Adjusted xlarge and added dayHeader
  borderRadius: { small: 4, medium: 8, large: 12, chip: 20 } // Added border radius values
};

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

  const theme = mockTheme;
  const styles = makeStyles(theme);

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
    <View style={[styles.timetableItem, { borderLeftColor: item.color || theme.colors.primary }]}>
      <View style={styles.itemTiming}>
        <MaterialCommunityIcons name="clock-outline" size={16} color={theme.colors.textSecondary} style={styles.itemIcon} />
        <Text style={styles.itemTimeText}>{item.startTime} - {item.endTime}</Text>
      </View>
      <Text style={styles.itemSubjectText}>{item.subjectName}</Text>
      {item.teacherName && item.teacherName !== 'N/A' && (
        <View style={styles.itemDetailRow}>
          <MaterialCommunityIcons name="teach" size={16} color={theme.colors.textSecondary} style={styles.itemIcon} />
          <Text style={styles.itemDetailText}>{item.teacherName}</Text>
        </View>
      )}
      <View style={styles.itemDetailRow}>
        <MaterialCommunityIcons name="map-marker-outline" size={16} color={theme.colors.textSecondary} style={styles.itemIcon} />
        <Text style={styles.itemDetailText}>{item.room || 'N/A'}</Text>
      </View>
    </View>
  );

  const renderDayChip = (day: string) => (
    <TouchableOpacity
      key={day}
      style={[
        styles.dayChip,
        activeDayFilter === day ? styles.dayChipActive : styles.dayChipInactive,
      ]}
      onPress={() => setActiveDayFilter(prev => prev === day ? null : day)} 
    >
      <Text style={activeDayFilter === day ? styles.dayChipTextActive : styles.dayChipTextInactive}>
        {day.substring(0,3)} 
      </Text>
    </TouchableOpacity>
  );

  const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  if (loadingChildren) {
    return <SafeAreaView style={styles.safeArea}><View style={styles.centered}><ActivityIndicator size="large" color={theme.colors.primary} /><Text style={styles.loadingText}>Loading children...</Text></View></SafeAreaView>;
  }

  if (!selectedChildId && childrenList.length > 1 && !loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.containerPadded}>
          <Text style={styles.headerTitle}>Select Child's Schedule</Text>
          <Text style={styles.messageText}>{error || 'Please choose a child to view their timetable.'}</Text>
          <FlatList
            data={childrenList}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.childSelectItem} onPress={() => handleChildSelection(item)}>
                <MaterialCommunityIcons name="account-child-outline" size={24} color={theme.colors.primary} style={styles.childIcon} />
                <Text style={styles.childSelectText}>{item.fullName}</Text>
                <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            )}
          />
        </View>
      </SafeAreaView>
    );
  }
  
  if (loading) { 
    return <SafeAreaView style={styles.safeArea}><View style={styles.centered}><ActivityIndicator size="large" color={theme.colors.primary} /><Text style={styles.loadingText}>Loading schedule...</Text></View></SafeAreaView>;
  }
  
  if (error) { 
     return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centeredContainerWithMessage}>
          <Text style={styles.headerTitle}>Schedule</Text>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color={theme.colors.error} style={{marginBottom: theme.spacing.medium}}/>
          <Text style={styles.messageText}>{error}</Text>
          <TouchableOpacity style={styles.button} onPress={() => loadData(selectedChildId)}> 
            <Text style={styles.buttonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  if (!selectedChildId) { 
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centeredContainerWithMessage}>
          <Text style={styles.headerTitle}>Schedule</Text>
          <MaterialCommunityIcons name="calendar-alert" size={48} color={theme.colors.textSecondary} style={{marginBottom: theme.spacing.medium}}/>
          <Text style={styles.messageText}>No child selected and no children found for your account.</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitleMain}>Schedule for {selectedChildName || 'Child'}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayChipsContainer}>
            {DAYS_ORDER.map(renderDayChip)}
        </ScrollView>
      </View>
      <ScrollView style={styles.containerScrollView}>
        {(activeDayFilter ? DAYS_ORDER.filter(d => d === activeDayFilter) : DAYS_ORDER).map(day => {
          const lessonsForDay = groupedTimetable[day];
          if (lessonsForDay && lessonsForDay.length > 0) {
            return (
              <View key={day} style={styles.daySection}>
                <Text style={styles.dayHeaderText}>{day}</Text>
                <FlatList
                  data={lessonsForDay.sort((a,b) => a.startTime.localeCompare(b.startTime))}
                  renderItem={renderItem}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false} 
                  ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
                />
              </View>
            );
          } else if (activeDayFilter === day) { 
             return (
                <View key={day} style={styles.daySectionEmpty}>
                    <View style={styles.centeredContent}>
                        <MaterialCommunityIcons name="calendar-check-outline" size={48} color={theme.colors.textSecondary} />
                        <Text style={styles.noLessonsText}>No lessons scheduled for {day}.</Text>
                    </View>
                </View>
            );
          }
          return null;
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

const makeStyles = (theme: typeof mockTheme) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  containerScrollView: { flex: 1 }, // Removed horizontal padding, will apply to day sections
  containerPadded: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.medium },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.medium },
  loadingText: { marginTop: theme.spacing.small, fontSize: theme.fontSize.medium, color: theme.colors.textSecondary },
  centeredContainerWithMessage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.large,
    backgroundColor: theme.colors.background,
  },
  messageText: {
    fontSize: theme.fontSize.medium,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.medium, 
  },
  button: {
    backgroundColor: theme.colors.buttonBackground,
    paddingVertical: theme.spacing.medium,
    paddingHorizontal: theme.spacing.large,
    borderRadius: theme.borderRadius.medium,
    marginTop: theme.spacing.small, 
  },
  buttonText: {
    color: theme.colors.buttonText,
    fontSize: theme.fontSize.button,
    fontWeight: '600',
  },
  centeredContent: { paddingVertical: theme.spacing.large, alignItems: 'center', justifyContent: 'center', minHeight: 150 },
  noLessonsText: { marginTop: theme.spacing.medium, fontSize: theme.fontSize.medium, color: theme.colors.textSecondary, textAlign: 'center' },
  
  headerBar: { // Container for title and day chips, with some elevation/shadow
    paddingTop: theme.spacing.medium,
    paddingHorizontal: theme.spacing.medium,
    backgroundColor: theme.colors.cardBackground, // Give it a background to lift it
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    // Elevation for Android
    elevation: 3,
  },
  headerTitleMain: { 
    fontSize: theme.fontSize.xlarge, 
    fontWeight: 'bold', 
    color: theme.colors.text, 
    textAlign: 'center',
    marginBottom: theme.spacing.medium,
  },
  headerTitle: { // Kept for child selection screen
    fontSize: theme.fontSize.xlarge, 
    fontWeight: 'bold', 
    color: theme.colors.text, 
    marginTop: theme.spacing.medium, 
    textAlign: 'center' 
  }, 
  dayChipsContainer: {
    paddingVertical: theme.spacing.medium, // Add vertical padding for better touch area
    alignItems: 'center', // Center chips if they don't fill width
  },
  dayChip: {
    paddingVertical: theme.spacing.small + 2, // Slightly taller chips
    paddingHorizontal: theme.spacing.medium + 2, // Slightly wider chips
    borderRadius: theme.borderRadius.chip,
    marginRight: theme.spacing.small,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipActive: {
    backgroundColor: theme.colors.dayChipActive,
    borderColor: theme.colors.dayChipActive,
  },
  dayChipInactive: {
    backgroundColor: theme.colors.cardBackground, // Use card background for inactive
    borderColor: theme.colors.borderColor, // Use a subtle border
  },
  dayChipTextActive: { color: theme.colors.dayChipTextActive, fontWeight: 'bold', fontSize: theme.fontSize.small },
  dayChipTextInactive: { color: theme.colors.text, fontSize: theme.fontSize.small }, // Darker text for inactive but readable
  
  daySection: { 
    marginBottom: theme.spacing.large, 
    paddingHorizontal: theme.spacing.medium, // Add horizontal padding here
  },
  daySectionEmpty: { 
    marginBottom: theme.spacing.large, 
    alignItems: 'center',
    paddingHorizontal: theme.spacing.medium,
  },
  dayHeaderText: { // New style for Day headers in the list
    fontSize: theme.fontSize.dayHeader, 
    fontWeight: '600', 
    color: theme.colors.primary, 
    marginTop: theme.spacing.large, // Add top margin for separation
    marginBottom: theme.spacing.medium, 
    paddingBottom: theme.spacing.small, 
    borderBottomWidth: 2, 
    borderBottomColor: theme.colors.primary,
  },
  
  // Timetable Item Card Style
  timetableItem: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.cardPadding,
    // marginBottom: theme.spacing.medium, // Replaced by ItemSeparatorComponent
    borderLeftWidth: 5, // For the color indicator
    borderColor: theme.colors.primary, // Default border color if item.color is not set
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    // Elevation for Android
    elevation: 2,
  },
  itemSeparator: {
    height: theme.spacing.medium,
  },
  itemTiming: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.small,
  },
  itemIcon: {
    marginRight: theme.spacing.small - 2,
  },
  itemTimeText: {
    fontSize: theme.fontSize.small,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  itemSubjectText: {
    fontSize: theme.fontSize.large,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.small,
  },
  itemDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.extraSmall,
  },
  itemDetailText: {
    fontSize: theme.fontSize.medium,
    color: theme.colors.textSecondary,
    flexShrink: 1, // Allow text to shrink if needed
  },

  // Old table styles - can be removed or kept for reference if other tables exist
  // tableHeader: { flexDirection: 'row', backgroundColor: theme.colors.headerRow, paddingVertical: theme.spacing.small, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  // headerCell: { fontWeight: 'bold', color: theme.colors.text, fontSize: theme.fontSize.medium },
  // row: { flexDirection: 'row', paddingVertical: theme.spacing.small, borderBottomWidth: 1, borderBottomColor: theme.colors.borderColor },
  // evenRow: { backgroundColor: theme.colors.evenRow },
  // oddRow: { backgroundColor: theme.colors.oddRow },
  // cell: { fontSize: theme.fontSize.medium, color: theme.colors.textSecondary, paddingHorizontal: theme.spacing.extraSmall }, 
  // timeCell: { flex: 2, },
  // subjectCell: { flex: 3, },
  // teacherCell: { flex: 2, },
  // roomCell: { flex: 1.5, textAlign: 'right' }, 

  childSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    padding: theme.spacing.medium,
    borderRadius: theme.borderRadius.medium,
    marginBottom: theme.spacing.small,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
     // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    // Elevation for Android
    elevation: 1,
  },
  childIcon: {
    marginRight: theme.spacing.medium,
  },
  childSelectText: {
    flex: 1,
    fontSize: theme.fontSize.item,
    color: theme.colors.text,
    fontWeight: '500',
  },
});

export default ParentScheduleScreen; 