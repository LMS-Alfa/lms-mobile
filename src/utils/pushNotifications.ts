import Constants from 'expo-constants'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { supabase } from './supabase'

/**
 * Registers the device for push notifications and stores the token in Supabase
 * @param userId The ID of the authenticated user
 * @returns The push token or null if registration failed
 */
export async function registerForPushNotifications(userId: string): Promise<string | null> {
	try {
		// Check if device is physical (required for push notifications on iOS)
		if (!Device.isDevice) {
			console.warn('Push notifications are not available on simulator/emulator')
			return null
		}

		// Request permission
		const { status: existingStatus } = await Notifications.getPermissionsAsync()
		let finalStatus = existingStatus

		if (existingStatus !== 'granted') {
			const { status } = await Notifications.requestPermissionsAsync()
			finalStatus = status
		}

		if (finalStatus !== 'granted') {
			console.warn('Failed to get push token: permission not granted')
			return null
		}

		// Get push token
		const token = await Notifications.getExpoPushTokenAsync({
			projectId: Constants.expoConfig?.extra?.eas?.projectId,
		})

		const pushToken = token.data
		console.log('Push token:', pushToken)

		// Store token in Supabase
		await storeExpoPushToken(userId, pushToken)

		return pushToken
	} catch (error) {
		console.error('Error registering for push notifications:', error)
		return null
	}
}

/**
 * Stores the Expo push token in Supabase
 * @param userId The user ID
 * @param token The Expo push token
 */
export async function storeExpoPushToken(userId: string, token: string): Promise<void> {
	try {
		// First, update the user's record with the latest token
		const { error: userError } = await supabase
			.from('users')
			.update({ expo_push_token: token })
			.eq('id', userId)

		if (userError) {
			console.error('Error updating user with push token:', userError)
		}

		// Then, add/update entry in push_tokens table to support multiple devices
		const { error: tokenError } = await supabase.from('push_tokens').upsert(
			{
				user_id: userId,
				token,
				device_id: Device.deviceName || 'unknown',
				platform: Device.osName || Platform.OS,
				last_used: new Date().toISOString(),
			},
			{ onConflict: 'token' }
		)

		if (tokenError) {
			console.error('Error storing push token:', tokenError)
		}
	} catch (error) {
		console.error('Error in storeExpoPushToken:', error)
	}
}

/**
 * Unregisters the device from push notifications
 * @param userId The user ID
 * @param token The push token to remove
 */
export async function unregisterPushToken(userId: string, token: string): Promise<void> {
	try {
		// Delete the token from push_tokens table
		const { error } = await supabase.from('push_tokens').delete().match({ user_id: userId, token })

		if (error) {
			console.error('Error removing push token:', error)
		}

		// Check if user has any tokens left
		const { data, error: countError } = await supabase
			.from('push_tokens')
			.select('token')
			.eq('user_id', userId)

		if (countError) {
			console.error('Error counting user tokens:', countError)
			return
		}

		// If no tokens left, clear the user's token field
		if (!data || data.length === 0) {
			await supabase.from('users').update({ expo_push_token: null }).eq('id', userId)
		}
	} catch (error) {
		console.error('Error in unregisterPushToken:', error)
	}
}
