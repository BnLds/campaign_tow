// Campaign TOW — PostMatchWizard component
// Story 4.1: Sequential post-match XP entry wizard
// Story 4.2: 2-phase flow — XP entry (Phase 1) then tier-up improvements (Phase 2)
// Story 4.3: 3-phase flow — XP+flags (Phase 1) → consequences (Phase 1.5) → tier-ups (Phase 2)

import { useState, useRef, useEffect } from 'react'
import { getXpConditionsForType, computeXpTotal } from '../lib/xp-conditions'
import { TierUpStep } from './tier-up-step'
import { InjuryBonusStep } from './injury-bonus-step'
import { UnitDestructionStep } from './unit-destruction-step'
import { InitialConsequenceStep } from './initial-consequence-step'
import type { InitialConsequenceItem } from './initial-consequence-step'
import { detectTierCrossings } from '../lib/tier'
import { parseGainStat, STAT_CAP, UNCAPPED_STATS, CD_STAT } from '../lib/delta-composer'
import type { ThresholdEntry } from '../lib/constants'
import type { ServerResult } from '../lib/types'
import type { InjuryResult } from './injury-bonus-step'
import type { DestructionResult } from './unit-destruction-step'
import type { ConsequenceEntry } from '../lib/validators'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TierUpQueueEntry = ThresholdEntry & {
  unitId: string
  unitName: string
  unitType: string
  hasMount: boolean  // defaults to false when not provided
  commandement: number  // current CD value for constraint checks
}

type FlaggedUnit = { id: string; name: string; type: string; existingGains: string[] }

// ---------------------------------------------------------------------------
// Helper — expand multi-selection entries into sequential single-pick steps
// ---------------------------------------------------------------------------

function expandQueueEntry(entry: TierUpQueueEntry): TierUpQueueEntry[] {
  const { majorCount, minorCount } = entry

  // Simple entry: exactly one category with count 1 — no expansion needed
  const needsExpansion = majorCount > 1 || minorCount > 1 || (majorCount > 0 && minorCount > 0)
  if (!needsExpansion) {
    return [entry]
  }

  const expanded: TierUpQueueEntry[] = []

  // Expand major picks (one step per major selection)
  for (let i = 0; i < majorCount; i++) {
    expanded.push({
      ...entry,
      majorCount: 1,
      minorCount: 0,
      minorImprovements: [],
      tierLabel: majorCount > 1
        ? `${entry.tierLabel} — Majeure ${i + 1}/${majorCount}`
        : entry.tierLabel,
    })
  }

  // Expand minor picks (one step per minor selection)
  for (let i = 0; i < minorCount; i++) {
    expanded.push({
      ...entry,
      majorCount: 0,
      minorCount: 1,
      majorImprovements: [],
      tierLabel: minorCount > 1
        ? `${entry.tierLabel} — Mineure ${i + 1}/${minorCount}`
        : (majorCount > 0 ? `${entry.tierLabel} — Mineure` : entry.tierLabel),
    })
  }

  return expanded
}

