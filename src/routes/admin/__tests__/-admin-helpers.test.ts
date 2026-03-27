import { describe, it, expect } from 'vitest'
import { createEmptyStats, STAT_KEYS } from '../-admin-helpers'

describe('createEmptyStats', () => {
  it('returns an object with all STAT_KEYS set to empty string', () => {
    const stats = createEmptyStats()
    for (const key of STAT_KEYS) {
      expect(stats[key]).toBe('')
    }
  })

  it('returns a new object each call (no shared reference)', () => {
    const a = createEmptyStats()
    const b = createEmptyStats()
    expect(a).not.toBe(b)
    expect(a).toEqual(b)
  })
})
