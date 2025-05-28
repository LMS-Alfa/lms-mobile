import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Icon from 'react-native-vector-icons/Feather'
import { useAppTheme } from '../../contexts/ThemeContext'
import { supabase } from '../../utils/supabase'

interface StudentPerformanceSummaryProps {
	studentId: string
	studentName: string
}

const StudentPerformanceSummary: React.FC<StudentPerformanceSummaryProps> = ({
	studentId,
	studentName,
}) => {
	const { theme } = useAppTheme()
	const [loading, setLoading] = useState(true)
	const [gpa, setGpa] = useState<string>('0.0')
	const [attendanceRate, setAttendanceRate] = useState<number>(0)
	const [attendanceSummary, setAttendanceSummary] = useState({
		present: 0,
		absent: 0,
		late: 0,
		excused: 0,
	})
	const [dataLoaded, setDataLoaded] = useState(false)

	useEffect(() => {
		// Only fetch data once when the component mounts
		// This is fine because the component will only be mounted when a child card is expanded
		if (!dataLoaded) {
			fetchPerformanceData()
		}
	}, []) // No dependency on studentId since we rely on component mounting

	const fetchPerformanceData = async () => {
		try {
			setLoading(true)

			// Fetch scores for GPA calculation
			const { data: scores, error: scoresError } = await supabase
				.from('scores')
				.select('score')
				.eq('student_id', studentId)

			if (scoresError) {
				console.error('[StudentPerformance] Error fetching scores:', scoresError)
				return
			}

			// Calculate GPA if scores exist
			if (scores && scores.length > 0) {
				const totalScore = scores.reduce((sum, s) => sum + Number(s.score), 0)
				const calculatedGpa = totalScore / scores.length
				setGpa(calculatedGpa.toFixed(1))
			}

			// Fetch attendance records
			const { data: attendance, error: attendanceError } = await supabase
				.from('attendance')
				.select('status')
				.eq('student_id', studentId)

			if (attendanceError) {
				console.error('[StudentPerformance] Error fetching attendance:', attendanceError)
				return
			}

			// Calculate attendance summary
			if (attendance && attendance.length > 0) {
				const summary = {
					present: 0,
					absent: 0,
					late: 0,
					excused: 0,
				}

				attendance.forEach(record => {
					const status = record.status.toLowerCase()
					if (summary.hasOwnProperty(status)) {
						summary[status as keyof typeof summary]++
					}
				})

				setAttendanceSummary(summary)

				// Calculate attendance rate (present / total)
				const totalRecords = attendance.length
				const presentCount = summary.present
				const rate = totalRecords > 0 ? (presentCount / totalRecords) * 100 : 0
				setAttendanceRate(Math.round(rate))
			}

			setDataLoaded(true)
		} catch (error) {
			console.error('[StudentPerformance] Error fetching performance data:', error)
		} finally {
			setLoading(false)
		}
	}

	if (loading) {
		return (
			<View style={[styles.container, { backgroundColor: theme.cardBackground }]}>
				<Text style={[styles.loadingText, { color: theme.textSecondary }]}>
					Loading performance data...
				</Text>
			</View>
		)
	}

	return (
		<View
			style={[
				styles.container,
				{ backgroundColor: theme.cardBackground, borderColor: theme.border },
			]}
		>
			<Text style={[styles.title, { color: theme.text }]}>{studentName}'s Performance</Text>

			<View style={styles.statsContainer}>
				{/* GPA Section */}
				<View style={styles.statSection}>
					<View style={[styles.iconContainer, { backgroundColor: '#4A90E2' }]}>
						<Icon name='award' size={18} color='#FFFFFF' />
					</View>
					<Text style={[styles.statValue, { color: theme.text }]}>{gpa}</Text>
					<Text style={[styles.statLabel, { color: theme.textSecondary }]}>GPA</Text>
				</View>

				{/* Attendance Rate Section */}
				<View style={styles.statSection}>
					<View style={[styles.iconContainer, { backgroundColor: '#66BB6A' }]}>
						<Icon name='user-check' size={18} color='#FFFFFF' />
					</View>
					<Text style={[styles.statValue, { color: theme.text }]}>{attendanceRate}%</Text>
					<Text style={[styles.statLabel, { color: theme.textSecondary }]}>Attendance</Text>
				</View>
			</View>

			{/* Attendance Breakdown */}
			<View style={styles.attendanceBreakdown}>
				<View style={styles.attendanceItem}>
					<View style={[styles.attendanceIndicator, { backgroundColor: '#4CAF50' }]} />
					<Text style={[styles.attendanceCount, { color: theme.text }]}>
						{attendanceSummary.present}
					</Text>
					<Text style={[styles.attendanceLabel, { color: theme.textSecondary }]}>Present</Text>
				</View>

				<View style={styles.attendanceItem}>
					<View style={[styles.attendanceIndicator, { backgroundColor: '#F44336' }]} />
					<Text style={[styles.attendanceCount, { color: theme.text }]}>
						{attendanceSummary.absent}
					</Text>
					<Text style={[styles.attendanceLabel, { color: theme.textSecondary }]}>Absent</Text>
				</View>

				<View style={styles.attendanceItem}>
					<View style={[styles.attendanceIndicator, { backgroundColor: '#FF9800' }]} />
					<Text style={[styles.attendanceCount, { color: theme.text }]}>
						{attendanceSummary.late}
					</Text>
					<Text style={[styles.attendanceLabel, { color: theme.textSecondary }]}>Late</Text>
				</View>

				<View style={styles.attendanceItem}>
					<View style={[styles.attendanceIndicator, { backgroundColor: '#9E9E9E' }]} />
					<Text style={[styles.attendanceCount, { color: theme.text }]}>
						{attendanceSummary.excused}
					</Text>
					<Text style={[styles.attendanceLabel, { color: theme.textSecondary }]}>Excused</Text>
				</View>
			</View>

			{/* Progress Bar for Attendance */}
			<View style={styles.progressContainer}>
				<View style={[styles.progressBackground, { backgroundColor: theme.border }]}>
					<View
						style={[
							styles.progressFill,
							{
								backgroundColor: getAttendanceColor(attendanceRate),
								width: `${attendanceRate}%`,
							},
						]}
					/>
				</View>
				<Text style={[styles.progressLabel, { color: theme.textSecondary }]}>Attendance Rate</Text>
			</View>
		</View>
	)
}

