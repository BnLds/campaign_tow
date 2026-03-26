// Campaign TOW — PhaseXp component
// Phase 1 (XP entry): checkbox conditions or numeric input per unit.

import { useState } from 'react'
import { getXpConditionsForType, computeXpTotal } from '../../lib/xp-conditions'
import { InitialConsequenceStep } from '../initial-consequence-step'
import type { InitialConsequenceItem } from '../initial-consequence-step'
import type { WizardUnit, ConsequenceEntry } from './types'
import { WizardHeader } from './wizard-header'

// ---------------------------------------------------------------------------
// XP data snapshot passed to onNext
// ---------------------------------------------------------------------------

export type XpData = {
  checkedConditions: Set<string>
  numericXpValue: number
  bonusXp: number
  isConsequenceChecked: boolean
  isChampionKilledChecked: boolean
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type PhaseXpProps = {
  unit: WizardUnit
  currentStep: number
  total: number
  mode: 'post-match' | 'initial-xp'
  catchupBonusXp?: number
  catchupDeltaXp?: number
  // Pre-fill state from orchestrator (for back-nav restore)
  savedCheckedConditions?: Set<string>
  savedConsequenceChecked?: boolean
  savedChampionKilledChecked?: boolean
  // initial-xp mode: orchestrator-owned consequences (accumulates across steps)
  initialConsequences?: InitialConsequenceItem[]
  campaignPlayers?: Array<{ playerId: string; playerDisplayName: string }>
  onAddInitialConsequence?: (entry: ConsequenceEntry) => void
  onRemoveInitialConsequence?: (localId: number) => void
  // Consequence/champion flag sync callbacks (post-match mode)
  onConsequenceChange?: (unitId: string, checked: boolean) => void
  onChampionKilledChange?: (unitId: string, checked: boolean) => void
  // Navigation callbacks
  onNext: (xpData: XpData) => Promise<void>
  onBack?: () => void
  onCancel: () => void
}

export function PhaseXp({
  unit,
  currentStep,
  total,
  mode,
  catchupBonusXp,
  catchupDeltaXp,
  savedCheckedConditions,
  savedConsequenceChecked = false,
  savedChampionKilledChecked = false,
  initialConsequences,
  campaignPlayers,
  onAddInitialConsequence,
  onRemoveInitialConsequence,
  onConsequenceChange,
  onChampionKilledChange,
  onNext,
  onBack,
  onCancel,
}: PhaseXpProps) {
  // Initialize state from saved values (set when component mounts via key reset)
  const [checkedConditions, setCheckedConditions] = useState<Set<string>>(() => {
    if (mode !== 'initial-xp' && savedCheckedConditions !== undefined) {
      return new Set(savedCheckedConditions)
    }
    return new Set()
  })

  const [numericXpValue, setNumericXpValue] = useState<number>(() => {
    if (mode === 'initial-xp') {
      const prevXp = unit.previousXpGained
      return prevXp != null && prevXp > 0 ? prevXp : 0
    }
    return 0
  })

  const [bonusXp, setBonusXp] = useState(() => catchupBonusXp ?? 0)

  // Derived — not state. Must recalculate when `unit` prop changes (e.g. rerender with fresh loader data).
  const showPreviousXpHint = (() => {
    if (mode === 'initial-xp') return false
    if (savedCheckedConditions !== undefined) return false
    const prevXp = unit.previousXpGained
    return prevXp != null && prevXp > 0
  })()

  const [isConsequenceChecked, setIsConsequenceChecked] = useState(savedConsequenceChecked)
  const [isChampionKilledChecked, setIsChampionKilledChecked] = useState(savedChampionKilledChecked)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const xpGained = computeXpTotal(checkedConditions, unit.type)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      await onNext({
        checkedConditions,
        numericXpValue,
        bonusXp,
        isConsequenceChecked,
        isChampionKilledChecked,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setIsSubmitting(false)
    }
  }

  // XP conditions (post-match mode)
  const conditions = mode !== 'initial-xp' ? getXpConditionsForType(unit.type) : []
  const baseConditions = conditions.filter((c) => c.group === 'base')
  const generalConditions = conditions.filter((c) => c.group === 'general')
  const exploitOrFeatConditions = conditions.filter((c) => c.group === 'exploit' || c.group === 'feat')
  const exploitFeatLabel = unit.type === 'Personnages' ? 'Exploits' : "Faits d'armes"

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
        next.delete(id)
      } else {
        for (const gc of generalConditions) next.delete(gc.id)
        next.add(id)
      }
      return next
    })
  }

  const modeHeader = mode === 'initial-xp' ? 'XP initiale' : undefined

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Progress row with optional back button */}
      <WizardHeader
        onBack={onBack}
        onCancel={onCancel}
        progressLabel={`Unité ${currentStep + 1} / ${total}`}
        backAriaLabel="Unité précédente"
        modeHeader={modeHeader}
      />

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
          {unit.name}
        </p>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.875rem',
            color: 'var(--color-text-secondary)',
            margin: '0 0 0.5rem',
          }}
        >
          {unit.type}
        </p>
      </div>

      {/* Bonus rattrapage stepper — post-match mode only */}
      {mode === 'post-match' && (
        <div data-testid="bonus-xp-section" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text-primary)', margin: 0 }}>
            Bonus rattrapage
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              data-testid="bonus-xp-decrement"
              disabled={bonusXp === 0}
              onClick={() => setBonusXp((v) => Math.max(0, v - 1))}
              style={{
                width: 44, height: 44, minWidth: 44, borderRadius: 8,
                background: '#334155',
                color: '#fff', border: 'none', fontSize: '1.25rem', fontWeight: 700,
                cursor: bonusXp === 0 ? 'not-allowed' : 'pointer',
                opacity: bonusXp === 0 ? 0.4 : 1,
                display: 'grid', placeItems: 'center',
              }}
            >
              −
            </button>
            <span
              data-testid="bonus-xp-value"
              style={{ fontWeight: 700, fontSize: '1rem', minWidth: '2rem', textAlign: 'center' }}
            >
              {bonusXp}
            </span>
            <button
              type="button"
              data-testid="bonus-xp-increment"
              onClick={() => setBonusXp((v) => Math.min(50, v + 1))}
              style={{
                width: 44, height: 44, minWidth: 44, borderRadius: 8,
                background: '#334155', color: '#fff', border: 'none',
                fontSize: '1.25rem', fontWeight: 700, cursor: 'pointer',
                display: 'grid', placeItems: 'center',
              }}
            >
              +
            </button>
          </div>
          {(catchupBonusXp ?? 0) > 0 && (
            <p data-testid="bonus-xp-hint" style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: 0 }}>
              Suggestion : +{catchupBonusXp} (écart de {catchupDeltaXp} XP)
            </p>
          )}
        </div>
      )}

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
            {showPreviousXpHint && unit.previousXpGained != null && (
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
                  Précédemment : {unit.previousXpGained} XP
                </p>
                {unit.previousXpGained > 0 && xpGained === 0 && (
                  <p
                    data-testid="wizard-xp-warning"
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.8rem',
                      color: 'var(--color-malus)',
                      margin: 0,
                    }}
                  >
                    Attention : vous aviez précédemment gagné {unit.previousXpGained} XP. Soumettre 0 XP remplacera cette valeur.
                  </p>
                )}
              </>
            )}

            <div data-testid="wizard-xp-checkboxes" role="group" aria-label="Conditions d'XP">
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
              {bonusXp > 0 ? `Total : ${xpGained} + ${bonusXp} bonus = ${xpGained + bonusXp} XP` : `Total : ${xpGained} XP`}
            </p>
          </>
        )}
      </div>

      {/* Past consequences inline — initial-xp mode only */}
      {mode === 'initial-xp' && campaignPlayers && onAddInitialConsequence && onRemoveInitialConsequence && (
        <InitialConsequenceStep
          unitId={unit.id}
          unitType={unit.type}
          campaignPlayers={campaignPlayers}
          consequences={(initialConsequences ?? []).filter((c) => c.unitId === unit.id)}
          onAdd={onAddInitialConsequence}
          onRemove={(localId) => onRemoveInitialConsequence(localId)}
        />
      )}

      {/* Consequence toggle — MHC for characters, Détruite for units (post-match only) */}
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
              onConsequenceChange?.(unit.id, e.target.checked)
            }}
          />
          {unit.type === 'Personnages' ? 'Mis Hors de Combat' : 'Détruite'}
        </label>
      )}

      {/* Champion killed in challenge — only for non-Personnages units that have a champion (post-match only) */}
      {mode !== 'initial-xp' && unit.type !== 'Personnages' && (unit.existingGains ?? []).some((g) => g.type === 'honour_champion') && (
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
              onChampionKilledChange?.(unit.id, e.target.checked)
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

      {/* Submit button */}
      <button
        data-testid="wizard-next-button"
        onClick={() => void handleSubmit()}
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

      {/* Completion marker */}
      <span data-testid="wizard-complete" style={{ display: 'none' }} />
    </div>
  )
}
