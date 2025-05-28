/**
 * Native adapters for React Native
 * This file provides native alternatives to browser-specific APIs
 * while allowing minimal browser stubs to exist
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import base64 from 'base-64'
import * as Device from 'expo-device'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { Dimensions, Platform } from 'react-native'
import { getRandomValues } from 'react-native-get-random-values'

// TextEncoder/TextDecoder polyfill - used by libraries like @supabase/supabase-js
if (typeof global.TextEncoder === 'undefined') {
	try {
		const TextEncodingPolyfill = require('text-encoding')
		global.TextEncoder = TextEncodingPolyfill.TextEncoder
		global.TextDecoder = TextEncodingPolyfill.TextDecoder
	} catch (error) {
		console.warn('Failed to apply TextEncoder polyfill:', error)
	}
}

// Base64 encoding/decoding
if (typeof global.btoa === 'undefined') {
	global.btoa = base64.encode
}

if (typeof global.atob === 'undefined') {
	global.atob = base64.decode
}

// Crypto API
if (typeof global.crypto === 'undefined' || !global.crypto.getRandomValues) {
	global.crypto = {
		...global.crypto,
		getRandomValues,
	}
}

// Buffer for binary data
if (typeof global.Buffer === 'undefined') {
	global.Buffer = require('buffer/').Buffer
}

// Device information (alternative to navigator.userAgent, etc.)
export const deviceInfo = {
	get platform() {
		return Platform.OS
	},
	get version() {
		return Platform.Version
	},
	get isEmulator() {
		return Device.isDevice === false
	},
	get deviceName() {
		return Device.deviceName || 'unknown'
	},
	get brand() {
		return Device.brand || 'unknown'
	},
	get modelName() {
		return Device.modelName || 'unknown'
	},
}

// Screen dimensions (alternative to window.innerWidth, etc.)
export const screen = {
	get width() {
		return Dimensions.get('window').width
	},
	get height() {
		return Dimensions.get('window').height
	},
	get scale() {
		return Dimensions.get('window').scale
	},
	get fontScale() {
		return Dimensions.get('window').fontScale
	},
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

// File operations (alternative to downloads, etc.)
export const files = {
	read: FileSystem.readAsStringAsync,
	write: FileSystem.writeAsStringAsync,
	delete: FileSystem.deleteAsync,
	share: Sharing.shareAsync,
	exists: FileSystem.getInfoAsync,
	createDirectory: FileSystem.makeDirectoryAsync,
	readDirectory: FileSystem.readDirectoryAsync,
}

// Initialize any needed global polyfills
export const initializeNativeAdapters = () => {
	console.log('Native adapters initialized - using minimal browser stubs')
}

export default {
	deviceInfo,
	screen,
	storage,
	files,
	initializeNativeAdapters,
}
