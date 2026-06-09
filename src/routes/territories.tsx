import { createFileRoute, redirect, useRouteContext } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { z } from 'zod'
import { useHydrated } from '../lib/useHydrated'
import { CoBanner } from '../components/territory/CoBanner'
import { territoryDashboardQueryOptions } from '../integrations/territory-queries'

export const territorySearchSchema = z.object({
  tile: z.string().optional(),
  view: z.enum(['grid', 'history']).default('grid'),
  setup: z.number().optional(),
})

export const Route = createFileRoute('/territories')({
  validateSearch: territorySearchSchema,
  beforeLoad: ({ context }) => {
    const session = (context as { session?: { isGuest: boolean } | null }).session
    if (!session) throw redirect({ to: '/login' })
    if (session.isGuest) throw redirect({ to: '/login' })
  },
  loader: async ({ context }) => {
    const session = (context as { session?: { playerId: string; isGuest: boolean } | null }).session
    if (!session || session.isGuest) return null
    await (context as { queryClient: QueryClient })
      .queryClient.ensureQueryData(territoryDashboardQueryOptions(session.playerId))
    return null
  },
  component: TerritoriesView,
})

function TerritoriesView() {
  const hydrated = useHydrated()
  useEffect(() => {
    if (hydrated) document.documentElement.setAttribute('data-app-hydrated', 'true')
  }, [hydrated])

  const { session } = useRouteContext({ from: '__root__' })
  const playerId = session && !session.isGuest ? session.playerId : ''
  const query = useQuery(territoryDashboardQueryOptions(playerId))

  if (query.isPending) {
    return <div className="text-center py-8 text-[var(--color-text-secondary)]">Chargement…</div>
  }
  if (query.error) {
    return <div className="text-center py-8 text-[var(--color-malus)]">{query.error.message}</div>
  }
  const result = query.data
  if (!result.success) {
    return <div className="text-center py-8 text-[var(--color-malus)]">{result.error.message}</div>
  }
  const { coBalance, factionDisplayName, setupCompletedAt } = result.data
  const isFetching = query.isFetching && !query.isPending
  return (
    <main>
      <CoBanner coBalance={coBalance} factionDisplayName={factionDisplayName} isFetching={isFetching} />
      {setupCompletedAt === null ? (
        <div className="max-w-[720px] mx-auto px-4 py-12 text-center">
          <div aria-hidden className="mx-auto mb-4 text-5xl opacity-40">📜</div>
          <p className="font-body text-base text-[var(--color-text-primary)] mb-2">
            Configurez vos territoires pour commencer
          </p>
          <p className="font-body text-sm text-[var(--color-text-secondary)] mb-6">
            Importez votre solde actuel, vos tuiles, vos colonies et vos bâtiments pour démarrer le suivi de votre empire.
          </p>
          {/* TODO Epic 7: open setup wizard */}
          <button
            type="button"
            onClick={() => { /* placeholder */ }}
            className="inline-flex items-center justify-center rounded-md bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Configurer mes territoires
          </button>
        </div>
      ) : (
        <div className="max-w-[720px] mx-auto px-4 py-12 text-center text-[var(--color-text-secondary)]">
          Tableau de bord à venir (Epic 2 — tuiles).
        </div>
      )}
    </main>
  )
}
