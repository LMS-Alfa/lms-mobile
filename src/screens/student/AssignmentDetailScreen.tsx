import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { useAuthStore } from '../../store/authStore';
import { Assignment, submitAssignment } from '../../services/assignmentService';
import { supabase } from '../../utils/supabase';

// Define route params type
type RootStackParamList = {
  AssignmentDetail: { assignmentId: number };
};

type AssignmentDetailRouteProp = RouteProp<RootStackParamList, 'AssignmentDetail'>;

const formatDate = (dateString: string | null) => {
  if (!dateString) return 'No date set';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });
};

const AssignmentDetailScreen = () => {
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const route = useRoute<AssignmentDetailRouteProp>();
  const navigation = useNavigation();
  const { user } = useAuthStore();
  
  const { assignmentId } = route.params;
  
  // Fetch assignment details
  useEffect(() => {
    const fetchAssignmentDetails = async () => {
      if (!assignmentId) {
        setError('Assignment ID is missing');
        setLoading(false);
        return;
      }
      
      try {
        const { data, error: fetchError } = await supabase
          .from('assignments')
          .select(`
            *,
            subject:subjectid (
              id,
              subjectname,
              code
            ),
            class:classid (
              id,
              classname,
              grade
            ),
            teacher:teacherid (
              id,
              first_name,
              last_name,
              email
            )
          `)
          .eq('id', assignmentId)
          .single();
        
        if (fetchError) {
          throw fetchError;
        }
        
        if (!data) {
          throw new Error('Assignment not found');
        }
        
        // Now fetch submissions for this assignment by this student
        const { data: submissions, error: submissionsError } = await supabase
          .from('assignment_submissions')
          .select('*')
          .eq('assignmentid', assignmentId)
          .eq('studentid', user?.id || '')
          .order('submittedat', { ascending: false });
        
        if (submissionsError) {
          throw submissionsError;
        }
        
        // Calculate status
        let status: 'not_started' | 'in_progress' | 'completed' | 'overdue' = 'not_started';
        
        if (submissions && submissions.length > 0) {
          status = 'completed';
        } else if (data.duedate && new Date(data.duedate) < new Date()) {
          status = 'overdue';
        }
        
        // Set the assignment with its submissions
        setAssignment({
          ...data,
          status,
          submissions: submissions || []
        });
        
      } catch (err) {
        console.error('Error fetching assignment details:', err);
        setError('Failed to load assignment details. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAssignmentDetails();
  }, [assignmentId, user?.id]);
  
  const handleSubmitAssignment = async () => {
    if (!user || !assignment) return;
    
    Alert.alert(
      'Submit Assignment',
      'Are you sure you want to submit this assignment? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          style: 'default',
          onPress: async () => {
            setSubmitting(true);
            try {
              // In a real app, you would upload files here
              await submitAssignment(assignment.id, user.id);
              
              // Refresh assignment data
              const { data, error: fetchError } = await supabase
                .from('assignments')
                .select(`
                  *,
                  subject:subjectid (
                    id,
                    subjectname,
                    code
                  )
                `)
                .eq('id', assignmentId)
                .single();
              
              if (fetchError) throw fetchError;
              
              // Fetch the new submission
              const { data: submissions, error: submissionsError } = await supabase
                .from('assignment_submissions')
                .select('*')
                .eq('assignmentid', assignmentId)
                .eq('studentid', user.id)
                .order('submittedat', { ascending: false });
              
              if (submissionsError) throw submissionsError;
              
              // Update assignment state
              setAssignment({
                ...data,
                status: 'completed',
                submissions: submissions || []
              });
              
              Alert.alert('Success', 'Assignment submitted successfully!');
            } catch (err) {
              console.error('Error submitting assignment:', err);
              Alert.alert('Error', 'Failed to submit assignment. Please try again.');
            } finally {
              setSubmitting(false);
            }
          }
        }
      ]
    );
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading assignment details...</Text>
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle" size={50} color="#F44336" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  if (!assignment) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="file-minus" size={50} color="#F44336" />
        <Text style={styles.errorText}>Assignment not found</Text>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  const isSubmitted = assignment.status === 'completed';
  const isOverdue = assignment.status === 'overdue';
  const latestSubmission = assignment.submissions && assignment.submissions.length > 0 
    ? assignment.submissions[0] 
    : null;
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color="#4A90E2" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.subjectCode}>
            {assignment.subject?.code || 'Subject Code'}
          </Text>
          <Text style={styles.title}>{assignment.title}</Text>
        </View>
      </View>
      
      <View style={styles.card}>
        <View style={styles.statusContainer}>
          <Text style={styles.sectionTitle}>Status</Text>
          <View style={[
            styles.statusBadge, 
            { 
              backgroundColor: isSubmitted 
                ? '#4CAF50' 
                : isOverdue 
                  ? '#F44336' 
                  : '#2196F3'
            }
          ]}>
            <Text style={styles.statusText}>
              {isSubmitted 
                ? 'Submitted' 
                : isOverdue 
                  ? 'Overdue' 
                  : 'Not Submitted'}
            </Text>
          </View>
        </View>
        
        <View style={styles.metaContainer}>
          <View style={styles.metaItem}>
            <Icon name="calendar" size={20} color="#666" style={styles.metaIcon} />
            <Text style={styles.metaText}>
              Due: {formatDate(assignment.duedate)}
            </Text>
          </View>
          
          <View style={styles.metaItem}>
            <Icon name="book" size={20} color="#666" style={styles.metaIcon} />
            <Text style={styles.metaText}>
              {assignment.subject?.subjectname || 'Unknown Subject'}
            </Text>
          </View>
          
          <View style={styles.metaItem}>
            <Icon name="users" size={20} color="#666" style={styles.metaIcon} />
            <Text style={styles.metaText}>
              {assignment.class?.classname || 'Unknown Class'}
            </Text>
          </View>
          
          {assignment.teacher && (
            <View style={styles.metaItem}>
              <Icon name="user" size={20} color="#666" style={styles.metaIcon} />
              <Text style={styles.metaText}>
                Teacher: {assignment.teacher.first_name} {assignment.teacher.last_name}
              </Text>
            </View>
          )}
          
          {assignment.maxscore && (
            <View style={styles.metaItem}>
              <Icon name="award" size={20} color="#666" style={styles.metaIcon} />
              <Text style={styles.metaText}>
                Maximum Points: {assignment.maxscore}
              </Text>
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>
          {assignment.description || 'No description provided for this assignment.'}
        </Text>
      </View>
      
      {isSubmitted && latestSubmission && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Your Submission</Text>
          
          <View style={styles.submissionMeta}>
            <Icon name="clock" size={18} color="#666" style={styles.metaIcon} />
            <Text style={styles.metaText}>
              Submitted on: {formatDate(latestSubmission.submittedat)}
            </Text>
          </View>
          
          {latestSubmission.grade !== null && (
            <View style={styles.gradeContainer}>
              <Text style={styles.gradeSectionTitle}>Grade</Text>
              <View style={styles.gradeBox}>
                <Text style={styles.gradeValue}>
                  {latestSubmission.grade} / {assignment.maxscore || '—'}
                </Text>
              </View>
              
              {latestSubmission.feedback && (
                <View style={styles.feedbackContainer}>
                  <Text style={styles.feedbackTitle}>Feedback:</Text>
                  <Text style={styles.feedbackContent}>{latestSubmission.feedback}</Text>
                </View>
              )}
            </View>
          )}
          
          {!latestSubmission.grade && (
            <Text style={styles.pendingText}>
              Your submission is being reviewed. Grades will appear here once available.
            </Text>
          )}
        </View>
      )}
      
      {!isSubmitted && (
        <TouchableOpacity 
          style={[
            styles.submitButton,
            submitting && styles.submitButtonDisabled
          ]}
          onPress={handleSubmitAssignment}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Icon name="check-circle" size={20} color="#FFFFFF" style={styles.submitIcon} />
              <Text style={styles.submitButtonText}>Submit Assignment</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    padding: 20,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 10,
  },
  headerContent: {
    flex: 1,
    marginLeft: 10,
  },
  subjectCode: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '600',
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    marginHorizontal: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  metaContainer: {
    marginBottom: 5,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  metaIcon: {
    marginRight: 10,
  },
  metaText: {
    fontSize: 16,
    color: '#555',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444',
  },
  submissionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  gradeContainer: {
    marginTop: 10,
    padding: 15,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
  },
  gradeSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    marginBottom: 10,
  },
  gradeBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  gradeValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  feedbackContainer: {
    marginTop: 15,
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    marginBottom: 5,
  },
  feedbackContent: {
    fontSize: 15,
    lineHeight: 22,
    color: '#666',
  },
  pendingText: {
    fontSize: 16,
    color: '#FF9800',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E2',
    borderRadius: 10,
    padding: 16,
    marginHorizontal: 15,
    marginBottom: 30,
    marginTop: 5,
  },
  submitButtonDisabled: {
    backgroundColor: '#A5C7EC',
  },
  submitIcon: {
    marginRight: 10,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default AssignmentDetailScreen; 