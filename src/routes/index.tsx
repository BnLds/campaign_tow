import { createFileRoute, useRouteContext, useRouter, Link } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { useState, useEffect } from 'react'
import { useHydrated } from '../lib/useHydrated'
import { WelcomeModal } from '../components/welcome-modal'
import { TimelineEntry } from '../components/timeline-entry'
import { ActionChip } from '../components/action-chip'
import { ArmyImportForm } from '../components/army-import-form'
import { authMiddleware } from '../lib/middleware'
import type { ServerResult } from '../lib/types'
import type { TimelineEntryData, PendingMatchData } from '../db/queries'
import { updateDisplayNameSchema, submitMatchResultSchema, toValidResult } from '../lib/validators'
import { sessionQueryOptions } from '../lib/session-queries'

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
    const { getPlayerArmy, getMatchParticipantByMatchAndPlayer, updateMatchResults, updateMatchResultOnLatest } = await import('../db/queries')
    const army = await getPlayerArmy(context.session.playerId)
    if (!army) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Aucune armee assignee' } }
    }
    const participant = await getMatchParticipantByMatchAndPlayer(data.matchId, context.session.playerId)
    if (!participant) {
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: "Vous n'etes pas participant de cette partie" },
      }
    }
    // First-time result entry (result is null) or re-edit on latest match
    const updated = participant.result === null
      ? await updateMatchResults(data.matchId, context.session.playerId, data.result)
      : await updateMatchResultOnLatest(data.matchId, context.session.playerId, army.id, data.result)
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
    const pendingMatches: PendingMatchData[] = await getPendingMatches(session.playerId)
    return { isGuest: false as const, army, timeline, pendingMatches }
  })

export const Route = createFileRoute('/')({
  staleTime: 30_000,
  loader: async () => {
    return loadCampaignTimelineFn()
  },
  component: CampaignView,
})

function CampaignView() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const context = useRouteContext({ from: '__root__' })
  const { session } = context
  // Reactive session: detects hasSeenWelcome changes from cache invalidation
  const { data: sessionQuery } = useQuery(sessionQueryOptions())
  const hasSeenWelcome = sessionQuery?.hasSeenWelcome ?? session?.hasSeenWelcome ?? true
  const [modalDismissed, setModalDismissed] = useState(false)
  const modalOpen = !hasSeenWelcome && !modalDismissed
  const [resultPickerMatchId, setResultPickerMatchId] = useState<string | null>(null)
  const [reentryConfirmMatchId, setReentryConfirmMatchId] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)
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
      setModalDismissed(true)
      await queryClient.invalidateQueries({ queryKey: ['session'] })
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
    queryClient.invalidateQueries({ queryKey: ['session'] })
    queryClient.invalidateQueries({ queryKey: ['army-info'] })
    await router.invalidate({ filter: (d) => d.routeId === '__root__' || d.routeId === '/' })
  }

  const handleEvolutionStart = (matchId: string) => {
    void router.navigate({ to: '/match/$matchId/post-match', params: { matchId } })
  }

  const handlePostMatchReentry = (matchId: string) => {
    setReentryConfirmMatchId(matchId)
  }

  const confirmReentry = () => {
    if (reentryConfirmMatchId) {
      const matchId = reentryConfirmMatchId
      setReentryConfirmMatchId(null)
      void router.navigate({ to: '/match/$matchId/post-match', params: { matchId } })
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
      {reentryConfirmMatchId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--color-surface)', borderRadius: 12, padding: '1.5rem', minWidth: 260, maxWidth: 340, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-text-primary)' }}>
              Modifier le rapport ?
            </p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1rem', lineHeight: 1.4 }}>
              Les ameliorations et consequences devront etre re-saisies. Les XP seront pre-remplis.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setReentryConfirmMatchId(null)}
                style={{ padding: '0.5rem 1rem', borderRadius: 8, border: '1px solid var(--color-separator)', background: 'var(--color-background)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.875rem' }}
              >
                Annuler
              </button>
              <button
                data-testid="confirm-reentry"
                onClick={confirmReentry}
                style={{ padding: '0.5rem 1rem', borderRadius: 8, border: 'none', background: '#334155', color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.875rem' }}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
      {resultPickerMatchId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--color-surface)', borderRadius: 12, padding: '1.5rem', minWidth: 260, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-text-primary)' }}>
              Résultat de la partie
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {(['victory', 'defeat', 'draw'] as const).map((r) => (
                <button
                  key={r}
                  onClick={async () => {
                    const matchId = resultPickerMatchId
                    setResultPickerMatchId(null)
                    await handleResultSubmit(matchId, r)
                  }}
                  style={{ padding: '0.6rem 1rem', borderRadius: 8, border: '1px solid var(--color-separator)', background: 'var(--color-background)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.9rem', textAlign: 'left' }}
                >
                  {r === 'victory' ? 'Victoire' : r === 'defeat' ? 'Défaite' : 'Nul'}
                </button>
              ))}
              <button
                onClick={() => setResultPickerMatchId(null)}
                style={{ marginTop: '0.25rem', padding: '0.5rem', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)', fontSize: '0.85rem' }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
      <main style={{ padding: '1rem', maxWidth: '720px', margin: '0 auto' }}>
        {importSuccess && (
          <p
            style={{
              marginBottom: '1rem',
              padding: '0.625rem',
              borderRadius: '0.375rem',
              background: 'var(--color-bonus-bg)',
              color: 'var(--color-bonus)',
              border: '1px solid var(--color-bonus)',
              fontSize: '0.875rem',
              fontFamily: 'var(--font-body)',
            }}
          >
            {importSuccess}
          </p>
        )}
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
          <ArmyImportForm onSuccess={async (data) => {
            setImportSuccess(`Armee importee : ${data.armyName} (${data.faction}) — ${data.unitCount} unite${data.unitCount > 1 ? 's' : ''}`)
            await queryClient.invalidateQueries({ queryKey: ['session'] })
            await queryClient.invalidateQueries({ queryKey: ['army-info'] })
            await router.invalidate({ filter: (d) => d.routeId === '__root__' || d.routeId === '/' })
          }} />
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

                  const opponentLabel = match.opponentArmyName ?? match.opponentPlayerName

                  const label = match.myResult === null
                    ? `Resultat a entrer -- vs ${opponentLabel} . ${formattedDate}`
                    : `Rapport de bataille -- vs ${opponentLabel} . ${formattedDate}`

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
                      onClick={() => setResultPickerMatchId(match.matchId)}
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
                        name: entry.opponent.name ?? entry.opponent.playerName,
                        faction: entry.opponent.faction ?? '',
                        playerName: entry.opponent.playerName ?? undefined,
                      }}
                      result={toValidResult(entry.result)}
                      date={entry.date}
                      hasEvolutions={entry.hasEvolutions}
                      isEditable={!isGuest && army !== null && (!entry.hasEvolutions || entry.isLatestMatch)}
                      isLatestMatch={entry.isLatestMatch}
                      onResultSubmit={handleResultSubmit}
                      onEvolutionStart={handleEvolutionStart}
                      onPostMatchReentry={handlePostMatchReentry}
                      unitXpEntries={entry.unitXpEntries}
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
