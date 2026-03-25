// Campaign TOW — WizardHeader component
// Shared progress bar with back/cancel buttons for all wizard phases.

type WizardHeaderProps = {
  onBack?: () => void          // undefined = hide back button
  onCancel: () => void
  progressLabel: string        // e.g. "Unité 1 / 3" or "Amélioration 2 / 5"
  backAriaLabel?: string       // defaults to "Étape précédente"
  modeHeader?: string          // optional sub-header (e.g. "XP initiale" in initial-xp mode)
}

export function WizardHeader({
  onBack,
  onCancel,
  progressLabel,
  backAriaLabel = 'Étape précédente',
  modeHeader,
}: WizardHeaderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', position: 'relative' }}>
      {onBack !== undefined && (
        <button
          data-testid="wizard-back-button"
          onClick={onBack}
          aria-label={backAriaLabel}
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
        {modeHeader !== undefined && (
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
            {modeHeader}
          </p>
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
          {progressLabel}
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
  )
}
