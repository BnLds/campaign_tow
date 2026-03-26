import type { AdminQueries } from './use-admin-queries'
import { useArmyAssignment } from './use-army-assignment'
import { btnClass } from './admin-helpers'

export function AdminAssignmentSection({ queries }: { queries: AdminQueries }) {
  const { state, actions } = useArmyAssignment(queries)

  return (
    <section style={{ marginTop: '2rem' }}>
      <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
        Armées
      </h2>

      {queries.armiesQuery.error && (
        <div
          style={{
            background: 'var(--color-malus-bg)',
            border: '1px solid var(--color-malus)',
            padding: '0.75rem',
            borderRadius: '0.5rem',
            marginBottom: '1rem',
            color: 'var(--color-malus)',
          }}
        >
          Impossible de charger la liste des armées
        </div>
      )}

      {state.assignResult && (
        <p
          data-testid="assign-result-message"
          style={{
            marginBottom: '1rem',
            padding: '0.625rem',
            borderRadius: '0.375rem',
            background: state.assignResult.success ? 'var(--color-bonus-bg)' : 'var(--color-malus-bg)',
            color: state.assignResult.success ? 'var(--color-bonus)' : 'var(--color-malus)',
            border: `1px solid ${state.assignResult.success ? 'var(--color-bonus)' : 'var(--color-malus)'}`,
            fontSize: '0.875rem',
          }}
        >
          {state.assignResult.message}
        </p>
      )}

      {queries.armiesQuery.isPending ? (
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>Chargement…</p>
      ) : (
        <div data-testid="army-list">
          {(queries.armiesQuery.data ?? []).length === 0 ? (
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
              Aucune armée importée.
            </p>
          ) : (
            (queries.armiesQuery.data ?? []).map((army) => (
              <div
                key={army.id}
                data-testid={`army-row-${army.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  flexWrap: 'wrap',
                  padding: '0.75rem 0',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <span style={{ fontWeight: 600, fontFamily: 'var(--font-display)', fontSize: '0.9rem', flex: '0 0 auto' }}>
                  {army.name}
                </span>
                <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', flex: '0 0 auto' }}>
                  {army.faction}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', flex: '0 0 auto' }}>
                  {army.playerUsername ?? 'Non assignée'}
                </span>
                <select
                  role="combobox"
                  value={state.selectedPlayers[army.id] ?? army.playerId ?? ''}
                  onChange={(e) =>
                    actions.setSelectedPlayer(army.id, e.target.value)
                  }
                  style={{
                    padding: '0.25rem 0.375rem',
                    borderRadius: '0.25rem',
                    border: '1px solid var(--color-border)',
                    fontSize: '0.8rem',
                    flex: '1 1 120px',
                    maxWidth: '160px',
                  }}
                >
                  <option value="">— Choisir un joueur —</option>
                  {(queries.playersQuery.data ?? []).map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.username}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => actions.handleAssign(army.id)}
                  disabled={state.assigningArmyId === army.id || !state.selectedPlayers[army.id]}
                  className={btnClass}
                  style={{
                    opacity: state.assigningArmyId === army.id || !state.selectedPlayers[army.id] ? 0.5 : 1,
                  }}
                >
                  Assigner
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  )
}
