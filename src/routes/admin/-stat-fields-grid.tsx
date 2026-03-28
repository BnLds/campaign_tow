import { STAT_KEYS } from './-admin-helpers'
import type { StatFields } from '#/db/queries/units'

export function StatFieldsGrid({ stats, setStats }: { stats: StatFields; setStats: (s: StatFields) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
      {STAT_KEYS.map((key) => (
        <div key={key}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '0.125rem' }}>
            {key.toUpperCase()}
          </label>
          <input
            type="text"
            value={stats[key]}
            onChange={(e) => setStats({ ...stats, [key]: e.target.value })}
            placeholder="—"
            style={{
              width: '100%',
              padding: '0.25rem 0.375rem',
              borderRadius: '0.25rem',
              border: '1px solid var(--color-border)',
              fontSize: '0.875rem',
              background: 'var(--color-surface)',
              boxSizing: 'border-box',
            }}
          />
        </div>
      ))}
    </div>
  )
}
