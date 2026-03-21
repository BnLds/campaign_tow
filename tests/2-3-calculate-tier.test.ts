// tests/2-3-calculate-tier.test.ts
// Story 2.3: Unit Card Display with Campaign Deltas
//
// Tests for the `calculateTier` utility function.
//
// XP Tier thresholds (updated in story 4-2):
//   Units:      < 10 → tier 0,  10–24 → tier 1,  25–49 → tier 2,  50–79 → tier 3,  >= 80 → tier 4
//   Characters: < 6  → tier 0,  6–19  → tier 1,  20–39 → tier 2,  40–69 → tier 3,  >= 70 → tier 4
//
// Note: "Honneur de bataille" at XP 3 and 9 is NOT a tier — it grants
// in-game bonuses but does not change the visual tier.

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
// Test 2 — xp=5 → tier 0 (below unit Aguerri threshold of 10)
// ---------------------------------------------------------------------------

describe('[AC1] calculateTier — just below Aguerri threshold', () => {
  it('[2.3-TIER-002] xp=5 → tier 0 (below unit Aguerri threshold of 10)', () => {
    expect(calculateTier(5, UNIT_TYPE)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Test 3 — unit xp=10 → tier 1 (Aguerri threshold for units)
// ---------------------------------------------------------------------------

describe('[AC1] calculateTier — Aguerri threshold', () => {
  it('[2.3-TIER-003] unit xp=10 → tier 1 (Aguerri, exactly at unit threshold)', () => {
    expect(calculateTier(10, UNIT_TYPE)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Test 4 — unit xp=25 → tier 2 (Expérimenté threshold for units)
// ---------------------------------------------------------------------------

describe('[AC1] calculateTier — Expérimenté threshold', () => {
  it('[2.3-TIER-004] unit xp=25 → tier 2 (Expérimenté, exactly at unit threshold)', () => {
    expect(calculateTier(25, UNIT_TYPE)).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Test 5 — unit xp=50 → tier 3 (Vétéran threshold for units)
// ---------------------------------------------------------------------------

describe('[AC1] calculateTier — Vétéran threshold', () => {
  it('[2.3-TIER-005] unit xp=50 → tier 3 (Vétéran, exactly at unit threshold)', () => {
    expect(calculateTier(50, UNIT_TYPE)).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// Test 6 — unit xp=24 → tier 1 (just below Expérimenté)
// ---------------------------------------------------------------------------

describe('[AC1] calculateTier — just below Expérimenté threshold', () => {
  it('[2.3-TIER-006] unit xp=24 → tier 1 (one below Expérimenté threshold of 25)', () => {
    expect(calculateTier(24, UNIT_TYPE)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Test 7 — Characters use DIFFERENT thresholds (6, 20, 40, 70)
// ---------------------------------------------------------------------------

describe('[AC1] calculateTier — Personnages use character-specific thresholds', () => {
  it('[2.3-TIER-007] character at xp=6 → tier 1 (Aguerri)', () => {
    expect(calculateTier(6, CHAR_TYPE)).toBe(1)
  })

  it('[2.3-TIER-008] character at xp=5 → tier 0 (below Aguerri)', () => {
    expect(calculateTier(5, CHAR_TYPE)).toBe(0)
  })

  it('[2.3-TIER-009] character at xp=20 → tier 2 (Expérimenté)', () => {
    expect(calculateTier(20, CHAR_TYPE)).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Test 8 — Honneur de bataille (xp=3) is NOT a tier — still tier 0
// ---------------------------------------------------------------------------

describe('[AC1] calculateTier — Honneur de bataille is not a tier', () => {
  it('[2.3-TIER-010] unit at xp=3 → tier 0 (Honneur de bataille grants in-game bonus, not a display tier)', () => {
    expect(calculateTier(3, UNIT_TYPE)).toBe(0)
  })

  it('[2.3-TIER-011] unit at xp=9 → tier 0 (xp=9 is below unit Aguerri threshold of 10)', () => {
    expect(calculateTier(9, UNIT_TYPE)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Test 9 — Function signature: accepts unitType string
// ---------------------------------------------------------------------------

describe('[AC1] calculateTier — accepts unitType parameter', () => {
  it('[2.3-TIER-012] returns valid tier value for any unitType string', () => {
    const result = calculateTier(10, 'Unités spéciales')
    expect([0, 1, 2, 3, 4]).toContain(result)
  })
})
