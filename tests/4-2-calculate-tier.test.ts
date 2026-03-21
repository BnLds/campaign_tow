// tests/4-2-calculate-tier.test.ts
// Story 4.2: Tier-Up Detection & Improvement Choice
// Status: RED — written before implementation (TDD)
//
// Tests for updated calculateTier(xp, unitType) and getTierLabel(tier, unitType).
// The existing calculateTier() in src/lib/tier.ts uses old thresholds (6/12/20).
// Story 4.2 replaces them with:
//   Units:      0→0, 10→1, 25→2, 50→3, 80→4
//   Characters: 0→0, 6→1,  20→2, 40→3, 70→4
//
// All tests will fail (wrong values) until the implementation is updated.
//
// Covers Tasks 10.1–10.3 (AC: 10)

import { describe, it, expect } from 'vitest'
import { calculateTier, getTierLabel } from '../src/lib/tier'

const UNIT_TYPE = 'Unités de base'
const CHAR_TYPE = 'Personnages'

// ---------------------------------------------------------------------------
// Task 10.1 — Unit thresholds: 0→0, 9→0, 10→1, 24→1, 25→2, 49→2, 50→3, 79→3, 80→4
// ---------------------------------------------------------------------------

describe('[AC10][P0] calculateTier — unit thresholds (Task 10.1)', () => {
  it('[4.2-TIER-001] unit xp=0 → tier 0 (Bleusaille)', () => {
    expect(calculateTier(0, UNIT_TYPE)).toBe(0)
  })

  it('[4.2-TIER-002] unit xp=9 → tier 0 (just below Aguerri threshold of 10)', () => {
    expect(calculateTier(9, UNIT_TYPE)).toBe(0)
  })

  it('[4.2-TIER-003] unit xp=10 → tier 1 (Aguerri, at threshold)', () => {
    expect(calculateTier(10, UNIT_TYPE)).toBe(1)
  })

  it('[4.2-TIER-004] unit xp=24 → tier 1 (just below Expérimenté threshold of 25)', () => {
    expect(calculateTier(24, UNIT_TYPE)).toBe(1)
  })

  it('[4.2-TIER-005] unit xp=25 → tier 2 (Expérimenté, at threshold)', () => {
    expect(calculateTier(25, UNIT_TYPE)).toBe(2)
  })

  it('[4.2-TIER-006] unit xp=49 → tier 2 (just below Vétéran threshold of 50)', () => {
    expect(calculateTier(49, UNIT_TYPE)).toBe(2)
  })

  it('[4.2-TIER-007] unit xp=50 → tier 3 (Vétéran, at threshold)', () => {
    expect(calculateTier(50, UNIT_TYPE)).toBe(3)
  })

  it('[4.2-TIER-008] unit xp=79 → tier 3 (just below Légendaire threshold of 80)', () => {
    expect(calculateTier(79, UNIT_TYPE)).toBe(3)
  })

  it('[4.2-TIER-009] unit xp=80 → tier 4 (Légendaire, at threshold)', () => {
    expect(calculateTier(80, UNIT_TYPE)).toBe(4)
  })

  it('[4.2-TIER-010] unit xp=100 → tier 4 (above Légendaire threshold)', () => {
    expect(calculateTier(100, UNIT_TYPE)).toBe(4)
  })

  it('[4.2-TIER-011] unit xp=3 → tier 0 (Honneur de bataille is NOT a visual tier)', () => {
    expect(calculateTier(3, UNIT_TYPE)).toBe(0)
  })

  it('[4.2-TIER-012] unit xp=9 → tier 0 (second Honneur de bataille is also NOT a visual tier)', () => {
    expect(calculateTier(9, UNIT_TYPE)).toBe(0)
  })

  it('[4.2-TIER-013] other unit type "Unités spéciales" uses unit thresholds (not character)', () => {
    expect(calculateTier(10, 'Unités spéciales')).toBe(1)
    expect(calculateTier(80, 'Unités d\'élite')).toBe(4)
  })
})

// ---------------------------------------------------------------------------
// Task 10.2 — Character thresholds: 0→0, 5→0, 6→1, 19→1, 20→2, 39→2, 40→3, 69→3, 70→4
// ---------------------------------------------------------------------------

