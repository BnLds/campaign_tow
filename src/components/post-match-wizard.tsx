// Campaign TOW — PostMatchWizard component
// Story 4.1: Sequential post-match XP entry wizard
// Story 4.2: 2-phase flow — XP entry (Phase 1) then tier-up improvements (Phase 2)

import { useState, useRef, useEffect } from 'react'
import { TierUpStep } from './tier-up-step'
import { detectTierCrossings } from '../lib/tier'
import { parseGainStat, STAT_CAP, UNCAPPED_STATS } from '../lib/delta-composer'
import type { ThresholdEntry } from '../lib/constants'
import type { ServerResult } from '../lib/types'

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
  units: Array<{ id: string; name: string; type: string; xp: number; previousXpGained?: number | null; hasMount?: boolean; existingGains?: string[]; commandement?: number; effectiveStats?: Record<string, number | null> }>
  onComplete: () => void
  onCancel: () => void
  /** Optional: inject custom submit function (for testing). Defaults to submitUnitXpFn. */
  onSubmitUnitXp?: (unitId: string, xpGained: number, matchParticipantId: string) => Promise<ServerResult<{ unitId: string; newXp: number }>>
  /** Batch commit: completes evolutions with all accumulated gains. Called once at the end.
   *  gains=[] for the no-tierup path. */
  onCompleteEvolutions?: (matchId: string, matchParticipantId: string, gains: Array<{ unitId: string; descriptions: string[] }>) => Promise<ServerResult<{ matchId: string }>>
}

