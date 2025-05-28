/**
 * Minimal browser stubs for React Native
 * Provides minimal empty objects with required properties
 * to prevent errors without simulating a full browser environment
 */

export const initializeBrowserStubs = () => {
	if (typeof global.document === 'undefined') {
		global.document = {
			createElement: () => ({ style: {} }),
			// Add minimal stubs as needed
		} as any
	}

	if (typeof global.window === 'undefined') {
		global.window = {
			addEventListener: () => {},
			removeEventListener: () => {},
			// Minimal window stubs
		} as any
	}

	if (typeof global.navigator === 'undefined') {
		global.navigator = {
			userAgent: 'react-native',
			// Minimal navigator stubs
		} as any
	}

	console.log('Minimal browser stubs initialized')
}

export default initializeBrowserStubs
