// tests/4-2-constants-tier.test.ts
// Story 4.2: Tier-Up Detection & Improvement Choice
// Status: RED — written before implementation (TDD)
//
// Tests for:
//   - UNIT_THRESHOLDS and CHARACTER_THRESHOLDS in src/lib/constants.ts
//   - detectTierCrossings() in src/lib/tier.ts
//
// Source files do NOT exist yet (constants.ts is new; detectTierCrossings is not yet in tier.ts).
// All tests will fail with import errors until the implementation is complete.
//
// Covers Tasks 9.1–9.13 (AC: 1, 5, 6, 7)

import { describe, it, expect } from 'vitest'
import { UNIT_THRESHOLDS, CHARACTER_THRESHOLDS, CHARACTER_MAJOR_IMPROVEMENTS } from '../src/lib/constants'
import { detectTierCrossings } from '../src/lib/tier'

const UNIT_TYPE = 'Unités de base'
const CHAR_TYPE = 'Personnages'

// ---------------------------------------------------------------------------
// Task 9.1 — UNIT_THRESHOLDS has 6 entries at XP 3, 9, 10, 25, 50, 80
// ---------------------------------------------------------------------------

describe('[AC5][P0] UNIT_THRESHOLDS — structure (Task 9.1)', () => {
  it('[4.2-CST-001] UNIT_THRESHOLDS has exactly 6 entries', () => {
    expect(UNIT_THRESHOLDS).toHaveLength(6)
  })

  it('[4.2-CST-002] UNIT_THRESHOLDS entries are at XP 3, 9, 10, 25, 50, 80 (in order)', () => {
    const xpValues = UNIT_THRESHOLDS.map((t) => t.xp)
    expect(xpValues).toEqual([3, 9, 10, 25, 50, 80])
  })

  it('[4.2-CST-003] UNIT_THRESHOLDS entry at XP 3 has tierLabel "Honneur de bataille"', () => {
    const entry = UNIT_THRESHOLDS.find((t) => t.xp === 3)
    expect(entry?.tierLabel).toBe('Honneur de bataille')
  })

  it('[4.2-CST-004] UNIT_THRESHOLDS entry at XP 9 has tierLabel "Honneur de bataille"', () => {
    const entry = UNIT_THRESHOLDS.find((t) => t.xp === 9)
    expect(entry?.tierLabel).toBe('Honneur de bataille')
  })

  it('[4.2-CST-005] UNIT_THRESHOLDS entry at XP 10 has tierLabel "Aguerri"', () => {
    const entry = UNIT_THRESHOLDS.find((t) => t.xp === 10)
    expect(entry?.tierLabel).toBe('Aguerri')
  })

  it('[4.2-CST-006] UNIT_THRESHOLDS entry at XP 25 has tierLabel "Expérimenté"', () => {
    const entry = UNIT_THRESHOLDS.find((t) => t.xp === 25)
    expect(entry?.tierLabel).toBe('Expérimenté')
  })

  it('[4.2-CST-007] UNIT_THRESHOLDS entry at XP 50 has tierLabel "Vétéran"', () => {
    const entry = UNIT_THRESHOLDS.find((t) => t.xp === 50)
    expect(entry?.tierLabel).toBe('Vétéran')
  })

  it('[4.2-CST-008] UNIT_THRESHOLDS entry at XP 80 has tierLabel "Légendaire"', () => {
    const entry = UNIT_THRESHOLDS.find((t) => t.xp === 80)
    expect(entry?.tierLabel).toBe('Légendaire')
  })
})

// ---------------------------------------------------------------------------
// Task 9.2 — CHARACTER_THRESHOLDS has 4 entries at XP 6, 20, 40, 70
// ---------------------------------------------------------------------------

