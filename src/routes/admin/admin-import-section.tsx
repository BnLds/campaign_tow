import type { AdminQueries } from './use-admin-queries'
import { useImportArmy } from './use-import-army'
import { btnClass } from './admin-helpers'

export function AdminImportSection({ queries }: { queries: AdminQueries }) {
  const { state, actions } = useImportArmy(queries)

  return (
    <section style={{ marginTop: '2rem' }}>
      <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
        Importer une armée OWB
      </h2>

      <textarea
        data-testid="owb-import-textarea"
        value={state.owbText}
        onChange={(e) => actions.setOwbText(e.target.value)}
        disabled={state.importSubmitting}
        placeholder="Coller ici l'export texte Old World Builder…"
        rows={6}
        style={{
          width: '100%',
          padding: '0.625rem',
          borderRadius: '0.375rem',
          border: '1px solid var(--color-border)',
          fontFamily: 'monospace',
          fontSize: '0.8rem',
          resize: 'vertical',
          background: 'var(--color-surface)',
          boxSizing: 'border-box',
        }}
      />

      <button
        data-testid="owb-import-submit"
        onClick={actions.handleImport}
        disabled={state.importSubmitting || !state.owbText.trim()}
        className={btnClass}
        style={{ marginTop: '0.75rem', opacity: state.importSubmitting ? 0.6 : 1 }}
      >
        {state.importSubmitting ? 'Import en cours…' : 'Importer'}
      </button>

      {state.importResult && (
        <p
          data-testid="import-result-message"
          style={{
            marginTop: '0.75rem',
            padding: '0.625rem',
            borderRadius: '0.375rem',
            background: state.importResult.success ? 'var(--color-bonus-bg)' : 'var(--color-malus-bg)',
            color: state.importResult.success ? 'var(--color-bonus)' : 'var(--color-malus)',
            border: `1px solid ${state.importResult.success ? 'var(--color-bonus)' : 'var(--color-malus)'}`,
            fontSize: '0.875rem',
          }}
        >
          {state.importResult.message}
        </p>
      )}
    </section>
  )
}
