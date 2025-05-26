import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
// import { useTheme, AppTheme } from '../../styles/theme'; // Removed for now
// import { Card } from '../../components/ui/Card'; // Removed for now
// import { GlobalStyles } from '../../styles/GlobalStyles'; // Removed for now

// import { fetchChildAssignmentDetails } from '../../services/parentSupabaseService'; // We'll create this

// Define the expected type for route params
type ParentAssignmentDetailScreenRouteProp = RouteProp<{
  ParentAssignmentDetail: {
    assignmentId: string;
    childId: string;
    childName?: string; // Optional: pass child name for display
    assignmentTitle?: string; // Optional: pass assignment title for header
  };
}, 'ParentAssignmentDetail'>;

// Placeholder interface for combined assignment and submission details
interface AssignmentDetails {
  id: string;
  title: string;
  instructions?: string;
  dueDate: string;
  subjectName?: string;
  maxScore?: number;
  // Submission specific
  submittedAt?: string | null;
  grade?: number | null;
  feedback?: string | null;
  // files?: Array<{ name: string; url: string }>; // Example for files
  isCompleted: boolean;
  isPastDue: boolean;
  statusText: string;
}

// Basic color palette (can be replaced with theme later)
const mockTheme = {
  colors: {
    background: '#F0F4F8',
    text: '#333333',
    textSecondary: '#555555',
    primary: '#007AFF',
    error: '#D32F2F',
    cardBackground: '#FFFFFF',
    borderColor: '#E0E0E0',
  },
  spacing: {
    small: 8,
    medium: 16,
    large: 24,
    extraSmall: 4,
  },
  fontSize: {
    small: 12,
    medium: 16,
    large: 18,
    xlarge: 24,
  }
};

const ParentAssignmentDetailScreen: React.FC = () => {
  const route = useRoute<ParentAssignmentDetailScreenRouteProp>();
  const { assignmentId, childId, childName, assignmentTitle } = route.params;
  // const theme = useTheme(); // Removed
  const theme = mockTheme; // Using mock theme
  const styles = makeStyles(theme);

  const [assignmentDetails, setAssignmentDetails] = useState<AssignmentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDetails = async () => {
      if (!assignmentId || !childId) {
        setError('Missing assignment or child ID.');
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // const details = await fetchChildAssignmentDetails(childId, assignmentId);
        // setAssignmentDetails(details);
        Alert.alert("Dev Note", "fetchChildAssignmentDetails service function needs to be implemented. Using placeholder data.");
        const placeholderDetails: AssignmentDetails = {
            id: assignmentId,
            title: assignmentTitle || 'Assignment Details',
            instructions: 'These are detailed instructions for the assignment. Make sure to read them carefully before starting. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
            dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // Due in 3 days
            subjectName: 'Mathematics',
            maxScore: 100,
            submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // Submitted 2 days ago
            grade: 85,
            feedback: 'Good effort! Please review chapter 3 for a better understanding of the topic concerning quadratic equations.',
            isCompleted: true,
            isPastDue: false,
            statusText: 'Graded'
        };
        setAssignmentDetails(placeholderDetails);

      } catch (e: any) {
        setError(e.message || 'Failed to load assignment details.');
        console.error("Error loading assignment details:", e);
      } finally {
        setLoading(false);
      }
    };
    loadDetails();
  }, [assignmentId, childId]);

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
  }

  if (error) {
    return <View style={styles.centered}><Text style={styles.errorText}>{error}</Text></View>;
  }

  if (!assignmentDetails) {
    return <View style={styles.centered}><Text>No assignment details found.</Text></View>;
  }

  // Simple Card like View
  const CardView: React.FC<{children: React.ReactNode, style?: object}> = ({ children, style }) => (
    <View style={[styles.card, style]}>{children}</View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.headerTitle}>{assignmentDetails.title}</Text>
      {childName && <Text style={styles.childNameText}>For: {childName}</Text>}
      
      <CardView>
        <Text style={styles.sectionTitle}>Status: {assignmentDetails.statusText}</Text>
        <Text style={styles.detailText}>Due Date: {new Date(assignmentDetails.dueDate).toLocaleDateString()}</Text>
        {assignmentDetails.subjectName && <Text style={styles.detailText}>Subject: {assignmentDetails.subjectName}</Text>}
      </CardView>

      {assignmentDetails.isCompleted && assignmentDetails.submittedAt && (
        <CardView>
          <Text style={styles.sectionTitle}>Submission</Text>
          <Text style={styles.detailText}>Submitted: {new Date(assignmentDetails.submittedAt).toLocaleString()}</Text>
          {assignmentDetails.grade !== null && assignmentDetails.grade !== undefined && (
            <Text style={styles.detailTextBold}>
              Grade: {assignmentDetails.grade}
              {assignmentDetails.maxScore ? ` / ${assignmentDetails.maxScore}` : ''}
            </Text>
          )}
          {assignmentDetails.feedback && (
            <>
              <Text style={styles.subSectionTitle}>Feedback:</Text>
              <Text style={styles.feedbackText}>{assignmentDetails.feedback}</Text>
            </>
          )}
        </CardView>
      )}

      {assignmentDetails.instructions && (
        <CardView>
          <Text style={styles.sectionTitle}>Instructions</Text>
          <Text style={styles.detailText}>{assignmentDetails.instructions}</Text>
        </CardView>
      )}
    </ScrollView>
  );
};