describe('[AC5][P0] CHARACTER_THRESHOLDS — structure (Task 9.2)', () => {
  it('[4.2-CST-009] CHARACTER_THRESHOLDS has exactly 4 entries', () => {
    expect(CHARACTER_THRESHOLDS).toHaveLength(4)
  })

  it('[4.2-CST-010] CHARACTER_THRESHOLDS entries are at XP 6, 20, 40, 70 (in order)', () => {
    const xpValues = CHARACTER_THRESHOLDS.map((t) => t.xp)
    expect(xpValues).toEqual([6, 20, 40, 70])
  })

  it('[4.2-CST-011] CHARACTER_THRESHOLDS entry at XP 6 has tierLabel "Aguerri"', () => {
    const entry = CHARACTER_THRESHOLDS.find((t) => t.xp === 6)
    expect(entry?.tierLabel).toBe('Aguerri')
  })

  it('[4.2-CST-012] CHARACTER_THRESHOLDS entry at XP 20 has tierLabel "Expérimenté"', () => {
    const entry = CHARACTER_THRESHOLDS.find((t) => t.xp === 20)
    expect(entry?.tierLabel).toBe('Expérimenté')
  })

  it('[4.2-CST-013] CHARACTER_THRESHOLDS entry at XP 40 has tierLabel "Vétéran"', () => {
    const entry = CHARACTER_THRESHOLDS.find((t) => t.xp === 40)
    expect(entry?.tierLabel).toBe('Vétéran')
  })

  it('[4.2-CST-014] CHARACTER_THRESHOLDS entry at XP 70 has tierLabel "Héroïque"', () => {
    const entry = CHARACTER_THRESHOLDS.find((t) => t.xp === 70)
    expect(entry?.tierLabel).toBe('Héroïque')
  })
})

// ---------------------------------------------------------------------------
// Task 9.3 — All improvements have unique id values
// ---------------------------------------------------------------------------

describe('[AC2][P0] Improvement ids — uniqueness across all improvement arrays (Task 9.3)', () => {
  it('[4.2-CST-015] all improvement items across all threshold arrays have unique id values', () => {
    const allIds: string[] = []

    for (const threshold of UNIT_THRESHOLDS) {
      for (const imp of threshold.majorImprovements) allIds.push(imp.id)
      for (const imp of threshold.minorImprovements) allIds.push(imp.id)
    }
    for (const threshold of CHARACTER_THRESHOLDS) {
      for (const imp of threshold.majorImprovements) allIds.push(imp.id)
      for (const imp of threshold.minorImprovements) allIds.push(imp.id)
    }

    const uniqueIds = new Set(allIds)
    expect(uniqueIds.size).toBe(allIds.length)
  })
})

// ---------------------------------------------------------------------------
// Task 9.4 — detectTierCrossings: unit 0→15 returns 3 crossings (3, 9, 10)
// ---------------------------------------------------------------------------

