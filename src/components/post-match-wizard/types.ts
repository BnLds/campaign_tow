// Campaign TOW — PostMatchWizard shared types
// Extracted from post-match-wizard.tsx during refactor (2026-03-25)

import type { ThresholdEntry } from '../../lib/constants'
import type { ServerResult } from '../../lib/types'
import type { ConsequenceEntry } from '../../lib/validators'
import type { InjuryResult } from '../injury-bonus-step'
import type { DestructionResult } from '../unit-destruction-step'
import type { InitialConsequenceItem } from '../initial-consequence-step'

// ---------------------------------------------------------------------------
// Re-exports for consumers
// ---------------------------------------------------------------------------

export type { InjuryResult, DestructionResult, InitialConsequenceItem, ConsequenceEntry, ServerResult }

// ---------------------------------------------------------------------------
// Wizard-internal types
// ---------------------------------------------------------------------------

export type ExtendedDestructionResult = DestructionResult & { xpLostAmount?: number }

export type TierUpQueueEntry = ThresholdEntry & {
  unitId: string
  unitName: string
  unitNickname?: string | null
  unitType: string
  hasMount: boolean  // defaults to false when not provided
  commandement: number  // current CD value for constraint checks
  honourKind?: 'new' | 'recovery'
}

export type FlaggedUnit = {
  id: string
  name: string
  type: string
  existingGains: Array<{ description: string; type: string }>
  clearedHonours?: string[]
}

export type WizardUnit = {
  id: string
  name: string
  nickname?: string | null
  type: string
  xp: number
  previousXpGained?: number | null
  previousDerouteXpLost?: number | null
  hasMount?: boolean
  existingGains?: Array<{ description: string; type: string }>
  clearedHonours?: string[]
  commandement?: number
  effectiveStats?: Record<string, number | null>
}

// ---------------------------------------------------------------------------
// PostMatchWizardProps — public API (identical shape to original)
// ---------------------------------------------------------------------------

export type PostMatchWizardProps = {
  matchId: string
  matchParticipantId: string
  /** Pseudo du joueur adverse — used for Haine/Rancune descriptions */
  opponentPlayerName?: string
  /** 'post-match' (default): checkbox XP conditions. 'initial-xp': direct numeric input 0-999. */
  mode?: 'post-match' | 'initial-xp'
  units: WizardUnit[]
  onComplete: () => void
  onCancel: () => void
  /** Optional: inject custom submit function (for testing). Defaults to submitUnitXpFn. */
  onSubmitUnitXp?: (unitId: string, xpGained: number, matchParticipantId: string, derouteXpLost?: number, bonusXp?: number) => Promise<ServerResult<{ unitId: string; newXp: number }>>
  /** Batch commit: completes evolutions with all accumulated gains and consequences. Called once at the end.
   *  gains=[] and consequences=[] for the no-tierup, no-consequence path. */
  onCompleteEvolutions?: (matchId: string, matchParticipantId: string, gains: Array<{ unitId: string; descriptions: string[] }>, consequences?: ConsequenceEntry[], championKilledIds?: string[]) => Promise<ServerResult<{ matchId: string }>>
  /** Campaign players (excluding current player) — for Haine/Rancune picker in initial-xp mode */
  campaignPlayers?: Array<{ playerId: string; playerDisplayName: string }>
  catchupBonusXp?: number
  catchupDeltaXp?: number
}

// ---------------------------------------------------------------------------
// WizardAccumulator — mutable cross-step accumulation state (lives in a ref)
// ---------------------------------------------------------------------------

export type WizardAccumulator = {
  submittedUnits: Set<string>
  xpResults: Map<string, { oldXp: number; newXp: number }>
  consequenceFlags: Map<string, boolean>
  championFlags: Map<string, boolean>
  pendingConsequences: Map<string, InjuryResult | ExtendedDestructionResult>
  pendingGains: Map<string, Array<{ descriptions: string[]; thresholdXp: number | null }>>
  cumulativeGains: Map<string, string[]>
  cumulativeHonourSelections: Map<string, Set<string>>
  flaggedUnits: FlaggedUnit[]
  submittedXpByStep: Map<number, Set<string>>
  submittedTierUpsByStep: Map<number, string[]>

  // Methods
  recordXp(unitId: string, oldXp: number, newXp: number): void
  recordConsequence(unitId: string, result: InjuryResult | ExtendedDestructionResult): void
  recordTierUp(step: number, tierUpEntry: TierUpQueueEntry, descriptions: string[]): void
  rollbackTierUp(step: number, prevEntry: TierUpQueueEntry): void
  setFlaggedUnits(units: FlaggedUnit[]): void
}
