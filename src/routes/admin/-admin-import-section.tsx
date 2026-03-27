import type { AdminQueries } from './-use-admin-queries'
import { useImportArmy } from './-use-import-army'
import { btnClass } from './-admin-helpers'

export function AdminImportSection({ queries }: { queries: AdminQueries }) {
  const { state, actions, isPending, error } = useImportArmy(queries)

  return (
    <section style={{ marginTop: '2rem' }}>
      <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
        Importer une armée OWB
      </h2>

      <textarea
        data-testid="owb-import-textarea"
        value={state.owbText}
        onChange={(e) => actions.setOwbText(e.target.value)}
        disabled={isPending}
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
        disabled={isPending || !state.owbText.trim()}
        className={btnClass}
        style={{ marginTop: '0.75rem', opacity: isPending ? 0.6 : 1 }}
      >
        {isPending ? 'Import en cours…' : 'Importer'}
      </button>

      {error && (
        <p
          data-testid="import-result-message"
          style={{
            marginTop: '0.75rem',
            padding: '0.625rem',
            borderRadius: '0.375rem',
            background: 'var(--color-malus-bg)',
            color: 'var(--color-malus)',
            border: '1px solid var(--color-malus)',
            fontSize: '0.875rem',
          }}
        >
          {error.message}
        </p>
      )}

      {state.importResult && (
        <p
          data-testid="import-result-message"
          style={{
            marginTop: '0.75rem',
            padding: '0.625rem',
            borderRadius: '0.375rem',
            background: 'var(--color-bonus-bg)',
            color: 'var(--color-bonus)',
            border: '1px solid var(--color-bonus)',
            fontSize: '0.875rem',
          }}
        >
          {state.importResult.message}
        </p>
      )}
    </section>
  )
}
