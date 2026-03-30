// Campaign TOW — TimelineEntry component
// Story 3.1: Displays a single match in the army timeline.
// Story 3.3: Interactive result entry (isEditable, onResultSubmit).

import { useState } from 'react'
import { stripConstraintHint, isNegativeConsequenceGain, isTemporaryConsequenceGain } from '../lib/format'
import { cn } from '#/lib/utils'
import { chipClasses } from '#/lib/chip-styles'
import { LinkButton } from '#/components/link-button'
import { Button } from '#/components/ui/button'

export type TimelineEntryProps = {
  matchId: string
  matchType?: 'standard' | 'initial_setup'
  opponent?: {
    name: string
    faction: string
    playerName?: string
  } | null
  result: 'victory' | 'defeat' | 'draw' | null
  date: string // ISO 8601
  hasEvolutions: boolean
  isEditable?: boolean
  isLatestMatch?: boolean
  onResultSubmit?: (matchId: string, result: 'victory' | 'defeat' | 'draw') => Promise<void>
  onEvolutionStart?: (matchId: string) => void
  onPostMatchReentry?: (matchId: string) => void
  onDelete?: (matchId: string) => void
  onSkipInitialXp?: () => void
  initialXpSkipped?: boolean
  unitXpEntries?: Array<{ unitName: string; unitType: string; xpGained: number; gains: Array<{ description: string; type: string }>; statChanges?: Array<{ stat: string; delta: number; temporary: boolean }> }>
  armyTotals?: {
    playerXp: number
    playerPoints: number
    opponentXp: number
    opponentPoints: number
    deltaXp: number
    deltaPoints: number
  }
}

const RESULT_CONFIG = {
  victory: {
    label: 'V',
    ariaLabel: 'Victoire',
    buttonLabel: 'Victoire',
    badgeClasses: 'text-cw-victory-text bg-cw-victory-bg',
    buttonClasses: 'text-cw-victory-text bg-cw-victory-bg',
    selectedBorder: 'border-2 border-cw-victory-text',
  },
  defeat: {
    label: 'D',
    ariaLabel: 'Défaite',
    buttonLabel: 'Défaite',
    badgeClasses: 'text-cw-defeat-text bg-cw-defeat-bg',
    buttonClasses: 'text-cw-defeat-text bg-cw-defeat-bg',
    selectedBorder: 'border-2 border-cw-defeat-text',
  },
  draw: {
    label: 'E',
    ariaLabel: 'Égalité',
    buttonLabel: 'Égalité',
    badgeClasses: 'text-cw-draw-text bg-cw-draw-bg',
    buttonClasses: 'text-cw-draw-text bg-cw-draw-bg',
    selectedBorder: 'border-2 border-cw-draw-text',
  },
} as const

function formatDate(isoDate: string): string {
  const d = new Date(isoDate)
  if (isNaN(d.getTime())) return isoDate
  const currentYear = new Date().getFullYear()
  const dateYear = d.getUTCFullYear()
  const dateOptions: Intl.DateTimeFormatOptions = dateYear !== currentYear
    ? { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }
    : { timeZone: 'UTC', day: 'numeric', month: 'short' }
  const datePart = new Intl.DateTimeFormat('fr-FR', dateOptions).format(d)
  // Don't show time for legacy matches stored at midnight
  if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0) return datePart
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const min = String(d.getUTCMinutes()).padStart(2, '0')
  return `${datePart} · ${hh}h${min}`
}

