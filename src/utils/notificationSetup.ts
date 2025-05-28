import { AudioModule } from 'expo-audio'
import { playNotificationSound } from './soundNotification'

/**
 * Sets up the notifications system
 * This is called during app initialization
 */
export const setupNotifications = async (): Promise<boolean> => {
	try {
		// Configure audio settings for proper notification playback
		await AudioModule.setAudioModeAsync({
			shouldPlayInBackground: false,
			interruptionMode: 'duckOthers', // Lower volume of other apps while our audio plays
			interruptionModeAndroid: 'duckOthers',
		})

		// Test the notification sound to ensure it's working
		const soundResult = await playNotificationSound()

		if (!soundResult) {
			console.warn('[NotificationSetup] Sound test failed, but continuing')
		}

		console.log('[NotificationSetup] Notification system initialized successfully')
		return true
	} catch (error) {
		console.error('[NotificationSetup] Failed to set up notifications:', error)
		return false
	}
}
