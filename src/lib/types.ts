// Campaign TOW — Shared server function return types

export type ErrorCode = 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'BAD_REQUEST' | 'VALIDATION_ERROR' | 'SERVER_ERROR'

export type ServerResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: ErrorCode; message: string } }
