// Campaign TOW — WizardEmpty component
// Renders the empty-army edge case (units.length === 0).
// Does NOT perform dynamic imports — the orchestrator builds onRetour.

type WizardEmptyProps = {
  onRetour: () => Promise<void>
  isSubmitting: boolean
  error: string | null
}

export function WizardEmpty({ onRetour, isSubmitting, error }: WizardEmptyProps) {
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
      {error && (
        <p
          data-testid="wizard-error"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.875rem',
            color: 'var(--color-malus)',
            margin: '0 0 1rem',
          }}
        >
          {error}
        </p>
      )}
      <button
        onClick={() => void onRetour()}
        disabled={isSubmitting}
        style={{
          fontFamily: 'var(--font-body)',
          color: 'var(--color-brand)',
          background: 'none',
          border: 'none',
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
          fontSize: '1rem',
          textDecoration: 'underline',
          opacity: isSubmitting ? 0.7 : 1,
        }}
      >
        Retour
      </button>
    </div>
  )
}
