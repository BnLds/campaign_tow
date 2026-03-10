// src/lib/validators.test.ts
// Story 1.2: Player Login & Session Management
// Status: RED — written before implementation (ATDD)
//
// Verifies: AC2 (successful login input), AC3 (failed login input)
// Will fail with "Cannot find module './validators'" until validators.ts is implemented.

import { describe, it, expect } from 'vitest'
import { loginSchema, updateDisplayNameSchema } from './validators'

// ---------------------------------------------------------------------------
// AC2 — loginSchema accepts valid credentials
// ---------------------------------------------------------------------------

describe('[AC2][P0] loginSchema — valid inputs', () => {
  it('[1.2-UNIT-001] accepts valid username and password', () => {
    const result = loginSchema.safeParse({ username: 'admin', password: 'secret123' })
    expect(result.success).toBe(true)
  })

  it('[1.2-UNIT-002] accepts username with underscores and numbers', () => {
    const result = loginSchema.safeParse({ username: 'player_42', password: 'pass' })
    expect(result.success).toBe(true)
  })

  it('[1.2-UNIT-003] accepts single-character values (min 1 for both fields)', () => {
    const result = loginSchema.safeParse({ username: 'u', password: 'x' })
    expect(result.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// AC3 — loginSchema rejects invalid credentials
// ---------------------------------------------------------------------------

describe('[AC3][P0] loginSchema — invalid inputs', () => {
  it('[1.2-UNIT-004] rejects empty username', () => {
    const result = loginSchema.safeParse({ username: '', password: 'secret123' })
    expect(result.success).toBe(false)
  })

  it('[1.2-UNIT-005] rejects empty password', () => {
    const result = loginSchema.safeParse({ username: 'admin', password: '' })
    expect(result.success).toBe(false)
  })

  it('[1.2-UNIT-006] rejects missing username field', () => {
    const result = loginSchema.safeParse({ password: 'secret123' })
    expect(result.success).toBe(false)
  })

  it('[1.2-UNIT-007] rejects missing password field', () => {
    const result = loginSchema.safeParse({ username: 'admin' })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// AC3 / AC4 — updateDisplayNameSchema (story 1.3)
// ---------------------------------------------------------------------------

describe('[AC3][P0] updateDisplayNameSchema — valid inputs', () => {
  it('[1.3-UNIT-001] accepts a valid display name and trims it', () => {
    const result = updateDisplayNameSchema.parse({ displayName: 'Thomas' })
    expect(result.displayName).toBe('Thomas')
  })

  it('[1.3-UNIT-002] trims surrounding whitespace from a valid name', () => {
    const result = updateDisplayNameSchema.parse({ displayName: '  Thomas  ' })
    expect(result.displayName).toBe('Thomas')
  })

  it('[1.3-UNIT-003] accepts display name at max length (100 chars)', () => {
    const result = updateDisplayNameSchema.safeParse({ displayName: 'a'.repeat(100) })
    expect(result.success).toBe(true)
  })
})

describe('[AC4][P0] updateDisplayNameSchema — invalid inputs', () => {
  it('[1.3-UNIT-004] rejects empty string', () => {
    const result = updateDisplayNameSchema.safeParse({ displayName: '' })
    expect(result.success).toBe(false)
  })

  it('[1.3-UNIT-005] rejects whitespace-only string (trimmed to empty)', () => {
    const result = updateDisplayNameSchema.safeParse({ displayName: '   ' })
    expect(result.success).toBe(false)
  })

  it('[1.3-UNIT-006] rejects display name exceeding 100 characters', () => {
    const result = updateDisplayNameSchema.safeParse({ displayName: 'a'.repeat(101) })
    expect(result.success).toBe(false)
  })
})