export type PostMatchWizardProps = {
  matchId: string
  matchParticipantId: string
  /** Pseudo du joueur adverse — used for Haine/Rancune descriptions */
  opponentPlayerName?: string
  /** 'post-match' (default): checkbox XP conditions. 'initial-xp': direct numeric input 0-999. */
  mode?: 'post-match' | 'initial-xp'
  units: Array<{ id: string; name: string; type: string; xp: number; previousXpGained?: number | null; previousDerouteXpLost?: number | null; hasMount?: boolean; existingGains?: string[]; commandement?: number; effectiveStats?: Record<string, number | null> }>
  onComplete: () => void
  onCancel: () => void
  /** Optional: inject custom submit function (for testing). Defaults to submitUnitXpFn. */
  onSubmitUnitXp?: (unitId: string, xpGained: number, matchParticipantId: string, derouteXpLost?: number) => Promise<ServerResult<{ unitId: string; newXp: number }>>
  /** Batch commit: completes evolutions with all accumulated gains and consequences. Called once at the end.
   *  gains=[] and consequences=[] for the no-tierup, no-consequence path. */
  onCompleteEvolutions?: (matchId: string, matchParticipantId: string, gains: Array<{ unitId: string; descriptions: string[] }>, consequences?: ConsequenceEntry[], championKilledIds?: string[]) => Promise<ServerResult<{ matchId: string }>>
  /** Campaign players (excluding current player) — for Haine/Rancune picker in initial-xp mode */
  campaignPlayers?: Array<{ playerId: string; playerDisplayName: string }>
}

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
}: PostMatchWizardProps) {
  // Phase state: Phase 1 (xp) → Phase 1.5 (consequences) → Phase 2 (tierup)
  const [phase, setPhase] = useState<'xp' | 'consequences' | 'tierup'>('xp')

  // Phase 1 state
  const [currentStep, setCurrentStep] = useState(0)
  const [checkedConditions, setCheckedConditions] = useState<Set<string>>(new Set())
  const [showPreviousXpHint, setShowPreviousXpHint] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // initial-xp mode: numeric input per unit
  const [numericXpValue, setNumericXpValue] = useState<number>(0)
  // initial-xp mode: accumulated past consequences (multi-select, flat array with _localId for removal)
  const [initialConsequences, setInitialConsequences] = useState<InitialConsequenceItem[]>([])
  const initialConsequencesRef = useRef<InitialConsequenceItem[]>([])
  const nextLocalIdRef = useRef(0)

  // Phase 1.5 (consequence) state
  const [consequenceIndex, setConsequenceIndex] = useState(0)
  // Track consequence toggle per unit (MHC for characters, destroyed for units)
  const consequenceFlagsRef = useRef<Map<string, boolean>>(new Map())
  // Track champion killed per unit (Phase 1, non-Personnages only)
  const championFlagsRef = useRef<Map<string, boolean>>(new Map())
  // Local checkbox states synced from refs on step change (for controlled inputs)
  const [isConsequenceChecked, setIsConsequenceChecked] = useState(false)
  const [isChampionKilledChecked, setIsChampionKilledChecked] = useState(false)
  // Ordered list of flagged units to process in Phase 1.5 (characters first, then units)
  const flaggedUnitsRef = useRef<FlaggedUnit[]>([])
  // Accumulated consequences for batch commit (discarded on cancel)
  // DestructionResult extended with xpLostAmount for deroute_sanglante
  const pendingConsequencesRef = useRef<Map<string, InjuryResult | (DestructionResult & { xpLostAmount?: number })>>(new Map())

  // Phase 2 state
  const [tierUpQueue, setTierUpQueue] = useState<TierUpQueueEntry[]>([])
  const [tierUpStep, setTierUpStep] = useState(0)
  // Track tier-up selections per step for potential back-button restore (ref to avoid re-renders)
  const submittedTierUpsByStepRef = useRef<Map<number, string[]>>(new Map())
  // Cumulative map: unitId → Set of honour descriptions already selected in this session
  // Avoids O(N²) rescanning of prior steps during Phase 2 render
  const cumulativeHonourSelectionsRef = useRef<Map<string, Set<string>>>(new Map())
  // Cumulative map: unitId → all gain descriptions selected in this session (for constraint checks)
  const cumulativeGainsRef = useRef<Map<string, string[]>>(new Map())
  // Pending gains to batch-commit at the end (unitId → groups per threshold)
  const pendingGainsRef = useRef<Map<string, Array<{ descriptions: string[]; thresholdXp: number | null }>>>(new Map())

  // XP results collected during Phase 1 (useRef to avoid re-renders on each submit)
  const xpResultsRef = useRef<Map<string, { oldXp: number; newXp: number }>>(new Map())

  // Sync consequence toggle checkboxes with current step's flag values
  useEffect(() => {
    const unitId = units[currentStep]?.id ?? ''
    setIsConsequenceChecked(consequenceFlagsRef.current.get(unitId) ?? false)
    setIsChampionKilledChecked(championFlagsRef.current.get(unitId) ?? false)
  }, [currentStep, units])

  // Track checked condition IDs per step (for back-button pre-fill)
  const submittedXpByStep = useRef<Map<number, Set<string>>>(new Map())

  // Pre-fill XP checkboxes (or numeric value) from saved state or show previous XP hint on re-entry
  useEffect(() => {
    const unit = units[currentStep] as typeof units[0] | undefined
    if (mode === 'initial-xp') {
      // Pre-fill numeric input with previousXpGained on re-entry
      const prevXp = unit?.previousXpGained
      setNumericXpValue(prevXp != null && prevXp > 0 ? prevXp : 0)
      setShowPreviousXpHint(false)
    } else {
      const saved = submittedXpByStep.current.get(currentStep)
      if (saved !== undefined) {
        setCheckedConditions(new Set(saved))
        setShowPreviousXpHint(false)
      } else {
        setCheckedConditions(new Set())
        const prevXp = unit?.previousXpGained
        setShowPreviousXpHint(prevXp != null && prevXp > 0)
      }
    }
  }, [currentStep, units, mode])
  // Fix 2 — synchronous guard against double-click race condition
  const submittingRef = useRef(false)
  // Fix 1 — track already-submitted units to prevent double XP on retry
  const submittedUnitsRef = useRef<Set<string>>(new Set())

  // Empty army case — Fix 6: call completeEvolutions before navigating back
  if (units.length === 0) {
    const handleEmptyRetour = async () => {
      if (onCompleteEvolutions) {
        await onCompleteEvolutions(matchId, matchParticipantId, [])
      } else {
        const { completeEvolutionsWithGainsFn } = await import('../routes/match/$matchId/post-match')
        await completeEvolutionsWithGainsFn({ data: { matchId, matchParticipantId, gains: [] } })
      }
      onComplete()
    }

    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            color: 'var(--color-text-secondary)',
            marginBottom: '1.5rem',
          }}
        >
          Aucune unité dans votre armée
        </p>
        <button
          onClick={() => void handleEmptyRetour()}
          style={{
            fontFamily: 'var(--font-body)',
            color: 'var(--color-brand)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1rem',
            textDecoration: 'underline',
          }}
        >
          Retour
        </button>
      </div>
    )
  }

  const currentUnit = units[currentStep]
  const xpGained = currentUnit ? computeXpTotal(checkedConditions, currentUnit.type) : 0
  const isLastXpStep = currentStep === units.length - 1
  const total = units.length

  // ---------------------------------------------------------------------------
  // Helper — build consequences array from pendingConsequencesRef for batch commit
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
    // Append initial-xp mode consequences (already ConsequenceEntry-shaped, no transformation needed)
    // CRITICAL: do NOT pass these through the pendingConsequencesRef loop above — they carry their own
    // per-consequence opponentPlayerName and must not be overwritten by the wizard-level prop.
    for (const item of initialConsequencesRef.current) {
      const { _localId: _id, ...entry } = item
      consequences.push(entry)
    }
    return consequences
  }

  const handleAddInitialConsequence = (entry: ConsequenceEntry) => {
    const newItem = { ...entry, _localId: nextLocalIdRef.current++ }
    initialConsequencesRef.current = [...initialConsequencesRef.current, newItem]
    setInitialConsequences(initialConsequencesRef.current)
  }

  const handleRemoveInitialConsequence = (localId: number) => {
    initialConsequencesRef.current = initialConsequencesRef.current.filter((c) => c._localId !== localId)
    setInitialConsequences(initialConsequencesRef.current)
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
    // AC12 invariant: all units with deroute consequences must have their xpResultsRef updated
    // before this function reads them. This catches ordering regressions if wizard flow is refactored.
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
          filteredMinor = crossing.minorImprovements.filter((imp) => !existingGains.includes(imp.label))
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
      let completeResult: ServerResult<{ matchId: string }>
      if (onCompleteEvolutions) {
        completeResult = await onCompleteEvolutions(matchId, matchParticipantId, [], consequences, championKilledIds)
      } else {
        const { completeEvolutionsWithGainsFn } = await import('../routes/match/$matchId/post-match')
        completeResult = await completeEvolutionsWithGainsFn({ data: { matchId, matchParticipantId, gains: [], consequences, championKilledIds } })
      }
      if (!completeResult.success) {
        setError(completeResult.error.message)
        setIsSubmitting(false)
        submittingRef.current = false
        return
      }
      // Transition out of Phase 1.5 before onComplete() so that if the parent
      // doesn't unmount immediately (e.g. tests with vi.fn() no-ops), the
      // consequence steps are no longer rendered.
      flaggedUnitsRef.current = []
      setPhase('xp')
      onComplete()
    } else {
      // Tier crossings exist — transition to Phase 2
      setTierUpQueue(queue)
      setTierUpStep(0)
      setPhase('tierup')
      setIsSubmitting(false)
      submittingRef.current = false
    }
  }

  // ---------------------------------------------------------------------------
  // Phase 1: XP entry
  // ---------------------------------------------------------------------------

  const handleNext = async () => {
    // Fix 2 — synchronous ref guard prevents double-click race
    if (submittingRef.current) return
    submittingRef.current = true

    if (isSubmitting) {
      submittingRef.current = false
      return
    }
    setIsSubmitting(true)
    setError(null)

    try {
      // Fix 1 — skip XP submission if this unit was already successfully submitted
      const alreadySubmitted = submittedUnitsRef.current.has(currentUnit.id)

      let newXp: number | null = null

      if (!alreadySubmitted) {
        // initial-xp mode: use direct numeric value; post-match mode: use checkbox total
        const xpToSubmit = mode === 'initial-xp' ? Math.max(0, Math.floor(numericXpValue)) : Math.floor(xpGained)
        let submitResult: ServerResult<{ unitId: string; newXp: number }>
        if (onSubmitUnitXp) {
          submitResult = await onSubmitUnitXp(currentUnit.id, xpToSubmit, matchParticipantId)
        } else {
          // Dynamic import to avoid bundling server fn into client
          const { submitUnitXpFn } = await import('../routes/match/$matchId/post-match')
          submitResult = await submitUnitXpFn({ data: { matchParticipantId, unitId: currentUnit.id, xpGained: xpToSubmit } })
        }

        if (!submitResult.success) {
          setError(submitResult.error.message)
          setIsSubmitting(false)
          submittingRef.current = false
          return
        }

        newXp = submitResult.data.newXp

        // Mark this unit as successfully submitted
        submittedUnitsRef.current.add(currentUnit.id)
      }

      // Store XP result for tier crossing detection.
      // initial-xp mode: oldXp is always 0 (entering XP from scratch since army creation).
      // post-match mode: oldXp = pre-match XP (before any XP from this match was applied).
      //   On first run: previousXpGained is null/0, so preMatchXp = currentUnit.xp.
      //   On resume: preMatchXp = currentUnit.xp - previousXpGained + previousDerouteXpLost
      //   (derouteXpLost restores the deducted amount so we get the true pre-match baseline)
      const preMatchXp = mode === 'initial-xp' ? 0 : (currentUnit.xp - (currentUnit.previousXpGained ?? 0) + (currentUnit.previousDerouteXpLost ?? 0))
      if (newXp !== null) {
        xpResultsRef.current.set(currentUnit.id, {
          oldXp: preMatchXp,
          newXp,
        })
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
        // initial-xp: skip Phase 1.5 unconditionally — consequences are collected inline during Phase 1
        if (mode === 'initial-xp') {
          await transitionToPhase2OrComplete()
          return
        }
        // All XP entered — compute flagged units for Phase 1.5
        const characters = units.filter((u) => u.type === 'Personnages' && consequenceFlagsRef.current.get(u.id))
        const unitsFlagged = units.filter((u) => u.type !== 'Personnages' && consequenceFlagsRef.current.get(u.id))
        const flagged: FlaggedUnit[] = [...characters, ...unitsFlagged].map((u) => ({ id: u.id, name: u.name, type: u.type, existingGains: u.existingGains ?? [] }))
        flaggedUnitsRef.current = flagged

        if (flagged.length > 0) {
          // Has consequences — enter Phase 1.5
          setConsequenceIndex(0)
          setPhase('consequences')
          setIsSubmitting(false)
          submittingRef.current = false
        } else {
          // No consequences — go directly to Phase 2 or complete
          await transitionToPhase2OrComplete()
        }
      } else {
        // Record the checked conditions for this step (for back-button pre-fill)
        submittedXpByStep.current.set(currentStep, new Set(checkedConditions))
        // Advance to next unit — useEffect on [currentStep] handles xpGained pre-fill
        setCurrentStep((prev) => prev + 1)
        setIsSubmitting(false)
        submittingRef.current = false
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      setIsSubmitting(false)
      submittingRef.current = false
    }
  }

  // ---------------------------------------------------------------------------
  // Phase 1.5: Consequence handling
  // ---------------------------------------------------------------------------

  const handleConsequenceConfirm = async (result: InjuryResult | DestructionResult) => {
    const currentFlaggedUnit = flaggedUnitsRef.current[consequenceIndex]
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!currentFlaggedUnit) return

    // Handle XP adjustments for Miraculé / Fureur Vengeresse (+2 XP) and Déroute Sanglante (XP loss)
    if (result.type === 'miracule' || result.type === 'fureur_vengeresse') {
      const xpEntry = xpResultsRef.current.get(currentFlaggedUnit.id)
      if (xpEntry) {
        const currentXpGained = xpEntry.newXp - xpEntry.oldXp
        const newXpGained = currentXpGained + 2
        let submitResult: ServerResult<{ unitId: string; newXp: number }>
        if (onSubmitUnitXp) {
          submitResult = await onSubmitUnitXp(currentFlaggedUnit.id, newXpGained, matchParticipantId)
        } else {
          const { submitUnitXpFn } = await import('../routes/match/$matchId/post-match')
          submitResult = await submitUnitXpFn({ data: { matchParticipantId, unitId: currentFlaggedUnit.id, xpGained: newXpGained } })
        }
        if (submitResult.success) {
          xpResultsRef.current.set(currentFlaggedUnit.id, { oldXp: xpEntry.oldXp, newXp: submitResult.data.newXp })
        }
      }
      // Store consequence for batch commit
      pendingConsequencesRef.current.set(currentFlaggedUnit.id, result)
    } else if (result.type === 'deroute_sanglante') {
      const xpEntry = xpResultsRef.current.get(currentFlaggedUnit.id)
      if (xpEntry) {
        const { calculateTier } = await import('../lib/tier')
        const { DEROUTE_XP_LOSS } = await import('../lib/constants')
        const tier = calculateTier(xpEntry.newXp, currentFlaggedUnit.type)
        const tierLoss = DEROUTE_XP_LOSS[tier]
        // Pass original xpGained (unchanged) + derouteXpLost separately
        const originalXpGained = xpEntry.newXp - xpEntry.oldXp
        let submitResult: ServerResult<{ unitId: string; newXp: number }>
        if (onSubmitUnitXp) {
          submitResult = await onSubmitUnitXp(currentFlaggedUnit.id, originalXpGained, matchParticipantId, tierLoss)
        } else {
          const { submitUnitXpFn } = await import('../routes/match/$matchId/post-match')
          submitResult = await submitUnitXpFn({ data: { matchParticipantId, unitId: currentFlaggedUnit.id, xpGained: originalXpGained, derouteXpLost: tierLoss } })
        }
        if (submitResult.success) {
          xpResultsRef.current.set(currentFlaggedUnit.id, { oldXp: xpEntry.oldXp, newXp: submitResult.data.newXp })
        }
        // Store consequence with full tierLoss as xpLostAmount (rules amount, not capped)
        pendingConsequencesRef.current.set(currentFlaggedUnit.id, { ...result, xpLostAmount: tierLoss })
      } else {
        pendingConsequencesRef.current.set(currentFlaggedUnit.id, result)
      }
    } else {
      // Store consequence for batch commit (all other types)
      pendingConsequencesRef.current.set(currentFlaggedUnit.id, result)
    }

    // Advance to next flagged unit or transition to Phase 2
    const nextIndex = consequenceIndex + 1
    if (nextIndex < flaggedUnitsRef.current.length) {
      setConsequenceIndex(nextIndex)
    } else {
      // All consequences done — proceed to Phase 2 or complete
      await transitionToPhase2OrComplete()
    }
  }

  const handleConsequenceBack = () => {
    if (consequenceIndex > 0) {
      setConsequenceIndex((prev) => prev - 1)
    } else {
      // Back to Phase 1 last XP step
      setPhase('xp')
      setCurrentStep(units.length - 1)
      // Clear last unit's XP result so it can be re-submitted
      const lastUnitId = units[units.length - 1]?.id
      if (lastUnitId) {
        xpResultsRef.current.delete(lastUnitId)
        submittedUnitsRef.current.delete(lastUnitId)
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Phase 2: Tier-up flow
  // ---------------------------------------------------------------------------

  const handleTierUpConfirm = async (result: { descriptions: string[] }) => {
    // C2 — synchronous ref guard prevents double-click race (same pattern as handleNext)
    if (submittingRef.current) return
    submittingRef.current = true

    const currentTierUp = tierUpQueue[tierUpStep]

    setIsSubmitting(true)
    setError(null)

    try {
      // Check if "2 améliorations mineures" was selected — need special handling
      const has2MinChoice = result.descriptions.includes('2 améliorations mineures')
      // Descriptions to actually save as gains (exclude placeholders that aren't real gains)
      const descriptionsToSave = result.descriptions.filter(
        (d) => d !== '2 améliorations mineures' && d !== 'Non applicable'
      )

      // Accumulate gains in pendingGainsRef grouped by threshold (NOT submitted to server yet)
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

      // Store selections for back-button restore (ref-based to avoid re-renders)
      submittedTierUpsByStepRef.current.set(tierUpStep, result.descriptions)

      // Update cumulative gains for this unit (for constraint checks on subsequent steps)
      const existingCumulative = cumulativeGainsRef.current.get(currentTierUp.unitId) ?? []
      cumulativeGainsRef.current.set(currentTierUp.unitId, [...existingCumulative, ...descriptionsToSave])

      // Update cumulative honour selections for this unit (O(1) lookup in render)
      if (currentTierUp.tierLabel === 'Honneur de bataille') {
        const existing = cumulativeHonourSelectionsRef.current.get(currentTierUp.unitId) ?? new Set()
        for (const d of descriptionsToSave) existing.add(d)
        cumulativeHonourSelectionsRef.current.set(currentTierUp.unitId, existing)
      }

      // If "2 améliorations mineures" was chosen, insert 2 sequential minor-pick sub-steps
      if (has2MinChoice) {
        const { CHARACTER_MINOR_IMPROVEMENTS } = await import('../lib/constants')
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
        // Insert the 2 sub-steps right after the current step
        const newQueue = [...tierUpQueue]
        newQueue.splice(tierUpStep + 1, 0, ...subSteps)
        setTierUpQueue(newQueue)
      }

      const effectiveQueueLength = has2MinChoice ? tierUpQueue.length + 2 : tierUpQueue.length
      const isLastTierUpStep = tierUpStep === effectiveQueueLength - 1

      if (isLastTierUpStep) {
        // All tier-ups done — batch commit all gains + consequences + stamp evolutionsEnteredAt
        const gains: Array<{ unitId: string; descriptions: string[]; thresholdXp?: number | null }> = []
        for (const [unitId, groups] of pendingGainsRef.current) {
          for (const group of groups) {
            gains.push({ unitId, descriptions: group.descriptions, thresholdXp: group.thresholdXp })
          }
        }
        const consequences = buildConsequencesArray()
        const championKilledIds = buildChampionKilledIds()

        let completeResult: ServerResult<{ matchId: string }>
        if (onCompleteEvolutions) {
          completeResult = await onCompleteEvolutions(matchId, matchParticipantId, gains, consequences, championKilledIds)
        } else {
          const { completeEvolutionsWithGainsFn } = await import('../routes/match/$matchId/post-match')
          completeResult = await completeEvolutionsWithGainsFn({ data: { matchId, matchParticipantId, gains, consequences, championKilledIds } })
        }
        if (!completeResult.success) {
          setError(completeResult.error.message)
          setIsSubmitting(false)
          submittingRef.current = false
          return
        }
        // onComplete() navigates away — no need to reset submittingRef
        onComplete()
      } else {
        setTierUpStep((prev) => prev + 1)
        setIsSubmitting(false)
        submittingRef.current = false
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      setIsSubmitting(false)
      submittingRef.current = false
    }
  }

  // ---------------------------------------------------------------------------
  // Render — Phase 2 (tier-up flow)
  // ---------------------------------------------------------------------------

  if (phase === 'tierup') {
    const currentTierUp = tierUpQueue[tierUpStep]
    // H3 — defensive guard: queue/step could be in intermediate state during React batching
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!currentTierUp) return null
    const isLastTierUpStep = tierUpStep === tierUpQueue.length - 1
    const totalTierUps = tierUpQueue.length

    // For honour thresholds, dynamically filter out improvements already selected
    // in earlier tier-up steps of the same unit (within this session) — O(1) lookup
    let dynamicMinorImprovements = currentTierUp.minorImprovements
    if (currentTierUp.tierLabel === 'Honneur de bataille') {
      const priorSelections = cumulativeHonourSelectionsRef.current.get(currentTierUp.unitId)
      if (priorSelections && priorSelections.size > 0) {
        dynamicMinorImprovements = currentTierUp.minorImprovements.filter(
          (imp) => !priorSelections.has(imp.label)
        )
      }
    }

    // Compute disabled improvement IDs based on existingGains + session cumulative gains
    const unitData = units.find((u) => u.id === currentTierUp.unitId)
    const existingGains = unitData?.existingGains ?? []
    const sessionGains = cumulativeGainsRef.current.get(currentTierUp.unitId) ?? []
    const allGains = [...existingGains, ...sessionGains]

    const disabledIds: string[] = []
    const isCharacter = currentTierUp.unitType === 'Personnages'

    // Count occurrences of gain patterns
    const mouvCount = allGains.filter((g) => /Mouvement/i.test(g)).length
    const enduranceCount = allGains.filter((g) => /Endurance/i.test(g)).length
    const attaqueCount = allGains.filter((g) => /Attaque/i.test(g)).length
    const pvCount = allGains.filter((g) => /PV/i.test(g)).length

    // Disable +1 Mouvement if already taken (unit + char)
    if (mouvCount >= 1) {
      for (const imp of [...currentTierUp.majorImprovements, ...dynamicMinorImprovements]) {
        if (/Mouvement/i.test(imp.label)) disabledIds.push(imp.id)
      }
    }

    // Commandement cap constraint: disable improvements that would push Cd beyond STAT_CAP (10).
    // Only Commandement is capped per campaign rules — all other stats are uncapped.
    const capBlockedIds: string[] = []
    const unitEffective = unitData?.effectiveStats ?? {}
    const allImprovements = [...currentTierUp.majorImprovements, ...dynamicMinorImprovements]
    for (const imp of allImprovements) {
      const parsed = parseGainStat(imp.label)
      if (!parsed || parsed.stat !== CD_STAT || unitEffective[parsed.stat] == null) continue
      if ((UNCAPPED_STATS as readonly string[]).includes(parsed.stat)) continue
      // Session gains for Commandement
      const sessionDelta = sessionGains
        .map((g) => parseGainStat(g))
        .filter((p) => p?.stat === CD_STAT)
        .reduce((sum, p) => sum + (p?.delta ?? 0), 0)
      if ((unitEffective[parsed.stat] as number) + sessionDelta + parsed.delta > STAT_CAP) {
        capBlockedIds.push(imp.id)
        if (!disabledIds.includes(imp.id)) disabledIds.push(imp.id)
      }
    }

    if (isCharacter) {
      // Char: +1 PV max 2x
      if (pvCount >= 2) {
        for (const imp of currentTierUp.majorImprovements) {
          if (/PV/i.test(imp.label)) disabledIds.push(imp.id)
        }
      }
      // Char: +1 Attaque max 1x
      if (attaqueCount >= 1) {
        for (const imp of currentTierUp.majorImprovements) {
          if (/Attaque/i.test(imp.label) && !/CC|CT/i.test(imp.label)) disabledIds.push(imp.id)
        }
      }
    } else {
      // Unit: +1 Endurance max 1x
      if (enduranceCount >= 1) {
        for (const imp of currentTierUp.majorImprovements) {
          if (/Endurance/i.test(imp.label)) disabledIds.push(imp.id)
        }
      }
      // Unit: +1 Attaque max 1x
      if (attaqueCount >= 1) {
        for (const imp of currentTierUp.majorImprovements) {
          if (/Attaque/i.test(imp.label) && !/CC|CT/i.test(imp.label)) disabledIds.push(imp.id)
        }
      }
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Progress row with back and cancel buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', position: 'relative' }}>
          <button
            data-testid="wizard-back-button"
            onClick={() => {
              if (tierUpStep > 0) {
                // H1 fix: rollback cumulative refs for the current step before going back
                const currentEntry = tierUpQueue[tierUpStep]
                const prevSelections = submittedTierUpsByStepRef.current.get(tierUpStep)
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                if (prevSelections && currentEntry) {
                  // Remove from pendingGainsRef (grouped by threshold)
                  const pendingGroups = pendingGainsRef.current.get(currentEntry.unitId)
                  if (pendingGroups) {
                    const descriptionsToRemove = prevSelections.filter((d) => d !== '2 améliorations mineures')
                    const updatedGroups = pendingGroups
                      .map((group) => {
                        if (group.thresholdXp !== currentEntry.xp) return group
                        const updatedDescs = [...group.descriptions]
                        for (const desc of descriptionsToRemove) {
                          const idx = updatedDescs.indexOf(desc)
                          if (idx !== -1) updatedDescs.splice(idx, 1)
                        }
                        return { ...group, descriptions: updatedDescs }
                      })
                      .filter((group) => group.descriptions.length > 0)
                    if (updatedGroups.length > 0) {
                      pendingGainsRef.current.set(currentEntry.unitId, updatedGroups)
                    } else {
                      pendingGainsRef.current.delete(currentEntry.unitId)
                    }
                  }
                  // Remove from cumulativeGainsRef
                  const cumGains = cumulativeGainsRef.current.get(currentEntry.unitId)
                  if (cumGains) {
                    const descriptionsToRemove = prevSelections.filter((d) => d !== '2 améliorations mineures')
                    const updated = [...cumGains]
                    for (const desc of descriptionsToRemove) {
                      const idx = updated.indexOf(desc)
                      if (idx !== -1) updated.splice(idx, 1)
                    }
                    cumulativeGainsRef.current.set(currentEntry.unitId, updated)
                  }
                  // Remove from cumulativeHonourSelectionsRef
                  if (currentEntry.tierLabel === 'Honneur de bataille') {
                    const honours = cumulativeHonourSelectionsRef.current.get(currentEntry.unitId)
                    if (honours) {
                      for (const d of prevSelections) honours.delete(d)
                    }
                  }
                  // Clear the stored selections for this step
                  submittedTierUpsByStepRef.current.delete(tierUpStep)
                }
                setTierUpStep((prev) => prev - 1)
              } else {
                // AC: Risk 9 — if Phase 1.5 was present, return there; otherwise return to Phase 1
                if (flaggedUnitsRef.current.length > 0) {
                  setConsequenceIndex(flaggedUnitsRef.current.length - 1)
                  setPhase('consequences')
                } else {
                  // Return to Phase 1 last XP step
                  setPhase('xp')
                  setCurrentStep(units.length - 1)
                  const lastUnitId = units[units.length - 1]?.id
                  if (lastUnitId) {
                    xpResultsRef.current.delete(lastUnitId)
                    submittedUnitsRef.current.delete(lastUnitId)
                  }
                }
              }
            }}
            aria-label="Étape précédente"
            style={{
              position: 'absolute',
              left: 0,
              width: 30,
              height: 30,
              borderRadius: 999,
              border: 'none',
              background: '#334155',
              color: '#fff',
              fontWeight: 800,
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              fontSize: '1rem',
              padding: 0,
            }}
          >
            ‹
          </button>
          <p
            data-testid="wizard-progress"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.875rem',
              color: 'var(--color-text-secondary)',
              margin: 0,
              textAlign: 'center',
            }}
          >
            Amélioration {tierUpStep + 1} / {totalTierUps}
          </p>
          <button
            type="button"
            data-testid="wizard-cancel-button"
            onClick={onCancel}
            aria-label="Quitter"
            style={{
              position: 'absolute',
              right: 0,
              width: 30,
              height: 30,
              borderRadius: 999,
              border: 'none',
              background: 'var(--color-malus)',
              color: '#fff',
              fontWeight: 800,
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              fontSize: '1rem',
              padding: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Error message */}
        {error && (
          <p
            data-testid="wizard-error"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.875rem',
              color: '#b82c2c',
              margin: 0,
            }}
          >
            {error}
          </p>
        )}

        {/* TierUpStep — key resets internal useState when advancing to next step (C1) */}
        <TierUpStep
          key={tierUpStep}
          tierLabel={currentTierUp.tierLabel}
          majorImprovements={currentTierUp.majorImprovements}
          minorImprovements={dynamicMinorImprovements}
          majorCount={currentTierUp.majorCount}
          minorCount={currentTierUp.minorCount}
          unitName={currentTierUp.unitName}
          isMounted={currentTierUp.hasMount}
          confirmLabel={isLastTierUpStep ? 'Terminer' : 'Suivant'}
          disabledImprovementIds={disabledIds}
          capBlockedImprovementIds={capBlockedIds}
          onConfirm={(result) => void handleTierUpConfirm(result)}
        />

        {/* Completion marker (shown after last unit submitted) */}
        <span data-testid="wizard-complete" style={{ display: 'none' }} />
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render — Phase 1.5 (consequence flow)
  // ---------------------------------------------------------------------------

  if (phase === 'consequences') {
    const currentFlaggedUnit = flaggedUnitsRef.current[consequenceIndex]
    // Defensive guard
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!currentFlaggedUnit) return null
    const isCharacter = currentFlaggedUnit.type === 'Personnages'

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Progress row with back button and cancel button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', position: 'relative' }}>
          <button
            data-testid="wizard-back-button"
            onClick={handleConsequenceBack}
            aria-label="Étape précédente"
            style={{
              position: 'absolute',
              left: 0,
              width: 30,
              height: 30,
              borderRadius: 999,
              border: 'none',
              background: '#334155',
              color: '#fff',
              fontWeight: 800,
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              fontSize: '1rem',
              padding: 0,
            }}
          >
            ‹
          </button>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.875rem',
              color: 'var(--color-text-secondary)',
              margin: 0,
              textAlign: 'center',
            }}
          >
            {isCharacter ? 'Blessure' : 'Destruction'} — {currentFlaggedUnit.name}
          </p>
          <button
            type="button"
            data-testid="wizard-cancel-button"
            onClick={onCancel}
            aria-label="Quitter"
            style={{
              position: 'absolute',
              right: 0,
              width: 30,
              height: 30,
              borderRadius: 999,
              border: 'none',
              background: 'var(--color-malus)',
              color: '#fff',
              fontWeight: 800,
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              fontSize: '1rem',
              padding: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Consequence step — key resets internal state when index changes */}
        {isCharacter ? (
          <InjuryBonusStep
            key={consequenceIndex}
            unitName={currentFlaggedUnit.name}
            onConfirm={(result) => void handleConsequenceConfirm(result)}
          />
        ) : (
          <UnitDestructionStep
            key={consequenceIndex}
            unitName={currentFlaggedUnit.name}
            hasBannerGain={currentFlaggedUnit.existingGains.includes('Bannière gratuite')}
            onConfirm={(result) => void handleConsequenceConfirm(result)}
          />
        )}

        {/* Completion marker */}
        <span data-testid="wizard-complete" style={{ display: 'none' }} />
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render — Phase 1 (XP entry)
  // ---------------------------------------------------------------------------

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Progress row with optional back button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', position: 'relative' }}>
        {currentStep > 0 && (
          <button
            data-testid="wizard-back-button"
            onClick={() => {
              const prevStep = currentStep - 1
              const prevUnitId = units[prevStep]?.id
              if (prevUnitId) {
                submittedUnitsRef.current.delete(prevUnitId)
                // Task 7.14: also clear xpResults entry to avoid stale data
                xpResultsRef.current.delete(prevUnitId)
              }
              setCurrentStep(prevStep)
            }}
            aria-label="Unité précédente"
            style={{
              position: 'absolute',
              left: 0,
              width: 30,
              height: 30,
              borderRadius: 999,
              border: 'none',
              background: '#334155',
              color: '#fff',
              fontWeight: 800,
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              fontSize: '1rem',
              padding: 0,
            }}
          >
            ‹
          </button>
        )}
        <div style={{ textAlign: 'center' }}>
          {mode === 'initial-xp' && (
            <p
              data-testid="wizard-mode-header"
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--color-brand)',
                margin: '0 0 2px',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              XP initiale
            </p>
          )}
          <p
            data-testid="wizard-progress"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.875rem',
              color: 'var(--color-text-secondary)',
              margin: 0,
            }}
          >
            Unité {currentStep + 1} / {total}
          </p>
        </div>
        <button
          type="button"
          data-testid="wizard-cancel-button"
          onClick={onCancel}
          aria-label="Quitter"
          style={{
            position: 'absolute',
            right: 0,
            width: 30,
            height: 30,
            borderRadius: 999,
            border: 'none',
            background: 'var(--color-malus)',
            color: '#fff',
            fontWeight: 800,
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            fontSize: '1rem',
            padding: 0,
          }}
        >
          ✕
        </button>
      </div>

      {/* Unit info */}
      <div
        style={{
          background: '#fffbf5',
          border: '1px solid #e0d5c8',
          borderRadius: '8px',
          padding: '1rem',
        }}
      >
        <p
          data-testid="wizard-unit-name"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '1.25rem',
            color: 'var(--color-text-primary)',
            margin: '0 0 0.25rem',
          }}
        >
          {currentUnit.name}
        </p>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.875rem',
            color: 'var(--color-text-secondary)',
            margin: '0 0 0.5rem',
          }}
        >
          {currentUnit.type}
        </p>
      </div>

      {/* XP section — numeric input (initial-xp mode) or checkboxes (post-match mode) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {mode === 'initial-xp' ? (
          <div data-testid="wizard-xp-numeric">
            <label
              style={{
                display: 'block',
                fontFamily: 'var(--font-body)',
                fontSize: '0.875rem',
                color: 'var(--color-text-secondary)',
                marginBottom: '0.375rem',
              }}
            >
              XP totale
            </label>
            <input
              data-testid="wizard-xp-numeric-input"
              type="number"
              min={0}
              max={999}
              value={numericXpValue}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setNumericXpValue(Math.min(999, Math.max(0, parseInt(e.target.value, 10) || 0)))}
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '1rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid var(--color-separator)',
                background: 'var(--color-background)',
                color: 'var(--color-text-primary)',
                width: '100%',
                boxSizing: 'border-box',
              }}
            />
          </div>
        ) : (
          <>
        {showPreviousXpHint && currentUnit.previousXpGained != null && (
          <>
            <p
              data-testid="wizard-previous-xp"
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.8rem',
                color: 'var(--color-info)',
                margin: 0,
              }}
            >
              Précédemment : {currentUnit.previousXpGained} XP
            </p>
            {currentUnit.previousXpGained > 0 && xpGained === 0 && (
              <p
                data-testid="wizard-xp-warning"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.8rem',
                  color: 'var(--color-malus)',
                  margin: 0,
                }}
              >
                Attention : vous aviez précédemment gagné {currentUnit.previousXpGained} XP. Soumettre 0 XP remplacera cette valeur.
              </p>
            )}
          </>
        )}

        <div data-testid="wizard-xp-checkboxes" role="group" aria-label="Conditions d'XP">
          {(() => {
            const conditions = getXpConditionsForType(currentUnit.type)
            const baseConditions = conditions.filter((c) => c.group === 'base')
            const generalConditions = conditions.filter((c) => c.group === 'general')
            const exploitOrFeatConditions = conditions.filter((c) => c.group === 'exploit' || c.group === 'feat')
            const exploitFeatLabel = currentUnit.type === 'Personnages' ? 'Exploits' : 'Faits d\'armes'

            const toggleCondition = (id: string) => {
              setCheckedConditions((prev) => {
                const next = new Set(prev)
                next.has(id) ? next.delete(id) : next.add(id)
                return next
              })
            }

            const toggleGeneralCondition = (id: string) => {
              setCheckedConditions((prev) => {
                const next = new Set(prev)
                if (next.has(id)) {
                  // Uncheck — just remove it
                  next.delete(id)
                } else {
                  // Check — remove all other general conditions first (mutual exclusivity)
                  for (const gc of generalConditions) next.delete(gc.id)
                  next.add(id)
                }
                return next
              })
            }

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {baseConditions.map((c) => (
                  <label
                    key={c.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.5rem',
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.85rem',
                      color: 'var(--color-text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      data-testid={`xp-condition-${c.id}`}
                      type="checkbox"
                      checked={checkedConditions.has(c.id)}
                      onChange={() => toggleCondition(c.id)}
                      style={{ marginTop: '0.15rem' }}
                    />
                    <span>{c.label} <strong>+{c.xp} XP</strong></span>
                  </label>
                ))}

                {generalConditions.length > 0 && (
                  <fieldset
                    role="group"
                    aria-label="Général (un seul choix possible)"
                    style={{
                      border: 'none',
                      margin: 0,
                      padding: '0.25rem 0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}
                  >
                    {generalConditions.map((c) => (
                      <label
                        key={c.id}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.5rem',
                          fontFamily: 'var(--font-body)',
                          fontSize: '0.85rem',
                          color: 'var(--color-text-secondary)',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          data-testid={`xp-condition-${c.id}`}
                          type="checkbox"
                          checked={checkedConditions.has(c.id)}
                          onChange={() => toggleGeneralCondition(c.id)}
                          style={{ marginTop: '0.15rem' }}
                        />
                        <span>{c.label} <strong>+{c.xp} XP</strong></span>
                      </label>
                    ))}
                  </fieldset>
                )}

                {exploitOrFeatConditions.length > 0 && (
                  <>
                    <p
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                        margin: '0.25rem 0 0 0',
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em',
                      }}
                    >
                      {exploitFeatLabel}
                    </p>
                    {exploitOrFeatConditions.map((c) => (
                      <label
                        key={c.id}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.5rem',
                          fontFamily: 'var(--font-body)',
                          fontSize: '0.85rem',
                          color: 'var(--color-text-secondary)',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          data-testid={`xp-condition-${c.id}`}
                          type="checkbox"
                          checked={checkedConditions.has(c.id)}
                          onChange={() => toggleCondition(c.id)}
                          style={{ marginTop: '0.15rem' }}
                        />
                        <span>{c.label} <strong>+{c.xp} XP</strong></span>
                      </label>
                    ))}
                  </>
                )}
              </div>
            )
          })()}
        </div>

        <p
          data-testid="wizard-xp-total"
          aria-live="polite"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '1rem',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            margin: '0.25rem 0 0 0',
          }}
        >
          Total : {xpGained} XP
        </p>
          </>
        )}
      </div>

      {/* Past consequences inline — initial-xp mode only */}
      {mode === 'initial-xp' && campaignPlayers && (
        <InitialConsequenceStep
          unitId={currentUnit.id}
          unitType={currentUnit.type}
          campaignPlayers={campaignPlayers}
          consequences={initialConsequences.filter((c) => c.unitId === currentUnit.id)}
          onAdd={handleAddInitialConsequence}
          onRemove={(localId) => handleRemoveInitialConsequence(localId)}
        />
      )}

      {/* Consequence toggle — MHC for characters, Détruite for units (AC1, AC12) — post-match only */}
      {mode !== 'initial-xp' && (
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          cursor: 'pointer',
          fontFamily: 'var(--font-body)',
          fontSize: '0.875rem',
          fontWeight: 600,
          color: 'var(--color-malus)',
        }}
      >
        <input
          data-testid="consequence-toggle"
          type="checkbox"
          checked={isConsequenceChecked}
          onChange={(e) => {
            setIsConsequenceChecked(e.target.checked)
            consequenceFlagsRef.current.set(currentUnit.id, e.target.checked)
          }}
        />
        {currentUnit.type === 'Personnages' ? 'Mis Hors de Combat' : 'Détruite'}
      </label>
      )}

      {/* Champion killed in challenge — only for non-Personnages units that have a champion — post-match only */}
      {mode !== 'initial-xp' && currentUnit.type !== 'Personnages' && (currentUnit.existingGains ?? []).some((g) => g === 'Champion gratuit') && (
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--color-malus)',
          }}
        >
          <input
            data-testid="champion-killed-toggle"
            type="checkbox"
            checked={isChampionKilledChecked}
            onChange={(e) => {
              setIsChampionKilledChecked(e.target.checked)
              championFlagsRef.current.set(currentUnit.id, e.target.checked)
            }}
          />
          Champion tué en défi
        </label>
      )}

      {/* Error message */}
      {error && (
        <p
          data-testid="wizard-error"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.875rem',
            color: 'var(--color-malus)',
            margin: 0,
          }}
        >
          {error}
        </p>
      )}

      {/* Submit button — always "Suivant" during Phase 1 (Task 7.4) */}
      <button
        data-testid="wizard-next-button"
        onClick={() => void handleNext()}
        disabled={isSubmitting}
        style={{
          fontFamily: 'var(--font-body)',
          fontWeight: 600,
          fontSize: '1rem',
          minHeight: '44px',
          padding: '0.625rem 1rem',
          borderRadius: '8px',
          background: isSubmitting ? '#9aa0a6' : '#334155',
          color: '#fff',
          border: 'none',
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
          opacity: isSubmitting ? 0.7 : 1,
        }}
      >
        Suivant
      </button>

      {/* Completion marker (shown after last unit submitted) */}
      <span data-testid="wizard-complete" style={{ display: 'none' }} />
    </div>
  )
}
