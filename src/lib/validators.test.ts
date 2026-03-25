// src/lib/validators.test.ts
// Story 1.2: Player Login & Session Management
// Status: RED — written before implementation (ATDD)
//
// Verifies: AC2 (successful login input), AC3 (failed login input)
// Will fail with "Cannot find module './validators'" until validators.ts is implemented.

import { describe, it, expect } from 'vitest'
import { loginSchema, updateUsernameSchema, createPlayerSchema, changePasswordSchema } from './validators'

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
// AC12 — updateUsernameSchema
// ---------------------------------------------------------------------------

describe('[AC12][P0] updateUsernameSchema — valid inputs', () => {
  it('[username-UNIT-001] accepts valid username (2+ chars)', () => {
    const result = updateUsernameSchema.safeParse({ username: 'Thomas' })
    expect(result.success).toBe(true)
  })

  it('[username-UNIT-002] trims surrounding whitespace', () => {
    const result = updateUsernameSchema.parse({ username: '  Thomas  ' })
    expect(result.username).toBe('Thomas')
  })

  it('[username-UNIT-003] accepts username at max length (50 chars)', () => {
    const result = updateUsernameSchema.safeParse({ username: 'a'.repeat(50) })
    expect(result.success).toBe(true)
  })
})

describe('[AC12][P0] updateUsernameSchema — invalid inputs', () => {
  it('[username-UNIT-004] rejects empty string', () => {
    const result = updateUsernameSchema.safeParse({ username: '' })
    expect(result.success).toBe(false)
  })

  it('[username-UNIT-005] rejects whitespace-only string (trimmed to empty)', () => {
    const result = updateUsernameSchema.safeParse({ username: '   ' })
    expect(result.success).toBe(false)
  })

  it('[username-UNIT-006] rejects username shorter than 2 characters', () => {
    const result = updateUsernameSchema.safeParse({ username: 'a' })
    expect(result.success).toBe(false)
  })

  it('[username-UNIT-007] rejects username exceeding 50 characters', () => {
    const result = updateUsernameSchema.safeParse({ username: 'a'.repeat(51) })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// AC2 / AC5 — createPlayerSchema (invite link flow — no password)
// ---------------------------------------------------------------------------

describe('[AC2][P0] createPlayerSchema — valid inputs', () => {
  it('[1.4-UNIT-001] accepts valid username (≥2 chars)', () => {
    const result = createPlayerSchema.safeParse({ username: 'thomas' })
    expect(result.success).toBe(true)
  })

  it('[1.4-UNIT-002] trims leading/trailing whitespace from username', () => {
    const result = createPlayerSchema.parse({ username: '  thomas  ' })
    expect(result.username).toBe('thomas')
  })

  it('[1.4-UNIT-003] accepts username at max length (50 chars)', () => {
    const result = createPlayerSchema.safeParse({ username: 'a'.repeat(50) })
    expect(result.success).toBe(true)
  })
})

describe('[AC5][P0] createPlayerSchema — invalid inputs', () => {
  it('[1.4-UNIT-006] rejects empty username', () => {
    const result = createPlayerSchema.safeParse({ username: '' })
    expect(result.success).toBe(false)
  })

  it('[1.4-UNIT-007] rejects username shorter than 2 characters (after trim)', () => {
    const result = createPlayerSchema.safeParse({ username: 'a' })
    expect(result.success).toBe(false)
  })

  it('[1.4-UNIT-008] rejects username exceeding 50 characters', () => {
    const result = createPlayerSchema.safeParse({ username: 'a'.repeat(51) })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// changePasswordSchema — settings page
// ---------------------------------------------------------------------------

describe('[AC7][P0] changePasswordSchema — valid inputs', () => {
  it('[settings-UNIT-001] accepts valid newPassword and confirmNewPassword', () => {
    const result = changePasswordSchema.safeParse({ newPassword: 'newsecret', confirmNewPassword: 'newsecret' })
    expect(result.success).toBe(true)
  })

  it('[settings-UNIT-002] accepts with optional currentPassword', () => {
    const result = changePasswordSchema.safeParse({ currentPassword: 'oldpass', newPassword: 'newsecret', confirmNewPassword: 'newsecret' })
    expect(result.success).toBe(true)
  })
})

describe('[AC7][P0] changePasswordSchema — invalid inputs', () => {
  it('[settings-UNIT-003] rejects newPassword shorter than 6 characters', () => {
    const result = changePasswordSchema.safeParse({ newPassword: '12345', confirmNewPassword: '12345' })
    expect(result.success).toBe(false)
  })

  it('[settings-UNIT-004] rejects mismatched confirmNewPassword — error attributed to confirmNewPassword field', () => {
    const result = changePasswordSchema.safeParse({ newPassword: 'newsecret', confirmNewPassword: 'different' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('confirmNewPassword')
    }
  })
})
