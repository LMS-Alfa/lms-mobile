/**
 * Date and timezone utility functions
 */

/**
 * Format date string to user's local timezone
 * @param dateString ISO date string to format
 * @param options Formatting options
 * @returns Formatted date string in user's timezone
 */
export const formatToLocalTime = (
	dateString: string | Date,
	options: Intl.DateTimeFormatOptions = {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
		hour12: true,
	}
): string => {
	if (!dateString) return 'N/A'

	try {
		const date = typeof dateString === 'string' ? new Date(dateString) : dateString
		return date.toLocaleString(undefined, options) // undefined uses the user's locale
	} catch (e) {
		console.error('Error formatting date:', e)
		return 'Invalid date'
	}
}

/**
 * Format relative time (today, yesterday, or date)
 * @param dateString ISO date string
 * @returns Formatted string like "Today at 2:30 PM" or "Jan 5 at 2:30 PM"
 */
export const formatRelativeTime = (dateString: string | Date): string => {
	if (!dateString) return 'N/A'

	try {
		const date = typeof dateString === 'string' ? new Date(dateString) : dateString

		// Format date depending on how old it is
		const now = new Date()
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
		const yesterday = new Date(today)
		yesterday.setDate(yesterday.getDate() - 1)

		const notifDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

		if (notifDate.getTime() === today.getTime()) {
			return `Today at ${date.toLocaleTimeString(undefined, {
				hour: 'numeric',
				minute: '2-digit',
			})}`
		} else if (notifDate.getTime() === yesterday.getTime()) {
			return `Yesterday at ${date.toLocaleTimeString(undefined, {
				hour: 'numeric',
				minute: '2-digit',
			})}`
		} else {
			return date.toLocaleDateString(undefined, {
				month: 'short',
				day: 'numeric',
				year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
				hour: 'numeric',
				minute: '2-digit',
			})
		}
	} catch (e) {
		console.error('Error formatting relative time:', e)
		return 'Invalid date'
	}
}

export default {
	formatToLocalTime,
	formatRelativeTime,
}
