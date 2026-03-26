// Campaign TOW — PostMatchWizard custom hook (stateful logic)

import { useState, useReducer, useRef, useEffect } from 'react'
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

// ---------------------------------------------------------------------------
// Return types (discriminated union by phase)
// ---------------------------------------------------------------------------

type EmptyPhaseResult = {
  phase: 'empty'
  props: { onRetour: () => Promise<void>; isSubmitting: boolean; error: string | null }
}
type XpPhaseResult = {
  phase: 'xp'
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
// Private helper — rollback a single tier-up step
// ---------------------------------------------------------------------------

function rollbackTierUpStep(
  prevEntry: TierUpQueueEntry,
  prevSelections: string[],
  pendingGains: Map<string, Array<{ descriptions: string[]; thresholdXp: number | null }>>,
  cumulativeGains: Map<string, string[]>,
  cumulativeHonourSelections: Map<string, Set<string>>,
): void {
  const descriptionsToRemove = prevSelections.filter((d) => d !== '2 améliorations mineures')

  // Remove from pendingGains
  const pendingGroups = pendingGains.get(prevEntry.unitId)
  if (pendingGroups) {
    const updatedGroups = pendingGroups
      .map((group) => {
        if (group.thresholdXp !== prevEntry.xp) return group
        const updatedDescs = [...group.descriptions]
        for (const desc of descriptionsToRemove) {
          const idx = updatedDescs.indexOf(desc)
          if (idx !== -1) updatedDescs.splice(idx, 1)
        }
        return { ...group, descriptions: updatedDescs }
      })
      .filter((group) => group.descriptions.length > 0)
    if (updatedGroups.length > 0) {
      pendingGains.set(prevEntry.unitId, updatedGroups)
    } else {
      pendingGains.delete(prevEntry.unitId)
    }
  }

  // Remove from cumulativeGains
  const cumGains = cumulativeGains.get(prevEntry.unitId)
  if (cumGains) {
    const updated = [...cumGains]
    for (const desc of descriptionsToRemove) {
      const idx = updated.indexOf(desc)
      if (idx !== -1) updated.splice(idx, 1)
    }
    cumulativeGains.set(prevEntry.unitId, updated)
  }

  // Remove from cumulativeHonourSelections
  if (prevEntry.tierLabel === 'Honneur de bataille') {
    const honours = cumulativeHonourSelections.get(prevEntry.unitId)
    if (honours) {
      for (const d of prevSelections) honours.delete(d)
    }
  }
}

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
  // Empty-army UI state (only used when units.length === 0)
  // ---------------------------------------------------------------------------
  const [emptyIsSubmitting, setEmptyIsSubmitting] = useState(false)
  const [emptyError, setEmptyError] = useState<string | null>(null)

  // ---------------------------------------------------------------------------
  // Consequence error state (Phase 1.5 async error display)
  // ---------------------------------------------------------------------------
  const [consequenceError, setConsequenceError] = useState<string | null>(null)

  // ---------------------------------------------------------------------------
  // Refs — server-call guards and cross-phase data
  // ---------------------------------------------------------------------------
  const submittingRef = useRef(false)
  const submittedUnitsRef = useRef<Set<string>>(new Set())
  const xpResultsRef = useRef<Map<string, { oldXp: number; newXp: number }>>(new Map())
  const pendingConsequencesRef = useRef<Map<string, InjuryResult | (DestructionResult & { xpLostAmount?: number })>>(new Map())
  const pendingGainsRef = useRef<Map<string, Array<{ descriptions: string[]; thresholdXp: number | null }>>>(new Map())
  const cumulativeGainsRef = useRef<Map<string, string[]>>(new Map())
  const cumulativeHonourSelectionsRef = useRef<Map<string, Set<string>>>(new Map())
  const submittedTierUpsByStepRef = useRef<Map<number, string[]>>(new Map())
  const submittedXpByStep = useRef<Map<number, Set<string>>>(new Map())
  const consequenceFlagsRef = useRef<Map<string, boolean>>(new Map())
  const championFlagsRef = useRef<Map<string, boolean>>(new Map())
  const flaggedUnitsRef = useRef<FlaggedUnit[]>([])

  // Stable ref for onComplete — avoids re-triggering useEffect if parent
  // passes an unstable callback identity (F1 adversarial review fix)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

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
    // AC12 invariant: all units with deroute consequences must have xpResultsRef updated
    for (const [unitId, consequence] of pendingConsequencesRef.current) {
      if (consequence.type === 'deroute_sanglante') {
        if (!xpResultsRef.current.has(unitId)) {
          throw new Error(`[PostMatchWizard] AC12 invariant violated: unit ${unitId} has deroute consequence but xpResultsRef was not updated`)
        }
      }
    }

    const queue = buildTierUpQueue(units, xpResultsRef.current)

    if (queue.length === 0) {
      // No tier crossings — batch commit with empty gains + consequences
      const consequences = buildConsequencesArray(pendingConsequencesRef.current, initialConsequencesRef.current, opponentPlayerName)
      const championKilledIds = buildChampionKilledIds(championFlagsRef.current)
      try {
        const completeResult = await completeEvolutionsAction({
          matchId, matchParticipantId, gains: [], consequences, championKilledIds,
          onCompleteEvolutions,
        })
        if (!completeResult.success) {
          throw new Error(completeResult.error.message)
        }
      } finally {
        submittingRef.current = false
      }
      // Transition out of Phase 1.5 before onComplete() so consequence steps are no longer rendered
      flaggedUnitsRef.current = []
      // Signal completion — useEffect above calls onComplete()
      wizardDispatch({ type: 'COMPLETE' })
    } else {
      // Tier crossings exist — transition to Phase 2
      submittingRef.current = false
      wizardDispatch({ type: 'ENTER_TIERUP', queue })
    }
  }

  // ---------------------------------------------------------------------------
  // Phase 1: XP entry handler
  // ---------------------------------------------------------------------------

  const handleNext = async (xpData: XpData, currentUnit: WizardUnit, currentStep: number, isLastXpStep: boolean): Promise<void> => {
    if (submittingRef.current) return
    submittingRef.current = true

    const { checkedConditions, numericXpValue, bonusXp, isConsequenceChecked, isChampionKilledChecked } = xpData

    // Sync consequence/champion flags to refs
    consequenceFlagsRef.current.set(currentUnit.id, isConsequenceChecked)
    championFlagsRef.current.set(currentUnit.id, isChampionKilledChecked)

    const alreadySubmitted = submittedUnitsRef.current.has(currentUnit.id)

    let newXp: number | null = null

    if (!alreadySubmitted) {
      const xpGained = computeXpTotal(checkedConditions, currentUnit.type)
      const xpToSubmit = mode === 'initial-xp' ? Math.max(0, Math.floor(numericXpValue)) : Math.floor(xpGained) + bonusXp
      const submitResult = await submitUnitXpAction({
        unitId: currentUnit.id, xpGained: xpToSubmit, matchParticipantId,
        bonusXp, onSubmitUnitXp,
      })

      if (!submitResult.success) {
        submittingRef.current = false
        throw new Error(submitResult.error.message)
      }

      newXp = submitResult.data.newXp
      submittedUnitsRef.current.add(currentUnit.id)
    }

    // Store XP result for tier crossing detection
    const preMatchXp = mode === 'initial-xp' ? 0 : (currentUnit.xp - (currentUnit.previousXpGained ?? 0) + (currentUnit.previousDerouteXpLost ?? 0))
    if (newXp !== null) {
      xpResultsRef.current.set(currentUnit.id, { oldXp: preMatchXp, newXp })
    } else {
      // Unit was already submitted — keep previous result (don't overwrite)
      if (!xpResultsRef.current.has(currentUnit.id)) {
        // Fallback: use current xp as newXp (no change), but still use pre-match oldXp
        xpResultsRef.current.set(currentUnit.id, { oldXp: preMatchXp, newXp: currentUnit.xp })
      }
    }

    if (isLastXpStep) {
      // Save last step's checked conditions (for back-nav from Phase 1.5)
      submittedXpByStep.current.set(currentStep, new Set(checkedConditions))
      // initial-xp: skip Phase 1.5 unconditionally — consequences collected inline during Phase 1
      if (mode === 'initial-xp') {
        try {
          await transitionToPhase2OrComplete()
        } catch (err) {
          submittingRef.current = false
          throw err
        }
        return
      }
      // Compute flagged units for Phase 1.5
      flaggedUnitsRef.current = buildFlaggedUnits(units, consequenceFlagsRef.current)

      if (flaggedUnitsRef.current.length > 0) {
        submittingRef.current = false
        wizardDispatch({ type: 'ENTER_CONSEQUENCES', startIndex: 0 })
      } else {
        try {
          await transitionToPhase2OrComplete()
        } catch (err) {
          submittingRef.current = false
          throw err
        }
      }
    } else {
      // Record the checked conditions for this step (for back-button pre-fill)
      submittedXpByStep.current.set(currentStep, new Set(checkedConditions))
      submittingRef.current = false
      wizardDispatch({ type: 'NEXT_XP_STEP' })
    }
  }

  // ---------------------------------------------------------------------------
  // Phase 1.5: Consequence handling
  // ---------------------------------------------------------------------------

  const handleConsequenceConfirm = async (result: InjuryResult | DestructionResult): Promise<void> => {
    if (submittingRef.current) return
    submittingRef.current = true

    if (wizardState.phase !== 'consequences') {
      submittingRef.current = false
      return
    }
    const { consequenceIndex } = wizardState
    const currentFlaggedUnit = flaggedUnitsRef.current[consequenceIndex]
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!currentFlaggedUnit) {
      submittingRef.current = false
      return
    }

    try {
      if (result.type === 'miracule' || result.type === 'fureur_vengeresse') {
        const xpEntry = xpResultsRef.current.get(currentFlaggedUnit.id)
        if (xpEntry) {
          const currentXpGained = xpEntry.newXp - xpEntry.oldXp
          const newXpGained = currentXpGained + 2
          const submitResult = await submitUnitXpAction({
            unitId: currentFlaggedUnit.id, xpGained: newXpGained, matchParticipantId,
            onSubmitUnitXp,
          })
          if (submitResult.success) {
            xpResultsRef.current.set(currentFlaggedUnit.id, { oldXp: xpEntry.oldXp, newXp: submitResult.data.newXp })
          } else {
            throw new Error(submitResult.error?.message ?? 'Erreur de soumission XP')
          }
        }
        pendingConsequencesRef.current.set(currentFlaggedUnit.id, result)
      } else if (result.type === 'deroute_sanglante') {
        const xpEntry = xpResultsRef.current.get(currentFlaggedUnit.id)
        if (xpEntry) {
          const { calculateTier } = await import('../../lib/tier')
          const { DEROUTE_XP_LOSS } = await import('../../lib/constants')
          const tier = calculateTier(xpEntry.newXp, currentFlaggedUnit.type)
          const tierLoss = DEROUTE_XP_LOSS[tier]
          const originalXpGained = xpEntry.newXp - xpEntry.oldXp
          const submitResult = await submitUnitXpAction({
            unitId: currentFlaggedUnit.id, xpGained: originalXpGained, matchParticipantId,
            derouteXpLost: tierLoss, onSubmitUnitXp,
          })
          if (submitResult.success) {
            xpResultsRef.current.set(currentFlaggedUnit.id, { oldXp: xpEntry.oldXp, newXp: submitResult.data.newXp })
          } else {
            throw new Error(submitResult.error?.message ?? 'Erreur de soumission XP')
          }
          pendingConsequencesRef.current.set(currentFlaggedUnit.id, { ...result, xpLostAmount: tierLoss })
        } else {
          pendingConsequencesRef.current.set(currentFlaggedUnit.id, result)
        }
      } else {
        pendingConsequencesRef.current.set(currentFlaggedUnit.id, result)
      }

      const nextIndex = consequenceIndex + 1
      if (nextIndex < flaggedUnitsRef.current.length) {
        submittingRef.current = false
        wizardDispatch({ type: 'NEXT_CONSEQUENCE' })
      } else {
        // transitionToPhase2OrComplete manages submittingRef itself
        await transitionToPhase2OrComplete()
      }
    } catch (err) {
      submittingRef.current = false
      throw err
    }
  }

  const handleConsequenceBack = () => {
    if (wizardState.phase !== 'consequences') return
    setConsequenceError(null)
    const { consequenceIndex } = wizardState
    if (consequenceIndex > 0) {
      wizardDispatch({ type: 'PREV_CONSEQUENCE' })
    } else {
      // Back to Phase 1 last XP step — clear last unit's XP result so it can be re-submitted
      const lastUnitId = units[units.length - 1]?.id
      if (lastUnitId) {
        xpResultsRef.current.delete(lastUnitId)
        submittedUnitsRef.current.delete(lastUnitId)
      }
      wizardDispatch({ type: 'BACK_TO_XP', step: units.length - 1 })
    }
  }

  // ---------------------------------------------------------------------------
  // Phase 2: Tier-up flow
  // ---------------------------------------------------------------------------

  const handleTierUpConfirm = async (result: { descriptions: string[] }): Promise<void> => {
    if (wizardState.phase !== 'tierup') return

    // Synchronous ref guard prevents double-click race
    if (submittingRef.current) return
    submittingRef.current = true

    try {
      const { tierUpQueue, tierUpStep } = wizardState
      const currentTierUp = tierUpQueue[tierUpStep]

      const has2MinChoice = result.descriptions.includes('2 améliorations mineures')
      const descriptionsToSave = result.descriptions.filter(
        (d) => d !== '2 améliorations mineures' && d !== 'Non applicable'
      )

      // Accumulate gains in pendingGainsRef grouped by threshold
      if (descriptionsToSave.length > 0) {
        const groups = pendingGainsRef.current.get(currentTierUp.unitId) ?? []
        const existingGroup = groups.find((g) => g.thresholdXp === currentTierUp.xp)
        if (existingGroup) {
          existingGroup.descriptions.push(...descriptionsToSave)
        } else {
          groups.push({ descriptions: [...descriptionsToSave], thresholdXp: currentTierUp.xp })
        }
        pendingGainsRef.current.set(currentTierUp.unitId, groups)
      }

      submittedTierUpsByStepRef.current.set(tierUpStep, result.descriptions)

      // Update cumulative gains
      const existingCumulative = cumulativeGainsRef.current.get(currentTierUp.unitId) ?? []
      cumulativeGainsRef.current.set(currentTierUp.unitId, [...existingCumulative, ...descriptionsToSave])

      // Update cumulative honour selections
      if (currentTierUp.tierLabel === 'Honneur de bataille') {
        const existing = cumulativeHonourSelectionsRef.current.get(currentTierUp.unitId) ?? new Set()
        for (const d of descriptionsToSave) existing.add(d)
        cumulativeHonourSelectionsRef.current.set(currentTierUp.unitId, existing)
      }

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
        const gains = buildBatchGainsPayload(pendingGainsRef.current)
        const consequences = buildConsequencesArray(pendingConsequencesRef.current, initialConsequencesRef.current, opponentPlayerName)
        const championKilledIds = buildChampionKilledIds(championFlagsRef.current)

        const completeResult = await completeEvolutionsAction({
          matchId, matchParticipantId, gains, consequences, championKilledIds,
          onCompleteEvolutions,
        })
        if (!completeResult.success) {
          submittingRef.current = false
          throw new Error(completeResult.error.message)
        }
        // Dispatch COMPLETE so onComplete() fires consistently via useEffect
        wizardDispatch({ type: 'COMPLETE' })
      } else {
        submittingRef.current = false
        wizardDispatch({ type: 'NEXT_TIERUP_STEP' })
      }
    } catch (err) {
      submittingRef.current = false
      throw err
    }
  }

  const handleTierUpBack = () => {
    if (wizardState.phase !== 'tierup') return
    const { tierUpQueue, tierUpStep } = wizardState

    if (tierUpStep > 0) {
      const prevStep = tierUpStep - 1
      const prevEntry = tierUpQueue[prevStep]
      const prevSelections = submittedTierUpsByStepRef.current.get(prevStep)
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (prevSelections && prevEntry) {
        rollbackTierUpStep(
          prevEntry,
          prevSelections,
          pendingGainsRef.current,
          cumulativeGainsRef.current,
          cumulativeHonourSelectionsRef.current,
        )
        submittedTierUpsByStepRef.current.delete(prevStep)
      }
      wizardDispatch({ type: 'PREV_TIERUP_STEP' })
    } else {
      // AC: Risk 9 — if Phase 1.5 was present, return there; otherwise return to Phase 1
      if (flaggedUnitsRef.current.length > 0) {
        wizardDispatch({ type: 'BACK_TO_CONSEQUENCES', consequenceIndex: flaggedUnitsRef.current.length - 1 })
      } else {
        const lastUnitId = units[units.length - 1]?.id
        if (lastUnitId) {
          xpResultsRef.current.delete(lastUnitId)
          submittedUnitsRef.current.delete(lastUnitId)
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
  // handleXpBack — extracted named function (captures refs)
  // ---------------------------------------------------------------------------

  const handleXpBack = () => {
    if (wizardState.phase !== 'xp') return
    const prevStep = wizardState.currentStep - 1
    const prevUnitId = units[prevStep]?.id
    if (prevUnitId) {
      submittedUnitsRef.current.delete(prevUnitId)
      // also clear xpResults entry to avoid stale data
      xpResultsRef.current.delete(prevUnitId)
    }
    wizardDispatch({ type: 'PREV_XP_STEP' })
  }

  // ---------------------------------------------------------------------------
  // handleEmptyRetour
  // ---------------------------------------------------------------------------

  const handleEmptyRetour = async () => {
    if (submittingRef.current) return
    submittingRef.current = true
    setEmptyIsSubmitting(true)
    setEmptyError(null)
    try {
      const result = await completeEvolutionsAction({ matchId, matchParticipantId, gains: [], onCompleteEvolutions })
      if (!result.success) {
        throw new Error(result.error.message)
      }
      wizardDispatch({ type: 'COMPLETE' })
    } catch (err) {
      setEmptyError(err instanceof Error ? err.message : 'Erreur inconnue')
      setEmptyIsSubmitting(false)
    } finally {
      submittingRef.current = false
    }
  }

  // ---------------------------------------------------------------------------
  // Return — discriminated union by phase
  // ---------------------------------------------------------------------------

  if (units.length === 0) {
    return {
      phase: 'empty',
      props: { onRetour: handleEmptyRetour, isSubmitting: emptyIsSubmitting, error: emptyError },
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
      [...cumulativeHonourSelectionsRef.current].map(([k, v]) => [k, new Set(v)])
    )
    const cumulativeGains = new Map(
      [...cumulativeGainsRef.current].map(([k, v]) => [k, [...v]])
    )

    return {
      phase: 'tierup',
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
    const currentFlaggedUnit = flaggedUnitsRef.current[consequenceIndex]
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!currentFlaggedUnit) return { phase: 'complete' }

    return {
      phase: 'consequences',
      consequenceError,
      props: {
        key: consequenceIndex,
        flaggedUnit: currentFlaggedUnit,
        onConfirm: (result) => {
          setConsequenceError(null)
          handleConsequenceConfirm(result).catch((err: unknown) => {
            setConsequenceError(err instanceof Error ? err.message : 'Erreur inconnue')
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

  const savedCheckedConditions = submittedXpByStep.current.get(currentStep)
  const savedConsequenceChecked = consequenceFlagsRef.current.get(currentUnit.id) ?? false
  const savedChampionKilledChecked = championFlagsRef.current.get(currentUnit.id) ?? false

  return {
    phase: 'xp',
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
      onConsequenceChange: (unitId, checked) => consequenceFlagsRef.current.set(unitId, checked),
      onChampionKilledChange: (unitId, checked) => championFlagsRef.current.set(unitId, checked),
      onNext: (xpData) => handleNext(xpData, currentUnit, currentStep, isLastXpStep),
      onBack: currentStep > 0 ? handleXpBack : undefined,
      onCancel,
    },
  }
}
