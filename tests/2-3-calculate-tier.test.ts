// tests/2-3-calculate-tier.test.ts
// Story 2.3: Unit Card Display with Campaign Deltas
// Status: RED — written before implementation (TDD)
//
// Tests for the `calculateTier` utility function.
// Source file does NOT exist yet: src/lib/tier.ts
// All tests will fail with import errors until the implementation is complete.
//
// XP Tier thresholds (both characters and units):
//   < 6  → tier 0 (no tier)
//   6–11 → tier 1 (Aguerri)
//   12–19 → tier 2 (Expérimenté)
//   >= 20 → tier 3 (Vétéran)
//
// Note: "Honneur de bataille" at XP 3 and 9 is NOT a tier — it grants
// in-game bonuses but does not change the visual tier (still tier 0 and 1).

import { describe, it, expect } from 'vitest'
import { calculateTier } from '../src/lib/tier'

const UNIT_TYPE = 'Unités de base'
const CHAR_TYPE = 'Personnages'

// ---------------------------------------------------------------------------
// Test 1 — xp=0 → tier 0
// ---------------------------------------------------------------------------

describe('[AC1] calculateTier — below any threshold', () => {
  it('[2.3-TIER-001] xp=0 → tier 0 (no experience)', () => {
    expect(calculateTier(0, UNIT_TYPE)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Test 2 — xp=5 → tier 0 (below Aguerri threshold)
// ---------------------------------------------------------------------------

describe('[AC1] calculateTier — just below Aguerri threshold', () => {
  it('[2.3-TIER-002] xp=5 → tier 0 (one below Aguerri threshold of 6)', () => {
    expect(calculateTier(5, UNIT_TYPE)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Test 3 — xp=6 → tier 1 (Aguerri threshold)
// ---------------------------------------------------------------------------

describe('[AC1] calculateTier — Aguerri threshold', () => {
  it('[2.3-TIER-003] xp=6 → tier 1 (Aguerri, exactly at threshold)', () => {
    expect(calculateTier(6, UNIT_TYPE)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Test 4 — xp=12 → tier 2 (Expérimenté threshold)
// ---------------------------------------------------------------------------

describe('[AC1] calculateTier — Expérimenté threshold', () => {
  it('[2.3-TIER-004] xp=12 → tier 2 (Expérimenté, exactly at threshold)', () => {
    expect(calculateTier(12, UNIT_TYPE)).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Test 5 — xp=20 → tier 3 (Vétéran threshold)
// ---------------------------------------------------------------------------

describe('[AC1] calculateTier — Vétéran threshold', () => {
  it('[2.3-TIER-005] xp=20 → tier 3 (Vétéran, exactly at threshold)', () => {
    expect(calculateTier(20, UNIT_TYPE)).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// Test 6 — xp=19 → tier 2 (just below Vétéran)
// ---------------------------------------------------------------------------

describe('[AC1] calculateTier — just below Vétéran threshold', () => {
  it('[2.3-TIER-006] xp=19 → tier 2 (one below Vétéran threshold of 20)', () => {
    expect(calculateTier(19, UNIT_TYPE)).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Test 7 — Characters use same thresholds (unitType='Personnages')
// ---------------------------------------------------------------------------

describe('[AC1] calculateTier — Personnages use same XP thresholds', () => {
  it('[2.3-TIER-007] character at xp=6 → tier 1 (Aguerri)', () => {
    expect(calculateTier(6, CHAR_TYPE)).toBe(1)
  })

  it('[2.3-TIER-008] character at xp=5 → tier 0 (below Aguerri)', () => {
    expect(calculateTier(5, CHAR_TYPE)).toBe(0)
  })

  it('[2.3-TIER-009] character at xp=20 → tier 3 (Vétéran)', () => {
    expect(calculateTier(20, CHAR_TYPE)).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// Test 8 — Honneur de bataille (xp=3) is NOT a tier — still tier 0
// ---------------------------------------------------------------------------

describe('[AC1] calculateTier — Honneur de bataille is not a tier', () => {
  it('[2.3-TIER-010] unit at xp=3 → tier 0 (Honneur de bataille grants in-game bonus, not a display tier)', () => {
    expect(calculateTier(3, UNIT_TYPE)).toBe(0)
  })

  it('[2.3-TIER-011] unit at xp=9 → tier 1 (xp=9 is within 6–11 range)', () => {
    expect(calculateTier(9, UNIT_TYPE)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Test 9 — Function signature: accepts unitType string (future-proofing)
// ---------------------------------------------------------------------------

describe('[AC1] calculateTier — accepts unitType parameter', () => {
  it('[2.3-TIER-012] returns 0|1|2|3 (valid tier value) for any unitType string', () => {
    const result = calculateTier(10, 'Unités spéciales')
    expect([0, 1, 2, 3]).toContain(result)
  })
})
