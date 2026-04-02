import { describe, it, expect } from 'vitest'
import { createWizardAccumulator } from '../wizard-accumulator'
import type { TierUpQueueEntry, ExtendedDestructionResult } from '../types'
import type { InjuryResult } from '../../injury-bonus-step'

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const makeTierUpEntry = (overrides?: Partial<TierUpQueueEntry>): TierUpQueueEntry => ({
  xp: 100,
  tierLabel: 'Vétéran',
  majorImprovements: [],
  minorImprovements: [],
  majorCount: 1,
  minorCount: 0,
  unitId: 'unit-1',
  unitName: 'Test Unit',
  unitType: 'Infanterie',
  hasMount: false,
  commandement: 0,
  ...overrides,
})

// ---------------------------------------------------------------------------
// createWizardAccumulator — initial state
// ---------------------------------------------------------------------------

describe('createWizardAccumulator', () => {
  it('returns correct initial state with all empty collections', () => {
    const acc = createWizardAccumulator()

    expect(acc.submittedUnits.size).toBe(0)
    expect(acc.xpResults.size).toBe(0)
    expect(acc.consequenceFlags.size).toBe(0)
    expect(acc.championFlags.size).toBe(0)
    expect(acc.pendingConsequences.size).toBe(0)
    expect(acc.pendingGains.size).toBe(0)
    expect(acc.cumulativeGains.size).toBe(0)
    expect(acc.cumulativeHonourSelections.size).toBe(0)
    expect(acc.flaggedUnits).toEqual([])
    expect(acc.submittedXpByStep.size).toBe(0)
    expect(acc.submittedTierUpsByStep.size).toBe(0)
  })

  it('exposes all required methods', () => {
    const acc = createWizardAccumulator()

    expect(typeof acc.recordXp).toBe('function')
    expect(typeof acc.recordConsequence).toBe('function')
    expect(typeof acc.recordTierUp).toBe('function')
    expect(typeof acc.rollbackTierUp).toBe('function')
    expect(typeof acc.setFlaggedUnits).toBe('function')
  })
})

// ---------------------------------------------------------------------------
// recordXp
// ---------------------------------------------------------------------------

