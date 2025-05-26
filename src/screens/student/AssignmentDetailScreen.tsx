import { RouteProp, useNavigation, useRoute } from '@react-navigation/native'
import { decode } from 'base64-arraybuffer'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system'
import React, { useEffect, useState } from 'react'
import {
	ActivityIndicator,
	Alert,
	Linking,
	Platform,
	SafeAreaView,
	ScrollView,
	StatusBar,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native'
import Icon from 'react-native-vector-icons/Feather'
import { Assignment, getAssignmentById } from '../../services/assignmentService'
import { useAuthStore } from '../../store/authStore'
import { supabase } from '../../utils/supabase'

// Define route params type
type RootStackParamList = {
	AssignmentDetail: { assignmentId: number }
}

type AssignmentDetailRouteProp = RouteProp<RootStackParamList, 'AssignmentDetail'>

const formatDate = (dateString: string | null) => {
	if (!dateString) return 'No date set'

	const date = new Date(dateString)
	return date.toLocaleDateString('en-US', {
		weekday: 'long',
		month: 'long',
		day: 'numeric',
		hour: 'numeric',
		minute: 'numeric',
		hour12: true,
	})
}

const AssignmentDetailScreen = () => {
	const [assignment, setAssignment] = useState<Assignment | null>(null)
	const [loading, setLoading] = useState(true)
	const [submitting, setSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null)

	const route = useRoute<AssignmentDetailRouteProp>()
	const navigation = useNavigation()
	const { user } = useAuthStore()

	const assignmentId = (route.params as any)?.assignmentId

	// Fetch assignment details
	useEffect(() => {
		if (!assignmentId) {
			setError('Assignment ID is missing')
			setLoading(false)
			return
		}

		const fetchAssignment = async () => {
			try {
				const data = await getAssignmentById(assignmentId)
				setAssignment(data)
				setError(null)
			} catch (err) {
				console.error('Error fetching assignment:', err)
				setError('Failed to load assignment details')
			} finally {
				setLoading(false)
			}
		}

		fetchAssignment()
	}, [assignmentId])

	const handleFilePick = async () => {
		try {
			const result = await DocumentPicker.getDocumentAsync({
				multiple: false, // Only allow one file
				copyToCacheDirectory: true,
			})

			if (!result.canceled && result.assets && result.assets.length > 0) {
				setSelectedFile(result.assets[0])
			}
		} catch (err) {
			Alert.alert('Error', 'Failed to pick file')
		}
	}

	const uploadFile = async () => {
		if (!selectedFile) return null

		try {
			console.log('Uploading file:', selectedFile.name)

			// Create a reliable file name
			const fileExt = selectedFile.name.split('.').pop()
			const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`
			const filePath = `submissions/${user?.id}/${assignmentId}/${fileName}`

			console.log('File path:', filePath)

			// For smaller files, use base64 encoding which is more reliable
			const fileInfo = await FileSystem.getInfoAsync(selectedFile.uri)
			console.log('File info:', fileInfo)

			// Use direct upload for smaller files
			if (fileInfo.exists && fileInfo.size && fileInfo.size < 1000000) {
				// Less than 1MB
				const base64 = await FileSystem.readAsStringAsync(selectedFile.uri, {
					encoding: FileSystem.EncodingType.Base64,
				})

				console.log('Using base64 upload for small file')

				const { data, error: uploadError } = await supabase.storage
					.from('lms')
					.upload(filePath, decode(base64), {
						contentType: selectedFile.mimeType || 'application/octet-stream',
					})

				if (uploadError) {
					console.error('Supabase upload error:', uploadError)
					throw uploadError
				}
			} else {
				// For larger files, use FormData
				console.log('Using FormData upload for larger file')

				const formData = new FormData()
				formData.append('file', {
					uri: selectedFile.uri,
					name: fileName,
					type: selectedFile.mimeType || 'application/octet-stream',
				} as any)

				const { data, error: uploadError } = await supabase.storage
					.from('lms')
					.upload(filePath, formData, {
						contentType: selectedFile.mimeType || 'application/octet-stream',
					})

				if (uploadError) {
					console.error('Supabase upload error:', uploadError)
					throw uploadError
				}
			}

			// Get the public URL
			const { data: urlData } = supabase.storage.from('lms').getPublicUrl(filePath)

			console.log('Upload successful, public URL:', urlData.publicUrl)
			return urlData.publicUrl
		} catch (err) {
			console.error('Error uploading file:', err)
			throw new Error(`Failed to upload file: ${selectedFile.name}`)
		}
	}

	const handleSubmitAssignment = async () => {
		if (!user || !assignment || !selectedFile) return

		Alert.alert(
			'Submit Assignment',
			'Are you sure you want to submit this assignment? This action cannot be undone.',
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Submit',
					style: 'default',
					onPress: async () => {
						setSubmitting(true)
						try {
							// Upload file first
							const fileUrl = await uploadFile()

							// Submit assignment with file URL
							const { data: submission, error: submissionError } = await supabase
								.from('submissions')
								.insert({
									assignmentid: assignment.id,
									studentid: user.id,
									submittedat: new Date().toISOString(),
									fileurl: fileUrl, // Changed from file_urls to fileurl (string)
								})
								.select()
								.single()

							if (submissionError) throw submissionError

							// Update assignment state
							setAssignment({
								...assignment,
								status: 'completed',
								submissions: [submission, ...(assignment.submissions || [])],
							})

							Alert.alert('Success', 'Assignment submitted successfully!')
							setSelectedFile(null)
						} catch (err) {
							console.error('Error submitting assignment:', err)
							Alert.alert('Error', 'Failed to submit assignment. Please try again.')
						} finally {
							setSubmitting(false)
						}
					},
				},
			]
		)
	}

	const getStatusColor = (status: Assignment['status']) => {
		switch (status) {
			case 'overdue':
				return '#FF4B4B'
			case 'in_progress':
				return '#FFB800'
			case 'completed':
				return '#4CAF50'
			case 'not_started':
			default:
				return '#4A90E2'
		}
	}

	const getStatusText = (status: Assignment['status']) => {
		switch (status) {
			case 'overdue':
				return 'Overdue'
			case 'in_progress':
				return 'In Progress'
			case 'completed':
				return 'Completed'
			case 'not_started':
			default:
				return 'Not Started'
		}
	}

	const handleFilePress = async (fileUrl: string) => {
		try {
			const supported = await Linking.canOpenURL(fileUrl)
			if (supported) {
				await Linking.openURL(fileUrl)
			} else {
				Alert.alert('Error', 'Cannot open this file')
			}
		} catch (error) {
			Alert.alert('Error', 'Failed to open file')
		}
	}

	if (loading) {
		return (
			<SafeAreaView style={styles.safeArea}>
				<StatusBar barStyle='default' backgroundColor='#4A90E2' />
				<View style={styles.loadingContainer}>
					<ActivityIndicator size='large' color='#4A90E2' />
					<Text style={styles.loadingText}>Loading assignment details...</Text>
				</View>
			</SafeAreaView>
		)
	}

	if (error || !assignment) {
		return (
			<SafeAreaView style={styles.safeArea}>
				<StatusBar barStyle='default' backgroundColor='#4A90E2' />
				<View style={styles.errorContainer}>
					<Icon name='alert-circle' size={48} color='#FF4B4B' />
					<Text style={styles.errorText}>{error || 'Assignment not found'}</Text>
					<TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
						<Text style={styles.buttonText}>Go Back</Text>
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		)
	}

	const isSubmitted = assignment.status === 'completed'
	const isOverdue = assignment.status === 'overdue'
	const latestSubmission =
		assignment.submissions && assignment.submissions.length > 0 ? assignment.submissions[0] : null

	return (
		<SafeAreaView style={styles.safeArea}>
			<StatusBar barStyle='default' backgroundColor='#4A90E2' />
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
					<Icon name='arrow-left' size={24} color='#FFFFFF' />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>{assignment.title}</Text>
			</View>

			<ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
				{/* Subject and Class Info */}
				<View style={styles.infoCard}>
					<View style={styles.row}>
						<Icon name='book' size={20} color='#4A90E2' />
						<Text style={styles.subjectText}>
							{assignment.subject?.subjectname || 'No subject'} •{' '}
							{assignment.class?.classname || 'No class'}
						</Text>
					</View>
				</View>

				{/* Status and Due Date */}
				<View style={styles.card}>
					<View style={styles.cardRow}>
						<View style={styles.statusSection}>
							<Text style={styles.label}>Status</Text>
							<View style={styles.statusContainer}>
								<View
									style={[styles.statusDot, { backgroundColor: getStatusColor(assignment.status) }]}
								/>
								<Text style={[styles.statusText, { color: getStatusColor(assignment.status) }]}>
									{getStatusText(assignment.status)}
								</Text>
							</View>
						</View>
						<View style={styles.dueDateSection}>
							<Text style={styles.label}>Due Date</Text>
							<Text style={[styles.value, isOverdue && styles.overdueText]}>
								{assignment.duedate
									? new Date(assignment.duedate).toLocaleDateString('en-US', {
											month: 'short',
											day: 'numeric',
											year: 'numeric',
									  })
									: 'No due date'}
							</Text>
						</View>
					</View>
				</View>

				{/* Instructions */}
				<View style={styles.card}>
					<Text style={styles.cardTitle}>Instructions</Text>
					<Text style={styles.instructionsText}>
						{assignment.instructions || 'No instructions provided'}
					</Text>
				</View>

				{/* File Upload Section */}
				{!isSubmitted && (
					<View style={styles.card}>
						<Text style={styles.cardTitle}>Upload File</Text>
						<TouchableOpacity style={styles.uploadButton} onPress={handleFilePick}>
							<Icon name='upload' size={24} color='#4A90E2' />
							<Text style={styles.uploadButtonText}>Select File</Text>
						</TouchableOpacity>

						{selectedFile && (
							<View style={styles.selectedFilesContainer}>
								<View style={styles.fileItem}>
									<Icon name='file' size={20} color='#4A90E2' />
									<Text style={styles.fileName} numberOfLines={1}>
										{selectedFile.name}
									</Text>
									<TouchableOpacity onPress={() => setSelectedFile(null)}>
										<Icon name='x' size={20} color='#FF4B4B' />
									</TouchableOpacity>
								</View>
							</View>
						)}
					</View>
				)}

				{/* Submission Details */}
				{isSubmitted && latestSubmission && (
					<View style={styles.card}>
						<Text style={styles.cardTitle}>Your Submission</Text>
						<View style={styles.row}>
							<Icon name='clock' size={18} color='#666' />
							<Text style={styles.submissionText}>
								Submitted on: {formatDate(latestSubmission.submittedat)}
							</Text>
						</View>

						{latestSubmission.fileurl && (
							<TouchableOpacity
								style={styles.fileLink}
								onPress={() => handleFilePress(latestSubmission.fileurl)}
							>
								<Icon name='paperclip' size={18} color='#4A90E2' />
								<Text style={styles.fileLinkText}>View Submitted File</Text>
							</TouchableOpacity>
						)}

						{latestSubmission.grade !== null && (
							<View style={styles.gradeSection}>
								<Text style={styles.gradeTitle}>Grade</Text>
								<View style={styles.gradeBox}>
									<Text style={styles.gradeValue}>
										{latestSubmission.grade} / {assignment.maxscore || '—'}
									</Text>
								</View>

								{latestSubmission.feedback && (
									<View style={styles.feedbackSection}>
										<Text style={styles.feedbackTitle}>Feedback</Text>
										<Text style={styles.feedbackText}>{latestSubmission.feedback}</Text>
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

				{/* Submit Button */}
				{!isSubmitted && (
					<TouchableOpacity
						style={[
							styles.submitButton,
							(submitting || !selectedFile) && styles.submitButtonDisabled,
						]}
						onPress={handleSubmitAssignment}
						disabled={submitting || !selectedFile}
					>
						{submitting ? (
							<ActivityIndicator size='small' color='#FFFFFF' />
						) : (
							<>
								<Icon name='check-circle' size={24} color='#FFFFFF' />
								<Text style={styles.submitButtonText}>
									{!selectedFile ? 'Select a file to submit' : 'Submit Assignment'}
								</Text>
							</>
						)}
					</TouchableOpacity>
				)}
			</ScrollView>
		</SafeAreaView>
	)
}

const STATUSBAR_HEIGHT = StatusBar.currentHeight || 0

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: '#4A90E2',
		paddingTop: Platform.OS === 'android' ? STATUSBAR_HEIGHT : 0,
	},
	container: {
		flex: 1,
		backgroundColor: '#F5F7FA',
	},
	contentContainer: {
		paddingBottom: 24,
	},
	header: {
		backgroundColor: '#4A90E2',
		flexDirection: 'row',
		alignItems: 'center',
		padding: 16,
		elevation: 0,
		zIndex: 10,
	},
	backButton: {
		padding: 8,
	},
	headerTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		color: '#FFFFFF',
		marginLeft: 16,
		flex: 1,
	},
	infoCard: {
		backgroundColor: '#FFFFFF',
		borderRadius: 8,
		padding: 16,
		margin: 16,
		marginTop: 16,
		elevation: 2,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
	},
	card: {
		backgroundColor: '#FFFFFF',
		borderRadius: 8,
		padding: 16,
		marginHorizontal: 16,
		marginBottom: 16,
		elevation: 1,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 1,
	},
	cardTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
		marginBottom: 16,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	cardRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
	},
	subjectText: {
		fontSize: 16,
		color: '#333',
		marginLeft: 8,
	},
	label: {
		fontSize: 14,
		color: '#666',
		marginBottom: 4,
	},
	value: {
		fontSize: 16,
		color: '#333',
		fontWeight: '500',
	},
	statusSection: {
		flex: 1,
	},
	dueDateSection: {
		flex: 1,
		alignItems: 'flex-end',
	},
	statusContainer: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	statusDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		marginRight: 6,
	},
	statusText: {
		fontSize: 16,
		fontWeight: '500',
	},
	overdueText: {
		color: '#FF4B4B',
	},
	instructionsText: {
		fontSize: 16,
		lineHeight: 24,
		color: '#444',
	},
	uploadButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		padding: 12,
		borderWidth: 2,
		borderColor: '#4A90E2',
		borderStyle: 'dashed',
		borderRadius: 8,
		marginBottom: 16,
	},
	uploadButtonText: {
		marginLeft: 8,
		fontSize: 16,
		color: '#4A90E2',
		fontWeight: '500',
	},
	selectedFilesContainer: {
		marginTop: 12,
	},
	fileItem: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 12,
		backgroundColor: '#F8F9FA',
		borderRadius: 8,
		marginBottom: 8,
	},
	fileName: {
		flex: 1,
		marginLeft: 12,
		marginRight: 12,
		fontSize: 14,
		color: '#333',
	},
	submissionText: {
		marginLeft: 8,
		fontSize: 14,
		color: '#666',
	},
	gradeSection: {
		marginTop: 16,
		padding: 16,
		backgroundColor: '#F8F9FA',
		borderRadius: 8,
	},
	gradeTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#333',
		marginBottom: 12,
	},
	gradeBox: {
		alignItems: 'center',
		justifyContent: 'center',
		padding: 16,
		backgroundColor: '#E3F2FD',
		borderRadius: 8,
	},
	gradeValue: {
		fontSize: 24,
		fontWeight: 'bold',
		color: '#1976D2',
	},
	feedbackSection: {
		marginTop: 16,
	},
	feedbackTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#333',
		marginBottom: 8,
	},
	feedbackText: {
		fontSize: 14,
		lineHeight: 20,
		color: '#666',
	},
	pendingText: {
		fontSize: 14,
		color: '#FF9800',
		fontStyle: 'italic',
		textAlign: 'center',
		marginTop: 8,
	},
	submitButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#4A90E2',
		borderRadius: 8,
		padding: 16,
		margin: 16,
		marginTop: 8,
	},
	submitButtonDisabled: {
		backgroundColor: '#A5C7EC',
	},
	submitButtonText: {
		marginLeft: 8,
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
		marginTop: 12,
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
		marginTop: 12,
		fontSize: 16,
		color: '#666',
		textAlign: 'center',
		marginBottom: 20,
	},
	button: {
		backgroundColor: '#4A90E2',
		paddingHorizontal: 24,
		paddingVertical: 12,
		borderRadius: 8,
	},
	buttonText: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: '500',
	},
	fileLink: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 12,
		marginBottom: 16,
		padding: 12,
		backgroundColor: '#F0F7FF',
		borderRadius: 8,
	},
	fileLinkText: {
		color: '#4A90E2',
		marginLeft: 8,
		fontSize: 16,
		fontWeight: '500',
	},
})

export default AssignmentDetailScreen
