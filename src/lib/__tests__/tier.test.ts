// src/lib/__tests__/tier.test.ts
// Deroute Sanglante — XP Loss with Tier-Down Gain Removal
// Tests for detectLostThresholds pure function

import { describe, it, expect } from 'vitest'
import { detectLostThresholds } from '../tier'

describe('detectLostThresholds', () => {
  // ---------------------------------------------------------------------------
  // Basic threshold detection
  // ---------------------------------------------------------------------------

  it('[DS-TH-001] returns [25] when unit drops from 35 to 20 (lost Expérimenté)', () => {
    const result = detectLostThresholds(35, 20, 'Infanterie')
    expect(result).toEqual([25])
  })

  it('[DS-TH-002] returns [10] when unit drops from 12 to 2 (lost Aguerri, 3 and 9 excluded)', () => {
    const result = detectLostThresholds(12, 2, 'Infanterie')
    expect(result).toEqual([10])
  })

  it('[DS-TH-003] returns [25, 50] when unit drops from 55 to 20 (lost Expérimenté + Vétéran)', () => {
    const result = detectLostThresholds(55, 20, 'Infanterie')
    expect(result).toContain(25)
    expect(result).toContain(50)
    expect(result).toHaveLength(2)
  })

  it('[DS-TH-004] returns [] when unit drops from 5 to 0 (no tier thresholds, 3 excluded)', () => {
    const result = detectLostThresholds(5, 0, 'Infanterie')
    expect(result).toEqual([])
  })

  it('[DS-TH-005] returns [] when XP went up (not a loss)', () => {
    const result = detectLostThresholds(20, 25, 'Infanterie')
    expect(result).toEqual([])
  })

  // ---------------------------------------------------------------------------
  // HONOUR_THRESHOLDS exclusion
  // ---------------------------------------------------------------------------

  it('[DS-TH-006] never returns 3 (honour threshold)', () => {
    const result = detectLostThresholds(10, 0, 'Infanterie')
    expect(result).not.toContain(3)
  })

  it('[DS-TH-007] never returns 9 (honour threshold)', () => {
    const result = detectLostThresholds(12, 0, 'Infanterie')
    expect(result).not.toContain(9)
  })

  it('[DS-TH-008] returns [10] when dropping from 11 to 1 (3 and 9 excluded, only 10 lost)', () => {
    const result = detectLostThresholds(11, 1, 'Infanterie')
    expect(result).toEqual([10])
  })

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  it('[DS-TH-009] returns [] when preXp equals postXp (no change)', () => {
    const result = detectLostThresholds(25, 25, 'Infanterie')
    expect(result).toEqual([])
  })

  it('[DS-TH-010] returns [] for Personnages (deroute does not apply to characters)', () => {
    const result = detectLostThresholds(35, 20, 'Personnages')
    expect(result).toEqual([])
  })

  it('[DS-TH-011] returns [50] only when dropping from 55 to 35 (50 > 35, 25 preserved)', () => {
    const result = detectLostThresholds(55, 35, 'Infanterie')
    expect(result).toEqual([50])
    expect(result).not.toContain(25)
  })

  it('[DS-TH-012] returns [] when no tier threshold is crossed (e.g. 24 to 15)', () => {
    const result = detectLostThresholds(24, 15, 'Infanterie')
    expect(result).toEqual([])
  })

  it('[DS-TH-013] returns [80] when dropping from 85 to 75 (lost Légendaire)', () => {
    const result = detectLostThresholds(85, 75, 'Infanterie')
    expect(result).toEqual([80])
  })

  it('[DS-TH-014] threshold boundary — preXp exactly at threshold (e.g. 25 to 20)', () => {
    // preXp >= threshold.xp required: preXp=25 >= 25, postXp=20 < 25 → lost
    const result = detectLostThresholds(25, 20, 'Infanterie')
    expect(result).toEqual([25])
  })

  it('[DS-TH-015] threshold boundary — postXp exactly at threshold (e.g. 30 to 25)', () => {
    // postXp must be < threshold.xp: postXp=25 is NOT < 25 → not lost
    const result = detectLostThresholds(30, 25, 'Infanterie')
    expect(result).toEqual([])
  })

  it('[DS-TH-016] unit exactly at Aguerri (XP=10) suffers tier-1 deroute (-10) to 0: returns [10]', () => {
    const result = detectLostThresholds(10, 0, 'Infanterie')
    expect(result).toEqual([10])
  })

  it('[DS-TH-017] unit at 0 XP suffers deroute (no-op): returns []', () => {
    const result = detectLostThresholds(0, 0, 'Infanterie')
    expect(result).toEqual([])
  })
})
