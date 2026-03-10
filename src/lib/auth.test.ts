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
import type { SessionData } from './auth'
import { authMiddleware, armyOwnerMiddleware } from './middleware'

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
})

// ---------------------------------------------------------------------------
// AC1 / AC5 — SessionData includes hasSeenWelcome (story 1.3)
// ---------------------------------------------------------------------------

describe('[AC1][AC5][P0] auth.ts — SessionData includes hasSeenWelcome (story 1.3)', () => {
  it('[1.3-UNIT-007] SessionData type requires hasSeenWelcome as boolean (structural contract)', () => {
    // Compile-time guards: si hasSeenWelcome est retiré ou mal typé dans SessionData,
    // ces déclarations ne compilent plus → les tests échouent.
    const seen: SessionData = { playerId: 'p1', isAdmin: false, displayName: 'Thomas', hasSeenWelcome: true }
    const unseen: SessionData = { playerId: 'p2', isAdmin: false, displayName: 'Marie', hasSeenWelcome: false }

    // Vérifie l'existence du champ et que les deux valeurs booléennes sont acceptées
    expect(seen).toHaveProperty('hasSeenWelcome', true)
    expect(unseen).toHaveProperty('hasSeenWelcome', false)
  })
})
