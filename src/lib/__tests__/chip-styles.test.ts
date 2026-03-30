// src/lib/__tests__/chip-styles.test.ts
// Tests for chipClasses helper

import { describe, it, expect } from 'vitest'
import { chipClasses } from '../chip-styles'

describe('chipClasses', () => {
  it('returns correct classes for variant "bonus"', () => {
    const result = chipClasses('bonus')
    expect(result).toBe('bg-cw-bonus-bg text-cw-bonus border border-cw-bonus-border')
  })

  it('returns correct classes for variant "malus"', () => {
    const result = chipClasses('malus')
    expect(result).toBe('bg-cw-malus-bg text-cw-malus border border-cw-malus-border')
  })

  it('returns correct classes for variant "temporary"', () => {
    const result = chipClasses('temporary')
    expect(result).toBe('bg-cw-temporary-bg text-cw-temporary border border-cw-temporary-border')
  })

  it('returns correct classes for variant "neutral"', () => {
    const result = chipClasses('neutral')
    expect(result).toBe('bg-cw-neutral-bg text-cw-neutral border border-cw-neutral-border')
  })

  it('all variants return strings containing the "cw-" prefix', () => {
    const variants = ['bonus', 'malus', 'temporary', 'neutral'] as const
    for (const variant of variants) {
      expect(chipClasses(variant)).toMatch(/cw-/)
    }
  })
})
