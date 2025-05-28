import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Icon from 'react-native-vector-icons/Feather'
import { useAppTheme } from '../../contexts/ThemeContext'
import { formatRelativeTime } from '../../utils/dateUtils'
import { NotificationItem } from './UnifiedNotificationHandler'

interface NotificationCardProps {
	notification: NotificationItem
	onPress?: () => void
	compact?: boolean
}

const NotificationCard: React.FC<NotificationCardProps> = ({
	notification,
	onPress,
	compact = false,
}) => {
	const { theme } = useAppTheme()

	// Get appropriate icon based on notification type
	const getIcon = () => {
		switch (notification.type) {
			case 'score':
				return 'award'
			case 'attendance':
				return 'user-check'
			case 'announcement':
				return 'bell'
			default:
				return 'info'
		}
	}

	// Get color based on notification type
	const getColor = () => {
		switch (notification.type) {
			case 'score':
				return '#4A90E2' // Blue
			case 'attendance':
				return '#F44336' // Red
			case 'announcement':
				return '#66BB6A' // Green
			default:
				return '#999999' // Gray
		}
	}

	// Format the timestamp
	const formattedTime = formatRelativeTime(notification.timestamp)

	return (
		<TouchableOpacity
			style={[
				styles.container,
				{ backgroundColor: theme.cardBackground, borderColor: theme.border },
				compact ? styles.compactContainer : {},
				notification.read ? styles.readContainer : {},
			]}
			onPress={onPress}
			disabled={!onPress}
		>
			<View style={[styles.iconContainer, { backgroundColor: getColor() }]}>
				<Icon name={getIcon()} size={compact ? 14 : 16} color='#FFFFFF' />
			</View>

			<View style={styles.contentContainer}>
				<Text
					style={[styles.content, { color: theme.text }, compact ? styles.compactContent : {}]}
					numberOfLines={compact ? 2 : 3}
				>
					{notification.content}
				</Text>

				<Text style={[styles.timestamp, { color: theme.textSecondary }]}>{formattedTime}</Text>
			</View>

			{!notification.read && (
				<View style={[styles.unreadIndicator, { backgroundColor: getColor() }]} />
			)}
		</TouchableOpacity>
	)
}

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		padding: 12,
		borderRadius: 8,
		marginBottom: 8,
		borderWidth: 1,
		shadowColor: '#000000',
		shadowOpacity: 0.1,
		shadowOffset: { width: 0, height: 1 },
		shadowRadius: 2,
		elevation: 2,
	},
	compactContainer: {
		padding: 8,
		marginBottom: 6,
	},
	readContainer: {
		opacity: 0.7,
	},
	iconContainer: {
		width: 32,
		height: 32,
		borderRadius: 16,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12,
	},
	contentContainer: {
		flex: 1,
	},
	content: {
		fontSize: 14,
		marginBottom: 4,
	},
	compactContent: {
		fontSize: 13,
	},
	timestamp: {
		fontSize: 12,
	},
	unreadIndicator: {
		width: 8,
		height: 8,
		borderRadius: 4,
		marginLeft: 8,
		alignSelf: 'flex-start',
		marginTop: 4,
	},
})

export default NotificationCard
