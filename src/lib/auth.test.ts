// src/lib/auth.test.ts
// Story 1.2: Player Login & Session Management
// Status: RED — written before implementation (ATDD)
//
// Verifies: AC4 (server-side session verification) — public contract only
// Will fail with "Cannot find module './auth'" until auth.ts is implemented.
//
// Note: Cookie I/O and DB calls are verified in tests/integration/auth.test.ts.
// These tests cover only the public API contract of the auth module.

import { describe, it, expect } from 'vitest'
import { getSession, createSession, deleteSession } from './auth'
import { authMiddleware, armyOwnerMiddleware, adminMiddleware } from './middleware'

// ---------------------------------------------------------------------------
// AC4 — auth.ts public contract
// ---------------------------------------------------------------------------

describe('[AC4][P0] auth.ts public API contract', () => {
  it('[1.2-UNIT-008] exports getSession as a function', () => {
    expect(typeof getSession).toBe('function')
  })

  it('[1.2-UNIT-009] exports createSession as a function', () => {
    expect(typeof createSession).toBe('function')
  })

  it('[1.2-UNIT-010] exports deleteSession as a function', () => {
    expect(typeof deleteSession).toBe('function')
  })

  it('[1.2-UNIT-011] exports authMiddleware (TanStack Start middleware)', () => {
    expect(authMiddleware).toBeDefined()
  })

  it('[1.2-UNIT-012] exports armyOwnerMiddleware (TanStack Start middleware)', () => {
    expect(armyOwnerMiddleware).toBeDefined()
  })

  // Story 1.4 — adminMiddleware (RED: fails until adminMiddleware is exported from middleware.ts)
  it('[1.4-UNIT-011] exports adminMiddleware (TanStack Start middleware for admin routes)', () => {
    expect(adminMiddleware).toBeDefined()
  })
})

