import { createAudioPlayer } from 'expo-audio'

/**
 * Play a notification sound using expo-audio
 * This replaces the previous expo-notifications implementation
 */
export const playNotificationSound = async (): Promise<boolean> => {
	try {
		// Load the notification sound from assets
		const player = createAudioPlayer(
			require('../../assets/sounds/notification-default.wav')
		)

		// Play the sound
		player.play()

		// Handle cleanup after playback
		setTimeout(() => {
			player.remove()
		}, 3000) // Allow enough time for the sound to play

		return true
	} catch (error) {
		console.error('Failed to play notification sound:', error)
		return false
	}
}

export default {
	playNotificationSound,
}