export function TimelineEntry({
  matchId,
  matchType = 'standard',
  opponent,
  result,
  date,
  hasEvolutions,
  isEditable = false,
  isLatestMatch = false,
  onResultSubmit,
  onEvolutionStart,
  onPostMatchReentry,
  onDelete,
  onSkipInitialXp,
  initialXpSkipped = false,
  unitXpEntries,
  armyTotals,
}: TimelineEntryProps) {
  const isInitialSetup = matchType === 'initial_setup'
  const resultConfig = result && !isInitialSetup ? RESULT_CONFIG[result] : null
  const formattedDate = formatDate(date)

  const [isSelecting, setIsSelecting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // initial_setup matches have no result (no V/D/E) — don't show result selection
  const showSelectionButtons =
    !isInitialSetup && isEditable && (result === null || isSelecting)

  const handleResultClick = async (selectedResult: 'victory' | 'defeat' | 'draw') => {
    if (!onResultSubmit || isSubmitting) return
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      await onResultSubmit(matchId, selectedResult)
      setIsSubmitting(false)
    } catch (err) {
      setIsSubmitting(false)
      setSubmitError(err instanceof Error ? err.message : 'Erreur inconnue')
    }
  }

  return (
    <div
      data-testid="timeline-entry"
      className="bg-cw-surface border border-cw-border rounded-lg px-4 py-3 flex flex-col gap-1"
    >
      {/* Header row: result badge + opponent name + date */}
      <div className="flex items-start gap-2.5">
        {/* Result badge — only shown when result is set and not in selection mode */}
        {resultConfig && !showSelectionButtons && (
          <span
            data-testid="result-badge"
            aria-label={resultConfig.ariaLabel}
            className={cn('inline-flex items-center justify-center size-8 rounded font-bold text-sm shrink-0', resultConfig.badgeClasses)}
          >
            {resultConfig.label}
          </span>
        )}

        {/* Opponent info (or "XP Initiale" label for initial_setup matches) */}
        <div className="flex-1 min-w-0">
          <p className="font-cw-display font-semibold text-[0.9375rem] text-cw-text-primary m-0 overflow-hidden text-ellipsis whitespace-nowrap">
            {isInitialSetup ? 'XP Initiale' : (opponent?.name ?? 'Adversaire')}
          </p>
          {!isInitialSetup && opponent && (
            <p className="text-[0.8125rem] text-cw-text-secondary m-0">
              {opponent.playerName?.trim() ? `${opponent.faction} · ${opponent.playerName.trim()}` : opponent.faction}
            </p>
          )}
          {!isInitialSetup && opponent && armyTotals && (
            <p className="text-xs m-0 flex flex-wrap gap-1.5">
                <span className={cn('', armyTotals.deltaXp > 0 ? 'text-cw-bonus' : armyTotals.deltaXp < 0 ? 'text-cw-malus' : 'text-cw-text-secondary')}>
                  Δ {armyTotals.deltaXp > 0 ? '+' : ''}{armyTotals.deltaXp} XP
                </span>
                <span className={cn('', armyTotals.deltaPoints > 0 ? 'text-cw-bonus' : armyTotals.deltaPoints < 0 ? 'text-cw-malus' : 'text-cw-text-secondary')}>
                  Δ {armyTotals.deltaPoints > 0 ? '+' : ''}{armyTotals.deltaPoints} pts
                </span>
              </p>
          )}
        </div>

        {/* Date + Modifier link */}
        <div className="shrink-0 flex flex-col items-end gap-1">
          {!isInitialSetup && (
            <span className="text-xs text-cw-text-secondary text-right">
              {formattedDate}
            </span>
          )}
          <div className="flex flex-row items-center gap-1.5">
            {isEditable && !isInitialSetup && result !== null && !isSelecting && (
              <LinkButton
                data-testid="modify-result"
                onClick={() => {
                  setIsSelecting(true)
                  setSubmitError(null)
                }}
              >
                Modifier
              </LinkButton>
            )}
            {isEditable && isInitialSetup && initialXpSkipped && !hasEvolutions && onEvolutionStart && (
              <LinkButton
                data-testid="modify-result"
                onClick={() => onEvolutionStart(matchId)}
              >
                Modifier
              </LinkButton>
            )}
            {isEditable && isInitialSetup && hasEvolutions && isLatestMatch && onPostMatchReentry && (
              <LinkButton
                data-testid="modify-result"
                onClick={() => onPostMatchReentry(matchId)}
              >
                Modifier
              </LinkButton>
            )}
            {isEditable && !isInitialSetup && result !== null && !isSelecting && !hasEvolutions && onDelete && (
              <button
                type="button"
                data-testid="delete-match"
                onClick={() => onDelete(matchId)}
                aria-label="Supprimer la partie"
                className="bg-transparent border-none cursor-pointer text-cw-malus text-sm font-bold p-0 leading-none min-w-7 min-h-7 inline-flex items-center justify-center"
              >
                ✕
              </button>
            )}
            {isEditable && !isInitialSetup && result !== null && isSelecting && (
              <LinkButton
                data-testid="cancel-modify"
                variant="danger"
                onClick={() => {
                  setIsSelecting(false)
                  setSubmitError(null)
                }}
              >
                Fermer
              </LinkButton>
            )}
          </div>
        </div>
      </div>

      {/* Result selection buttons */}
      {showSelectionButtons && (
        <>
        {hasEvolutions && isLatestMatch && isSelecting && (
          <p className="text-xs text-cw-text-secondary m-0 mt-1 italic">
            Changer le résultat ne modifie pas le rapport — pensez à le re-saisir si nécessaire.
          </p>
        )}
        <div className="flex gap-2 mt-1">
          {(['victory', 'defeat', 'draw'] as const).map((key) => {
            const cfg = RESULT_CONFIG[key]
            return (
              <button
                key={key}
                data-testid={`result-select-${key}`}
                disabled={isSubmitting}
                onClick={() => handleResultClick(key)}
                className={cn(
                  'flex-1 min-h-11 min-w-11 rounded-md font-semibold text-sm cursor-pointer',
                  cfg.buttonClasses,
                  result === key && isSelecting ? cfg.selectedBorder : 'border border-transparent',
                  isSubmitting && 'opacity-60 cursor-not-allowed',
                )}
              >
                {cfg.buttonLabel}
              </button>
            )
          })}
        </div>
        </>
      )}

      {/* Inline error message */}
      {submitError && (
        <p
          data-testid="result-error"
          className="text-[0.8125rem] text-cw-malus m-0 mt-1"
        >
          {submitError}
        </p>
      )}

      {/* XP + gains per unit — one line per unit/character */}
      {(() => {
        const xpLines = hasEvolutions
          ? (unitXpEntries ?? []).filter((e) => e.xpGained > 0 || e.gains.length > 0 || (e.statChanges?.length ?? 0) > 0)
          : []
        return xpLines.length > 0 ? (
          <div className="flex flex-col gap-0.5 mt-1">
            {xpLines.map((e, idx) => (
              <div
                key={idx}
                className="flex flex-wrap items-center gap-1 text-xs"
              >
                <span className="text-cw-text-secondary">
                  {e.unitName}
                </span>
                {e.xpGained > 0 && (
                  <span className="text-cw-text-secondary">
                    +{e.xpGained} XP
                  </span>
                )}
                {e.gains.map((g, gi) => {
                  const isTemp = isTemporaryConsequenceGain(g.type)
                  const isNeg = isNegativeConsequenceGain(g.type)
                  const variant = isTemp ? 'temporary' : isNeg ? 'malus' : 'bonus'
                  return (
                    <span
                      key={gi}
                      className={cn('px-1.5 rounded-full font-semibold text-[0.6875rem]', chipClasses(variant))}
                    >
                      {stripConstraintHint(g.description)}
                    </span>
                  )
                })}
                {(e.statChanges ?? []).map((sc, si) => {
                  const isTemporary = sc.temporary
                  const prefix = sc.delta > 0 ? '+' : ''
                  const label = isTemporary
                    ? `${prefix}${sc.delta} ${sc.stat.toUpperCase()} (prochaine bataille)`
                    : `${prefix}${sc.delta} ${sc.stat.toUpperCase()}`
                  return (
                    <span
                      key={`sc-${si}`}
                      data-testid="timeline-stat-change"
                      className={cn('px-1.5 rounded-full font-semibold text-[0.6875rem]', chipClasses(isTemporary ? 'temporary' : 'malus'))}
                    >
                      {label}
                    </span>
                  )
                })}
              </div>
            ))}
          </div>
        ) : null
      })()}

      {/* Message for skipped initial XP */}
      {isInitialSetup && initialXpSkipped && !hasEvolutions && (
        <p className="text-[0.8125rem] text-cw-text-secondary italic mt-1">
          Pas d&apos;xp initiale, c&apos;est une nouvelle armée !
        </p>
      )}

      {/* "Au rapport !" button — shown when result is set (or initial_setup), evolutions not yet entered, and editable */}
      {isEditable && (result !== null || isInitialSetup) && !hasEvolutions && !initialXpSkipped && onEvolutionStart && (
        <Button
          type="button"
          data-testid="evolution-start"
          variant="brand"
          onClick={() => onEvolutionStart(matchId)}
          className="self-center mt-1 gap-1.5"
        >
          Au rapport ! <span aria-hidden="true">›</span>
        </Button>
      )}

      {/* "Passer l'XP initiale" button — only for initial_setup, when editable and not yet filled */}
      {isEditable && isInitialSetup && !hasEvolutions && onSkipInitialXp && (
        <LinkButton
          data-testid="skip-initial-xp"
          className="self-center py-1 text-[0.8125rem]"
          onClick={onSkipInitialXp}
        >
          Passer l&apos;XP initiale
        </LinkButton>
      )}

      {/* "Modifier le dernier rapport" — shown on latest match with completed post-match.
           For standard matches: only after clicking "Modifier". For initial_setup: always visible. */}
      {isEditable && !isInitialSetup && result !== null && hasEvolutions && isLatestMatch && isSelecting && onPostMatchReentry && (
        <Button
          type="button"
          data-testid="post-match-reentry"
          variant="brand"
          onClick={() => onPostMatchReentry(matchId)}
          className="self-center mt-1 gap-1.5"
        >
          Modifier le dernier rapport
        </Button>
      )}
    </div>
  )
}