describe('[AC10][P0] calculateTier — character thresholds (Task 10.2)', () => {
  it('[4.2-TIER-014] character xp=0 → tier 0 (no tier for characters)', () => {
    expect(calculateTier(0, CHAR_TYPE)).toBe(0)
  })

  it('[4.2-TIER-015] character xp=5 → tier 0 (just below Aguerri threshold of 6)', () => {
    expect(calculateTier(5, CHAR_TYPE)).toBe(0)
  })

  it('[4.2-TIER-016] character xp=6 → tier 1 (Aguerri, at threshold)', () => {
    expect(calculateTier(6, CHAR_TYPE)).toBe(1)
  })

  it('[4.2-TIER-017] character xp=19 → tier 1 (just below Expérimenté threshold of 20)', () => {
    expect(calculateTier(19, CHAR_TYPE)).toBe(1)
  })

  it('[4.2-TIER-018] character xp=20 → tier 2 (Expérimenté, at threshold)', () => {
    expect(calculateTier(20, CHAR_TYPE)).toBe(2)
  })

  it('[4.2-TIER-019] character xp=39 → tier 2 (just below Vétéran threshold of 40)', () => {
    expect(calculateTier(39, CHAR_TYPE)).toBe(2)
  })

  it('[4.2-TIER-020] character xp=40 → tier 3 (Vétéran, at threshold)', () => {
    expect(calculateTier(40, CHAR_TYPE)).toBe(3)
  })

  it('[4.2-TIER-021] character xp=69 → tier 3 (just below Héroïque threshold of 70)', () => {
    expect(calculateTier(69, CHAR_TYPE)).toBe(3)
  })

  it('[4.2-TIER-022] character xp=70 → tier 4 (Héroïque, at threshold)', () => {
    expect(calculateTier(70, CHAR_TYPE)).toBe(4)
  })

  it('[4.2-TIER-023] character xp=99 → tier 4 (above Héroïque threshold)', () => {
    expect(calculateTier(99, CHAR_TYPE)).toBe(4)
  })
})

// ---------------------------------------------------------------------------
// Task 10.3 — getTierLabel with unitType for tier 4
// ---------------------------------------------------------------------------

describe('[AC10][P0] getTierLabel — tier 4 depends on unitType (Task 10.3)', () => {
  it('[4.2-TIER-024] getTierLabel(4, "Unités de base") returns "✦ Légendaire"', () => {
    expect(getTierLabel(4, UNIT_TYPE)).toBe('✦ Légendaire')
  })

  it('[4.2-TIER-025] getTierLabel(4, "Personnages") returns "✦ Héroïque"', () => {
    expect(getTierLabel(4, CHAR_TYPE)).toBe('✦ Héroïque')
  })

  it('[4.2-TIER-026] getTierLabel(4, "Unités spéciales") returns "✦ Légendaire" (non-character defaults to unit label)', () => {
    expect(getTierLabel(4, 'Unités spéciales')).toBe('✦ Légendaire')
  })

  it('[4.2-TIER-027] getTierLabel(3, UNIT_TYPE) returns "✦ Vétéran"', () => {
    expect(getTierLabel(3, UNIT_TYPE)).toBe('✦ Vétéran')
  })

  it('[4.2-TIER-028] getTierLabel(2, UNIT_TYPE) returns "◆ Expérimenté"', () => {
    expect(getTierLabel(2, UNIT_TYPE)).toBe('◆ Expérimenté')
  })

  it('[4.2-TIER-029] getTierLabel(1, UNIT_TYPE) returns "◈ Aguerri"', () => {
    expect(getTierLabel(1, UNIT_TYPE)).toBe('◈ Aguerri')
  })

  it('[4.2-TIER-030] getTierLabel(0, UNIT_TYPE) returns "Bleusaille" (units have Bleusaille at tier 0)', () => {
    expect(getTierLabel(0, UNIT_TYPE)).toBe('Bleusaille')
  })

  it('[4.2-TIER-031] getTierLabel(0, CHAR_TYPE) returns "" (characters have no label at tier 0)', () => {
    expect(getTierLabel(0, CHAR_TYPE)).toBe('')
  })
})