describe('recordXp', () => {
  it('sets xpResults entry and adds unitId to submittedUnits', () => {
    const acc = createWizardAccumulator()

    acc.recordXp('unit-1', 10, 20)

    expect(acc.xpResults.get('unit-1')).toEqual({ oldXp: 10, newXp: 20 })
    expect(acc.submittedUnits.has('unit-1')).toBe(true)
  })

  it('records multiple units independently', () => {
    const acc = createWizardAccumulator()

    acc.recordXp('unit-1', 0, 5)
    acc.recordXp('unit-2', 10, 15)

    expect(acc.xpResults.size).toBe(2)
    expect(acc.submittedUnits.size).toBe(2)
    expect(acc.xpResults.get('unit-2')).toEqual({ oldXp: 10, newXp: 15 })
  })

  it('overwrites existing entry when called twice for the same unit', () => {
    const acc = createWizardAccumulator()

    acc.recordXp('unit-1', 0, 5)
    acc.recordXp('unit-1', 5, 10)

    expect(acc.xpResults.get('unit-1')).toEqual({ oldXp: 5, newXp: 10 })
    expect(acc.submittedUnits.size).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// recordConsequence
// ---------------------------------------------------------------------------

describe('recordConsequence', () => {
  it('sets pendingConsequences entry for injury result', () => {
    const acc = createWizardAccumulator()
    const injuryResult: InjuryResult = { type: 'no_effect' }

    acc.recordConsequence('unit-1', injuryResult)

    expect(acc.pendingConsequences.get('unit-1')).toEqual(injuryResult)
  })

  it('sets pendingConsequences entry for destruction result with xpLostAmount', () => {
    const acc = createWizardAccumulator()
    const destructionResult: ExtendedDestructionResult = {
      type: 'deroute_sanglante',
      bannerLost: false,
      xpLostAmount: 10,
    }

    acc.recordConsequence('unit-1', destructionResult)

    expect(acc.pendingConsequences.get('unit-1')).toEqual(destructionResult)
  })

  it('overwrites existing consequence for the same unit', () => {
    const acc = createWizardAccumulator()
    const first: InjuryResult = { type: 'no_effect' }
    const second: InjuryResult = { type: 'death' }

    acc.recordConsequence('unit-1', first)
    acc.recordConsequence('unit-1', second)

    expect((acc.pendingConsequences.get('unit-1') as InjuryResult).type).toBe('death')
  })
})

// ---------------------------------------------------------------------------
// recordTierUp
// ---------------------------------------------------------------------------

describe('recordTierUp', () => {
  it('accumulates gains in pendingGains grouped by threshold XP', () => {
    const acc = createWizardAccumulator()
    const entry = makeTierUpEntry({ xp: 25, unitId: 'unit-1' })

    acc.recordTierUp(1, entry, ['+1 CC'])

    const groups = acc.pendingGains.get('unit-1')
    expect(groups).toHaveLength(1)
    expect(groups![0]).toEqual({ descriptions: ['+1 CC'], thresholdXp: 25 })
  })

  it('merges descriptions into existing group with same thresholdXp', () => {
    const acc = createWizardAccumulator()
    const entry = makeTierUpEntry({ xp: 25, unitId: 'unit-1' })

    acc.recordTierUp(1, entry, ['+1 CC'])
    acc.recordTierUp(2, entry, ['+1 Force'])

    const groups = acc.pendingGains.get('unit-1')
    expect(groups).toHaveLength(1)
    expect(groups![0].descriptions).toEqual(['+1 CC', '+1 Force'])
  })

  it('creates separate groups for different threshold XP values', () => {
    const acc = createWizardAccumulator()
    const entry10 = makeTierUpEntry({ xp: 10, unitId: 'unit-1' })
    const entry25 = makeTierUpEntry({ xp: 25, unitId: 'unit-1' })

    acc.recordTierUp(1, entry10, ['+1 Initiative'])
    acc.recordTierUp(2, entry25, ['+1 CT'])

    const groups = acc.pendingGains.get('unit-1')
    expect(groups).toHaveLength(2)
    expect(groups![0]).toEqual({ descriptions: ['+1 Initiative'], thresholdXp: 10 })
    expect(groups![1]).toEqual({ descriptions: ['+1 CT'], thresholdXp: 25 })
  })

  it('updates cumulativeGains', () => {
    const acc = createWizardAccumulator()
    const entry = makeTierUpEntry({ unitId: 'unit-1' })

    acc.recordTierUp(1, entry, ['+1 CC', '+1 Initiative'])

    expect(acc.cumulativeGains.get('unit-1')).toEqual(['+1 CC', '+1 Initiative'])
  })

  it('appends to cumulativeGains on subsequent calls', () => {
    const acc = createWizardAccumulator()
    const entry = makeTierUpEntry({ unitId: 'unit-1' })

    acc.recordTierUp(1, entry, ['+1 CC'])
    acc.recordTierUp(2, entry, ['+1 Force'])

    expect(acc.cumulativeGains.get('unit-1')).toEqual(['+1 CC', '+1 Force'])
  })

  it('tracks honour selections for Honneur de bataille entries (honourKind: new)', () => {
    const acc = createWizardAccumulator()
    const entry = makeTierUpEntry({ xp: 3, tierLabel: 'Honneur de bataille', honourKind: 'new', unitId: 'unit-1' })

    acc.recordTierUp(1, entry, ['Champion gratuit'])

    const honours = acc.cumulativeHonourSelections.get('unit-1')
    expect(honours?.has('Champion gratuit')).toBe(true)
  })

  it('tracks honour selections for Récupération d\'honneur entries (honourKind: recovery)', () => {
    const acc = createWizardAccumulator()
    const entry = makeTierUpEntry({ xp: 0, tierLabel: "Récupération d'honneur", honourKind: 'recovery', unitId: 'unit-1' })

    acc.recordTierUp(1, entry, ['Bannière gratuite'])

    const honours = acc.cumulativeHonourSelections.get('unit-1')
    expect(honours?.has('Bannière gratuite')).toBe(true)
  })

  it('does NOT track honour selections for non-honour tiers', () => {
    const acc = createWizardAccumulator()
    const entry = makeTierUpEntry({ xp: 25, tierLabel: 'Expérimenté', unitId: 'unit-1' })

    acc.recordTierUp(1, entry, ['+1 Force'])

    expect(acc.cumulativeHonourSelections.get('unit-1')).toBeUndefined()
  })

  it('stores all descriptions in submittedTierUpsByStep including "2 améliorations mineures"', () => {
    const acc = createWizardAccumulator()
    const entry = makeTierUpEntry({ unitId: 'unit-1' })

    acc.recordTierUp(1, entry, ['2 améliorations mineures', '+1 CC'])

    expect(acc.submittedTierUpsByStep.get(1)).toEqual(['2 améliorations mineures', '+1 CC'])
  })

  it('filters out "2 améliorations mineures" from pendingGains and cumulativeGains', () => {
    const acc = createWizardAccumulator()
    const entry = makeTierUpEntry({ unitId: 'unit-1' })

    acc.recordTierUp(1, entry, ['2 améliorations mineures', '+1 CC'])

    const groups = acc.pendingGains.get('unit-1')
    expect(groups![0].descriptions).toEqual(['+1 CC'])
    expect(acc.cumulativeGains.get('unit-1')).toEqual(['+1 CC'])
  })

  it('filters out "Non applicable" from pendingGains and cumulativeGains', () => {
    const acc = createWizardAccumulator()
    const entry = makeTierUpEntry({ xp: 3, tierLabel: 'Honneur de bataille', honourKind: 'new', unitId: 'unit-1' })

    acc.recordTierUp(1, entry, ['Non applicable'])

    expect(acc.pendingGains.get('unit-1')).toBeUndefined()
    expect(acc.cumulativeGains.get('unit-1')).toBeUndefined()
  })

  it('does not create pendingGains or cumulativeGains when all descriptions are filtered out', () => {
    // Edge case: only "2 améliorations mineures" passed — all descriptions are filtered,
    // so no gains should be recorded. submittedTierUpsByStep MUST still have the entry
    // (needed for rollback to work correctly).
    const acc = createWizardAccumulator()
    const entry = makeTierUpEntry({ unitId: 'unit-1' })

    acc.recordTierUp(1, entry, ['2 améliorations mineures'])

    expect(acc.pendingGains.get('unit-1')).toBeUndefined()
    expect(acc.cumulativeGains.get('unit-1')).toBeUndefined()
    expect(acc.submittedTierUpsByStep.get(1)).toEqual(['2 améliorations mineures'])
  })
})

// ---------------------------------------------------------------------------
// rollbackTierUp
// ---------------------------------------------------------------------------

describe('rollbackTierUp', () => {
  it('removes gains added by the targeted step from pendingGains and cumulativeGains', () => {
    const acc = createWizardAccumulator()
    const entry = makeTierUpEntry({ xp: 25, unitId: 'unit-1' })

    acc.recordTierUp(1, entry, ['+1 CC'])
    acc.rollbackTierUp(1, entry)

    expect(acc.pendingGains.get('unit-1')).toBeUndefined()
    expect(acc.cumulativeGains.get('unit-1')).toEqual([])
  })

  it('deletes the step entry from submittedTierUpsByStep', () => {
    const acc = createWizardAccumulator()
    const entry = makeTierUpEntry({ unitId: 'unit-1' })

    acc.recordTierUp(1, entry, ['+1 CC'])
    acc.rollbackTierUp(1, entry)

    expect(acc.submittedTierUpsByStep.has(1)).toBe(false)
  })

  it('clears honour selections for Honneur de bataille entries (honourKind: new)', () => {
    const acc = createWizardAccumulator()
    const entry = makeTierUpEntry({ xp: 3, tierLabel: 'Honneur de bataille', honourKind: 'new', unitId: 'unit-1' })

    acc.recordTierUp(1, entry, ['Champion gratuit'])
    acc.rollbackTierUp(1, entry)

    const honours = acc.cumulativeHonourSelections.get('unit-1')
    expect(honours?.has('Champion gratuit')).toBe(false)
  })

  it('clears honour selections for Récupération d\'honneur entries (honourKind: recovery)', () => {
    const acc = createWizardAccumulator()
    const entry = makeTierUpEntry({ xp: 0, tierLabel: "Récupération d'honneur", honourKind: 'recovery', unitId: 'unit-1' })

    acc.recordTierUp(1, entry, ['Bannière gratuite'])
    acc.rollbackTierUp(1, entry)

    const honours = acc.cumulativeHonourSelections.get('unit-1')
    expect(honours?.has('Bannière gratuite')).toBe(false)
  })

  it('does not clear honour selections when rolling back a non-honour tier', () => {
    const acc = createWizardAccumulator()
    const honourEntry = makeTierUpEntry({ xp: 3, tierLabel: 'Honneur de bataille', honourKind: 'new', unitId: 'unit-1' })
    const normalEntry = makeTierUpEntry({ xp: 25, tierLabel: 'Expérimenté', unitId: 'unit-1' })

    acc.recordTierUp(1, honourEntry, ['Champion gratuit'])
    acc.recordTierUp(2, normalEntry, ['+1 Force'])

    // Roll back the normal (non-honour) step
    acc.rollbackTierUp(2, normalEntry)

    const honours = acc.cumulativeHonourSelections.get('unit-1')
    expect(honours?.has('Champion gratuit')).toBe(true)
  })

  it('is a no-op for a non-existent step (defensive)', () => {
    const acc = createWizardAccumulator()
    const entry = makeTierUpEntry({ unitId: 'unit-1' })

    // Should not throw
    expect(() => acc.rollbackTierUp(99, entry)).not.toThrow()

    expect(acc.pendingGains.size).toBe(0)
    expect(acc.cumulativeGains.size).toBe(0)
    expect(acc.submittedTierUpsByStep.size).toBe(0)
  })

  it('only removes the targeted step when multiple steps exist', () => {
    const acc = createWizardAccumulator()
    const entry10 = makeTierUpEntry({ xp: 10, unitId: 'unit-1' })
    const entry25 = makeTierUpEntry({ xp: 25, unitId: 'unit-1' })

    acc.recordTierUp(1, entry10, ['+1 Initiative'])
    acc.recordTierUp(2, entry25, ['+1 CT'])

    // Roll back only step 2
    acc.rollbackTierUp(2, entry25)

    // Step 1 gains must still be present
    const groups = acc.pendingGains.get('unit-1')
    expect(groups).toHaveLength(1)
    expect(groups![0]).toEqual({ descriptions: ['+1 Initiative'], thresholdXp: 10 })

    expect(acc.cumulativeGains.get('unit-1')).toEqual(['+1 Initiative'])
    expect(acc.submittedTierUpsByStep.has(1)).toBe(true)
    expect(acc.submittedTierUpsByStep.has(2)).toBe(false)
  })

  it('filters out "2 améliorations mineures" from descriptionsToRemove during rollback', () => {
    // Business rule: "2 améliorations mineures" is NOT removed from gains on rollback
    // because it was never added to pendingGains/cumulativeGains in the first place.
    // The real minor improvement descriptions chosen as a result of that option ARE added.
    // This test verifies the filter works correctly — rollback of the meta-option
    // has no effect (it was never persisted), and actual minor descriptions ARE rolled back.
    const acc = createWizardAccumulator()
    const entry = makeTierUpEntry({ unitId: 'unit-1' })

    // Simulate: player chose "2 améliorations mineures" as the major slot,
    // then picked "+1 CC" and "+1 Initiative" as the two minor improvements.
    // The descriptions array contains all three selections.
    acc.recordTierUp(1, entry, ['2 améliorations mineures', '+1 CC', '+1 Initiative'])

    // pendingGains should only have the actual minor improvements (not the meta-option)
    const groups = acc.pendingGains.get('unit-1')
    expect(groups![0].descriptions).toEqual(['+1 CC', '+1 Initiative'])

    acc.rollbackTierUp(1, entry)

    // After rollback, actual minor improvements are gone, meta-option was never there
    expect(acc.pendingGains.get('unit-1')).toBeUndefined()
    expect(acc.cumulativeGains.get('unit-1')).toEqual([])
    expect(acc.submittedTierUpsByStep.has(1)).toBe(false)
  })
})
