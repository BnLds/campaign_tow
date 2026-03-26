import { useAddUnit } from './use-add-unit'
import type { AdminQueries } from './use-admin-queries'
import { btnClass } from './admin-helpers'
import { StatFieldsGrid } from './stat-fields-grid'

interface AdminAddUnitSectionProps {
  queries: AdminQueries
}

export function AdminAddUnitSection({ queries }: AdminAddUnitSectionProps) {
  const { state, actions } = useAddUnit(queries)
  const armies = queries.armiesQuery.data ?? []
  const canSubmit = !!state.addUnitArmyId && !!state.addUnitName.trim() && !!state.addUnitType && !state.addUnitSubmitting

  return (
    <section style={{ marginTop: '2rem' }}>
      <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
        Ajouter une unité
      </h2>

      <div style={{ marginBottom: '0.75rem' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
          Armée
        </label>
        <select
          value={state.addUnitArmyId}
          onChange={(e) => actions.setAddUnitArmyId(e.target.value)}
          style={{ width: '100%', padding: '0.375rem', borderRadius: '0.25rem', border: '1px solid var(--color-border)', fontSize: '0.875rem', background: 'var(--color-surface)' }}
        >
          <option value="">— Choisir une armée —</option>
          {armies.map((a) => (
            <option key={a.id} value={a.id}>{a.name} ({a.faction})</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '0.75rem' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
          Nom de l'unité
        </label>
        <input
          type="text"
          value={state.addUnitName}
          onChange={(e) => actions.setAddUnitName(e.target.value)}
          placeholder="Nom de l'unité"
          style={{ width: '100%', padding: '0.375rem', borderRadius: '0.25rem', border: '1px solid var(--color-border)', fontSize: '0.875rem', background: 'var(--color-surface)', boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ marginBottom: '0.75rem' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
          Type
        </label>
        <select
          value={state.addUnitType}
          onChange={(e) => actions.setAddUnitType(e.target.value)}
          style={{ width: '100%', padding: '0.375rem', borderRadius: '0.25rem', border: '1px solid var(--color-border)', fontSize: '0.875rem', background: 'var(--color-surface)' }}
        >
          <option value="">— Choisir un type —</option>
          <option value="Personnages">Personnages</option>
          <option value="Unités de base">Unités de base</option>
          <option value="Unités spéciales">Unités spéciales</option>
          <option value="Unités rares">Unités rares</option>
        </select>
      </div>

      <StatFieldsGrid stats={state.addUnitStats} setStats={actions.setAddUnitStats} />

      <button
        onClick={actions.handleAddUnit}
        disabled={!canSubmit}
        className={btnClass}
        style={{ opacity: canSubmit ? 1 : 0.5 }}
      >
        {state.addUnitSubmitting ? 'Ajout en cours…' : 'Ajouter l\'unité'}
      </button>

      {state.addUnitResult && (
        <p style={{
          marginTop: '0.75rem',
          padding: '0.625rem',
          borderRadius: '0.375rem',
          background: state.addUnitResult.success ? 'var(--color-bonus-bg)' : 'var(--color-malus-bg)',
          color: state.addUnitResult.success ? 'var(--color-bonus)' : 'var(--color-malus)',
          border: `1px solid ${state.addUnitResult.success ? 'var(--color-bonus)' : 'var(--color-malus)'}`,
          fontSize: '0.875rem',
        }}>
          {state.addUnitResult.message}
        </p>
      )}
    </section>
  )
}
