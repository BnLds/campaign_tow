// src/lib/validators.test.ts
// Story 1.2: Player Login & Session Management
// Status: RED — written before implementation (ATDD)
//
// Verifies: AC2 (successful login input), AC3 (failed login input)
// Will fail with "Cannot find module './validators'" until validators.ts is implemented.

import { describe, it, expect } from 'vitest'
import { loginSchema, updateDisplayNameSchema, createPlayerSchema } from './validators'

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

// ---------------------------------------------------------------------------
// AC2 / AC5 — createPlayerSchema (story 1.4)
// Status: RED — tests fail until createPlayerSchema is exported from validators.ts
// ---------------------------------------------------------------------------

describe('[AC2][P0] createPlayerSchema — valid inputs', () => {
  it('[1.4-UNIT-001] accepts valid username (≥2 chars) and temp password (≥6 chars)', () => {
    const result = createPlayerSchema.safeParse({ username: 'thomas', tempPassword: 'secret123' })
    expect(result.success).toBe(true)
  })

  it('[1.4-UNIT-002] trims leading/trailing whitespace from username', () => {
    const result = createPlayerSchema.parse({ username: '  thomas  ', tempPassword: 'secret123' })
    expect(result.username).toBe('thomas')
  })

  it('[1.4-UNIT-003] accepts username at max length (50 chars)', () => {
    const result = createPlayerSchema.safeParse({ username: 'a'.repeat(50), tempPassword: 'secret123' })
    expect(result.success).toBe(true)
  })

  it('[1.4-UNIT-004] accepts password at max length (100 chars)', () => {
    const result = createPlayerSchema.safeParse({ username: 'thomas', tempPassword: 'a'.repeat(100) })
    expect(result.success).toBe(true)
  })

  it('[1.4-UNIT-005] preserves spaces in tempPassword — no trim (spaces in passwords are intentional)', () => {
    const result = createPlayerSchema.parse({ username: 'thomas', tempPassword: 'pass word 1' })
    expect(result.tempPassword).toBe('pass word 1')
  })
})

describe('[AC5][P0] createPlayerSchema — invalid inputs', () => {
  it('[1.4-UNIT-006] rejects empty username', () => {
    const result = createPlayerSchema.safeParse({ username: '', tempPassword: 'secret123' })
    expect(result.success).toBe(false)
  })

  it('[1.4-UNIT-007] rejects username shorter than 2 characters (after trim)', () => {
    const result = createPlayerSchema.safeParse({ username: 'a', tempPassword: 'secret123' })
    expect(result.success).toBe(false)
  })

  it('[1.4-UNIT-008] rejects username exceeding 50 characters', () => {
    const result = createPlayerSchema.safeParse({ username: 'a'.repeat(51), tempPassword: 'secret123' })
    expect(result.success).toBe(false)
  })

  it('[1.4-UNIT-009] rejects tempPassword shorter than 6 characters', () => {
    const result = createPlayerSchema.safeParse({ username: 'thomas', tempPassword: '12345' })
    expect(result.success).toBe(false)
  })

  it('[1.4-UNIT-010] rejects tempPassword exceeding 100 characters', () => {
    const result = createPlayerSchema.safeParse({ username: 'thomas', tempPassword: 'a'.repeat(101) })
    expect(result.success).toBe(false)
  })
})