const makeStyles = (currentTheme: typeof mockTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: currentTheme.colors.background,
  },
  contentContainer: {
    padding: currentTheme.spacing.medium,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: currentTheme.spacing.medium,
  },
  errorText: {
    color: currentTheme.colors.error,
    fontSize: currentTheme.fontSize.medium,
    textAlign: 'center',
  },
  headerTitle: {
    fontSize: currentTheme.fontSize.xlarge,
    fontWeight: 'bold',
    color: currentTheme.colors.text,
    marginBottom: currentTheme.spacing.small,
    textAlign: 'center',
  },
  childNameText: {
    fontSize: currentTheme.fontSize.medium,
    color: currentTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: currentTheme.spacing.large,
  },
  card: {
    backgroundColor: currentTheme.colors.cardBackground,
    borderRadius: 8,
    padding: currentTheme.spacing.medium,
    marginBottom: currentTheme.spacing.medium,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.20,
    shadowRadius: 1.41,
    elevation: Platform.OS === 'android' ? 2 : 0, // Basic elevation for Android
    borderWidth: Platform.OS === 'ios' ? 1 : 0, // Subtle border for iOS card style
    borderColor: currentTheme.colors.borderColor, 
  },
  sectionTitle: {
    fontSize: currentTheme.fontSize.large,
    fontWeight: 'bold',
    color: currentTheme.colors.primary,
    marginBottom: currentTheme.spacing.small,
  },
  subSectionTitle: {
    fontSize: currentTheme.fontSize.medium,
    fontWeight: 'bold',
    color: currentTheme.colors.text,
    marginTop: currentTheme.spacing.small,
    marginBottom: currentTheme.spacing.extraSmall,
  },
  detailText: {
    fontSize: currentTheme.fontSize.medium,
    color: currentTheme.colors.text,
    marginBottom: currentTheme.spacing.extraSmall,
    lineHeight: currentTheme.fontSize.medium * 1.5,
  },
  detailTextBold: {
    fontSize: currentTheme.fontSize.medium,
    color: currentTheme.colors.text,
    fontWeight: 'bold',
    marginBottom: currentTheme.spacing.extraSmall,
  },
  feedbackText: {
    fontSize: currentTheme.fontSize.medium,
    color: currentTheme.colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: currentTheme.fontSize.medium * 1.4,
  },
});

export default ParentAssignmentDetailScreen; 