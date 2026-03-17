// Campaign TOW — PostMatchWizard component
// Story 4.1: Sequential post-match XP entry wizard
// Presents each unit one at a time for XP entry.

import { useState, useRef } from 'react'
import type { ServerResult } from '../lib/types'

export type PostMatchWizardProps = {
  matchId: string
  matchParticipantId: string
  units: Array<{ id: string; name: string; type: string; xp: number }>
  onComplete: () => void
  /** Optional: inject custom submit function (for testing). Defaults to submitUnitXpFn. */
  onSubmitUnitXp?: (unitId: string, xpGained: number) => Promise<ServerResult<{ unitId: string; newXp: number }>>
  /** Optional: inject custom complete function (for testing). Defaults to completeEvolutionsFn. */
  onCompleteEvolutions?: (matchId: string) => Promise<ServerResult<{ matchId: string }>>
}

export function PostMatchWizard({
  matchId,
  units,
  onComplete,
  onSubmitUnitXp,
  onCompleteEvolutions,
}: PostMatchWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [xpGained, setXpGained] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
  const isLastStep = currentStep === units.length - 1
  const total = units.length

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

      if (!alreadySubmitted) {
        let submitResult: ServerResult<{ unitId: string; newXp: number }>
        if (onSubmitUnitXp) {
          submitResult = await onSubmitUnitXp(currentUnit.id, Math.floor(xpGained))
        } else {
          // Dynamic import to avoid bundling server fn into client
          const { submitUnitXpFn } = await import('../routes/match/$matchId/post-match')
          submitResult = await submitUnitXpFn({ data: { unitId: currentUnit.id, xpGained: Math.floor(xpGained) } })
        }

        if (!submitResult.success) {
          setError(submitResult.error.message)
          setIsSubmitting(false)
          submittingRef.current = false
          return
        }

        // Mark this unit as successfully submitted
        submittedUnitsRef.current.add(currentUnit.id)
      }

      if (isLastStep) {
        // Last unit — call completeEvolutions then navigate
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
        // Advance to next unit
        setCurrentStep((prev) => prev + 1)
        setXpGained(0)
        setIsSubmitting(false)
        submittingRef.current = false
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      setIsSubmitting(false)
      submittingRef.current = false
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Progress indicator */}
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
          XP actuel : {currentUnit.xp}
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
          XP gagné
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

      {/* Submit button */}
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
        {isLastStep ? 'Terminer' : 'Suivant'}
      </button>

      {/* Completion marker (shown after last unit submitted) */}
      <span data-testid="wizard-complete" style={{ display: 'none' }} />
    </div>
  )
}
