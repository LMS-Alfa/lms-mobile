import { RouteProp, useRoute } from '@react-navigation/native'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useAppTheme } from '../../contexts/ThemeContext'
import { fetchChildAssignmentDetails } from '../../services/parentSupabaseService'
import { useAuthStore } from '../../store/authStore'

// Define the expected type for route params
type ParentAssignmentDetailScreenRouteProp = RouteProp<
	{
		ParentAssignmentDetail: {
			assignmentId: string
			childId: string
			childName?: string // Optional: pass child name for display
			assignmentTitle?: string // Optional: pass assignment title for header
		}
	},
	'ParentAssignmentDetail'
>

// Placeholder interface for combined assignment and submission details
interface AssignmentDetails {
	id: string
	title: string
	instructions?: string
	dueDate: string
	subjectName?: string
	maxScore?: number
	// Submission specific
	submittedAt?: string | null
	grade?: number | null
	feedback?: string | null
	// files?: Array<{ name: string; url: string }>; // Example for files
	isCompleted: boolean
	isPastDue: boolean
	statusText: string
}

const ParentAssignmentDetailScreen: React.FC = () => {
	const route = useRoute<ParentAssignmentDetailScreenRouteProp>()
	const { assignmentId, childId, childName, assignmentTitle } = route.params
	const { theme } = useAppTheme()
	const { user } = useAuthStore()
	const styles = makeStyles(theme)

	const [assignmentDetails, setAssignmentDetails] = useState<AssignmentDetails | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		const loadDetails = async () => {
			if (!assignmentId || !childId) {
				setError('Missing assignment or child ID.')
				setLoading(false)
				return
			}
			setLoading(true)
			try {
				const details = await fetchChildAssignmentDetails(childId, assignmentId)
				setAssignmentDetails(details)
			} catch (e: any) {
				setError(e.message || 'Failed to load assignment details.')
				console.error('Error loading assignment details:', e)
			} finally {
				setLoading(false)
			}
		}
		loadDetails()
	}, [assignmentId, childId])

	if (loading) {
		return (
			<View style={styles.centered}>
				<ActivityIndicator size='large' color={theme.primary} />
			</View>
		)
	}

	if (error) {
		return (
			<View style={styles.centered}>
				<Text style={styles.errorText}>{error}</Text>
			</View>
		)
	}

	if (!assignmentDetails) {
		return (
			<View style={styles.centered}>
				<Text>No assignment details found.</Text>
			</View>
		)
	}

	// Simple Card like View
	const CardView: React.FC<{ children: React.ReactNode; style?: object }> = ({
		children,
		style,
	}) => <View style={[styles.card, style]}>{children}</View>

	return (
		<ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
			<Text style={styles.headerTitle}>{assignmentDetails.title}</Text>
			{childName && <Text style={styles.childNameText}>For: {childName}</Text>}

			<CardView>
				<Text style={styles.sectionTitle}>Status: {assignmentDetails.statusText}</Text>
				<Text style={styles.detailText}>
					Due Date: {new Date(assignmentDetails.dueDate).toLocaleDateString()}
				</Text>
				{assignmentDetails.subjectName && (
					<Text style={styles.detailText}>Subject: {assignmentDetails.subjectName}</Text>
				)}
			</CardView>

			{assignmentDetails.isCompleted && assignmentDetails.submittedAt && (
				<CardView>
					<Text style={styles.sectionTitle}>Submission</Text>
					<Text style={styles.detailText}>
						Submitted: {new Date(assignmentDetails.submittedAt).toLocaleString()}
					</Text>
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
	)
}

const makeStyles = (theme: any) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: theme.background,
		},
		contentContainer: {
			padding: 16,
		},
		centered: {
			flex: 1,
			justifyContent: 'center',
			alignItems: 'center',
			padding: 16,
		},
		errorText: {
			color: theme.danger,
			fontSize: 16,
			textAlign: 'center',
		},
		headerTitle: {
			fontSize: 24,
			fontWeight: 'bold',
			color: theme.text,
			marginBottom: 8,
			textAlign: 'center',
		},
		childNameText: {
			fontSize: 16,
			color: theme.textSecondary,
			textAlign: 'center',
			marginBottom: 24,
		},
		card: {
			backgroundColor: theme.cardBackground,
			borderRadius: 8,
			padding: 16,
			marginBottom: 16,
			shadowColor: '#000',
			shadowOffset: {
				width: 0,
				height: 1,
			},
			shadowOpacity: 0.2,
			shadowRadius: 1.41,
			elevation: Platform.OS === 'android' ? 2 : 0, // Basic elevation for Android
			borderWidth: Platform.OS === 'ios' ? 1 : 0, // Subtle border for iOS card style
			borderColor: theme.border,
		},
		sectionTitle: {
			fontSize: 18,
			fontWeight: 'bold',
			color: theme.primary,
			marginBottom: 8,
		},
		subSectionTitle: {
			fontSize: 16,
			fontWeight: 'bold',
			color: theme.text,
			marginTop: 8,
			marginBottom: 4,
		},
		detailText: {
			fontSize: 16,
			color: theme.text,
			marginBottom: 4,
			lineHeight: 24,
		},
		detailTextBold: {
			fontSize: 16,
			color: theme.text,
			fontWeight: 'bold',
			marginBottom: 4,
		},
		feedbackText: {
			fontSize: 16,
			color: theme.textSecondary,
			fontStyle: 'italic',
			lineHeight: 22,
		},
	})

export default ParentAssignmentDetailScreen
