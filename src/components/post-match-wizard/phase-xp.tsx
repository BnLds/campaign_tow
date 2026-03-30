// Campaign TOW — PhaseXp component
// Phase 1 (XP entry): checkbox conditions or numeric input per unit.

import { useState } from 'react'
import { useHasScrolled } from './use-has-scrolled'
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
  const [stickyRef, hasScrolled] = useHasScrolled<HTMLDivElement>()

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
    <div className="flex flex-col">
      {/* Sticky wrapper: WizardHeader + unit info */}
      <div ref={stickyRef} className="relative sticky top-0 z-10 bg-[var(--color-bg)] pb-5">
        {/* Progress row with optional back button */}
        <WizardHeader
          onBack={onBack}
          onCancel={onCancel}
          progressLabel={`Unité ${currentStep + 1} / ${total}`}
          backAriaLabel="Unité précédente"
          modeHeader={modeHeader}
        />

        {/* Unit info */}
        <div className="mt-5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
          <p
            data-testid="wizard-unit-name"
            className="font-[family-name:var(--font-display)] font-bold text-xl text-[var(--color-text-primary)] mb-1"
          >
            {unit.nickname ? `${unit.nickname}, ${unit.name}` : unit.name}
          </p>
          <p className="font-[family-name:var(--font-body)] text-sm text-[var(--color-text-secondary)] mb-2">
            {unit.type}
          </p>
        </div>
        <div className={`absolute left-0 right-0 bottom-0 h-6 translate-y-full pointer-events-none z-10 bg-fade-down transition-opacity duration-200 ${hasScrolled ? 'opacity-100' : 'opacity-0'}`} />
      </div>

      {/* Content wrapper */}
      <div className="flex flex-col gap-5">
        {/* Bonus rattrapage stepper — post-match mode only */}
        {mode === 'post-match' && (
          <div data-testid="bonus-xp-section" className="flex flex-col gap-1">
            <p className="font-[family-name:var(--font-body)] font-semibold text-sm text-[var(--color-text-primary)] m-0">
              Bonus rattrapage
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                data-testid="bonus-xp-decrement"
                disabled={bonusXp === 0}
                onClick={() => setBonusXp((v) => Math.max(0, v - 1))}
                className={`size-11 min-w-11 rounded-lg bg-[var(--color-brand)] text-white border-none text-xl font-bold grid place-items-center${bonusXp === 0 ? ' opacity-40 cursor-not-allowed' : ' cursor-pointer'}`}
              >
                −
              </button>
              <span
                data-testid="bonus-xp-value"
                className="font-bold text-base min-w-8 text-center"
              >
                {bonusXp}
              </span>
              <button
                type="button"
                data-testid="bonus-xp-increment"
                onClick={() => setBonusXp((v) => Math.min(50, v + 1))}
                className="size-11 min-w-11 rounded-lg bg-[var(--color-brand)] text-white border-none text-xl font-bold grid place-items-center cursor-pointer"
              >
                +
              </button>
            </div>
            {(catchupBonusXp ?? 0) > 0 && (
              <p data-testid="bonus-xp-hint" className="font-[family-name:var(--font-body)] text-xs text-[var(--color-text-secondary)] m-0">
                Suggestion : +{catchupBonusXp} (écart de {catchupDeltaXp} XP)
              </p>
            )}
          </div>
        )}

        {/* XP section — numeric input (initial-xp mode) or checkboxes (post-match mode) */}
        <div className="flex flex-col gap-2">
          {mode === 'initial-xp' ? (
            <div data-testid="wizard-xp-numeric">
              <label
                className="block font-[family-name:var(--font-body)] text-sm text-[var(--color-text-secondary)] mb-1.5"
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
                className="font-[family-name:var(--font-body)] text-base px-3 py-2 rounded-md border border-[var(--color-separator)] bg-[var(--color-bg)] text-[var(--color-text-primary)] w-full"
              />
            </div>
          ) : (
            <>
              {showPreviousXpHint && unit.previousXpGained != null && (
                <>
                  <p
                    data-testid="wizard-previous-xp"
                    className="font-[family-name:var(--font-body)] text-[0.8rem] text-[var(--color-info)] m-0"
                  >
                    Précédemment : {unit.previousXpGained} XP
                  </p>
                  {unit.previousXpGained > 0 && xpGained === 0 && (
                    <p
                      data-testid="wizard-xp-warning"
                      className="font-[family-name:var(--font-body)] text-[0.8rem] text-[var(--color-malus)] m-0"
                    >
                      Attention : vous aviez précédemment gagné {unit.previousXpGained} XP. Soumettre 0 XP remplacera cette valeur.
                    </p>
                  )}
                </>
              )}

              <div data-testid="wizard-xp-checkboxes" role="group" aria-label="Conditions d'XP">
                <div className="flex flex-col gap-2">
                  {baseConditions.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-start gap-2 font-[family-name:var(--font-body)] text-[0.85rem] text-[var(--color-text-secondary)] cursor-pointer"
                    >
                      <input
                        data-testid={`xp-condition-${c.id}`}
                        type="checkbox"
                        checked={checkedConditions.has(c.id)}
                        onChange={() => toggleCondition(c.id)}
                        className="mt-[0.15rem]"
                      />
                      <span>{c.label} <strong>+{c.xp} XP</strong></span>
                    </label>
                  ))}

                  {generalConditions.length > 0 && (
                    <fieldset
                      role="group"
                      aria-label="Général (un seul choix possible)"
                      className="border-none m-0 py-1 px-0 flex flex-col gap-2"
                    >
                      {generalConditions.map((c) => (
                        <label
                          key={c.id}
                          className="flex items-start gap-2 font-[family-name:var(--font-body)] text-[0.85rem] text-[var(--color-text-secondary)] cursor-pointer"
                        >
                          <input
                            data-testid={`xp-condition-${c.id}`}
                            type="checkbox"
                            checked={checkedConditions.has(c.id)}
                            onChange={() => toggleGeneralCondition(c.id)}
                            className="mt-[0.15rem]"
                          />
                          <span>{c.label} <strong>+{c.xp} XP</strong></span>
                        </label>
                      ))}
                    </fieldset>
                  )}

                  {exploitOrFeatConditions.length > 0 && (
                    <>
                      <p
                        className="font-[family-name:var(--font-body)] text-[0.8rem] font-semibold text-[var(--color-text-primary)] mt-1 uppercase tracking-[0.03em]"
                      >
                        {exploitFeatLabel}
                      </p>
                      {exploitOrFeatConditions.map((c) => (
                        <label
                          key={c.id}
                          className="flex items-start gap-2 font-[family-name:var(--font-body)] text-[0.85rem] text-[var(--color-text-secondary)] cursor-pointer"
                        >
                          <input
                            data-testid={`xp-condition-${c.id}`}
                            type="checkbox"
                            checked={checkedConditions.has(c.id)}
                            onChange={() => toggleCondition(c.id)}
                            className="mt-[0.15rem]"
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
                className="font-[family-name:var(--font-body)] text-base font-semibold text-[var(--color-text-primary)] mt-1"
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
            className="flex items-center gap-2 cursor-pointer font-[family-name:var(--font-body)] text-sm font-semibold text-[var(--color-malus)]"
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
            className="flex items-center gap-2 cursor-pointer font-[family-name:var(--font-body)] text-sm font-semibold text-[var(--color-malus)]"
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
            className="font-[family-name:var(--font-body)] text-sm text-[var(--color-malus)] m-0"
          >
            {error}
          </p>
        )}

        {/* Submit button */}
        <button
          data-testid="wizard-next-button"
          onClick={() => void handleSubmit()}
          disabled={isSubmitting}
          className={`font-[family-name:var(--font-body)] font-semibold text-base min-h-11 px-4 py-2.5 rounded-lg text-white border-none ${isSubmitting ? 'bg-[var(--color-silver)] cursor-not-allowed opacity-70' : 'bg-[var(--color-brand)] cursor-pointer'}`}
        >
          Suivant
        </button>

        {/* Completion marker */}
        <span data-testid="wizard-complete" className="hidden" />
      </div>
    </div>
  )
}
