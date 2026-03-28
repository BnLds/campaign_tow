// Campaign TOW — PostMatchWizard custom hook (stateful logic)

import { useState, useReducer, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { computeXpTotal } from '../../lib/xp-conditions'
import type {
  PostMatchWizardProps,
  WizardUnit,
  FlaggedUnit,
  TierUpQueueEntry,
  ConsequenceEntry,
  InjuryResult,
  DestructionResult,
  InitialConsequenceItem,
} from './types'
import { wizardReducer, initialWizardState } from './reducer'
import type { XpData } from './phase-xp'
import {
  buildConsequencesArray,
  buildChampionKilledIds,
  buildTierUpQueue,
  buildBatchGainsPayload,
  buildFlaggedUnits,
} from './helpers'
import { submitUnitXpAction, completeEvolutionsAction } from './server-actions'
import type { SubmitUnitXpParams, CompleteEvolutionsParams } from './server-actions'
import { createWizardAccumulator } from './wizard-accumulator'

// ---------------------------------------------------------------------------
// Return types (discriminated union by phase)
// ---------------------------------------------------------------------------

type EmptyPhaseResult = {
  phase: 'empty'
  props: { onRetour: () => Promise<void>; isSubmitting: boolean; error: string | null }
}
type XpPhaseResult = {
  phase: 'xp'
  completeError: string | null
  props: {
    key: number
    unit: WizardUnit
    currentStep: number
    total: number
    mode: 'post-match' | 'initial-xp'
    catchupBonusXp?: number
    catchupDeltaXp?: number
    savedCheckedConditions?: Set<string>
    savedConsequenceChecked?: boolean
    savedChampionKilledChecked?: boolean
    initialConsequences?: InitialConsequenceItem[]
    campaignPlayers?: Array<{ playerId: string; playerDisplayName: string }>
    onAddInitialConsequence?: (entry: ConsequenceEntry) => void
    onRemoveInitialConsequence?: (localId: number) => void
    onConsequenceChange?: (unitId: string, checked: boolean) => void
    onChampionKilledChange?: (unitId: string, checked: boolean) => void
    onNext: (xpData: XpData) => Promise<void>
    onBack?: () => void
    onCancel: () => void
  }
}
type ConsequencePhaseResult = {
  phase: 'consequences'
  consequenceError: string | null
  props: {
    key: number
    flaggedUnit: FlaggedUnit
    onConfirm: (result: InjuryResult | DestructionResult) => void
    onBack: () => void
    onCancel: () => void
  }
}
type TierUpPhaseResult = {
  phase: 'tierup'
  completeError: string | null
  props: {
    key: number
    currentTierUp: TierUpQueueEntry
    tierUpStep: number
    totalTierUps: number
    isLastStep: boolean
    units: WizardUnit[]
    cumulativeHonourSelections: Map<string, Set<string>>
    cumulativeGains: Map<string, string[]>
    onConfirm: (result: { descriptions: string[] }) => Promise<void>
    onBack: () => void
    onCancel: () => void
  }
}
type CompletePhaseResult = { phase: 'complete' }

export type UsePostMatchWizardReturn =
  | EmptyPhaseResult
  | XpPhaseResult
  | ConsequencePhaseResult
  | TierUpPhaseResult
  | CompletePhaseResult

// ---------------------------------------------------------------------------
// usePostMatchWizard hook
// ---------------------------------------------------------------------------

export function usePostMatchWizard({
  matchId,
  matchParticipantId,
  opponentPlayerName = 'Adversaire',
  mode = 'post-match',
  units,
  onComplete,
  onCancel,
  onSubmitUnitXp,
  onCompleteEvolutions,
  campaignPlayers,
  catchupBonusXp,
  catchupDeltaXp,
}: PostMatchWizardProps): UsePostMatchWizardReturn {
  // ---------------------------------------------------------------------------
  // Phase reducer (phase navigation only)
  // ---------------------------------------------------------------------------
  const [wizardState, wizardDispatch] = useReducer(wizardReducer, undefined, initialWizardState)

  // ---------------------------------------------------------------------------
  // Cross-step accumulation state (cannot be in PhaseXp — resets on key change)
  // ---------------------------------------------------------------------------
  const [initialConsequences, setInitialConsequences] = useState<InitialConsequenceItem[]>([])
  const initialConsequencesRef = useRef<InitialConsequenceItem[]>([])
  const nextLocalIdRef = useRef(0)

  // ---------------------------------------------------------------------------
  // WizardAccumulator — single ref holding all cross-step mutable data
  // ---------------------------------------------------------------------------
  const acc = useRef(createWizardAccumulator())

  // ---------------------------------------------------------------------------
  // Synchronous double-click guard
  // ---------------------------------------------------------------------------
  const busyRef = useRef(false)

  // Stable ref for onComplete — avoids re-triggering useEffect if parent
  // passes an unstable callback identity (F1 adversarial review fix)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  const submitXpMutation = useMutation({
    mutationFn: async (params: SubmitUnitXpParams) => {
      const result = await submitUnitXpAction(params)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
  })

  const completeEvolutionsMutation = useMutation({
    mutationFn: async (params: CompleteEvolutionsParams) => {
      const result = await completeEvolutionsAction(params)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
  })

  // Derived busy guard — covers both synchronous double-click and in-flight mutations
  const isBusy = busyRef.current || submitXpMutation.isPending || completeEvolutionsMutation.isPending

  // ---------------------------------------------------------------------------
  // complete phase side-effect: detect phase === 'complete' after dispatch
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (wizardState.phase === 'complete') {
      onCompleteRef.current()
    }
  }, [wizardState.phase])

  // ---------------------------------------------------------------------------
  // Helper — transition from end of Phase 1.5 (or Phase 1 when no consequences)
  //          to Phase 2 (tier-ups) or direct completion
  // ---------------------------------------------------------------------------

  const transitionToPhase2OrComplete = async () => {
    // AC12 invariant: all units with deroute consequences must have xpResults updated
    for (const [unitId, consequence] of acc.current.pendingConsequences) {
      if (consequence.type === 'deroute_sanglante') {
        if (!acc.current.xpResults.has(unitId)) {
          throw new Error(`[PostMatchWizard] AC12 invariant violated: unit ${unitId} has deroute consequence but xpResults was not updated`)
        }
      }
    }

    const queue = buildTierUpQueue(units, acc.current.xpResults)

    if (queue.length === 0) {
      // No tier crossings — batch commit with empty gains + consequences
      const consequences = buildConsequencesArray(acc.current.pendingConsequences, initialConsequencesRef.current, opponentPlayerName)
      const championKilledIds = buildChampionKilledIds(acc.current.championFlags)
      completeEvolutionsMutation.reset()
      await completeEvolutionsMutation.mutateAsync({
        matchId, matchParticipantId, gains: [], consequences, championKilledIds,
        onCompleteEvolutions,
      })
      // Transition out of Phase 1.5 before onComplete() so consequence steps are no longer rendered
      acc.current.setFlaggedUnits([])
      // Signal completion — useEffect above calls onComplete()
      wizardDispatch({ type: 'COMPLETE' })
    } else {
      // Tier crossings exist — transition to Phase 2
      wizardDispatch({ type: 'ENTER_TIERUP', queue })
    }
  }

  // ---------------------------------------------------------------------------
  // Phase 1: XP entry handler
  // ---------------------------------------------------------------------------

  const handleNext = async (xpData: XpData, currentUnit: WizardUnit, currentStep: number, isLastXpStep: boolean): Promise<void> => {
    if (isBusy) return
    busyRef.current = true

    try {
      const { checkedConditions, numericXpValue, bonusXp, isConsequenceChecked, isChampionKilledChecked } = xpData

      // Sync consequence/champion flags to accumulator
      acc.current.consequenceFlags.set(currentUnit.id, isConsequenceChecked)
      acc.current.championFlags.set(currentUnit.id, isChampionKilledChecked)

      const alreadySubmitted = acc.current.submittedUnits.has(currentUnit.id)

      let newXp: number | null = null

      if (!alreadySubmitted) {
        const xpGained = computeXpTotal(checkedConditions, currentUnit.type)
        const xpToSubmit = mode === 'initial-xp' ? Math.max(0, Math.floor(numericXpValue)) : Math.floor(xpGained) + bonusXp
        submitXpMutation.reset()
        const data = await submitXpMutation.mutateAsync({
          unitId: currentUnit.id, xpGained: xpToSubmit, matchParticipantId,
          bonusXp, onSubmitUnitXp,
        })

        newXp = data.newXp
      }

      // Store XP result for tier crossing detection
      const preMatchXp = mode === 'initial-xp' ? 0 : (currentUnit.xp - (currentUnit.previousXpGained ?? 0) + (currentUnit.previousDerouteXpLost ?? 0))
      if (newXp !== null) {
        acc.current.recordXp(currentUnit.id, preMatchXp, newXp)
      } else {
        // Unit was already submitted — keep previous result (don't overwrite)
        if (!acc.current.xpResults.has(currentUnit.id)) {
          // Fallback: use current xp as newXp (no change), but still use pre-match oldXp
          acc.current.recordXp(currentUnit.id, preMatchXp, currentUnit.xp)
        }
      }

      if (isLastXpStep) {
        // Save last step's checked conditions (for back-nav from Phase 1.5)
        acc.current.submittedXpByStep.set(currentStep, new Set(checkedConditions))
        // initial-xp: skip Phase 1.5 unconditionally — consequences collected inline during Phase 1
        if (mode === 'initial-xp') {
          await transitionToPhase2OrComplete()
          return
        }
        // Compute flagged units for Phase 1.5
        acc.current.setFlaggedUnits(buildFlaggedUnits(units, acc.current.consequenceFlags))

        if (acc.current.flaggedUnits.length > 0) {
          wizardDispatch({ type: 'ENTER_CONSEQUENCES', startIndex: 0 })
        } else {
          await transitionToPhase2OrComplete()
        }
      } else {
        // Record the checked conditions for this step (for back-button pre-fill)
        acc.current.submittedXpByStep.set(currentStep, new Set(checkedConditions))
        wizardDispatch({ type: 'NEXT_XP_STEP' })
      }
    } finally {
      busyRef.current = false
    }
  }

  // ---------------------------------------------------------------------------
  // Phase 1.5: Consequence handling
  // ---------------------------------------------------------------------------

  const handleConsequenceConfirm = async (result: InjuryResult | DestructionResult): Promise<void> => {
    if (isBusy) return
    busyRef.current = true

    try {
      if (wizardState.phase !== 'consequences') {
        return
      }
      const { consequenceIndex } = wizardState
      const currentFlaggedUnit = acc.current.flaggedUnits[consequenceIndex]
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!currentFlaggedUnit) {
        return
      }

      if (result.type === 'miracule' || result.type === 'fureur_vengeresse') {
        const xpEntry = acc.current.xpResults.get(currentFlaggedUnit.id)
        if (xpEntry) {
          const currentXpGained = xpEntry.newXp - xpEntry.oldXp
          const newXpGained = currentXpGained + 2
          submitXpMutation.reset()
          const data = await submitXpMutation.mutateAsync({
            unitId: currentFlaggedUnit.id, xpGained: newXpGained, matchParticipantId,
            onSubmitUnitXp,
          })
          acc.current.recordXp(currentFlaggedUnit.id, xpEntry.oldXp, data.newXp)
        }
        acc.current.recordConsequence(currentFlaggedUnit.id, result)
      } else if (result.type === 'deroute_sanglante') {
        const xpEntry = acc.current.xpResults.get(currentFlaggedUnit.id)
        if (xpEntry) {
          const { calculateTier } = await import('../../lib/tier')
          const { DEROUTE_XP_LOSS } = await import('../../lib/constants')
          const tier = calculateTier(xpEntry.newXp, currentFlaggedUnit.type)
          const tierLoss = DEROUTE_XP_LOSS[tier]
          const originalXpGained = xpEntry.newXp - xpEntry.oldXp
          submitXpMutation.reset()
          const data = await submitXpMutation.mutateAsync({
            unitId: currentFlaggedUnit.id, xpGained: originalXpGained, matchParticipantId,
            derouteXpLost: tierLoss, onSubmitUnitXp,
          })
          acc.current.recordXp(currentFlaggedUnit.id, xpEntry.oldXp, data.newXp)
          acc.current.recordConsequence(currentFlaggedUnit.id, { ...result, xpLostAmount: tierLoss })
        } else {
          acc.current.recordConsequence(currentFlaggedUnit.id, result)
        }
      } else {
        acc.current.recordConsequence(currentFlaggedUnit.id, result)
      }

      const nextIndex = consequenceIndex + 1
      if (nextIndex < acc.current.flaggedUnits.length) {
        wizardDispatch({ type: 'NEXT_CONSEQUENCE' })
      } else {
        // transitionToPhase2OrComplete does not manage busyRef
        await transitionToPhase2OrComplete()
      }
    } finally {
      busyRef.current = false
    }
  }

  const handleConsequenceBack = () => {
    if (wizardState.phase !== 'consequences') return
    const { consequenceIndex } = wizardState
    if (consequenceIndex > 0) {
      wizardDispatch({ type: 'PREV_CONSEQUENCE' })
    } else {
      // Back to Phase 1 last XP step — clear last unit's XP result so it can be re-submitted
      const lastUnitId = units[units.length - 1]?.id
      if (lastUnitId) {
        acc.current.xpResults.delete(lastUnitId)
        acc.current.submittedUnits.delete(lastUnitId)
      }
      wizardDispatch({ type: 'BACK_TO_XP', step: units.length - 1 })
    }
  }

  // ---------------------------------------------------------------------------
  // Phase 2: Tier-up flow
  // ---------------------------------------------------------------------------

  const handleTierUpConfirm = async (result: { descriptions: string[] }): Promise<void> => {
    if (wizardState.phase !== 'tierup') return
    if (isBusy) return
    busyRef.current = true

    try {
      const { tierUpQueue, tierUpStep } = wizardState
      const currentTierUp = tierUpQueue[tierUpStep]

      const has2MinChoice = result.descriptions.includes('2 améliorations mineures')

      // Use accumulator to record this tier-up (handles pendingGains, cumulativeGains, honourSelections)
      acc.current.recordTierUp(tierUpStep, currentTierUp, result.descriptions)

      // If "2 améliorations mineures" was chosen, insert 2 sequential minor-pick sub-steps
      if (has2MinChoice) {
        const { CHARACTER_MINOR_IMPROVEMENTS } = await import('../../lib/constants')
        const subSteps: TierUpQueueEntry[] = [1, 2].map((n) => ({
          xp: currentTierUp.xp,
          tierLabel: `${currentTierUp.tierLabel} — Mineure ${n}/2`,
          majorImprovements: [],
          minorImprovements: CHARACTER_MINOR_IMPROVEMENTS.map((imp, idx) => ({
            ...imp,
            id: `${imp.id}-sub${tierUpStep}-${n}-${idx}`,
          })),
          majorCount: 0,
          minorCount: 1,
          unitId: currentTierUp.unitId,
          unitName: currentTierUp.unitName,
          unitNickname: currentTierUp.unitNickname,
          unitType: currentTierUp.unitType,
          hasMount: currentTierUp.hasMount,
          commandement: currentTierUp.commandement,
        }))
        wizardDispatch({ type: 'INSERT_TIERUP_SUBSTEPS', entries: subSteps, afterIndex: tierUpStep })
      }

      const effectiveQueueLength = has2MinChoice ? tierUpQueue.length + 2 : tierUpQueue.length
      const isLastTierUpStep = tierUpStep === effectiveQueueLength - 1

      if (isLastTierUpStep) {
        // All tier-ups done — batch commit all gains + consequences
        const gains = buildBatchGainsPayload(acc.current.pendingGains)
        const consequences = buildConsequencesArray(acc.current.pendingConsequences, initialConsequencesRef.current, opponentPlayerName)
        const championKilledIds = buildChampionKilledIds(acc.current.championFlags)

        completeEvolutionsMutation.reset()
        await completeEvolutionsMutation.mutateAsync({
          matchId, matchParticipantId, gains, consequences, championKilledIds,
          onCompleteEvolutions,
        })
        // Dispatch COMPLETE so onComplete() fires consistently via useEffect
        wizardDispatch({ type: 'COMPLETE' })
      } else {
        wizardDispatch({ type: 'NEXT_TIERUP_STEP' })
      }
    } finally {
      busyRef.current = false
    }
  }

  const handleTierUpBack = () => {
    if (wizardState.phase !== 'tierup') return
    const { tierUpQueue, tierUpStep } = wizardState

    if (tierUpStep > 0) {
      const prevStep = tierUpStep - 1
      const prevEntry = tierUpQueue[prevStep]
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (prevEntry) {
        acc.current.rollbackTierUp(prevStep, prevEntry)
      }
      wizardDispatch({ type: 'PREV_TIERUP_STEP' })
    } else {
      // AC: Risk 9 — if Phase 1.5 was present, return there; otherwise return to Phase 1
      if (acc.current.flaggedUnits.length > 0) {
        wizardDispatch({ type: 'BACK_TO_CONSEQUENCES', consequenceIndex: acc.current.flaggedUnits.length - 1 })
      } else {
        const lastUnitId = units[units.length - 1]?.id
        if (lastUnitId) {
          acc.current.xpResults.delete(lastUnitId)
          acc.current.submittedUnits.delete(lastUnitId)
        }
        wizardDispatch({ type: 'BACK_TO_XP', step: units.length - 1 })
      }
    }
  }

  // ---------------------------------------------------------------------------
  // initial-xp consequence callbacks (orchestrator-owned state)
  // ---------------------------------------------------------------------------

  const handleAddInitialConsequence = (entry: ConsequenceEntry) => {
    const newItem = { ...entry, _localId: nextLocalIdRef.current++ }
    initialConsequencesRef.current = [...initialConsequencesRef.current, newItem]
    setInitialConsequences(initialConsequencesRef.current)
  }

  const handleRemoveInitialConsequence = (localId: number) => {
    initialConsequencesRef.current = initialConsequencesRef.current.filter((c) => c._localId !== localId)
    setInitialConsequences(initialConsequencesRef.current)
  }

  // ---------------------------------------------------------------------------
  // handleXpBack — extracted named function (captures accumulator)
  // ---------------------------------------------------------------------------

  const handleXpBack = () => {
    if (wizardState.phase !== 'xp') return
    const prevStep = wizardState.currentStep - 1
    const prevUnitId = units[prevStep]?.id
    if (prevUnitId) {
      acc.current.submittedUnits.delete(prevUnitId)
      // also clear xpResults entry to avoid stale data
      acc.current.xpResults.delete(prevUnitId)
    }
    wizardDispatch({ type: 'PREV_XP_STEP' })
  }

  // ---------------------------------------------------------------------------
  // handleEmptyRetour
  // ---------------------------------------------------------------------------

  const handleEmptyRetour = async () => {
    if (isBusy) return
    busyRef.current = true
    try {
      completeEvolutionsMutation.reset()
      await completeEvolutionsMutation.mutateAsync({ matchId, matchParticipantId, gains: [], onCompleteEvolutions })
      wizardDispatch({ type: 'COMPLETE' })
    } catch {
      // Error is stored in completeEvolutionsMutation.error — swallow to prevent
      // unhandled rejection (component reads error from mutation state)
    } finally {
      busyRef.current = false
    }
  }

  // ---------------------------------------------------------------------------
  // Return — discriminated union by phase
  // ---------------------------------------------------------------------------

  if (units.length === 0) {
    return {
      phase: 'empty',
      props: {
        onRetour: handleEmptyRetour,
        isSubmitting: completeEvolutionsMutation.isPending,
        error: completeEvolutionsMutation.error?.message ?? null,
      },
    }
  }

  if (wizardState.phase === 'tierup') {
    const { tierUpQueue, tierUpStep } = wizardState
    const currentTierUp = tierUpQueue[tierUpStep]
    // H3 — defensive guard: queue/step could be in intermediate state during React batching
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!currentTierUp) return { phase: 'complete' }

    const isLastStep = tierUpStep === tierUpQueue.length - 1
    const totalTierUps = tierUpQueue.length

    // Deep copy for constraint display — PhaseTierUp receives snapshots, not live refs
    const cumulativeHonourSelections = new Map(
      [...acc.current.cumulativeHonourSelections].map(([k, v]) => [k, new Set(v)])
    )
    const cumulativeGains = new Map(
      [...acc.current.cumulativeGains].map(([k, v]) => [k, [...v]])
    )

    return {
      phase: 'tierup',
      completeError: completeEvolutionsMutation.error?.message ?? null,
      props: {
        key: tierUpStep,
        currentTierUp,
        tierUpStep,
        totalTierUps,
        isLastStep,
        units,
        cumulativeHonourSelections,
        cumulativeGains,
        onConfirm: (result) => handleTierUpConfirm(result),
        onBack: handleTierUpBack,
        onCancel,
      },
    }
  }

  if (wizardState.phase === 'consequences') {
    const { consequenceIndex } = wizardState
    const currentFlaggedUnit = acc.current.flaggedUnits[consequenceIndex]
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!currentFlaggedUnit) return { phase: 'complete' }

    return {
      phase: 'consequences',
      consequenceError: submitXpMutation.error?.message ?? completeEvolutionsMutation.error?.message ?? null,
      props: {
        key: consequenceIndex,
        flaggedUnit: currentFlaggedUnit,
        onConfirm: (result) => {
          handleConsequenceConfirm(result).catch((err: unknown) => {
            console.error('[PostMatchWizard] consequence confirm error:', err)
          })
        },
        onBack: handleConsequenceBack,
        onCancel,
      },
    }
  }

  if (wizardState.phase === 'complete') {
    return { phase: 'complete' }
  }

  // Phase 'xp' (default)
  const { currentStep } = wizardState
  const currentUnit = units[currentStep]
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive: step could exceed array bounds during React batching
  if (!currentUnit) return { phase: 'complete' }

  const isLastXpStep = currentStep === units.length - 1

  const savedCheckedConditions = acc.current.submittedXpByStep.get(currentStep)
  const savedConsequenceChecked = acc.current.consequenceFlags.get(currentUnit.id) ?? false
  const savedChampionKilledChecked = acc.current.championFlags.get(currentUnit.id) ?? false

  return {
    phase: 'xp',
    completeError: completeEvolutionsMutation.error?.message ?? null,
    props: {
      key: currentStep,
      unit: currentUnit,
      currentStep,
      total: units.length,
      mode,
      catchupBonusXp,
      catchupDeltaXp,
      savedCheckedConditions,
      savedConsequenceChecked,
      savedChampionKilledChecked,
      initialConsequences,
      campaignPlayers,
      onAddInitialConsequence: handleAddInitialConsequence,
      onRemoveInitialConsequence: handleRemoveInitialConsequence,
      onConsequenceChange: (unitId, checked) => acc.current.consequenceFlags.set(unitId, checked),
      onChampionKilledChange: (unitId, checked) => acc.current.championFlags.set(unitId, checked),
      onNext: (xpData) => handleNext(xpData, currentUnit, currentStep, isLastXpStep),
      onBack: currentStep > 0 ? handleXpBack : undefined,
      onCancel,
    },
  }
}
