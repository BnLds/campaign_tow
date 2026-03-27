import React from 'react'
import { useCreateMatch } from './-use-create-match'
import type { AdminQueries } from './-use-admin-queries'
import { btnClass } from './-admin-helpers'

interface AdminMatchSectionProps {
  queries: AdminQueries
}

export function AdminMatchSection({ queries }: AdminMatchSectionProps) {
  const { state, derived, actions } = useCreateMatch(queries)
  const armies = queries.armiesQuery.data ?? []

  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.375rem',
    borderRadius: '0.25rem',
    border: '1px solid var(--color-border)',
    fontSize: '0.875rem',
    background: 'var(--color-surface)',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 500,
    marginBottom: '0.25rem',
  }
  const rowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.75rem',
    marginBottom: '0.75rem',
  }

  const canSubmit =
    !!state.matchArmy1Id &&
    !!state.matchArmy2Id &&
    state.matchArmy1Id !== state.matchArmy2Id &&
    !!state.matchDate &&
    !!state.matchTime &&
    !state.matchSubmitting

  return (
    <>
      <section style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
          Créer une partie
        </h2>

        <div style={rowStyle}>
          <div>
            <label style={labelStyle}>Armée 1</label>
            <select value={state.matchArmy1Id} onChange={(e) => actions.setMatchArmy1Id(e.target.value)} style={selectStyle}>
              <option value="">— Choisir —</option>
              {armies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Résultat armée 1</label>
            <select value={state.matchResult1} onChange={(e) => actions.setMatchResult1(e.target.value as typeof state.matchResult1)} style={selectStyle}>
              {derived.resultOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div style={rowStyle}>
          <div>
            <label style={labelStyle}>Armée 2</label>
            <select value={state.matchArmy2Id} onChange={(e) => actions.setMatchArmy2Id(e.target.value)} style={selectStyle}>
              <option value="">— Choisir —</option>
              {armies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Résultat armée 2</label>
            <select value={state.matchResult2} onChange={(e) => actions.setMatchResult2(e.target.value as typeof state.matchResult2)} style={selectStyle}>
              {derived.resultOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {state.matchArmy1Id && state.matchArmy2Id && state.matchArmy1Id === state.matchArmy2Id && (
          <p style={{ fontSize: '0.875rem', color: 'var(--color-malus)', marginBottom: '0.75rem' }}>
            Les deux armées doivent être différentes.
          </p>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div>
            <label style={labelStyle}>Date de la partie</label>
            <input type="date" value={state.matchDate} onChange={(e) => actions.setMatchDate(e.target.value)} style={{ ...selectStyle, width: 'auto' }} />
          </div>
          <div>
            <label htmlFor="admin-match-time" style={labelStyle}>Heure</label>
            <input id="admin-match-time" type="time" required value={state.matchTime} onChange={(e) => actions.setMatchTime(e.target.value)} style={{ ...selectStyle, width: 'auto' }} />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <input type="checkbox" id="evolutions-entered" checked={state.matchEvolutions} onChange={(e) => actions.setMatchEvolutions(e.target.checked)} />
          <label htmlFor="evolutions-entered" style={{ fontSize: '0.875rem', cursor: 'pointer' }}>
            Évolutions déjà saisies
          </label>
        </div>

        <button onClick={actions.handleCreateMatch} disabled={!canSubmit} className={btnClass} style={{ opacity: canSubmit ? 1 : 0.5 }}>
          {state.matchSubmitting ? 'Création…' : 'Créer la partie'}
        </button>

        {state.matchResult && (
          <p style={{
            marginTop: '0.75rem', padding: '0.625rem', borderRadius: '0.375rem',
            background: state.matchResult.success ? 'var(--color-bonus-bg)' : 'var(--color-malus-bg)',
            color: state.matchResult.success ? 'var(--color-bonus)' : 'var(--color-malus)',
            border: `1px solid ${state.matchResult.success ? 'var(--color-bonus)' : 'var(--color-malus)'}`,
            fontSize: '0.875rem',
          }}>
            {state.matchResult.message}
          </p>
        )}
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>
          Parties (suppression)
        </h2>
        {state.deleteMatchError && (
          <p style={{ color: 'var(--color-malus)', fontFamily: 'var(--font-body)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
            {state.deleteMatchError}
          </p>
        )}
        {queries.matchesQuery.isLoading && <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Chargement…</p>}
        {(queries.matchesQuery.data ?? []).map((m) => {
          const mDate = new Date(m.date)
          const datePart = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }).format(mDate)
          const dateLabel = mDate.getUTCHours() === 0 && mDate.getUTCMinutes() === 0
            ? datePart
            : `${datePart}, ${new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' }).format(mDate)}`
          const isPending = m.evolutions1EnteredAt === null && m.evolutions2EnteredAt === null
          const label = `${m.player1Name} vs ${m.player2Name} — ${dateLabel}`
          return (
            <div key={m.matchId} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.4rem 0', borderBottom: '1px solid var(--color-separator)' }}>
              <span style={{ flex: 1, fontFamily: 'var(--font-body)', fontSize: '0.875rem' }}>{label}</span>
              {isPending && (
                <button
                  type="button"
                  onClick={() => void actions.handleDeleteMatchAdmin(m.matchId, label)}
                  style={{ padding: '0.25rem 0.625rem', borderRadius: 6, border: 'none', background: 'var(--color-malus)', color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.8rem', fontWeight: 600 }}
                >
                  Supprimer
                </button>
              )}
            </div>
          )
        })}
      </section>
    </>
  )
}
