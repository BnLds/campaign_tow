// Campaign TOW — TimelineEntry component
// Story 3.1: Displays a single match in the army timeline.
// Story 3.3: Interactive result entry (isEditable, onResultSubmit).

import { useState } from 'react'
import { stripConstraintHint, isNegativeConsequenceGain, isTemporaryConsequenceGain } from '../lib/format'

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
  unitXpEntries?: Array<{ unitName: string; unitType: string; xpGained: number; gains: string[]; statChanges?: Array<{ stat: string; delta: number; temporary: boolean }> }>
}

const RESULT_CONFIG = {
  victory: {
    label: 'V',
    ariaLabel: 'Victoire',
    buttonLabel: 'Victoire',
    color: '#2d7a3a',
    background: '#edf8ef',
    className: 'victory',
  },
  defeat: {
    label: 'D',
    ariaLabel: 'Défaite',
    buttonLabel: 'Défaite',
    color: '#b82c2c',
    background: '#fdf0f0',
    className: 'defeat',
  },
  draw: {
    label: 'E',
    ariaLabel: 'Égalité',
    buttonLabel: 'Égalité',
    color: '#9ca3af',
    background: '#f3f4f6',
    className: 'draw',
  },
} as const

function formatDate(isoDate: string): string {
  const d = new Date(isoDate)
  if (isNaN(d.getTime())) return isoDate // fallback: return raw string
  const tz = 'UTC' // Paris wall-clock stored as UTC — display as-is
  const datePart = new Intl.DateTimeFormat('fr-FR', {
    timeZone: tz,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d)
  // Don't show "00:00" for legacy matches stored at midnight
  if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0) return datePart
  const timePart = new Intl.DateTimeFormat('fr-FR', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
  return `${datePart}, ${timePart}`
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
  unitXpEntries,
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
      style={{
        background: '#fffbf5',
        border: '1px solid #e0d5c8',
        borderRadius: '8px',
        padding: '0.75rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
      }}
    >
      {/* Header row: result badge + opponent name + date */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          minHeight: '44px',
        }}
      >
        {/* Result badge — only shown when result is set and not in selection mode */}
        {resultConfig && !showSelectionButtons && (
          <span
            data-testid="result-badge"
            aria-label={resultConfig.ariaLabel}
            className={resultConfig.className}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '2rem',
              height: '2rem',
              borderRadius: '4px',
              fontFamily: 'var(--font-body)',
              fontWeight: 700,
              fontSize: '0.875rem',
              color: resultConfig.color,
              background: resultConfig.background,
              flexShrink: 0,
            }}
          >
            {resultConfig.label}
          </span>
        )}

        {/* Opponent info (or "XP Initiale" label for initial_setup matches) */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: '0.9375rem',
              color: 'var(--color-text-primary)',
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {isInitialSetup ? 'XP Initiale' : (opponent?.name ?? 'Adversaire')}
          </p>
          {!isInitialSetup && opponent && (
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.8125rem',
                color: 'var(--color-text-secondary)',
                margin: 0,
              }}
            >
              {opponent.playerName?.trim() ? `${opponent.faction} · ${opponent.playerName.trim()}` : opponent.faction}
            </p>
          )}
        </div>

        {/* Date + Modifier link */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          {!isInitialSetup && (
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.8125rem',
                color: 'var(--color-text-secondary)',
              }}
            >
              {formattedDate}
            </span>
          )}
          {isEditable && !isInitialSetup && result !== null && !isSelecting && (
            <button
              data-testid="modify-result"
              onClick={() => {
                setIsSelecting(true)
                setSubmitError(null)
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                fontSize: '0.75rem',
                color: 'var(--color-text-secondary)',
                textDecoration: 'underline',
                padding: 0,
              }}
            >
              Modifier
            </button>
          )}
          {isEditable && !isInitialSetup && result !== null && !isSelecting && !hasEvolutions && onDelete && (
            <button
              type="button"
              data-testid="delete-match"
              onClick={() => onDelete(matchId)}
              aria-label="Supprimer la partie"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-malus)',
                fontSize: '0.875rem',
                fontWeight: 700,
                padding: '0 2px',
                lineHeight: 1,
                minWidth: 28,
                minHeight: 28,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✕
            </button>
          )}
          {isEditable && !isInitialSetup && result !== null && isSelecting && (
            <button
              data-testid="cancel-modify"
              onClick={() => {
                setIsSelecting(false)
                setSubmitError(null)
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                fontSize: '0.75rem',
                color: '#b82c2c',
                textDecoration: 'underline',
                padding: 0,
              }}
            >
              Fermer
            </button>
          )}
        </div>
      </div>

      {/* Result selection buttons */}
      {showSelectionButtons && (
        <>
        {hasEvolutions && isLatestMatch && isSelecting && (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: '0.25rem 0 0', fontStyle: 'italic' }}>
            Changer le résultat ne modifie pas le rapport — pensez à le re-saisir si nécessaire.
          </p>
        )}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
          {(['victory', 'defeat', 'draw'] as const).map((key) => {
            const cfg = RESULT_CONFIG[key]
            return (
              <button
                key={key}
                data-testid={`result-select-${key}`}
                disabled={isSubmitting}
                onClick={() => handleResultClick(key)}
                style={{
                  flex: 1,
                  minHeight: '44px',
                  minWidth: '44px',
                  borderRadius: '6px',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  color: cfg.color,
                  background: cfg.background,
                  border: (result === key && isSelecting) ? `2px solid ${cfg.color}` : '1px solid transparent',
                  opacity: isSubmitting ? 0.6 : 1,
                }}
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
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.8125rem',
            color: '#b82c2c',
            margin: 0,
            marginTop: '0.25rem',
          }}
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
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              marginTop: '4px',
            }}
          >
            {xpLines.map((e, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.75rem',
                }}
              >
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  {e.unitName}
                </span>
                {e.xpGained > 0 && (
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    +{e.xpGained} XP
                  </span>
                )}
                {e.gains.map((g, gi) => {
                  const isTemp = isTemporaryConsequenceGain(g)
                  const isNeg = isNegativeConsequenceGain(g)
                  const chipColors = isTemp
                    ? { bg: 'var(--color-temporary-bg)', fg: 'var(--color-temporary)', border: 'var(--color-temporary-border)' }
                    : isNeg
                      ? { bg: 'var(--color-malus-bg)', fg: 'var(--color-malus)', border: 'var(--color-malus-border)' }
                      : { bg: 'var(--color-bonus-bg)', fg: 'var(--color-bonus)', border: 'var(--color-bonus-border)' }
                  return (
                    <span
                      key={gi}
                      style={{
                        padding: '0 0.375rem',
                        borderRadius: '9999px',
                        background: chipColors.bg,
                        color: chipColors.fg,
                        border: `1px solid ${chipColors.border}`,
                        fontWeight: 600,
                        fontSize: '0.6875rem',
                      }}
                    >
                      {stripConstraintHint(g)}
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
                      style={{
                        padding: '0 0.375rem',
                        borderRadius: '9999px',
                        background: isTemporary ? 'var(--color-temporary-bg)' : 'var(--color-malus-bg)',
                        color: isTemporary ? 'var(--color-temporary)' : 'var(--color-malus)',
                        border: `1px solid ${isTemporary ? 'var(--color-temporary-border)' : 'var(--color-malus-border)'}`,
                        fontWeight: 600,
                        fontSize: '0.6875rem',
                      }}
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

      {/* "Au rapport !" button — shown when result is set (or initial_setup), evolutions not yet entered, and editable */}
      {isEditable && (result !== null || isInitialSetup) && !hasEvolutions && onEvolutionStart && (
        <button
          type="button"
          data-testid="evolution-start"
          onClick={() => onEvolutionStart(matchId)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.375rem',
            alignSelf: 'center',
            minHeight: '44px',
            background: '#334155',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            fontSize: '0.8125rem',
            padding: '0.5rem 1rem',
            marginTop: '0.25rem',
          }}
        >
          Au rapport ! <span aria-hidden="true">›</span>
        </button>
      )}

      {/* "Passer l'XP initiale" button — only for initial_setup, when editable and not yet filled */}
      {isEditable && isInitialSetup && !hasEvolutions && onSkipInitialXp && (
        <button
          type="button"
          data-testid="skip-initial-xp"
          onClick={onSkipInitialXp}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            fontSize: '0.8125rem',
            color: 'var(--color-text-secondary)',
            textDecoration: 'underline',
            alignSelf: 'center',
            padding: '0.25rem 0',
          }}
        >
          Passer l&apos;XP initiale
        </button>
      )}

      {/* "Modifier le dernier rapport" — shown on latest match with completed post-match.
           For standard matches: only after clicking "Modifier". For initial_setup: always visible. */}
      {isEditable && (result !== null || isInitialSetup) && hasEvolutions && isLatestMatch && (isSelecting || isInitialSetup) && onPostMatchReentry && (
        <button
          type="button"
          data-testid="post-match-reentry"
          onClick={() => onPostMatchReentry(matchId)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.375rem',
            alignSelf: 'center',
            minHeight: '44px',
            background: '#334155',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            fontSize: '0.8125rem',
            padding: '0.5rem 1rem',
            marginTop: '0.25rem',
          }}
        >
          Modifier le dernier rapport
        </button>
      )}
    </div>
  )
}
