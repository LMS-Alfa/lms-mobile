import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { useTheme, DefaultTheme } from 'styled-components/native';
import { useAuthStore } from '../../store/authStore'; // Import auth store
import Icon from 'react-native-vector-icons/Feather'; // Import Feather icons

// Define props for MetricCard
interface MetricCardProps {
  title: string;
  value: number | string;
  iconName: string; // Changed from iconText to iconName
  iconColor?: string;
  cardColor?: string; 
  style?: any; // For animated style
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, iconName, iconColor, cardColor, style }) => {
  const theme = useTheme() as DefaultTheme & { cardBlue?: string; cardGreen?: string; cardOrange?: string; cardPurple?: string; backgroundAlt?: string; cardBackground?: string; separator?: string; text?: string; textSecondary?: string; primary?: string; };
  return (
    <Animated.View style={[styles.metricCard, { backgroundColor: cardColor || theme.cardBackground || '#ffffff' }, style]}>
      <View style={[styles.metricIconCircle, { backgroundColor: iconColor ? theme.primary + '20' : theme.primary + '10'  }]}>
        <Icon name={iconName} size={22} color={iconColor || theme.primary || '#0000ff'} />
    </View>
      <Text style={[styles.metricValue, { color: theme.text || '#222' }]}>{value}</Text>
      <Text style={[styles.metricTitle, { color: theme.textSecondary || '#555555' }]}>{title}</Text>
    </Animated.View>
  );
};

// Animated Section Container
interface AnimatedSectionProps {
  children: React.ReactNode;
  style?: any; // For animated style, can be more specific if needed e.g., ViewStyle | Animated.AnimatedProps<ViewStyle>
}

const AnimatedSection: React.FC<AnimatedSectionProps> = ({ children, style }) => (
  <Animated.View style={[styles.sectionContainer, style]}>
    {children}
  </Animated.View>
);

