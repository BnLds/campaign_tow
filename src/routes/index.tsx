import { createFileRoute, useRouteContext, useRouter, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState, useEffect } from 'react'
import { useHydrated } from '../lib/useHydrated'
import { WelcomeModal } from '../components/welcome-modal'
import { TimelineEntry } from '../components/timeline-entry'
import { authMiddleware } from '../lib/middleware'
import type { ServerResult } from '../lib/types'
import type { TimelineEntryData } from '../db/queries'
import { updateDisplayNameSchema } from '../lib/validators'

const VALID_RESULTS = new Set(['victory', 'defeat', 'draw'] as const)
type ValidResult = 'victory' | 'defeat' | 'draw'
function toValidResult(r: string | null): ValidResult | null {
  if (r && VALID_RESULTS.has(r as ValidResult)) return r as ValidResult
  return null
}

const markWelcomeSeenFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<void> => {
    if (context.session.isGuest) throw new Error('UNAUTHORIZED')
    const { markPlayerWelcomeSeen } = await import('../db/queries')
    await markPlayerWelcomeSeen(context.session.playerId)
  })

const updateDisplayNameFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator(updateDisplayNameSchema)
  .handler(async ({ context, data }): Promise<ServerResult<{ displayName: string }>> => {
    if (context.session.isGuest) throw new Error('UNAUTHORIZED')
    const { updatePlayerDisplayName } = await import('../db/queries')
    await updatePlayerDisplayName(context.session.playerId, data.displayName)
    return { success: true, data: { displayName: data.displayName } }
  })

const loadCampaignTimelineFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { session } = context
    if (session.isGuest) {
      return { isGuest: true as const, army: null, timeline: [] as TimelineEntryData[] }
    }
    const { getPlayerArmy, getTimelineForArmy } = await import('../db/queries')
    const army = await getPlayerArmy(session.playerId)
    const timeline: TimelineEntryData[] = army
      ? await getTimelineForArmy(army.id)
      : []
    return { isGuest: false as const, army, timeline }
  })

export const Route = createFileRoute('/')({
  loader: async () => {
    return loadCampaignTimelineFn()
  },
  component: CampaignView,
})

function CampaignView() {
  const router = useRouter()
  const context = useRouteContext({ from: '__root__' })
  const { session } = context
  const [modalOpen, setModalOpen] = useState(session?.hasSeenWelcome === false)
  const hydrated = useHydrated()
  const { isGuest, army, timeline } = Route.useLoaderData()

  useEffect(() => {
    if (hydrated) {
      document.documentElement.setAttribute('data-app-hydrated', 'true')
    }
  }, [hydrated])

  const handleDismiss = async () => {
    try {
      await markWelcomeSeenFn()
    } finally {
      setModalOpen(false)
      await router.invalidate()
    }
  }

  const handleUpdateDisplayName = async (name: string) => {
    const result = await updateDisplayNameFn({ data: { displayName: name } })
    if (!result.success) {
      throw new Error(result.error.message)
    }
  }

  return (
    <>
      {!session?.isGuest && (
        <WelcomeModal
          open={modalOpen}
          displayName={session?.displayName ?? ''}
          onDismiss={handleDismiss}
          onUpdateDisplayName={handleUpdateDisplayName}
        />
      )}
      <main style={{ padding: '1rem', maxWidth: '720px', margin: '0 auto' }}>
        {isGuest ? (
          /* Guest user: no personal timeline */
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
              Connectez-vous pour voir votre timeline
            </p>
            <Link to="/armies" style={{ color: 'var(--color-brand)' }}>
              Voir toutes les armées
            </Link>
          </div>
        ) : army === null ? (
          /* Logged in but no army assigned */
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              Aucune armee assignee — contactez l'administrateur
            </p>
          </div>
        ) : (
          /* Logged in with an army */
          <>
            {/* Army header */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h1
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: '1.5rem',
                  color: 'var(--color-text-primary)',
                  marginBottom: '0.25rem',
                }}
              >
                {army.name}
              </h1>
              <p
                style={{
                  color: 'var(--color-text-secondary)',
                  fontSize: '0.875rem',
                  marginBottom: '0.5rem',
                }}
              >
                {army.faction}
              </p>
              <Link
                to="/armies/$armyId"
                params={{ armyId: army.id }}
                style={{ color: 'var(--color-brand)', fontSize: '0.875rem' }}
              >
                Voir le détail de l'armée
              </Link>
            </div>

            {/* Timeline */}
            <section>
              <h2
                style={{
                  fontFamily: 'var(--font-body)',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--color-section-label)',
                  marginBottom: '0.75rem',
                }}
              >
                Historique
              </h2>

              {timeline.length === 0 ? (
                <p style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                  Aucune partie jouee pour le moment
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {timeline.map((entry) => (
                    <TimelineEntry
                      key={entry.matchId}
                      matchId={entry.matchId}
                      opponent={{
                        name: entry.opponent.name,
                        faction: entry.opponent.faction,
                        playerName: entry.opponent.playerName ?? undefined,
                      }}
                      result={toValidResult(entry.result)}
                      date={entry.date}
                      hasEvolutions={entry.hasEvolutions}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </>
  )
}
