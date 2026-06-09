/** Cache duration for session-related queries (session, army info) */
export const STALE_TIME_SESSION = 5 * 60 * 1000 // 5 minutes

/** Cache duration for unit-deltas queries (stat modifiers + gains) */
export const STALE_TIME_UNIT_DELTAS = 30_000 // 30 seconds

/** Cache duration for campaign timeline queries */
export const STALE_TIME_CAMPAIGN_TIMELINE = 10_000 // 10 seconds

/** Polling interval for campaign timeline auto-refresh */
export const REFETCH_INTERVAL_CAMPAIGN_TIMELINE = 15_000 // 15 seconds
