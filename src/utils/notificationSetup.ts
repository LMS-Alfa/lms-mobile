import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

/**
 * Initialize local notification settings for the app
 * Note: Only local notifications are used as push notifications are not supported
 * in Expo Go on Android from SDK 53 without a development build.
 */
export const setupNotifications = async () => {
	try {
		// Configure how notifications appear when the app is in foreground
		Notifications.setNotificationHandler({
			handleNotification: async () => ({
				shouldShowAlert: true, // Show alert when app is in foreground
				shouldPlaySound: true, // Play sound
				shouldSetBadge: true, // Set badge count
			}),
		})

		// Set notification channel for Android
		if (Platform.OS === 'android') {
			await Notifications.setNotificationChannelAsync('default', {
				name: 'Default',
				importance: Notifications.AndroidImportance.MAX,
				vibrationPattern: [0, 250, 250, 250],
				lightColor: '#FF231F7C',
				sound: true, // Use default sound
			})
		}

		// Request permissions for local notifications
		const { status: existingStatus } = await Notifications.getPermissionsAsync()
		let finalStatus = existingStatus

		// Only ask if permissions have not already been determined
		if (existingStatus !== 'granted') {
			const { status } = await Notifications.requestPermissionsAsync({
				ios: {
					allowAlert: true,
					allowBadge: true,
					allowSound: true,
				},
			})
			finalStatus = status
		}

		if (finalStatus !== 'granted') {
			console.warn('Local notification permissions not granted!')
			return false
		}

		return true
	} catch (error) {
		console.error('Error setting up local notifications:', error)
		return false
	}
}

/**
 * Send a local notification with sound
 */
export const sendLocalNotification = async (
	title: string,
	body: string,
	data: Record<string, any> = {}
) => {
	try {
		await Notifications.scheduleNotificationAsync({
			content: {
				title,
				body,
				data,
				sound: true,
			},
			trigger: null, // null means show immediately
		})
		return true
	} catch (error) {
		console.error('Error sending local notification:', error)
		return false
	}
}

/**
 * Remove all delivered notifications
 */
export const clearAllNotifications = async () => {
	try {
		await Notifications.dismissAllNotificationsAsync()
		return true
	} catch (error) {
		console.error('Error clearing notifications:', error)
		return false
	}
}

export default {
	setupNotifications,
	sendLocalNotification,
	clearAllNotifications,
}