const AdminDashboardScreen = () => {
  const theme = useTheme() as DefaultTheme & { cardBlue?: string; cardGreen?: string; cardOrange?: string; cardPurple?: string; backgroundAlt?: string; cardBackground?: string; separator?: string; text?: string; textSecondary?: string; primary?: string; iconDefaultColor?: string; success?: string; warning?: string; }; 
  const user = useAuthStore((state) => state.user);

  // Animation refs
  const animations = useRef([
    new Animated.Value(0), // Welcome message
    new Animated.Value(0), // Metrics Grid
    new Animated.Value(0), // Student Stats Section
    new Animated.Value(0)  // Attendance Section
  ]).current;

  useEffect(() => {
    const animateIn = () => {
      Animated.stagger(150, 
        animations.map(anim => 
          Animated.timing(anim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          })
        )
      ).start();
    };
    animateIn();
  }, [animations]);

  const animatedStyles = animations.map(anim => ({
    opacity: anim,
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [30, 0],
        }),
      },
    ],
  }));

  // Placeholder data - aligned with web screenshot where possible
  const metrics = {
    totalUsers: 62,
    totalStudents: 51,
    totalTeachers: 7,
    activeClasses: 1,
  };

  const studentStats = {
    total: 51,
    active: 51,
    inactive: 0,
    activePercentage: 100,
    inactivePercentage: 0,
  };

  // Define icon colors based on theme or fallbacks
  const iconPrimaryColor = theme.primary || '#007AFF';
  const cardColors = {
      blue: theme.cardBlue || '#E9F5FF', // Lighter, more minimalistic
      green: theme.cardGreen || '#E6FFFA',
      orange: theme.cardOrange || '#FFF9E6',
      purple: theme.cardPurple || '#FEEFFF',
  };

  return (
    <ScrollView 
        style={[styles.container, { backgroundColor: theme.backgroundAlt || '#F7F9FC' }]} 
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
    >
      <Animated.View style={[styles.headerContainer, animatedStyles[0]]}>
        <Text style={[styles.headerTitle, { color: theme.text || '#1D232E' }]}>Dashboard</Text>
        {user && (
          <Text style={[styles.welcomeMessage, { color: theme.textSecondary || '#6C7A89' }]}>
            Welcome back, {user.firstName || 'Admin'}!
          </Text>
        )}
      </Animated.View>

      <Animated.View style={[styles.metricsGridContainer, animatedStyles[1]]}>
        <MetricCard title="Total Users" value={metrics.totalUsers} iconName="users" cardColor={cardColors.blue} iconColor={iconPrimaryColor} />
        <MetricCard title="Total Students" value={metrics.totalStudents} iconName="users" cardColor={cardColors.green} iconColor={theme.success || '#28A745'} />
        <MetricCard title="Teachers" value={metrics.totalTeachers} iconName="briefcase" cardColor={cardColors.orange} iconColor={theme.warning || '#FFC107'} />
        <MetricCard title="Active Classes" value={metrics.activeClasses} iconName="book-open" cardColor={cardColors.purple} iconColor={theme.primary || '#6F42C1'} />
      </Animated.View>

      <AnimatedSection style={[{ backgroundColor: theme.cardBackground || '#FFFFFF' }, animatedStyles[2]]}>
        <Text style={[styles.sectionTitle, { color: theme.text || '#1D232E' }]}>Student Statistics</Text>
        <View style={styles.studentStatsContent}>
          <View style={[styles.studentStatsCircle, { borderColor: theme.primary || '#007AFF'}]}>
            <Text style={[styles.studentStatsCircleText, { color: theme.primary || '#007AFF' }]}>{studentStats.total}</Text>
            <Text style={[styles.studentStatsCircleLabel, { color: theme.textSecondary || '#6C7A89' }]}>Total Students</Text>
          </View>
          <View style={styles.studentStatsDetails}>
            <Text style={[styles.statText, {color: theme.text || '#343A40'}]}>Active Students: <Text style={styles.statValue}>{studentStats.active} ({studentStats.activePercentage}%)</Text></Text>
            <Text style={[styles.statText, {color: theme.text || '#343A40'}]}>Inactive Students: <Text style={styles.statValue}>{studentStats.inactive} ({studentStats.inactivePercentage}%)</Text></Text>
            <View style={[styles.statsBarContainer, { backgroundColor: theme.separator || '#E9ECEF'}]}>
              <View style={[styles.statsBar, { width: `${studentStats.activePercentage}%`, backgroundColor: theme.primary || '#007AFF' }]} />
      </View>
            <Text style={[styles.statsBarLabel, {color: theme.textSecondary || '#6C7A89'}]}>Active vs. Inactive</Text>
      </View>
        </View>
      </AnimatedSection>

      <AnimatedSection style={[{ backgroundColor: theme.cardBackground || '#FFFFFF' }, animatedStyles[3]]}>
        <View style={styles.attendanceHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text || '#1D232E' }]}>Attendance Overview</Text>
            <TouchableOpacity onPress={() => console.log('Full Report Tapped')}>
                <Text style={[styles.fullReportLink, {color: theme.primary || '#007AFF'}]}>Full Report</Text>
            </TouchableOpacity>
        </View>
        <Text style={[styles.subSectionTitle, { color: theme.textSecondary || '#6C7A89' }]}>Daily Attendance</Text>
        <View style={[styles.placeholderBox, { backgroundColor: theme.backgroundAlt || '#F7F9FC' }]}>
          <Icon name="calendar" size={28} color={theme.textSecondary || '#6C7A89'} />
          <Text style={[styles.placeholderText, { color: theme.textSecondary || '#6C7A89'}]}>Daily attendance chart coming soon...</Text>
      </View>
      </AnimatedSection>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 30, // Increased padding at the bottom
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 25, 
    paddingBottom: 20,
    borderBottomWidth: 1,
    // borderBottomColor: theme.separator, // Use theme color
  },
  headerTitle: {
    fontSize: 28, // Increased for emphasis
    fontWeight: 'bold',
  },
  welcomeMessage: {
    fontSize: 16,
    marginTop: 5,
  },
  metricsGridContainer: { // Wrapper for metrics grid for animation
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  metricCard: {
    width: '48%',
    borderRadius: 12, // Slightly more rounded
    paddingVertical: 20, // Increased vertical padding
    paddingHorizontal: 10,
    alignItems: 'center',
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 }, // Subtle shadow
    shadowOpacity: 0.05, // Very subtle
    shadowRadius: 5,
    elevation: 2, 
  },
  metricIconCircle: {
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 26,
    fontWeight: '700', // Bolder
    marginBottom: 3,
  },
  metricTitle: {
    fontSize: 13, 
    textAlign: 'center',
  },
  sectionContainer: {
    marginHorizontal: 15,
    marginVertical: 10, 
    padding: 20, // Increased padding
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20, 
    fontWeight: '600', // Semi-bold
    marginBottom: 18, 
  },
  studentStatsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  studentStatsCircle: {
    width: 100, 
    height: 100, 
    borderRadius: 50, 
    borderWidth: 8, // Thicker border for emphasis
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  studentStatsCircleText: {
    fontSize: 26, 
    fontWeight: 'bold',
  },
  studentStatsCircleLabel: {
    fontSize: 12, 
    marginTop: 4, 
  },
  studentStatsDetails: {
    flex: 1,
  },
  statText: {
    fontSize: 14, 
    marginBottom: 8, 
  },
  statValue: { 
    fontWeight: 'bold',
  },
  statsBarContainer: {
    height: 10, 
    borderRadius: 5,
    marginTop: 5,
    marginBottom: 5, 
    overflow: 'hidden',
  },
  statsBar: {
    height: '100%',
    borderRadius: 5,
  },
  statsBarLabel: {
    fontSize: 12, 
    textAlign: 'center',
    marginTop: 5,
  },
  attendanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8, 
  },
  fullReportLink: {
      fontSize: 14, 
      fontWeight: '600',
  },
  subSectionTitle: {
    fontSize: 16, 
    fontWeight: '600',
    marginTop: 10, 
    marginBottom: 10,
  },
  placeholderBox: {
    paddingVertical: 20, 
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  placeholderText: { // Style for placeholder text, e.g. in attendance chart
    marginTop: 8,
    fontSize: 14,
  }
});

export default AdminDashboardScreen; 