import { useCorrection } from './use-correction'
import type { AdminQueries } from './use-admin-queries'
import { btnClass } from './admin-helpers'
import { StatFieldsGrid } from './stat-fields-grid'

interface AdminCorrectionSectionProps {
  queries: AdminQueries
}

export function AdminCorrectionSection({ queries }: AdminCorrectionSectionProps) {
  const { state, derived, actions } = useCorrection(queries)
  const armies = queries.armiesQuery.data ?? []
  const selectedUnit = derived.corrUnits.find((u) => u.id === state.corrUnitId)
  const hasMultipleSubProfiles = (selectedUnit?.subProfiles.length ?? 0) > 1
  const hasNoSubProfiles = selectedUnit && selectedUnit.subProfiles.length === 0
  const canSubmit = !!state.corrSubProfileId && !state.corrSubmitting

  return (
    <section style={{ marginTop: '2rem' }}>
      <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
        Corriger les stats
      </h2>

      <div style={{ marginBottom: '0.75rem' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
          Armée
        </label>
        <select
          value={state.corrArmyId}
          onChange={(e) => actions.setCorrArmyId(e.target.value)}
          style={{ width: '100%', padding: '0.375rem', borderRadius: '0.25rem', border: '1px solid var(--color-border)', fontSize: '0.875rem', background: 'var(--color-surface)' }}
        >
          <option value="">— Choisir une armée —</option>
          {armies.map((a) => (
            <option key={a.id} value={a.id}>{a.name} ({a.faction})</option>
          ))}
        </select>
      </div>

      {state.corrArmyId && (
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
            Unité
          </label>
          {derived.armyUnitsLoading ? (
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Chargement des unités…</p>
          ) : derived.armyUnitsError ? (
            <p style={{ fontSize: '0.875rem', color: 'var(--color-malus)' }}>Impossible de charger les unités</p>
          ) : derived.corrUnits.length === 0 ? (
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Aucune unité dans cette armée</p>
          ) : (
            <select
              value={state.corrUnitId}
              onChange={(e) => actions.setCorrUnitId(e.target.value)}
              style={{ width: '100%', padding: '0.375rem', borderRadius: '0.25rem', border: '1px solid var(--color-border)', fontSize: '0.875rem', background: 'var(--color-surface)' }}
            >
              <option value="">— Choisir une unité —</option>
              {derived.corrUnits.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {state.corrUnitId && hasMultipleSubProfiles && (
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
            Sous-profil
          </label>
          <select
            value={state.corrSubProfileId}
            onChange={(e) => actions.setCorrSubProfileId(e.target.value)}
            style={{ width: '100%', padding: '0.375rem', borderRadius: '0.25rem', border: '1px solid var(--color-border)', fontSize: '0.875rem', background: 'var(--color-surface)' }}
          >
            <option value="">— Choisir un sous-profil —</option>
            {derived.corrSubProfiles.map((sp) => (
              <option key={sp.id} value={sp.id}>{sp.label}</option>
            ))}
          </select>
        </div>
      )}

      {state.corrUnitId && hasNoSubProfiles && (
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
          Aucun sous-profil
        </p>
      )}

      {state.corrSubProfileId && (
        <>
          <StatFieldsGrid stats={state.corrStats} setStats={actions.setCorrStats} />
          <button
            onClick={actions.handleCorrectStats}
            disabled={!canSubmit}
            className={btnClass}
            style={{ opacity: canSubmit ? 1 : 0.5 }}
          >
            {state.corrSubmitting ? 'Mise à jour…' : 'Mettre à jour les stats'}
          </button>
        </>
      )}

      {state.corrResult && (
        <p style={{
          marginTop: '0.75rem',
          padding: '0.625rem',
          borderRadius: '0.375rem',
          background: state.corrResult.success ? 'var(--color-bonus-bg)' : 'var(--color-malus-bg)',
          color: state.corrResult.success ? 'var(--color-bonus)' : 'var(--color-malus)',
          border: `1px solid ${state.corrResult.success ? 'var(--color-bonus)' : 'var(--color-malus)'}`,
          fontSize: '0.875rem',
        }}>
          {state.corrResult.message}
        </p>
      )}
    </section>
  )
}
