import '@supabase/supabase-js'

// Extend the RealtimeChannel interface to support postgres_changes
declare module '@supabase/supabase-js' {
	interface RealtimeChannel {
		on(
			event: 'postgres_changes',
			filter: {
				event: string
				schema: string
				table: string
				filter?: string
			},
			callback: (payload: any) => void
		): RealtimeChannel
	}
}