describe('[AC5][P0] detectTierCrossings — unit 0→15 (Task 9.4)', () => {
  it('[4.2-CST-016] unit 0→15: returns exactly 3 crossings', () => {
    const crossings = detectTierCrossings(0, 15, UNIT_TYPE)
    expect(crossings).toHaveLength(3)
  })

  it('[4.2-CST-017] unit 0→15: crossing XP values are [3, 9, 10]', () => {
    const crossings = detectTierCrossings(0, 15, UNIT_TYPE)
    expect(crossings.map((c) => c.xp)).toEqual([3, 9, 10])
  })

  it('[4.2-CST-018] unit 0→15: crossing at XP 3 has majorCount=0 and minorCount=1', () => {
    const crossings = detectTierCrossings(0, 15, UNIT_TYPE)
    const crossing3 = crossings.find((c) => c.xp === 3)
    expect(crossing3?.majorCount).toBe(0)
    expect(crossing3?.minorCount).toBe(1)
  })

  it('[4.2-CST-019] unit 0→15: crossing at XP 9 has majorCount=0 and minorCount=1', () => {
    const crossings = detectTierCrossings(0, 15, UNIT_TYPE)
    const crossing9 = crossings.find((c) => c.xp === 9)
    expect(crossing9?.majorCount).toBe(0)
    expect(crossing9?.minorCount).toBe(1)
  })

  it('[4.2-CST-020] unit 0→15: crossing at XP 10 has majorCount=0 and minorCount=1', () => {
    const crossings = detectTierCrossings(0, 15, UNIT_TYPE)
    const crossing10 = crossings.find((c) => c.xp === 10)
    expect(crossing10?.majorCount).toBe(0)
    expect(crossing10?.minorCount).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Task 9.5 — detectTierCrossings: unit 8→10 returns 2 crossings (9, 10)
// ---------------------------------------------------------------------------

describe('[AC5][P0] detectTierCrossings — unit 8→10 (Task 9.5)', () => {
  it('[4.2-CST-021] unit 8→10: returns exactly 2 crossings (XP 9 and 10)', () => {
    const crossings = detectTierCrossings(8, 10, UNIT_TYPE)
    expect(crossings).toHaveLength(2)
    expect(crossings.map((c) => c.xp)).toEqual([9, 10])
  })
})

// ---------------------------------------------------------------------------
// Task 9.6 — detectTierCrossings: character 0→25 returns 2 crossings (6, 20)
// ---------------------------------------------------------------------------

describe('[AC5][P0] detectTierCrossings — character 0→25 (Task 9.6)', () => {
  it('[4.2-CST-022] character 0→25: returns exactly 2 crossings', () => {
    const crossings = detectTierCrossings(0, 25, CHAR_TYPE)
    expect(crossings).toHaveLength(2)
  })

  it('[4.2-CST-023] character 0→25: crossing XP values are [6, 20]', () => {
    const crossings = detectTierCrossings(0, 25, CHAR_TYPE)
    expect(crossings.map((c) => c.xp)).toEqual([6, 20])
  })
})

// ---------------------------------------------------------------------------
// Task 9.7 — detectTierCrossings: delta=0 returns empty
// ---------------------------------------------------------------------------

describe('[AC7][P0] detectTierCrossings — delta=0 (Task 9.7)', () => {
  it('[4.2-CST-024] unit oldXp===newXp: returns empty array', () => {
    expect(detectTierCrossings(10, 10, UNIT_TYPE)).toEqual([])
  })

  it('[4.2-CST-025] character oldXp===newXp: returns empty array', () => {
    expect(detectTierCrossings(6, 6, CHAR_TYPE)).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Task 9.8 — detectTierCrossings: negative delta returns empty
// ---------------------------------------------------------------------------

describe('[AC7][P0] detectTierCrossings — negative delta (Task 9.8)', () => {
  it('[4.2-CST-026] unit newXp < oldXp: returns empty array', () => {
    expect(detectTierCrossings(20, 10, UNIT_TYPE)).toEqual([])
  })

  it('[4.2-CST-027] character newXp < oldXp: returns empty array', () => {
    expect(detectTierCrossings(30, 5, CHAR_TYPE)).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Task 9.9 — detectTierCrossings: crossings sorted ascending by XP
// ---------------------------------------------------------------------------

describe('[AC5][P0] detectTierCrossings — sorted ascending (Task 9.9)', () => {
  it('[4.2-CST-028] unit 0→80: crossings are sorted ascending by XP', () => {
    const crossings = detectTierCrossings(0, 80, UNIT_TYPE)
    const xpValues = crossings.map((c) => c.xp)
    const sorted = [...xpValues].sort((a, b) => a - b)
    expect(xpValues).toEqual(sorted)
  })

  it('[4.2-CST-029] character 0→70: crossings are sorted ascending by XP', () => {
    const crossings = detectTierCrossings(0, 70, CHAR_TYPE)
    const xpValues = crossings.map((c) => c.xp)
    const sorted = [...xpValues].sort((a, b) => a - b)
    expect(xpValues).toEqual(sorted)
  })
})

// ---------------------------------------------------------------------------
// Task 9.10 — Légendaire (unit 0→80) has majorCount=2, minorCount=1
// ---------------------------------------------------------------------------

describe('[AC5][P0] detectTierCrossings — Légendaire threshold (Task 9.10)', () => {
  it('[4.2-CST-030] UNIT_THRESHOLDS entry at XP 80 (Légendaire) has majorCount=2', () => {
    const entry = UNIT_THRESHOLDS.find((t) => t.xp === 80)
    expect(entry?.majorCount).toBe(2)
  })

  it('[4.2-CST-031] UNIT_THRESHOLDS entry at XP 80 (Légendaire) has minorCount=1', () => {
    const entry = UNIT_THRESHOLDS.find((t) => t.xp === 80)
    expect(entry?.minorCount).toBe(1)
  })

  it('[4.2-CST-032] detectTierCrossings unit 0→80: Légendaire crossing has majorCount=2 and minorCount=1', () => {
    const crossings = detectTierCrossings(0, 80, UNIT_TYPE)
    const legendaire = crossings.find((c) => c.xp === 80)
    expect(legendaire?.majorCount).toBe(2)
    expect(legendaire?.minorCount).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Task 9.11 — Héroïque (character 0→70) has majorCount=2, minorCount=2
// ---------------------------------------------------------------------------

describe('[AC5][P0] detectTierCrossings — Héroïque threshold (Task 9.11)', () => {
  it('[4.2-CST-033] CHARACTER_THRESHOLDS entry at XP 70 (Héroïque) has majorCount=2', () => {
    const entry = CHARACTER_THRESHOLDS.find((t) => t.xp === 70)
    expect(entry?.majorCount).toBe(2)
  })

  it('[4.2-CST-034] CHARACTER_THRESHOLDS entry at XP 70 (Héroïque) has minorCount=2', () => {
    const entry = CHARACTER_THRESHOLDS.find((t) => t.xp === 70)
    expect(entry?.minorCount).toBe(2)
  })

  it('[4.2-CST-035] detectTierCrossings character 0→70: Héroïque crossing has majorCount=2 and minorCount=2', () => {
    const crossings = detectTierCrossings(0, 70, CHAR_TYPE)
    const heroique = crossings.find((c) => c.xp === 70)
    expect(heroique?.majorCount).toBe(2)
    expect(heroique?.minorCount).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Task 9.12 — Endurance slotCost=2 ONLY in CHARACTER_MAJOR (not UNIT_MAJOR)
// ---------------------------------------------------------------------------

describe('[AC2][P0] Endurance slotCost — character only (Task 9.12)', () => {
  it('[4.2-CST-036] CHARACTER_MAJOR_IMPROVEMENTS contains Endurance with slotCost=2', () => {
    const endurance = CHARACTER_MAJOR_IMPROVEMENTS.find((imp) => imp.id === 'c-maj-e')
    expect(endurance).toBeDefined()
    expect(endurance?.slotCost).toBe(2)
  })

  it('[4.2-CST-037] Endurance in CHARACTER_THRESHOLDS at XP 20 (majorCount=1) major improvements has slotCost=2', () => {
    const entry = CHARACTER_THRESHOLDS.find((t) => t.xp === 20)
    const endurance = entry?.majorImprovements.find((imp) => imp.id === 'c-maj-e')
    expect(endurance?.slotCost).toBe(2)
  })

  it('[4.2-CST-038] UNIT_THRESHOLDS at XP 25 (Expérimenté) major improvements: Endurance has NO slotCost override (default 1 or undefined)', () => {
    const entry = UNIT_THRESHOLDS.find((t) => t.xp === 25)
    const endurance = entry?.majorImprovements.find((imp) => imp.id === 'u-maj-e')
    // Unit Endurance should NOT have slotCost=2
    expect(endurance?.slotCost ?? 1).toBe(1)
  })

  it('[4.2-CST-039] unit Endurance id is "u-maj-e" (not the character one "c-maj-e")', () => {
    const entry = UNIT_THRESHOLDS.find((t) => t.xp === 25)
    const unitEnduranceIds = entry?.majorImprovements.map((imp) => imp.id) ?? []
    expect(unitEnduranceIds).toContain('u-maj-e')
    expect(unitEnduranceIds).not.toContain('c-maj-e')
  })
})

// ---------------------------------------------------------------------------
// Task 9.13 — unit 0→80 returns 6 crossings (all unit thresholds)
// ---------------------------------------------------------------------------

describe('[AC5][P0] detectTierCrossings — unit 0→80 (Task 9.13)', () => {
  it('[4.2-CST-040] unit 0→80: returns exactly 6 crossings', () => {
    const crossings = detectTierCrossings(0, 80, UNIT_TYPE)
    expect(crossings).toHaveLength(6)
  })

  it('[4.2-CST-041] unit 0→80: crossing XP values are [3, 9, 10, 25, 50, 80]', () => {
    const crossings = detectTierCrossings(0, 80, UNIT_TYPE)
    expect(crossings.map((c) => c.xp)).toEqual([3, 9, 10, 25, 50, 80])
  })
})

// ---------------------------------------------------------------------------
// Bonus — majorCount / minorCount for all unit thresholds
// ---------------------------------------------------------------------------

describe('[AC2][P0] UNIT_THRESHOLDS — majorCount/minorCount per entry', () => {
  it('[4.2-CST-042] XP 3 (Honneur): majorCount=0, minorCount=1', () => {
    const entry = UNIT_THRESHOLDS.find((t) => t.xp === 3)
    expect(entry?.majorCount).toBe(0)
    expect(entry?.minorCount).toBe(1)
  })

  it('[4.2-CST-043] XP 9 (Honneur): majorCount=0, minorCount=1', () => {
    const entry = UNIT_THRESHOLDS.find((t) => t.xp === 9)
    expect(entry?.majorCount).toBe(0)
    expect(entry?.minorCount).toBe(1)
  })

  it('[4.2-CST-044] XP 10 (Aguerri): majorCount=0, minorCount=1', () => {
    const entry = UNIT_THRESHOLDS.find((t) => t.xp === 10)
    expect(entry?.majorCount).toBe(0)
    expect(entry?.minorCount).toBe(1)
  })

  it('[4.2-CST-045] XP 25 (Expérimenté): majorCount=1, minorCount=0', () => {
    const entry = UNIT_THRESHOLDS.find((t) => t.xp === 25)
    expect(entry?.majorCount).toBe(1)
    expect(entry?.minorCount).toBe(0)
  })

  it('[4.2-CST-046] XP 50 (Vétéran): majorCount=0, minorCount=2', () => {
    const entry = UNIT_THRESHOLDS.find((t) => t.xp === 50)
    expect(entry?.majorCount).toBe(0)
    expect(entry?.minorCount).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Bonus — majorCount / minorCount for all character thresholds
// ---------------------------------------------------------------------------

describe('[AC2][P0] CHARACTER_THRESHOLDS — majorCount/minorCount per entry', () => {
  it('[4.2-CST-047] XP 6 (Aguerri char): majorCount=0, minorCount=1', () => {
    const entry = CHARACTER_THRESHOLDS.find((t) => t.xp === 6)
    expect(entry?.majorCount).toBe(0)
    expect(entry?.minorCount).toBe(1)
  })

  it('[4.2-CST-048] XP 20 (Expérimenté char): majorCount=1, minorCount=0', () => {
    const entry = CHARACTER_THRESHOLDS.find((t) => t.xp === 20)
    expect(entry?.majorCount).toBe(1)
    expect(entry?.minorCount).toBe(0)
  })

  it('[4.2-CST-049] XP 40 (Vétéran char): majorCount=1, minorCount=2', () => {
    const entry = CHARACTER_THRESHOLDS.find((t) => t.xp === 40)
    expect(entry?.majorCount).toBe(1)
    expect(entry?.minorCount).toBe(2)
  })
})
