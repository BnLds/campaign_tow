// Campaign TOW — TimelineEntry component
// Story 3.1: Displays a single match in the army timeline.

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
}

const RESULT_CONFIG = {
  victory: {
    label: 'V',
    ariaLabel: 'Victoire',
    color: '#2d7a3a',
    background: '#edf8ef',
    className: 'victory',
  },
  defeat: {
    label: 'D',
    ariaLabel: 'Défaite',
    color: '#b82c2c',
    background: '#fdf0f0',
    className: 'defeat',
  },
  draw: {
    label: 'E',
    ariaLabel: 'Égalité',
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
  matchId: _matchId,
  opponent,
  result,
  date,
  hasEvolutions,
}: TimelineEntryProps) {
  const resultConfig = result ? RESULT_CONFIG[result] : null
  const formattedDate = formatDate(date)

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
        {/* Result badge */}
        {resultConfig && (
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
            {opponent.faction}
          </p>
        </div>

        {/* Date */}
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.8125rem',
            color: 'var(--color-text-secondary)',
            flexShrink: 0,
          }}
        >
          {formattedDate}
        </span>
      </div>

      {/* Evolution indicator */}
      {hasEvolutions && (
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.8125rem',
            color: 'var(--color-text-secondary)',
            margin: 0,
          }}
        >
          Evolutions saisies
        </p>
      )}
    </div>
  )
}
