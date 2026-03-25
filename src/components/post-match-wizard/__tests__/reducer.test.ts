import { describe, it, expect } from 'vitest'
import { wizardReducer, initialWizardState } from '../reducer'
import type { WizardState } from '../reducer'
import type { TierUpQueueEntry } from '../types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTierUpEntry(overrides: Partial<TierUpQueueEntry> = {}): TierUpQueueEntry {
  return {
    xp: 3,
    tierLabel: 'Aguerri',
    majorImprovements: [],
    minorImprovements: [{ id: 'mv', label: '+1 Mouvement', category: 'minor' as const }],
    majorCount: 0,
    minorCount: 1,
    unitId: 'u1',
    unitName: 'Hallebardiers',
    unitType: 'Infanterie',
    hasMount: false,
    commandement: 0,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// initialWizardState
// ---------------------------------------------------------------------------

describe('initialWizardState', () => {
  it('returns xp phase at step 0', () => {
    const state = initialWizardState()
    expect(state).toEqual({ phase: 'xp', currentStep: 0 })
  })
})

// ---------------------------------------------------------------------------
// XP phase transitions
// ---------------------------------------------------------------------------

describe('wizardReducer — XP phase', () => {
  it('NEXT_XP_STEP increments currentStep', () => {
    const state: WizardState = { phase: 'xp', currentStep: 0 }
    expect(wizardReducer(state, { type: 'NEXT_XP_STEP' })).toEqual({ phase: 'xp', currentStep: 1 })
  })

  it('PREV_XP_STEP decrements currentStep', () => {
    const state: WizardState = { phase: 'xp', currentStep: 2 }
    expect(wizardReducer(state, { type: 'PREV_XP_STEP' })).toEqual({ phase: 'xp', currentStep: 1 })
  })

  it('PREV_XP_STEP clamps at 0', () => {
    const state: WizardState = { phase: 'xp', currentStep: 0 }
    expect(wizardReducer(state, { type: 'PREV_XP_STEP' })).toEqual({ phase: 'xp', currentStep: 0 })
  })

  it('NEXT_XP_STEP is ignored when not in xp phase', () => {
    const state: WizardState = { phase: 'consequences', consequenceIndex: 0 }
    expect(wizardReducer(state, { type: 'NEXT_XP_STEP' })).toBe(state)
  })
})

// ---------------------------------------------------------------------------
// Consequence phase transitions
// ---------------------------------------------------------------------------

describe('wizardReducer — consequences phase', () => {
  it('ENTER_CONSEQUENCES transitions from xp to consequences', () => {
    const state: WizardState = { phase: 'xp', currentStep: 2 }
    expect(wizardReducer(state, { type: 'ENTER_CONSEQUENCES', startIndex: 0 })).toEqual({
      phase: 'consequences',
      consequenceIndex: 0,
    })
  })

  it('NEXT_CONSEQUENCE increments consequenceIndex', () => {
    const state: WizardState = { phase: 'consequences', consequenceIndex: 0 }
    expect(wizardReducer(state, { type: 'NEXT_CONSEQUENCE' })).toEqual({
      phase: 'consequences',
      consequenceIndex: 1,
    })
  })

  it('PREV_CONSEQUENCE decrements consequenceIndex', () => {
    const state: WizardState = { phase: 'consequences', consequenceIndex: 2 }
    expect(wizardReducer(state, { type: 'PREV_CONSEQUENCE' })).toEqual({
      phase: 'consequences',
      consequenceIndex: 1,
    })
  })

  it('PREV_CONSEQUENCE clamps at 0', () => {
    const state: WizardState = { phase: 'consequences', consequenceIndex: 0 }
    expect(wizardReducer(state, { type: 'PREV_CONSEQUENCE' })).toEqual({
      phase: 'consequences',
      consequenceIndex: 0,
    })
  })

  it('BACK_TO_XP returns to xp phase at given step', () => {
    const state: WizardState = { phase: 'consequences', consequenceIndex: 0 }
    expect(wizardReducer(state, { type: 'BACK_TO_XP', step: 3 })).toEqual({
      phase: 'xp',
      currentStep: 3,
    })
  })
})

// ---------------------------------------------------------------------------
// Tier-up phase transitions
// ---------------------------------------------------------------------------

describe('wizardReducer — tierup phase', () => {
  it('ENTER_TIERUP with non-empty queue transitions to tierup at step 0', () => {
    const queue = [makeTierUpEntry()]
    const state: WizardState = { phase: 'xp', currentStep: 0 }
    const result = wizardReducer(state, { type: 'ENTER_TIERUP', queue })
    expect(result).toEqual({ phase: 'tierup', tierUpQueue: queue, tierUpStep: 0 })
  })

  it('ENTER_TIERUP with empty queue returns complete', () => {
    const state: WizardState = { phase: 'xp', currentStep: 0 }
    expect(wizardReducer(state, { type: 'ENTER_TIERUP', queue: [] })).toEqual({ phase: 'complete' })
  })

  it('NEXT_TIERUP_STEP increments tierUpStep', () => {
    const queue = [makeTierUpEntry(), makeTierUpEntry({ unitId: 'u2' })]
    const state: WizardState = { phase: 'tierup', tierUpQueue: queue, tierUpStep: 0 }
    expect(wizardReducer(state, { type: 'NEXT_TIERUP_STEP' })).toEqual({
      phase: 'tierup',
      tierUpQueue: queue,
      tierUpStep: 1,
    })
  })

  it('PREV_TIERUP_STEP decrements tierUpStep', () => {
    const queue = [makeTierUpEntry(), makeTierUpEntry({ unitId: 'u2' })]
    const state: WizardState = { phase: 'tierup', tierUpQueue: queue, tierUpStep: 1 }
    expect(wizardReducer(state, { type: 'PREV_TIERUP_STEP' })).toEqual({
      phase: 'tierup',
      tierUpQueue: queue,
      tierUpStep: 0,
    })
  })

  it('PREV_TIERUP_STEP clamps at 0', () => {
    const queue = [makeTierUpEntry()]
    const state: WizardState = { phase: 'tierup', tierUpQueue: queue, tierUpStep: 0 }
    expect(wizardReducer(state, { type: 'PREV_TIERUP_STEP' })).toEqual({
      phase: 'tierup',
      tierUpQueue: queue,
      tierUpStep: 0,
    })
  })

  it('BACK_TO_CONSEQUENCES returns to consequences at given index', () => {
    const queue = [makeTierUpEntry()]
    const state: WizardState = { phase: 'tierup', tierUpQueue: queue, tierUpStep: 0 }
    expect(wizardReducer(state, { type: 'BACK_TO_CONSEQUENCES', consequenceIndex: 2 })).toEqual({
      phase: 'consequences',
      consequenceIndex: 2,
    })
  })

  it('INSERT_TIERUP_SUBSTEPS splices entries after given index', () => {
    const entry1 = makeTierUpEntry({ unitId: 'u1', tierLabel: 'A' })
    const entry2 = makeTierUpEntry({ unitId: 'u2', tierLabel: 'B' })
    const sub1 = makeTierUpEntry({ unitId: 'u1', tierLabel: 'Sub1' })
    const sub2 = makeTierUpEntry({ unitId: 'u1', tierLabel: 'Sub2' })
    const state: WizardState = { phase: 'tierup', tierUpQueue: [entry1, entry2], tierUpStep: 0 }

    const result = wizardReducer(state, { type: 'INSERT_TIERUP_SUBSTEPS', entries: [sub1, sub2], afterIndex: 0 })
    expect(result).toEqual({
      phase: 'tierup',
      tierUpQueue: [entry1, sub1, sub2, entry2],
      tierUpStep: 0,
    })
  })

  it('INSERT_TIERUP_SUBSTEPS is ignored when not in tierup phase', () => {
    const state: WizardState = { phase: 'xp', currentStep: 0 }
    const result = wizardReducer(state, { type: 'INSERT_TIERUP_SUBSTEPS', entries: [], afterIndex: 0 })
    expect(result).toBe(state)
  })

  it('NEXT_TIERUP_STEP at last index returns state unchanged (upper bound guard)', () => {
    const queue = [makeTierUpEntry(), makeTierUpEntry({ unitId: 'u2' })]
    const state: WizardState = { phase: 'tierup', tierUpQueue: queue, tierUpStep: 1 }
    expect(wizardReducer(state, { type: 'NEXT_TIERUP_STEP' })).toBe(state)
  })
})

// ---------------------------------------------------------------------------
// COMPLETE
// ---------------------------------------------------------------------------

describe('wizardReducer — COMPLETE', () => {
  it('transitions to complete from any phase', () => {
    const xpState: WizardState = { phase: 'xp', currentStep: 0 }
    expect(wizardReducer(xpState, { type: 'COMPLETE' })).toEqual({ phase: 'complete' })

    const consState: WizardState = { phase: 'consequences', consequenceIndex: 1 }
    expect(wizardReducer(consState, { type: 'COMPLETE' })).toEqual({ phase: 'complete' })
  })
})

// ---------------------------------------------------------------------------
// Guards against phase: 'complete'
// ---------------------------------------------------------------------------

describe('wizardReducer — complete phase guards', () => {
  const completeState: WizardState = { phase: 'complete' }

  it('BACK_TO_XP from complete returns state unchanged', () => {
    expect(wizardReducer(completeState, { type: 'BACK_TO_XP', step: 0 })).toBe(completeState)
  })

  it('BACK_TO_CONSEQUENCES from complete returns state unchanged', () => {
    expect(wizardReducer(completeState, { type: 'BACK_TO_CONSEQUENCES', consequenceIndex: 0 })).toBe(completeState)
  })

  it('ENTER_CONSEQUENCES from complete returns state unchanged', () => {
    expect(wizardReducer(completeState, { type: 'ENTER_CONSEQUENCES', startIndex: 0 })).toBe(completeState)
  })
})
