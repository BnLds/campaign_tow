// Campaign TOW — Shared server function return types

export type MatchType = 'standard' | 'initial_setup'

export type ErrorCode = 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'BAD_REQUEST' | 'VALIDATION_ERROR' | 'SERVER_ERROR' | 'CONFLICT' | 'POST_MATCH_IN_PROGRESS' | 'RATE_LIMITED' | 'INVALID_TOKEN' | 'ALREADY_ACTIVATED' | 'USERNAME_TAKEN' | 'INVALID_CURRENT_PASSWORD' | 'UNIT_SELECTION_REQUIRED'

export type ServerResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: ErrorCode; message: string } }
