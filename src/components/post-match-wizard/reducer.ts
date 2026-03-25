// Campaign TOW — PostMatchWizard reducer
// Lightweight phase-transition reducer (phase navigation only).
// UI state (checkedConditions, isSubmitting, error, etc.) is managed locally
// by each phase component via useState.

import type { TierUpQueueEntry } from './types'

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export type WizardState =
  | { phase: 'xp'; currentStep: number }
  | { phase: 'consequences'; consequenceIndex: number }
  | { phase: 'tierup'; tierUpQueue: TierUpQueueEntry[]; tierUpStep: number }
  | { phase: 'complete' }

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type WizardAction =
  | { type: 'NEXT_XP_STEP' }
  | { type: 'PREV_XP_STEP' }
  | { type: 'ENTER_CONSEQUENCES'; startIndex: number }
  | { type: 'NEXT_CONSEQUENCE' }
  | { type: 'PREV_CONSEQUENCE' }
  | { type: 'BACK_TO_XP'; step: number }
  | { type: 'ENTER_TIERUP'; queue: TierUpQueueEntry[] }
  | { type: 'NEXT_TIERUP_STEP' }
  | { type: 'PREV_TIERUP_STEP' }
  | { type: 'BACK_TO_CONSEQUENCES'; consequenceIndex: number }
  | { type: 'INSERT_TIERUP_SUBSTEPS'; entries: TierUpQueueEntry[]; afterIndex: number }
  | { type: 'COMPLETE' }

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'NEXT_XP_STEP': {
      if (state.phase !== 'xp') return state
      return { phase: 'xp', currentStep: state.currentStep + 1 }
    }

    case 'PREV_XP_STEP': {
      if (state.phase !== 'xp') return state
      return { phase: 'xp', currentStep: Math.max(0, state.currentStep - 1) }
    }

    case 'ENTER_CONSEQUENCES': {
      if (state.phase === 'complete') return state
      return { phase: 'consequences', consequenceIndex: action.startIndex }
    }

    case 'NEXT_CONSEQUENCE': {
      if (state.phase !== 'consequences') return state
      return { phase: 'consequences', consequenceIndex: state.consequenceIndex + 1 }
    }

    case 'PREV_CONSEQUENCE': {
      if (state.phase !== 'consequences') return state
      return { phase: 'consequences', consequenceIndex: Math.max(0, state.consequenceIndex - 1) }
    }

    case 'BACK_TO_XP': {
      if (state.phase === 'complete') return state
      return { phase: 'xp', currentStep: action.step }
    }

    case 'ENTER_TIERUP': {
      if (action.queue.length === 0) {
        return { phase: 'complete' }
      }
      return { phase: 'tierup', tierUpQueue: action.queue, tierUpStep: 0 }
    }

    case 'NEXT_TIERUP_STEP': {
      if (state.phase !== 'tierup') return state
      if (state.tierUpStep >= state.tierUpQueue.length - 1) return state
      return { phase: 'tierup', tierUpQueue: state.tierUpQueue, tierUpStep: state.tierUpStep + 1 }
    }

    case 'PREV_TIERUP_STEP': {
      if (state.phase !== 'tierup') return state
      return { phase: 'tierup', tierUpQueue: state.tierUpQueue, tierUpStep: Math.max(0, state.tierUpStep - 1) }
    }

    case 'BACK_TO_CONSEQUENCES': {
      if (state.phase === 'complete') return state
      return { phase: 'consequences', consequenceIndex: action.consequenceIndex }
    }

    case 'INSERT_TIERUP_SUBSTEPS': {
      if (state.phase !== 'tierup') return state
      const newQueue = [...state.tierUpQueue]
      newQueue.splice(action.afterIndex + 1, 0, ...action.entries)
      return { phase: 'tierup', tierUpQueue: newQueue, tierUpStep: state.tierUpStep }
    }

    case 'COMPLETE': {
      return { phase: 'complete' }
    }

    default: {
      // Exhaustiveness check — TypeScript will catch missing cases
      action satisfies never
      return state
    }
  }
}

// ---------------------------------------------------------------------------
// Initial state factory
// ---------------------------------------------------------------------------

export function initialWizardState(): WizardState {
  return { phase: 'xp', currentStep: 0 }
}
