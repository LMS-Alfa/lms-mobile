/**
 * React Native Environment
 * This file provides React Native alternatives to browser-specific APIs
 * without trying to simulate browser globals like document or window
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Device from 'expo-device'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { Dimensions, Platform } from 'react-native'

// Device information
export const deviceInfo = {
	platform: Platform.OS,
	version: Platform.Version,
	deviceName: Device.deviceName || 'unknown',
	brand: Device.brand || 'unknown',
	modelName: Device.modelName || 'unknown',
}

// Screen dimensions
export const screenDimensions = {
	width: Dimensions.get('window').width,
	height: Dimensions.get('window').height,
	scale: Dimensions.get('window').scale,
	fontScale: Dimensions.get('window').fontScale,
}

// Storage (alternative to localStorage)
export const storage = {
	getItem: AsyncStorage.getItem,
	setItem: AsyncStorage.setItem,
	removeItem: AsyncStorage.removeItem,
	clear: AsyncStorage.clear,
	getAllKeys: AsyncStorage.getAllKeys,
	multiGet: AsyncStorage.multiGet,
	multiSet: AsyncStorage.multiSet,
	multiRemove: AsyncStorage.multiRemove,
}

// File operations
export const files = {
	read: FileSystem.readAsStringAsync,
	write: FileSystem.writeAsStringAsync,
	delete: FileSystem.deleteAsync,
	share: Sharing.shareAsync,
	exists: FileSystem.getInfoAsync,
	createDirectory: FileSystem.makeDirectoryAsync,
	readDirectory: FileSystem.readDirectoryAsync,
}

// Initialize native environment
export const initializeNativeEnvironment = () => {
	console.log('Native environment initialized')
}

export default {
	deviceInfo,
	screenDimensions,
	storage,
	files,
	initializeNativeEnvironment,
}