// Helper function to get color based on attendance rate
const getAttendanceColor = (rate: number): string => {
	if (rate >= 90) return '#4CAF50' // Green
	if (rate >= 75) return '#8BC34A' // Light Green
	if (rate >= 60) return '#FFEB3B' // Yellow
	if (rate >= 40) return '#FF9800' // Orange
	return '#F44336' // Red
}

const styles = StyleSheet.create({
	container: {
		padding: 16,
		borderRadius: 8,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: '#E0E0E0',
		backgroundColor: '#FFFFFF',
	},
	title: {
		fontSize: 16,
		fontWeight: '600',
		marginBottom: 16,
	},
	loadingText: {
		textAlign: 'center',
		padding: 16,
	},
	statsContainer: {
		flexDirection: 'row',
		justifyContent: 'space-around',
		marginBottom: 16,
	},
	statSection: {
		alignItems: 'center',
	},
	iconContainer: {
		width: 36,
		height: 36,
		borderRadius: 18,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 8,
	},
	statValue: {
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 4,
	},
	statLabel: {
		fontSize: 12,
	},
	attendanceBreakdown: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 16,
	},
	attendanceItem: {
		alignItems: 'center',
	},
	attendanceIndicator: {
		width: 12,
		height: 12,
		borderRadius: 6,
		marginBottom: 4,
	},
	attendanceCount: {
		fontSize: 14,
		fontWeight: '600',
		marginBottom: 2,
	},
	attendanceLabel: {
		fontSize: 10,
	},
	progressContainer: {
		marginTop: 8,
	},
	progressBackground: {
		height: 8,
		borderRadius: 4,
		backgroundColor: '#E0E0E0',
		overflow: 'hidden',
		marginBottom: 4,
	},
	progressFill: {
		height: '100%',
		borderRadius: 4,
	},
	progressLabel: {
		fontSize: 10,
		textAlign: 'right',
	},
})

export default StudentPerformanceSummary
