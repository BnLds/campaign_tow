// Campaign TOW — PostMatchWizard orchestrator
// Story 4.1: Sequential post-match XP entry wizard
// Story 4.2: 2-phase flow — XP entry (Phase 1) then tier-up improvements (Phase 2)
// Story 4.3: 3-phase flow — XP+flags (Phase 1) → consequences (Phase 1.5) → tier-ups (Phase 2)

import { useState, useReducer, useRef, useEffect } from 'react'
import { detectTierCrossings } from '../../lib/tier'
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
import { WizardEmpty } from './wizard-empty'
import { PhaseXp } from './phase-xp'
import type { XpData } from './phase-xp'
import { PhaseConsequences } from './phase-consequences'
import { PhaseTierUp, expandQueueEntry } from './phase-tierup'

export type { PostMatchWizardProps }

// ---------------------------------------------------------------------------
// Centralized dynamic import helper (6 sites → 1 helper)
// ---------------------------------------------------------------------------

const getPostMatchServerFns = () => import('../../routes/match/$matchId/post-match')

// ---------------------------------------------------------------------------
// PostMatchWizard orchestrator
// ---------------------------------------------------------------------------

export function PostMatchWizard({
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
}: PostMatchWizardProps) {
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
  // Double-click guard (synchronous)
  const submittingRef = useRef(false)
  // Already-submitted units (dedup on retry)
  const submittedUnitsRef = useRef<Set<string>>(new Set())
  // XP results from Phase 1 (for tier crossing detection + Phase 1.5 adjustments)
  const xpResultsRef = useRef<Map<string, { oldXp: number; newXp: number }>>(new Map())
  // Pending consequences from Phase 1.5 (for batch commit)
  const pendingConsequencesRef = useRef<Map<string, InjuryResult | (DestructionResult & { xpLostAmount?: number })>>(new Map())
  // Pending gains from Phase 2 grouped by threshold (for batch commit)
  const pendingGainsRef = useRef<Map<string, Array<{ descriptions: string[]; thresholdXp: number | null }>>>(new Map())
  // Cumulative gains: unitId → all gain descriptions selected this session (for constraint checks)
  const cumulativeGainsRef = useRef<Map<string, string[]>>(new Map())
  // Cumulative honour selections: unitId → Set of honour descriptions (O(1) lookup)
  const cumulativeHonourSelectionsRef = useRef<Map<string, Set<string>>>(new Map())
  // Per-step submitted tier-up descriptions (for back-button rollback)
  const submittedTierUpsByStepRef = useRef<Map<number, string[]>>(new Map())
  // Per-step submitted XP condition sets (for back-button pre-fill)
  const submittedXpByStep = useRef<Map<number, Set<string>>>(new Map())
  // Per-unit consequence flags (MHC/Détruite)
  const consequenceFlagsRef = useRef<Map<string, boolean>>(new Map())
  // Per-unit champion killed flags
  const championFlagsRef = useRef<Map<string, boolean>>(new Map())
  // Ordered flagged units for Phase 1.5
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
  // Helpers — build batch-commit arrays
  // ---------------------------------------------------------------------------

  const buildConsequencesArray = (): ConsequenceEntry[] => {
    const consequences: ConsequenceEntry[] = []
    for (const [unitId, result] of pendingConsequencesRef.current) {
      if ('bannerLost' in result) {
        // DestructionResult (possibly extended with xpLostAmount)
        const entry: ConsequenceEntry = { unitId, type: result.type, bannerLost: result.bannerLost }
        if (result.type === 'rancune') {
          entry.opponentPlayerName = opponentPlayerName
        }
        const extResult = result as DestructionResult & { xpLostAmount?: number }
        if (result.type === 'deroute_sanglante' && extResult.xpLostAmount != null) {
          entry.xpLostAmount = extResult.xpLostAmount
        }
        consequences.push(entry)
      } else {
        // InjuryResult
        const entry: ConsequenceEntry = { unitId, type: result.type }
        if ('stat' in result && result.stat) entry.stat = result.stat
        if ('delta' in result) entry.delta = result.delta
        if (result.type === 'haine') {
          entry.opponentPlayerName = opponentPlayerName
        }
        consequences.push(entry)
      }
    }
    // Append initial-xp mode consequences (already ConsequenceEntry-shaped)
    for (const item of initialConsequencesRef.current) {
      const { _localId: _id, ...entry } = item
      consequences.push(entry)
    }
    return consequences
  }

  const buildChampionKilledIds = (): string[] => {
    const ids: string[] = []
    for (const [unitId, killed] of championFlagsRef.current) {
      if (killed) ids.push(unitId)
    }
    return ids
  }

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

    const queue: TierUpQueueEntry[] = []
    for (const unit of units) {
      const result = xpResultsRef.current.get(unit.id)
      if (!result) {
        console.warn(`[PostMatchWizard] No XP result found for unit ${unit.id} (${unit.name}). Treating as 0 XP gained — no tier crossing.`)
        continue
      }
      const crossings = detectTierCrossings(result.oldXp, result.newXp, unit.type)
      const existingGains = unit.existingGains ?? []
      for (const crossing of crossings) {
        const isHonour = crossing.tierLabel === 'Honneur de bataille'
        let filteredMinor = crossing.minorImprovements
        if (isHonour) {
          filteredMinor = crossing.minorImprovements.filter((imp) => !existingGains.some((g) => g.description === imp.label))
        }
        if (isHonour && filteredMinor.length === 0) continue
        const baseEntry: TierUpQueueEntry = {
          ...crossing,
          minorImprovements: isHonour ? filteredMinor : crossing.minorImprovements,
          unitId: unit.id,
          unitName: unit.name,
          unitType: unit.type,
          hasMount: unit.hasMount ?? false,
          commandement: unit.commandement ?? 0,
        }
        queue.push(...expandQueueEntry(baseEntry))
      }
    }

    if (queue.length === 0) {
      // No tier crossings — batch commit with empty gains + consequences
      const consequences = buildConsequencesArray()
      const championKilledIds = buildChampionKilledIds()
      let completeResult: Awaited<ReturnType<NonNullable<PostMatchWizardProps['onCompleteEvolutions']>>>
      try {
        if (onCompleteEvolutions) {
          completeResult = await onCompleteEvolutions(matchId, matchParticipantId, [], consequences, championKilledIds)
        } else {
          const { completeEvolutionsWithGainsFn } = await getPostMatchServerFns()
          completeResult = await completeEvolutionsWithGainsFn({ data: { matchId, matchParticipantId, gains: [], consequences, championKilledIds } })
        }
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
  // Phase 1: XP entry handler (receives xpData snapshot from PhaseXp)
  // ---------------------------------------------------------------------------

  const handleNext = async (xpData: XpData, currentUnit: WizardUnit, currentStep: number, isLastXpStep: boolean): Promise<void> => {
    // Fix 2 — synchronous ref guard prevents double-click race
    if (submittingRef.current) return
    submittingRef.current = true

    const { checkedConditions, numericXpValue, bonusXp, isConsequenceChecked, isChampionKilledChecked } = xpData

    // Sync consequence/champion flags to refs
    consequenceFlagsRef.current.set(currentUnit.id, isConsequenceChecked)
    championFlagsRef.current.set(currentUnit.id, isChampionKilledChecked)

    // Fix 1 — skip XP submission if this unit was already successfully submitted
    const alreadySubmitted = submittedUnitsRef.current.has(currentUnit.id)

    let newXp: number | null = null

    if (!alreadySubmitted) {
      const xpGained = computeXpTotal(checkedConditions, currentUnit.type)
      const xpToSubmit = mode === 'initial-xp' ? Math.max(0, Math.floor(numericXpValue)) : Math.floor(xpGained) + bonusXp
      let submitResult: Awaited<ReturnType<NonNullable<PostMatchWizardProps['onSubmitUnitXp']>>>
      if (onSubmitUnitXp) {
        submitResult = bonusXp > 0
          ? await onSubmitUnitXp(currentUnit.id, xpToSubmit, matchParticipantId, undefined, bonusXp)
          : await onSubmitUnitXp(currentUnit.id, xpToSubmit, matchParticipantId)
      } else {
        const { submitUnitXpFn } = await getPostMatchServerFns()
        submitResult = await submitUnitXpFn({ data: { matchParticipantId, unitId: currentUnit.id, xpGained: xpToSubmit, bonusXp: bonusXp > 0 ? bonusXp : undefined } })
      }

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
      const characters = units.filter((u) => u.type === 'Personnages' && consequenceFlagsRef.current.get(u.id))
      const unitsFlagged = units.filter((u) => u.type !== 'Personnages' && consequenceFlagsRef.current.get(u.id))
      const flagged: FlaggedUnit[] = [...characters, ...unitsFlagged].map((u) => ({ id: u.id, name: u.name, type: u.type, existingGains: u.existingGains ?? [] }))
      flaggedUnitsRef.current = flagged

      if (flagged.length > 0) {
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
          let submitResult: Awaited<ReturnType<NonNullable<PostMatchWizardProps['onSubmitUnitXp']>>>
          if (onSubmitUnitXp) {
            submitResult = await onSubmitUnitXp(currentFlaggedUnit.id, newXpGained, matchParticipantId)
          } else {
            const { submitUnitXpFn } = await getPostMatchServerFns()
            submitResult = await submitUnitXpFn({ data: { matchParticipantId, unitId: currentFlaggedUnit.id, xpGained: newXpGained } })
          }
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
          let submitResult: Awaited<ReturnType<NonNullable<PostMatchWizardProps['onSubmitUnitXp']>>>
          if (onSubmitUnitXp) {
            submitResult = await onSubmitUnitXp(currentFlaggedUnit.id, originalXpGained, matchParticipantId, tierLoss)
          } else {
            const { submitUnitXpFn } = await getPostMatchServerFns()
            submitResult = await submitUnitXpFn({ data: { matchParticipantId, unitId: currentFlaggedUnit.id, xpGained: originalXpGained, derouteXpLost: tierLoss } })
          }
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

    // C2 — synchronous ref guard prevents double-click race
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
      // Contract: stores human-readable labels (e.g. '+1 CC') produced by resolveDescription()
      // in tier-up-step.tsx. PhaseTierUp filters improvements via priorSelections.has(imp.label),
      // where imp.label is the same label string — the two sides must stay in sync.
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
        const gains: Array<{ unitId: string; descriptions: string[]; thresholdXp?: number | null }> = []
        for (const [unitId, groups] of pendingGainsRef.current) {
          for (const group of groups) {
            gains.push({ unitId, descriptions: group.descriptions, thresholdXp: group.thresholdXp })
          }
        }
        const consequences = buildConsequencesArray()
        const championKilledIds = buildChampionKilledIds()

        let completeResult: Awaited<ReturnType<NonNullable<PostMatchWizardProps['onCompleteEvolutions']>>>
        if (onCompleteEvolutions) {
          completeResult = await onCompleteEvolutions(matchId, matchParticipantId, gains, consequences, championKilledIds)
        } else {
          const { completeEvolutionsWithGainsFn } = await getPostMatchServerFns()
          completeResult = await completeEvolutionsWithGainsFn({ data: { matchId, matchParticipantId, gains, consequences, championKilledIds } })
        }
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
        // Remove from pendingGainsRef
        const pendingGroups = pendingGainsRef.current.get(prevEntry.unitId)
        if (pendingGroups) {
          const descriptionsToRemove = prevSelections.filter((d) => d !== '2 améliorations mineures')
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
            pendingGainsRef.current.set(prevEntry.unitId, updatedGroups)
          } else {
            pendingGainsRef.current.delete(prevEntry.unitId)
          }
        }
        // Remove from cumulativeGainsRef
        const cumGains = cumulativeGainsRef.current.get(prevEntry.unitId)
        if (cumGains) {
          const descriptionsToRemove = prevSelections.filter((d) => d !== '2 améliorations mineures')
          const updated = [...cumGains]
          for (const desc of descriptionsToRemove) {
            const idx = updated.indexOf(desc)
            if (idx !== -1) updated.splice(idx, 1)
          }
          cumulativeGainsRef.current.set(prevEntry.unitId, updated)
        }
        // Remove from cumulativeHonourSelectionsRef
        if (prevEntry.tierLabel === 'Honneur de bataille') {
          const honours = cumulativeHonourSelectionsRef.current.get(prevEntry.unitId)
          if (honours) {
            for (const d of prevSelections) honours.delete(d)
          }
        }
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
  // Empty army case
  // ---------------------------------------------------------------------------

  if (units.length === 0) {
    const handleEmptyRetour = async () => {
      if (submittingRef.current) return
      submittingRef.current = true
      setEmptyIsSubmitting(true)
      setEmptyError(null)
      try {
        if (onCompleteEvolutions) {
          await onCompleteEvolutions(matchId, matchParticipantId, [])
        } else {
          const { completeEvolutionsWithGainsFn } = await getPostMatchServerFns()
          await completeEvolutionsWithGainsFn({ data: { matchId, matchParticipantId, gains: [] } })
        }
        wizardDispatch({ type: 'COMPLETE' })
      } catch (err) {
        setEmptyError(err instanceof Error ? err.message : 'Erreur inconnue')
        setEmptyIsSubmitting(false)
      } finally {
        submittingRef.current = false
      }
    }

    return (
      <WizardEmpty
        onRetour={handleEmptyRetour}
        isSubmitting={emptyIsSubmitting}
        error={emptyError}
      />
    )
  }

  // ---------------------------------------------------------------------------
  // Render — phase routing
  // ---------------------------------------------------------------------------

  if (wizardState.phase === 'tierup') {
    const { tierUpQueue, tierUpStep } = wizardState
    const currentTierUp = tierUpQueue[tierUpStep]
    // H3 — defensive guard: queue/step could be in intermediate state during React batching
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!currentTierUp) return null

    const isLastTierUpStep = tierUpStep === tierUpQueue.length - 1
    const totalTierUps = tierUpQueue.length

    // Deep copy for constraint display — PhaseTierUp receives snapshots, not live refs
    const cumulativeHonourSelectionsCopy = new Map(
      [...cumulativeHonourSelectionsRef.current].map(([k, v]) => [k, new Set(v)])
    )
    const cumulativeGainsCopy = new Map(
      [...cumulativeGainsRef.current].map(([k, v]) => [k, [...v]])
    )

    return (
      <PhaseTierUp
        key={tierUpStep}
        currentTierUp={currentTierUp}
        tierUpStep={tierUpStep}
        totalTierUps={totalTierUps}
        isLastStep={isLastTierUpStep}
        units={units}
        cumulativeHonourSelections={cumulativeHonourSelectionsCopy}
        cumulativeGains={cumulativeGainsCopy}
        onConfirm={(result) => handleTierUpConfirm(result)}
        onBack={handleTierUpBack}
        onCancel={onCancel}
      />
    )
  }

  if (wizardState.phase === 'consequences') {
    const { consequenceIndex } = wizardState
    const currentFlaggedUnit = flaggedUnitsRef.current[consequenceIndex]
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!currentFlaggedUnit) return null

    return (
      <>
        {consequenceError && (
          <p role="alert" style={{ color: '#b82c2c', marginBottom: '0.5rem' }}>{consequenceError}</p>
        )}
        <PhaseConsequences
          key={consequenceIndex}
          flaggedUnit={currentFlaggedUnit}
          onConfirm={(result) => {
            setConsequenceError(null)
            handleConsequenceConfirm(result).catch((err: unknown) => {
              setConsequenceError(err instanceof Error ? err.message : 'Erreur inconnue')
            })
          }}
          onBack={handleConsequenceBack}
          onCancel={onCancel}
        />
      </>
    )
  }

  if (wizardState.phase === 'complete') {
    // Terminal state — useEffect above calls onComplete()
    return null
  }

  // Phase 'xp' (default)
  const { currentStep } = wizardState
  const currentUnit = units[currentStep]
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive: step could exceed array bounds during React batching
  if (!currentUnit) return null
  const isLastXpStep = currentStep === units.length - 1
  const total = units.length

  const savedCheckedConditions = submittedXpByStep.current.get(currentStep)
  const savedConsequenceChecked = consequenceFlagsRef.current.get(currentUnit.id) ?? false
  const savedChampionKilledChecked = championFlagsRef.current.get(currentUnit.id) ?? false

  return (
    <PhaseXp
      key={currentStep}
      unit={currentUnit}
      currentStep={currentStep}
      total={total}
      mode={mode}
      catchupBonusXp={catchupBonusXp}
      catchupDeltaXp={catchupDeltaXp}
      savedCheckedConditions={savedCheckedConditions}
      savedConsequenceChecked={savedConsequenceChecked}
      savedChampionKilledChecked={savedChampionKilledChecked}
      initialConsequences={initialConsequences}
      campaignPlayers={campaignPlayers}
      onAddInitialConsequence={handleAddInitialConsequence}
      onRemoveInitialConsequence={handleRemoveInitialConsequence}
      onConsequenceChange={(unitId, checked) => consequenceFlagsRef.current.set(unitId, checked)}
      onChampionKilledChange={(unitId, checked) => championFlagsRef.current.set(unitId, checked)}
      onNext={(xpData) => handleNext(xpData, currentUnit, currentStep, isLastXpStep)}
      onBack={currentStep > 0 ? () => {
        const prevStep = currentStep - 1
        const prevUnitId = units[prevStep]?.id
        if (prevUnitId) {
          submittedUnitsRef.current.delete(prevUnitId)
          // Task 7.14: also clear xpResults entry to avoid stale data
          xpResultsRef.current.delete(prevUnitId)
        }
        wizardDispatch({ type: 'PREV_XP_STEP' })
      } : undefined}
      onCancel={onCancel}
    />
  )
}
