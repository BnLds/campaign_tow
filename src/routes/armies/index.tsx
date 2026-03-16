// Campaign TOW — /armies route
// Lists all armies. Highlights own army with gold styling.
// Accessible to all users including guests (read-only).

import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useEffect } from 'react'
import { useHydrated } from '../../lib/useHydrated'
import { authMiddleware } from '../../lib/middleware'

const loadArmiesListFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getAllArmies } = await import('../../db/queries')
    const armies = await getAllArmies()
    const { session } = context
    const currentPlayerId = session.isGuest ? null : session.playerId
    return {
      armies: armies.map((a) => ({ ...a, isOwn: currentPlayerId !== null && a.playerId === currentPlayerId })),
      isGuest: session.isGuest,
    }
  })

export const Route = createFileRoute('/armies/')({
  loader: async () => {
    return loadArmiesListFn()
  },
  component: ArmiesListView,
})

function ArmiesListView() {
  const { armies, isGuest } = Route.useLoaderData()
  const hydrated = useHydrated()

  useEffect(() => {
    if (hydrated) {
      document.documentElement.setAttribute('data-app-hydrated', 'true')
    }
  }, [hydrated])

  return (
    <main style={{ padding: '1rem', maxWidth: '720px', margin: '0 auto' }}>
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '1.5rem',
          color: 'var(--color-text-primary)',
          marginBottom: '1.5rem',
        }}
      >
        Armees
      </h1>

      {armies.length === 0 ? (
        <p style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
          Aucune armee dans la campagne
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {armies.map((army) => {
            const isOwn = !isGuest && army.isOwn
            return (
              <Link
                key={army.id}
                to="/armies/$armyId"
                params={{ armyId: army.id }}
                style={{
                  display: 'block',
                  textDecoration: 'none',
                  padding: '0.875rem 1rem',
                  borderRadius: '8px',
                  border: isOwn ? '2px solid #ead69b' : '1px solid #e0d5c8',
                  background: isOwn ? '#fff9ec' : '#fffbf5',
                  color: 'inherit',
                }}
              >
                <p
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 600,
                    fontSize: '0.9375rem',
                    color: 'var(--color-text-primary)',
                    margin: 0,
                    marginBottom: '0.125rem',
                  }}
                >
                  {army.name}
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.8125rem',
                    color: 'var(--color-text-secondary)',
                    margin: 0,
                  }}
                >
                  {army.faction}
                  {army.playerDisplayName && ` — ${army.playerDisplayName}`}
                </p>
              </Link>
            )
          })}
        </div>
      )}
    </main>
  )
}
