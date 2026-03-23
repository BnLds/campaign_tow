// Campaign TOW — /armies route
// Lists all armies. Highlights own army with gold styling.
// Accessible to all users including guests (read-only).

import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { useEffect } from 'react'
import { useHydrated } from '../../lib/useHydrated'
import { authMiddleware } from '../../lib/middleware'
import { ArmyListItem } from '../../components/army-list-item'
import { ArmyImportForm } from '../../components/army-import-form'

// ArmyListItem gold variant colors (passed via isOwn prop):
// isOwn=true: border #ead69b, background gradient from #fff9ec to #fff6eb
// Navigation: Link to /armies/$armyId via ArmyListItem component

const loadArmiesListFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getAllArmies, getAllArmyRecords } = await import('../../db/queries')
    const armies = await getAllArmies()
    const recordsMap = await getAllArmyRecords()
    const { session } = context
    const currentPlayerId = session.isGuest ? null : session.playerId

    const armiesWithData = armies.map((a) => ({
      ...a,
      isOwn: currentPlayerId !== null && a.playerId === currentPlayerId,
      record: recordsMap.get(a.id) ?? null,
    }))

    // Sort: own army first, then alphabetically by name
    const sorted = [...armiesWithData].sort((a, b) => {
      if (a.isOwn && !b.isOwn) return -1
      if (!a.isOwn && b.isOwn) return 1
      return a.name.localeCompare(b.name)
    })

    return {
      armies: sorted,
      isGuest: session.isGuest,
    }
  })

export const Route = createFileRoute('/armies/')({
  staleTime: 60_000,
  loader: async () => {
    return loadArmiesListFn()
  },
  component: ArmiesListView,
})

function ArmiesListView() {
  const { armies, isGuest } = Route.useLoaderData()
  const queryClient = useQueryClient()
  const router = useRouter()
  const hydrated = useHydrated()
  const hasOwnArmy = !isGuest && armies.some((a) => a.isOwn)

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

      {!isGuest && !hasOwnArmy && (
        <ArmyImportForm onSuccess={async () => {
          await queryClient.invalidateQueries({ queryKey: ['session'] })
          await queryClient.invalidateQueries({ queryKey: ['army-info'] })
          await router.invalidate({ filter: (d) => d.routeId === '__root__' || d.routeId === '/armies/' })
        }} />
      )}

      {armies.length === 0 ? (
        <div>
          <p style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
            Aucune armee dans la campagne
          </p>
          <Link to="/" style={{ color: 'var(--color-brand)', fontSize: '0.875rem' }}>
            Retour a la campagne
          </Link>
        </div>
      ) : (
        <div>
          {armies.map((army) => {
            const isOwn = !isGuest && army.isOwn
            return (
              <ArmyListItem
                key={army.id}
                id={army.id}
                name={army.name}
                faction={army.faction}
                playerDisplayName={army.playerDisplayName ?? null}
                record={army.record}
                isOwn={isOwn}
              />
            )
          })}
        </div>
      )}
    </main>
  )
}
