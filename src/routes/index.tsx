import { createFileRoute, useRouteContext, useRouter, Link } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { useState, useEffect, useRef } from 'react'
import { useHydrated } from '../lib/useHydrated'
import { WelcomeModal } from '../components/welcome-modal'
import { TimelineEntry } from '../components/timeline-entry'
import { ArmyImportForm } from '../components/army-import-form'
import { authMiddleware } from '../lib/middleware'
import type { ServerResult } from '../lib/types'
import type { TimelineEntryData } from '../db/queries'
import { updateDisplayNameSchema, submitMatchResultSchema, deleteMatchSchema, toValidResult } from '../lib/validators'
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

export const deleteMatchFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator(deleteMatchSchema)
  .handler(async ({ context, data }): Promise<ServerResult<null>> => {
    if (context.session.isGuest) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Connexion requise' } }
    }
    const { getMatchParticipantByMatchAndPlayer, deleteMatchWithXpRollback } = await import('../db/queries')
    const participant = await getMatchParticipantByMatchAndPlayer(data.matchId, context.session.playerId)
    if (!participant) {
      return { success: false, error: { code: 'FORBIDDEN', message: "Vous n'êtes pas participant de cette partie" } }
    }
    const result = await deleteMatchWithXpRollback(data.matchId)
    if (!result.deleted) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Post-match déjà complété' } }
    }
    return { success: true, data: null }
  })

const createInitialSetupMatchFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<ServerResult<{ matchId: string }>> => {
    if (context.session.isGuest) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Connexion requise' } }
    }
    const { getPlayerArmy, createInitialSetupMatch } = await import('../db/queries')
    const army = await getPlayerArmy(context.session.playerId)
    if (!army) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Aucune armee assignee' } }
    }
    const matchId = await createInitialSetupMatch(context.session.playerId, army.id)
    return { success: true, data: { matchId } }
  })

const skipInitialXpFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<ServerResult<void>> => {
    if (context.session.isGuest) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Connexion requise' } }
    }
    const { getPlayerArmy, getInitialSetupMatchForArmy } = await import('../db/queries')
    const { db } = await import('../db/index')
    const { armies: armiesTable, matches: matchesTable, matchParticipants: mpTable } = await import('../db/schema')
    const { eq: dbEq, and: dbAnd } = await import('drizzle-orm')

    const army = await getPlayerArmy(context.session.playerId)
    if (!army) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Aucune armee assignee' } }
    }

    await db.transaction(async (tx) => {
      // Clear needsInitialXp flag
      await tx.update(armiesTable).set({ needsInitialXp: false }).where(dbEq(armiesTable.id, army.id))

      // Delete incomplete initial_setup match if it exists
      const existing = await getInitialSetupMatchForArmy(army.id)
      if (existing && existing.evolutionsEnteredAt === null) {
        await tx.delete(mpTable).where(dbEq(mpTable.matchId, existing.matchId))
        await tx.delete(matchesTable).where(dbAnd(dbEq(matchesTable.id, existing.matchId), dbEq(matchesTable.matchType, 'initial_setup')))
      }
    })

    return { success: true, data: undefined }
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
        initialSetupMatch: null as { matchId: string; matchParticipantId: string; evolutionsEnteredAt: string | null } | null,
      }
    }
    const { getPlayerArmy, getTimelineForArmy, getInitialSetupMatchForArmy } = await import('../db/queries')
    const army = await getPlayerArmy(session.playerId)
    const [timeline, initialSetupMatchRaw] = await Promise.all([
      army ? getTimelineForArmy(army.id) : Promise.resolve([] as TimelineEntryData[]),
      army?.needsInitialXp ? getInitialSetupMatchForArmy(army.id) : Promise.resolve(null),
    ])
    const initialSetupMatch = initialSetupMatchRaw
      ? {
          matchId: initialSetupMatchRaw.matchId,
          matchParticipantId: initialSetupMatchRaw.matchParticipantId,
          evolutionsEnteredAt: initialSetupMatchRaw.evolutionsEnteredAt?.toISOString() ?? null,
        }
      : null
    return { isGuest: false as const, army, timeline, initialSetupMatch }
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
  const [reentryConfirmMatchId, setReentryConfirmMatchId] = useState<string | null>(null)
  const [deleteConfirmMatch, setDeleteConfirmMatch] = useState<{ matchId: string; opponentName: string; date: string } | null>(null)
  const [skipXpConfirmOpen, setSkipXpConfirmOpen] = useState(false)
  const [skipXpError, setSkipXpError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string } | null>(null)
  const [blockToast, setBlockToast] = useState<string | null>(null)
  const blockToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)
  const hydrated = useHydrated()
  const { isGuest, army, timeline, initialSetupMatch } = Route.useLoaderData()

  // Ref to track toast timeout — clears previous timeout on each new toast, and on unmount
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (blockToastTimeoutRef.current) clearTimeout(blockToastTimeoutRef.current)
    }
  }, [])

  // Double-submit guard for delete mutation
  const deleteMatchInProgressRef = useRef(false)
  // Double-submit guard for skip-XP mutation
  const skipXpInProgressRef = useRef(false)

  // Auto-create initial setup match on mount if needed (useRef guard prevents double-run in React Strict Mode)
  const initialMatchCreatedRef = useRef(false)
  useEffect(() => {
    if (initialMatchCreatedRef.current) return
    if (!army?.needsInitialXp || initialSetupMatch) return
    initialMatchCreatedRef.current = true
    void createInitialSetupMatchFn().then(async (result) => {
      if (result.success) {
        await router.invalidate({ filter: (d) => d.routeId === '/' })
      }
    })
  }, [army, initialSetupMatch, router])

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

  const handleDeleteMatch = async () => {
    if (!deleteConfirmMatch) return
    if (deleteMatchInProgressRef.current) return
    deleteMatchInProgressRef.current = true
    const { matchId } = deleteConfirmMatch
    setDeleteConfirmMatch(null)
    try {
      const result = await deleteMatchFn({ data: { matchId } })
      const message = result.success
        ? `${session?.displayName ?? 'Joueur'} a supprimé le match`
        : (result.error.message ?? 'Erreur lors de la suppression')
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
      if (blockToastTimeoutRef.current) clearTimeout(blockToastTimeoutRef.current)
      setBlockToast(null)
      setToast({ message })
      toastTimeoutRef.current = setTimeout(() => setToast(null), 5000)
      await router.invalidate({ filter: (d) => d.routeId === '__root__' || d.routeId === '/' })
    } finally {
      deleteMatchInProgressRef.current = false
    }
  }

  const handleSkipInitialXp = () => {
    setSkipXpConfirmOpen(true)
  }

  const confirmSkipInitialXp = async () => {
    if (skipXpInProgressRef.current) return
    skipXpInProgressRef.current = true
    setSkipXpError(null)
    try {
      const result = await skipInitialXpFn()
      if (!result.success) {
        setSkipXpError(result.error.message ?? 'Erreur lors du passage de l\'XP initiale')
        return
      }
      setSkipXpConfirmOpen(false)
      await router.invalidate({ filter: (d) => d.routeId === '/' })
    } catch {
      setSkipXpError('Une erreur est survenue')
    } finally {
      skipXpInProgressRef.current = false
    }
  }

  const showBlockToast = (message: string) => {
    if (blockToastTimeoutRef.current) clearTimeout(blockToastTimeoutRef.current)
    setToast(null)
    setBlockToast(message)
    blockToastTimeoutRef.current = setTimeout(() => setBlockToast(null), 3000)
  }

  const handleEvolutionStart = (matchId: string) => {
    // Priority 1: initial XP not done — block all standard matches
    if (army?.needsInitialXp && matchId !== initialSetupMatch?.matchId) {
      if (initialSetupMatch === null || initialSetupMatch.evolutionsEnteredAt === null) {
        showBlockToast("Remplissez d'abord l'XP initiale de votre armée")
        return
      }
    }
    // Priority 2: previous standard match with result entered but evolutions not yet filled.
    // Timeline is sorted newest-first (getTimelineForArmy: ORDER BY date DESC, createdAt DESC),
    // so "older" = higher index in array.
    // Note: matches with result === null are intentionally excluded — the player first needs to
    // enter a result (separate action), then fill post-match evolutions. Only the second step
    // (result set, evolutions missing) triggers the ordering block.
    const matchIndex = timeline.findIndex((e) => e.matchId === matchId)
    if (matchIndex !== -1) {
      const olderUnfilled = timeline
        .slice(matchIndex + 1)
        .some((e) => e.matchType !== 'initial_setup' && e.result !== null && !e.hasEvolutions)
      if (olderUnfilled) {
        showBlockToast("Remplissez d'abord le rapport du match précédent")
        return
      }
    }
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
      {/* Toast rouge — suppression de match */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 70, left: '50%', transform: 'translateX(-50%)', background: 'var(--color-malus)', color: '#fff', padding: '0.625rem 1.25rem', borderRadius: 8, fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600, zIndex: 50, whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
          {toast.message}
        </div>
      )}
      {/* Toast navy — blocage rapport post-match */}
      {blockToast && (
        <div data-testid="block-toast" style={{ position: 'fixed', bottom: 70, left: '50%', transform: 'translateX(-50%)', background: 'var(--color-brand-dark)', color: '#fff', padding: '0.625rem 1.25rem', borderRadius: 8, fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600, zIndex: 50, maxWidth: 'calc(100vw - 2rem)', textAlign: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
          {blockToast}
        </div>
      )}
      {/* Modal de confirmation — suppression de match */}
      {deleteConfirmMatch && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--color-surface)', borderRadius: 12, padding: '1.5rem', minWidth: 260, maxWidth: 340, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-text-primary)' }}>
              Supprimer la partie ?
            </p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1rem', lineHeight: 1.4 }}>
              {`Supprimer le match du ${deleteConfirmMatch.date} contre ${deleteConfirmMatch.opponentName} ?`}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteConfirmMatch(null)}
                style={{ padding: '0.5rem 1rem', borderRadius: 8, border: '1px solid var(--color-separator)', background: 'var(--color-background)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.875rem' }}
              >
                Annuler
              </button>
              <button
                data-testid="confirm-delete-match"
                onClick={() => void handleDeleteMatch()}
                style={{ padding: '0.5rem 1rem', borderRadius: 8, border: 'none', background: 'var(--color-malus)', color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.875rem' }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
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
      {/* Modal de confirmation — passer l'XP initiale */}
      {skipXpConfirmOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--color-surface)', borderRadius: 12, padding: '1.5rem', minWidth: 260, maxWidth: 340, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-text-primary)' }}>
              Passer l&apos;XP initiale ?
            </p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1rem', lineHeight: 1.4 }}>
              Les unités ne recevront aucune XP de départ. Cette action ne peut pas être annulée depuis l&apos;interface.
            </p>
            {skipXpError && (
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', color: 'var(--color-malus)', margin: '0 0 0.75rem' }}>
                {skipXpError}
              </p>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setSkipXpConfirmOpen(false); setSkipXpError(null) }}
                style={{ padding: '0.5rem 1rem', borderRadius: 8, border: '1px solid var(--color-separator)', background: 'var(--color-background)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.875rem' }}
              >
                Annuler
              </button>
              <button
                data-testid="confirm-skip-initial-xp"
                onClick={() => { void confirmSkipInitialXp() }}
                style={{ padding: '0.5rem 1rem', borderRadius: 8, border: 'none', background: '#334155', color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.875rem' }}
              >
                Confirmer
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
                      matchType={entry.matchType as 'standard' | 'initial_setup' | undefined}
                      opponent={entry.opponent
                        ? {
                            name: entry.opponent.name ?? entry.opponent.playerName,
                            faction: entry.opponent.faction ?? '',
                            playerName: entry.opponent.playerName ?? undefined,
                          }
                        : null
                      }
                      result={toValidResult(entry.result)}
                      date={entry.date}
                      hasEvolutions={entry.hasEvolutions}
                      isEditable={!isGuest && army !== null && (!entry.hasEvolutions || entry.isLatestMatch)}
                      isLatestMatch={entry.isLatestMatch}
                      onResultSubmit={handleResultSubmit}
                      onEvolutionStart={handleEvolutionStart}
                      onPostMatchReentry={handlePostMatchReentry}
                      onSkipInitialXp={entry.matchType === 'initial_setup' ? handleSkipInitialXp : undefined}
                      onDelete={!entry.hasEvolutions ? (matchId) => {
                        const opponent = entry.opponent
                        const opponentName = opponent?.name ?? opponent?.playerName ?? 'Adversaire'
                        let formattedDate: string
                        try {
                          const parsed = new Date(entry.date)
                          formattedDate = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(parsed)
                        } catch {
                          formattedDate = entry.date
                        }
                        setDeleteConfirmMatch({ matchId, opponentName, date: formattedDate })
                      } : undefined}
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