export function PostMatchWizard({
  matchId,
  matchParticipantId,
  units,
  onComplete,
  onCancel,
  onSubmitUnitXp,
  onCompleteEvolutions,
}: PostMatchWizardProps) {
  // Phase 1 state
  const [currentStep, setCurrentStep] = useState(0)
  const [xpGained, setXpGained] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Phase 2 state
  const [phase, setPhase] = useState<'xp' | 'tierup'>('xp')
  const [tierUpQueue, setTierUpQueue] = useState<TierUpQueueEntry[]>([])
  const [tierUpStep, setTierUpStep] = useState(0)
  // Track tier-up selections per step for potential back-button restore (ref to avoid re-renders)
  const submittedTierUpsByStepRef = useRef<Map<number, string[]>>(new Map())
  // Cumulative map: unitId → Set of honour descriptions already selected in this session
  // Avoids O(N²) rescanning of prior steps during Phase 2 render
  const cumulativeHonourSelectionsRef = useRef<Map<string, Set<string>>>(new Map())
  // Cumulative map: unitId → all gain descriptions selected in this session (for constraint checks)
  const cumulativeGainsRef = useRef<Map<string, string[]>>(new Map())
  // Pending gains to batch-commit at the end (unitId → descriptions[])
  const pendingGainsRef = useRef<Map<string, string[]>>(new Map())

  // XP results collected during Phase 1 (useRef to avoid re-renders on each submit)
  const xpResultsRef = useRef<Map<string, { oldXp: number; newXp: number }>>(new Map())

  // Pre-fill XP input from previousXpGained when step changes (AC2)
  useEffect(() => {
    const submitted = submittedXpByStep.current.get(currentStep)
    if (submitted !== undefined) {
      setXpGained(submitted)
    } else {
      const prevXp = (units[currentStep] as typeof units[0] | undefined)?.previousXpGained
      setXpGained(prevXp ?? 0)
    }
  }, [currentStep, units])

  // Track XP values entered by the player per step (for back-button pre-fill)
  const submittedXpByStep = useRef<Map<number, number>>(new Map())
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
  const isLastXpStep = currentStep === units.length - 1
  const total = units.length

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
        let submitResult: ServerResult<{ unitId: string; newXp: number }>
        if (onSubmitUnitXp) {
          submitResult = await onSubmitUnitXp(currentUnit.id, Math.floor(xpGained), matchParticipantId)
        } else {
          // Dynamic import to avoid bundling server fn into client
          const { submitUnitXpFn } = await import('../routes/match/$matchId/post-match')
          submitResult = await submitUnitXpFn({ data: { matchParticipantId, unitId: currentUnit.id, xpGained: Math.floor(xpGained) } })
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
      // oldXp = pre-match XP (before any XP from this match was applied).
      // On first run: previousXpGained is null/0, so preMatchXp = currentUnit.xp.
      // On resume: previousXpGained > 0, and currentUnit.xp already includes it,
      // so preMatchXp = currentUnit.xp - previousXpGained = true pre-match XP.
      const preMatchXp = currentUnit.xp - (currentUnit.previousXpGained ?? 0)
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
        // All XP entered — compute tier crossings
        const queue: TierUpQueueEntry[] = []
        for (const unit of units) {
          const result = xpResultsRef.current.get(unit.id)
          if (!result) {
            // M3 — no xpResults entry means the unit was never submitted; treat as no XP gain (no crossing possible)
            console.warn(`[PostMatchWizard] No XP result found for unit ${unit.id} (${unit.name}). Treating as 0 XP gained — no tier crossing.`)
            continue
          }
          const crossings = detectTierCrossings(result.oldXp, result.newXp, unit.type)
          const existingGains = unit.existingGains ?? []
          for (const crossing of crossings) {
            // For honour thresholds, filter out already-acquired improvements from DB
            const isHonour = crossing.tierLabel === 'Honneur de bataille'
            let filteredMinor = crossing.minorImprovements
            if (isHonour) {
              filteredMinor = crossing.minorImprovements.filter((imp) => !existingGains.includes(imp.label))
            }
            // Skip honour step entirely if no options remain
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
            // Expand multi-selection entries into sequential single-pick steps
            queue.push(...expandQueueEntry(baseEntry))
          }
        }

        if (queue.length === 0) {
          // No tier crossings — call completeEvolutions with empty gains
          let completeResult: ServerResult<{ matchId: string }>
          if (onCompleteEvolutions) {
            completeResult = await onCompleteEvolutions(matchId, matchParticipantId, [])
          } else {
            const { completeEvolutionsWithGainsFn } = await import('../routes/match/$matchId/post-match')
            completeResult = await completeEvolutionsWithGainsFn({ data: { matchId, matchParticipantId, gains: [] } })
          }
          if (!completeResult.success) {
            setError(completeResult.error.message)
            setIsSubmitting(false)
            submittingRef.current = false
            return
          }
          onComplete()
        } else {
          // Tier crossings exist — transition to Phase 2
          setTierUpQueue(queue)
          setTierUpStep(0)
          setPhase('tierup')
          setIsSubmitting(false)
          submittingRef.current = false
        }
      } else {
        // Record the submitted XP value for this step (for back-button pre-fill)
        submittedXpByStep.current.set(currentStep, xpGained)
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
      // Descriptions to actually save as gains (exclude "2 améliorations mineures" placeholder)
      const descriptionsToSave = has2MinChoice
        ? result.descriptions.filter((d) => d !== '2 améliorations mineures')
        : result.descriptions

      // Accumulate gains in pendingGainsRef (NOT submitted to server yet)
      if (descriptionsToSave.length > 0) {
        const existing = pendingGainsRef.current.get(currentTierUp.unitId) ?? []
        pendingGainsRef.current.set(currentTierUp.unitId, [...existing, ...descriptionsToSave])
      }

      // Store selections for back-button restore (ref-based to avoid re-renders)
      submittedTierUpsByStepRef.current.set(tierUpStep, result.descriptions)

      // Update cumulative gains for this unit (for constraint checks on subsequent steps)
      const existingCumulative = cumulativeGainsRef.current.get(currentTierUp.unitId) ?? []
      cumulativeGainsRef.current.set(currentTierUp.unitId, [...existingCumulative, ...descriptionsToSave])

      // Update cumulative honour selections for this unit (O(1) lookup in render)
      if (currentTierUp.tierLabel === 'Honneur de bataille') {
        const existing = cumulativeHonourSelectionsRef.current.get(currentTierUp.unitId) ?? new Set()
        for (const d of result.descriptions) existing.add(d)
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
        // All tier-ups done — batch commit all gains + stamp evolutionsEnteredAt
        const gains: Array<{ unitId: string; descriptions: string[] }> = []
        for (const [unitId, descriptions] of pendingGainsRef.current) {
          gains.push({ unitId, descriptions })
        }

        let completeResult: ServerResult<{ matchId: string }>
        if (onCompleteEvolutions) {
          completeResult = await onCompleteEvolutions(matchId, matchParticipantId, gains)
        } else {
          const { completeEvolutionsWithGainsFn } = await import('../routes/match/$matchId/post-match')
          completeResult = await completeEvolutionsWithGainsFn({ data: { matchId, matchParticipantId, gains } })
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

    // Generic stat cap constraint: disable improvements that would push a stat beyond STAT_CAP
    const capBlockedIds: string[] = []
    const unitEffective = unitData?.effectiveStats ?? {}
    const allImprovements = [...currentTierUp.majorImprovements, ...dynamicMinorImprovements]
    for (const imp of allImprovements) {
      const parsed = parseGainStat(imp.label)
      if (!parsed || unitEffective[parsed.stat] == null) continue
      if ((UNCAPPED_STATS as readonly string[]).includes(parsed.stat)) continue
      // Session gains for this stat
      const sessionDelta = sessionGains
        .map((g) => parseGainStat(g))
        .filter((p) => p?.stat === parsed.stat)
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
                if (prevSelections && currentEntry) {
                  // Remove from pendingGainsRef
                  const pending = pendingGainsRef.current.get(currentEntry.unitId)
                  if (pending) {
                    const descriptionsToRemove = prevSelections.filter((d) => d !== '2 améliorations mineures')
                    const updated = [...pending]
                    for (const desc of descriptionsToRemove) {
                      const idx = updated.indexOf(desc)
                      if (idx !== -1) updated.splice(idx, 1)
                    }
                    if (updated.length > 0) {
                      pendingGainsRef.current.set(currentEntry.unitId, updated)
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
                // Return to Phase 1 last XP step
                setPhase('xp')
                setCurrentStep(units.length - 1)
                // Clear xpResults for last unit to avoid stale data
                const lastUnitId = units[units.length - 1]?.id
                if (lastUnitId) {
                  xpResultsRef.current.delete(lastUnitId)
                  submittedUnitsRef.current.delete(lastUnitId)
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
          Unité {currentStep + 1} / {total}
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
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.875rem',
            color: 'var(--color-text-secondary)',
            margin: 0,
          }}
        >
          XP avant cette partie : {currentUnit.xp - (currentUnit.previousXpGained ?? 0)}
        </p>
      </div>

      {/* XP input */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label
          htmlFor="wizard-xp-input"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.875rem',
            color: 'var(--color-text-primary)',
          }}
        >
          XP gagné lors de cette partie
        </label>
        <input
          id="wizard-xp-input"
          data-testid="wizard-xp-input"
          type="number"
          inputMode="numeric"
          step="1"
          pattern="[0-9]*"
          min={0}
          max={99}
          value={xpGained}
          onChange={(e) => {
            // Fix 5 — clamp value to prevent NaN from non-numeric input
            const val = Number(e.target.value)
            setXpGained(isNaN(val) ? 0 : Math.max(0, Math.min(99, Math.floor(val))))
          }}
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '1rem',
            padding: '0.5rem 0.75rem',
            border: '1px solid #e0d5c8',
            borderRadius: '6px',
            background: '#fffbf5',
            color: 'var(--color-text-primary)',
            width: '100%',
            boxSizing: 'border-box',
          }}
        />
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
