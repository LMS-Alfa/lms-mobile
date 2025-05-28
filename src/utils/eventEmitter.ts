import { EventEmitter } from 'events'

// Create a singleton event emitter for cross-component communication
export const eventEmitter = new EventEmitter()

// Event types
export const EVENTS = {
	SCORE_UPDATED: 'scoreUpdated',
	ATTENDANCE_UPDATED: 'attendanceUpdated',
	DATA_REFRESHED: 'dataRefreshed',
	NEW_NOTIFICATION: 'newNotification',
}

// Usage example:
// Import: import { eventEmitter, EVENTS } from '../utils/eventEmitter'
//
// To emit: eventEmitter.emit(EVENTS.SCORE_UPDATED, { studentId, scoreId })
//
// To listen:
// useEffect(() => {
//   const listener = (data) => {
//     // Handle the event
//     console.log('Score updated:', data)
//     // Refresh data or update UI
//   }
//
//   eventEmitter.on(EVENTS.SCORE_UPDATED, listener)
//
//   return () => {
//     eventEmitter.off(EVENTS.SCORE_UPDATED, listener)
//   }
// }, [])
