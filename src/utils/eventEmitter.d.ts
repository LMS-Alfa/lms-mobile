import { EventEmitter } from 'events'

export const eventEmitter: EventEmitter

export const EVENTS: {
	SCORE_UPDATED: string
	ATTENDANCE_UPDATED: string
	DATA_REFRESHED: string
}
