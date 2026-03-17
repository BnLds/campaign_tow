import { createFileRoute, useRouteContext, useRouter, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState, useEffect } from 'react'
import { useHydrated } from '../lib/useHydrated'
import { WelcomeModal } from '../components/welcome-modal'
import { TimelineEntry } from '../components/timeline-entry'
import { ActionChip } from '../components/action-chip'
import { authMiddleware } from '../lib/middleware'
import type { ServerResult } from '../lib/types'
import type { TimelineEntryData, PendingMatchData } from '../db/queries'
import { updateDisplayNameSchema, submitMatchResultSchema, toValidResult } from '../lib/validators'

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

export const submitMatchResultFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator(submitMatchResultSchema)
  .handler(async ({ context, data }): Promise<ServerResult<{ participantId: string; result: string }>> => {
    if (context.session.isGuest) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Connexion requise' } }
    }
    const { getPlayerArmy, getMatchParticipantByMatchAndArmy, updateMatchResults } = await import('../db/queries')
    const army = await getPlayerArmy(context.session.playerId)
    if (!army) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Aucune armee assignee' } }
    }
    const participant = await getMatchParticipantByMatchAndArmy(data.matchId, army.id)
    if (!participant) {
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: "Vous n'etes pas participant de cette partie" },
      }
    }
    const updated = await updateMatchResults(data.matchId, army.id, data.result)
    if (!updated) {
      return { success: false, error: { code: 'SERVER_ERROR', message: 'Echec de la mise a jour du resultat' } }
    }
    return { success: true, data: { participantId: participant.id, result: data.result } }
  })

const loadCampaignTimelineFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { session } = context
    if (session.isGuest) {
      return {
        isGuest: true as const,
        army: null,
        timeline: [] as TimelineEntryData[],
        pendingMatches: [] as PendingMatchData[],
      }
    }
    const { getPlayerArmy, getTimelineForArmy, getPendingMatches } = await import('../db/queries')
    const army = await getPlayerArmy(session.playerId)
    const timeline: TimelineEntryData[] = army
      ? await getTimelineForArmy(army.id)
      : []
    const pendingMatches: PendingMatchData[] = army
      ? await getPendingMatches(army.id)
      : []
    return { isGuest: false as const, army, timeline, pendingMatches }
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
  const { isGuest, army, timeline, pendingMatches } = Route.useLoaderData()

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

  const handleResultSubmit = async (matchId: string, result: 'victory' | 'defeat' | 'draw') => {
    const response = await submitMatchResultFn({ data: { matchId, result } })
    if (!response.success) {
      throw new Error(response.error.message)
    }
    await router.invalidate()
  }

  const handleEvolutionStart = (matchId: string) => {
    void router.navigate({ to: '/match/$matchId/post-match', params: { matchId } })
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
            {/* Action strip — pending matches */}
            {pendingMatches.length > 0 && (
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 0', marginBottom: 12, alignItems: 'center', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
              >
                {pendingMatches.map((match) => {
                  // H4 — safe date formatting: fallback to raw date string if parsing fails
                  let formattedDate: string
                  try {
                    const parsed = new Date(match.date)
                    if (isNaN(parsed.getTime())) throw new Error('invalid date')
                    formattedDate = new Intl.DateTimeFormat('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                    }).format(parsed)
                  } catch {
                    formattedDate = match.date
                  }

                  const label = match.myResult === null
                    ? `Resultat a entrer -- vs ${match.opponentArmyName} . ${formattedDate}`
                    : `Rapport de bataille -- vs ${match.opponentArmyName} . ${formattedDate}`

                  // myResult !== null → result entered, evolutions pending → navigate to post-match
                  if (match.myResult !== null) {
                    return (
                      <ActionChip
                        key={match.matchId}
                        label={label}
                        href={'/match/' + match.matchId + '/post-match'}
                      />
                    )
                  }

                  return (
                    <ActionChip
                      key={match.matchId}
                      label={label}
                      // TODO: story 3.3 -- result entry route -- no href for now (avoids scroll-to-top)
                    />
                  )
                })}
              </div>
            )}

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
                      isEditable={!isGuest && army !== null}
                      onResultSubmit={handleResultSubmit}
                      onEvolutionStart={handleEvolutionStart}
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
