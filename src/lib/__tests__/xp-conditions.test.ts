import { describe, it, expect } from 'vitest'
import {
  CHARACTER_XP_CONDITIONS,
  UNIT_XP_CONDITIONS,
  getXpConditionsForType,
  computeXpTotal,
} from '../xp-conditions'

describe('getXpConditionsForType', () => {
  it('returns character conditions for "Personnages"', () => {
    const conditions = getXpConditionsForType('Personnages')
    expect(conditions).toBe(CHARACTER_XP_CONDITIONS)
    expect(conditions.some((c) => c.id === 'general_win')).toBe(true)
    expect(conditions.some((c) => c.id === 'survived')).toBe(false)
  })

  it('returns unit conditions for "Infanterie"', () => {
    const conditions = getXpConditionsForType('Infanterie')
    expect(conditions).toBe(UNIT_XP_CONDITIONS)
    expect(conditions.some((c) => c.id === 'survived')).toBe(true)
    expect(conditions.some((c) => c.id === 'general_win')).toBe(false)
  })

  it('returns unit conditions for "Artillerie" (unknown type → fallback)', () => {
    expect(getXpConditionsForType('Artillerie')).toBe(UNIT_XP_CONDITIONS)
  })

  it('returns unit conditions for empty string (fallback)', () => {
    expect(getXpConditionsForType('')).toBe(UNIT_XP_CONDITIONS)
  })

  it('returns unit conditions for "Personnage" (singular ≠ plural)', () => {
    expect(getXpConditionsForType('Personnage')).toBe(UNIT_XP_CONDITIONS)
  })
})

describe('computeXpTotal', () => {
  it('returns 3 for deployed + general_win (Personnages)', () => {
    expect(computeXpTotal(new Set(['deployed', 'general_win']), 'Personnages')).toBe(3)
  })

  it('returns 0 for empty set (Infanterie)', () => {
    expect(computeXpTotal(new Set([]), 'Infanterie')).toBe(0)
  })

  it('returns 3 for deployed + survived + feat_destroy_unit (Infanterie)', () => {
    expect(
      computeXpTotal(new Set(['deployed', 'survived', 'feat_destroy_unit']), 'Infanterie'),
    ).toBe(3)
  })

  it('ignores unknown IDs — deployed + FAKE_ID (Personnages) returns 1', () => {
    expect(computeXpTotal(new Set(['deployed', 'FAKE_ID']), 'Personnages')).toBe(1)
  })

  it('max possible XP per match fits within submitUnitXpSchema limit (99)', () => {
    const maxChar = CHARACTER_XP_CONDITIONS.reduce((s, c) => s + c.xp, 0)
    const maxUnit = UNIT_XP_CONDITIONS.reduce((s, c) => s + c.xp, 0)
    expect(Math.max(maxChar, maxUnit)).toBeLessThanOrEqual(99)
  })
})
