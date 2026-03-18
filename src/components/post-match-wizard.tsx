// Campaign TOW — PostMatchWizard component
// Story 4.1: Sequential post-match XP entry wizard
// Story 4.2: 2-phase flow — XP entry (Phase 1) then tier-up improvements (Phase 2)

import { useState, useRef, useEffect } from 'react'
import { TierUpStep } from './tier-up-step'
import { detectTierCrossings } from '../lib/tier'
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
}

export type PostMatchWizardProps = {
  matchId: string
  matchParticipantId: string
  units: Array<{ id: string; name: string; type: string; xp: number; previousXpGained?: number | null; hasMount?: boolean }>
  onComplete: () => void
  onCancel: () => void
  /** Optional: inject custom submit function (for testing). Defaults to submitUnitXpFn. */
  onSubmitUnitXp?: (unitId: string, xpGained: number, matchParticipantId: string) => Promise<ServerResult<{ unitId: string; newXp: number }>>
  /** Optional: inject custom complete function (for testing). Defaults to completeEvolutionsFn. */
  onCompleteEvolutions?: (matchId: string) => Promise<ServerResult<{ matchId: string }>>
  /** Optional: inject custom tier-up submit function (for testing). Defaults to submitTierUpFn. */
  onSubmitTierUp?: (unitId: string, matchParticipantId: string, improvements: Array<{ description: string }>) => Promise<ServerResult<{ unitId: string; gainsCreated: number }>>
}

export function PostMatchWizard({
  matchId,
  matchParticipantId,
  units,
  onComplete,
  onCancel,
  onSubmitUnitXp,
  onCompleteEvolutions,
  onSubmitTierUp,
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
  }, [currentStep]) // intentionally excludes `units` — see comment above

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
        await onCompleteEvolutions(matchId)
      } else {
        const { completeEvolutionsFn } = await import('../routes/match/$matchId/post-match')
        await completeEvolutionsFn({ data: { matchId } })
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
      // oldXp = unit.xp (current XP before this wizard submission).
      // newXp = server-returned value (or re-use existing if already submitted).
      if (newXp !== null) {
        xpResultsRef.current.set(currentUnit.id, {
          oldXp: currentUnit.xp,
          newXp,
        })
      } else {
        // Unit was already submitted — keep previous result (don't overwrite)
        if (!xpResultsRef.current.has(currentUnit.id)) {
          // Fallback: no crossing possible
          xpResultsRef.current.set(currentUnit.id, { oldXp: currentUnit.xp, newXp: currentUnit.xp })
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
          for (const crossing of crossings) {
            queue.push({
              ...crossing,
              unitId: unit.id,
              unitName: unit.name,
              unitType: unit.type,
              hasMount: unit.hasMount ?? false,
            })
          }
        }

        if (queue.length === 0) {
          // No tier crossings — call completeEvolutions directly
          let completeResult: ServerResult<{ matchId: string }>
          if (onCompleteEvolutions) {
            completeResult = await onCompleteEvolutions(matchId)
          } else {
            const { completeEvolutionsFn } = await import('../routes/match/$matchId/post-match')
            completeResult = await completeEvolutionsFn({ data: { matchId } })
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
      const improvements = result.descriptions.map((d) => ({ description: d }))

      let submitResult: ServerResult<{ unitId: string; gainsCreated: number }>
      if (onSubmitTierUp) {
        submitResult = await onSubmitTierUp(currentTierUp.unitId, matchParticipantId, improvements)
      } else {
        const { submitTierUpFn } = await import('../routes/match/$matchId/post-match')
        submitResult = await submitTierUpFn({
          data: { unitId: currentTierUp.unitId, matchParticipantId, improvements },
        })
      }

      if (!submitResult.success) {
        setError(submitResult.error.message)
        setIsSubmitting(false)
        submittingRef.current = false
        return
      }

      // Store selections for back-button restore (ref-based to avoid re-renders)
      submittedTierUpsByStepRef.current.set(tierUpStep, result.descriptions)

      const isLastTierUpStep = tierUpStep === tierUpQueue.length - 1

      if (isLastTierUpStep) {
        // All tier-ups done — call completeEvolutions
        let completeResult: ServerResult<{ matchId: string }>
        if (onCompleteEvolutions) {
          completeResult = await onCompleteEvolutions(matchId)
        } else {
          const { completeEvolutionsFn } = await import('../routes/match/$matchId/post-match')
          completeResult = await completeEvolutionsFn({ data: { matchId } })
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
    if (!currentTierUp) return null
    const isLastTierUpStep = tierUpStep === tierUpQueue.length - 1
    const totalTierUps = tierUpQueue.length

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Progress row with back and cancel buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', position: 'relative' }}>
          <button
            data-testid="wizard-back-button"
            onClick={() => {
              if (tierUpStep > 0) {
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
          minorImprovements={currentTierUp.minorImprovements}
          majorCount={currentTierUp.majorCount}
          minorCount={currentTierUp.minorCount}
          unitName={currentTierUp.unitName}
          isMounted={currentTierUp.hasMount}
          confirmLabel={isLastTierUpStep ? 'Terminer' : 'Suivant'}
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
