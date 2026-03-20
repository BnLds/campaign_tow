// Campaign TOW — TimelineEntry component
// Story 3.1: Displays a single match in the army timeline.
// Story 3.3: Interactive result entry (isEditable, onResultSubmit).

import { useState } from 'react'
import { stripConstraintHint, isNegativeConsequenceGain } from '../lib/format'

export type TimelineEntryProps = {
  matchId: string
  opponent: {
    name: string
    faction: string
    playerName?: string
  }
  result: 'victory' | 'defeat' | 'draw' | null
  date: string // ISO 8601
  hasEvolutions: boolean
  isEditable?: boolean
  onResultSubmit?: (matchId: string, result: 'victory' | 'defeat' | 'draw') => Promise<void>
  onEvolutionStart?: (matchId: string) => void
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
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d)
}

export function TimelineEntry({
  matchId,
  opponent,
  result,
  date,
  hasEvolutions,
  isEditable = false,
  onResultSubmit,
  onEvolutionStart,
  unitXpEntries,
}: TimelineEntryProps) {
  const resultConfig = result ? RESULT_CONFIG[result] : null
  const formattedDate = formatDate(date)

  const [isSelecting, setIsSelecting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const showSelectionButtons =
    isEditable && (result === null || isSelecting)

  const handleResultClick = async (selectedResult: 'victory' | 'defeat' | 'draw') => {
    if (!onResultSubmit || isSubmitting) return
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      await onResultSubmit(matchId, selectedResult)
      setIsSubmitting(false)
      setIsSelecting(false)
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

        {/* Opponent info */}
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
            {opponent.name}
          </p>
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
        </div>

        {/* Date + Modifier link */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.8125rem',
              color: 'var(--color-text-secondary)',
            }}
          >
            {formattedDate}
          </span>
          {isEditable && result !== null && !isSelecting && (
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
        </div>
      </div>

      {/* Result selection buttons */}
      {showSelectionButtons && (
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
                  const isNeg = isNegativeConsequenceGain(g)
                  return (
                    <span
                      key={gi}
                      style={{
                        padding: '0 0.375rem',
                        borderRadius: '9999px',
                        background: isNeg ? 'var(--color-malus-bg)' : 'var(--color-bonus-bg)',
                        color: isNeg ? 'var(--color-malus)' : 'var(--color-bonus)',
                        border: `1px solid ${isNeg ? 'var(--color-malus-border)' : 'var(--color-bonus-border)'}`,
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
                        background: isTemporary ? '#fff3eb' : 'var(--color-malus-bg)',
                        color: isTemporary ? '#e07b30' : 'var(--color-malus)',
                        border: `1px solid ${isTemporary ? '#f0a870' : 'var(--color-malus-border)'}`,
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

      {/* "Au rapport !" button — shown when result is set, evolutions not yet entered, and editable */}
      {isEditable && result !== null && !hasEvolutions && onEvolutionStart && (
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
    </div>
  )
}
