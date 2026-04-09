import { createFileRoute, useRouteContext, useRouter, Link } from '@tanstack/react-router'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { useState, useEffect, useRef } from 'react'
import { TimelineEntry } from '../components/timeline-entry'
import { ArmyImportForm } from '../components/army-import-form'
import { UnitSelectionWizard } from '../components/unit-selection-wizard'
import { authMiddleware } from '../lib/middleware'
import type { ServerResult, MatchType } from '../lib/types'
import { submitMatchResultSchema, submitUnitSelectionSchema, deleteMatchSchema, toValidResult } from '../lib/validators'
import { requiresUnitSelection } from '../lib/match-utils'
import { invalidateArmyState } from '../lib/invalidation-helpers'
import { campaignTimelineQueryOptions } from '../lib/campaign-queries'
import { sessionQueryOptions } from '../lib/session-queries'

export const submitMatchResultFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator(submitMatchResultSchema)
  .handler(async ({ context, data }): Promise<ServerResult<{ participantId: string; result: string }>> => {
    if (context.session.isGuest) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Connexion requise' } }
    }
    const { getPlayerArmy, getMatchParticipantByMatchAndPlayer, updateMatchResults, updateMatchResultOnLatest, snapshotArmyTotalsForMatch } = await import('../db/queries')
    const army = await getPlayerArmy(context.session.playerId)
    if (!army) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Aucune armée assignée' } }
    }
    const participant = await getMatchParticipantByMatchAndPlayer(data.matchId, context.session.playerId)
    if (!participant) {
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: "Vous n'êtes pas participant de cette partie" },
      }
    }
    // Unit selection gate — skip for initial_setup matches
    const { db: dbInst } = await import('../db/index')
    const { matches: matchesTable } = await import('../db/schema')
    const { eq: dbEq } = await import('drizzle-orm')
    const matchTypeRows = await dbInst
      .select({ matchType: matchesTable.matchType })
      .from(matchesTable)
      .where(dbEq(matchesTable.id, data.matchId))
      .limit(1)
    const matchType = matchTypeRows[0]?.matchType ?? 'standard'
    if (requiresUnitSelection(matchType) && !participant.unitSelectionCompletedAt) {
      return { success: false, error: { code: 'UNIT_SELECTION_REQUIRED', message: 'La sélection des unités doit être complétée avant de saisir le résultat' } }
    }
    // First-time result entry (result is null) or re-edit on latest match
    const isFirstTime = participant.result === null
    const updated = isFirstTime
      ? await updateMatchResults(data.matchId, context.session.playerId, data.result)
      : await updateMatchResultOnLatest(data.matchId, context.session.playerId, army.id, army.initialXpCompletedAt, data.result)
    if (!updated) {
      return { success: false, error: { code: 'SERVER_ERROR', message: 'Échec de la mise à jour du résultat' } }
    }
    // Snapshot: capture army XP & points deltas at result entry
    await snapshotArmyTotalsForMatch(data.matchId)
    return { success: true, data: { participantId: participant.id, result: data.result } }
  })

export const submitUnitSelectionFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator(submitUnitSelectionSchema)
  .handler(async ({ context, data }): Promise<ServerResult<{ totalXp: number; totalPoints: number }>> => {
    if (context.session.isGuest) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Connexion requise' } }
    }
    const { getPlayerArmy, getMatchParticipantByMatchAndPlayer, submitUnitSelection, snapshotArmyTotalsForMatch } = await import('../db/queries')
    const army = await getPlayerArmy(context.session.playerId)
    if (!army) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Aucune armée assignée' } }
    }
    const participant = await getMatchParticipantByMatchAndPlayer(data.matchId, context.session.playerId)
    if (!participant) {
      return { success: false, error: { code: 'FORBIDDEN', message: "Vous n'êtes pas participant de cette partie" } }
    }
    // Reject for initial_setup matches
    const { db: dbInst } = await import('../db/index')
    const { matchParticipants: mpTable, matches: matchesTable } = await import('../db/schema')
    const { eq: dbEq } = await import('drizzle-orm')
    const [matchRow] = await dbInst
      .select({ matchType: matchesTable.matchType })
      .from(matchesTable)
      .where(dbEq(matchesTable.id, data.matchId))
      .limit(1)
    if (matchRow && !requiresUnitSelection(matchRow.matchType)) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Sélection des unités non applicable pour ce type de partie' } }
    }
    // Block modification after post-match evolutions completed
    const [mpRow] = await dbInst
      .select({ evolutionsEnteredAt: mpTable.evolutionsEnteredAt })
      .from(mpTable)
      .where(dbEq(mpTable.id, participant.id))
      .limit(1)
    if (mpRow?.evolutionsEnteredAt) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Impossible de modifier la sélection après le rapport post-match' } }
    }
    try {
      // Wrap selection + snapshot in a single transaction to prevent race conditions
      const { db: dbTx } = await import('../db/index')
      const totals = await dbTx.transaction(async (tx) => {
        const result = await submitUnitSelection(participant.id, data.unitIds, tx)
        // If participant already has a result, recalculate snapshot atomically
        if (participant.result !== null) {
          await snapshotArmyTotalsForMatch(data.matchId, tx)
        }
        return result
      })
      return { success: true, data: totals }
    } catch (err) {
      if (err instanceof Error && err.message === 'INVALID_UNIT_IDS') {
        return { success: false, error: { code: 'FORBIDDEN', message: "Certaines unités n'appartiennent pas à votre armée" } }
      }
      throw err
    }
  })

export const loadArmyUnitsForSelectionFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .inputValidator((data: { matchId: string }) => data)
  .handler(async ({ context, data }): Promise<ServerResult<{ units: Array<{ id: string; name: string; type: string; xp: number; points: number; effectivePoints: number }>; preSelectedUnitIds: string[] }>> => {
    if (context.session.isGuest) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Connexion requise' } }
    }
    const { getPlayerArmy, getMatchParticipantByMatchAndPlayer, getUnitsForArmy, getUnitSelectionForParticipant } = await import('../db/queries')
    const army = await getPlayerArmy(context.session.playerId)
    if (!army) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Aucune armée assignée' } }
    }
    const participant = await getMatchParticipantByMatchAndPlayer(data.matchId, context.session.playerId)
    if (!participant) {
      return { success: false, error: { code: 'FORBIDDEN', message: "Vous n'êtes pas participant de cette partie" } }
    }
    // Block loading wizard after post-match evolutions completed
    const { db: dbCheck } = await import('../db/index')
    const { matchParticipants: mpCheck } = await import('../db/schema')
    const { eq: eqCheck } = await import('drizzle-orm')
    const [mpRowCheck] = await dbCheck
      .select({ evolutionsEnteredAt: mpCheck.evolutionsEnteredAt })
      .from(mpCheck)
      .where(eqCheck(mpCheck.id, participant.id))
      .limit(1)
    if (mpRowCheck?.evolutionsEnteredAt) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Sélection verrouillée après le rapport post-match' } }
    }
    const armyUnits = await getUnitsForArmy(army.id)
    const { db: dbQ } = await import('../db/index')
    const { unitGains: ugTable } = await import('../db/schema')
    const { eq, and, inArray } = await import('drizzle-orm')
    const armyUnitIds = armyUnits.map((u) => u.id)
    const activePertesCata = armyUnitIds.length > 0
      ? await dbQ.select({ unitId: ugTable.unitId })
          .from(ugTable)
          .where(and(
            inArray(ugTable.unitId, armyUnitIds),
            eq(ugTable.type, 'pertes_catastrophiques'),
            eq(ugTable.cleared, false),
          ))
      : []
    const pertesCataIds = new Set(activePertesCata.map((r) => r.unitId))
    const preSelectedUnitIds = await getUnitSelectionForParticipant(participant.id)
    return {
      success: true,
      data: {
        units: armyUnits.map((u) => ({
          id: u.id, name: u.name, type: u.type, xp: u.xp,
          points: u.points ?? 0,
          effectivePoints: pertesCataIds.has(u.id) ? Math.floor((u.points ?? 0) / 2) : (u.points ?? 0),
        })),
        preSelectedUnitIds,
      },
    }
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
      return { success: false, error: { code: 'FORBIDDEN', message: 'Aucune armée assignée' } }
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
    const { getPlayerArmy } = await import('../db/queries')
    const { db } = await import('../db/index')
    const { armies: armiesTable } = await import('../db/schema')
    const { eq: dbEq } = await import('drizzle-orm')

    const army = await getPlayerArmy(context.session.playerId)
    if (!army) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Aucune armée assignée' } }
    }

    await db.update(armiesTable).set({ initialXpCompletedAt: new Date() }).where(dbEq(armiesTable.id, army.id))

    return { success: true, data: undefined }
  })

export const Route = createFileRoute('/')({
  loader: async ({ context: { queryClient } }) => {
    const session = queryClient.getQueryData(sessionQueryOptions().queryKey)
    if (!session || session.isGuest) return
    await queryClient.ensureQueryData(campaignTimelineQueryOptions(session.playerId))
  },
  component: CampaignView,
})

function CampaignView() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const context = useRouteContext({ from: '__root__' })
  const { session } = context
  const [reentryConfirmMatchId, setReentryConfirmMatchId] = useState<string | null>(null)
  const [unitSelectionMatchId, setUnitSelectionMatchId] = useState<string | null>(null)
  const [deleteConfirmMatch, setDeleteConfirmMatch] = useState<{ matchId: string; opponentName: string; date: string } | null>(null)
  const [skipXpConfirmOpen, setSkipXpConfirmOpen] = useState(false)
  const [skipXpError, setSkipXpError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string } | null>(null)
  const [blockToast, setBlockToast] = useState<string | null>(null)
  const blockToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)
  const playerId = session && !session.isGuest ? session.playerId : null
  const timelineQuery = useQuery({
    ...campaignTimelineQueryOptions(playerId ?? ''),
    enabled: !!playerId,
  })
  const isGuest = !playerId
  const army = isGuest ? null : timelineQuery.data?.army ?? null
  const timeline = isGuest ? [] : timelineQuery.data?.timeline ?? []
  const initialSetupMatch = isGuest ? null : timelineQuery.data?.initialSetupMatch ?? null

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
    if (!army) return
    if (army.initialXpCompletedAt || initialSetupMatch) return
    initialMatchCreatedRef.current = true
    createInitialSetupMatchFn()
      .then(async (result) => {
        if (result.success) {
          await queryClient.invalidateQueries({ queryKey: ['campaign-timeline'] })
          await router.invalidate({ filter: (d) => d.routeId === '__root__' })
        } else {
          initialMatchCreatedRef.current = false
        }
      })
      .catch((err) => {
        console.error('[initial-setup] failed:', err)
        initialMatchCreatedRef.current = false
      })
  }, [army, initialSetupMatch, queryClient, router])

  const handleResultSubmit = async (matchId: string, result: 'victory' | 'defeat' | 'draw') => {
    const response = await submitMatchResultFn({ data: { matchId, result } })
    if (!response.success) {
      throw new Error(response.error.message)
    }
    queryClient.invalidateQueries({ queryKey: ['session'] })
    await invalidateArmyState(queryClient, router)
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
        ? `${session?.username ?? 'Joueur'} a supprimé le match`
        : result.error.message
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
      if (blockToastTimeoutRef.current) clearTimeout(blockToastTimeoutRef.current)
      setBlockToast(null)
      setToast({ message })
      toastTimeoutRef.current = setTimeout(() => setToast(null), 5000)
      await invalidateArmyState(queryClient, router)
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
        setSkipXpError(result.error.message)
        return
      }
      setSkipXpConfirmOpen(false)
      await invalidateArmyState(queryClient, router)
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

  const handleUnitSelectionStart = (matchId: string) => {
    setUnitSelectionMatchId(matchId)
  }

  const handleUnitSelectionSubmit = async (matchId: string, unitIds: string[]) => {
    const response = await submitUnitSelectionFn({ data: { matchId, unitIds } })
    if (!response.success) {
      throw new Error(response.error.message)
    }
    setUnitSelectionMatchId(null)
    await invalidateArmyState(queryClient, router)
  }

  const handleEvolutionStart = (matchId: string) => {
    // Priority 1: initial XP not done — block all standard matches
    if (!army?.initialXpCompletedAt && matchId !== initialSetupMatch?.matchId) {
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
              Les améliorations et conséquences devront être re-saisies. Les XP seront pré-remplis.
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
      {/* Wizard de sélection d'unités */}
      {unitSelectionMatchId && (
        <UnitSelectionWizard
          matchId={unitSelectionMatchId}
          loadUnits={() => loadArmyUnitsForSelectionFn({ data: { matchId: unitSelectionMatchId } })}
          onSubmit={(unitIds) => handleUnitSelectionSubmit(unitSelectionMatchId, unitIds)}
          onCancel={() => setUnitSelectionMatchId(null)}
        />
      )}
      {/* Modal de confirmation — passer l'XP initiale */}
      {skipXpConfirmOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--color-surface)', borderRadius: 12, padding: '1.5rem', minWidth: 260, maxWidth: 340, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-text-primary)' }}>
              Pas d&apos;xp, que de la bleusaille ?
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
        ) : !timelineQuery.data ? (
          /* Data loading (hydration) */
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--color-text-secondary)' }}>Chargement…</p>
          </div>
        ) : army === null ? (
          /* Logged in but no army assigned */
          <ArmyImportForm onSuccess={async (data) => {
            setImportSuccess(`Armée importée : ${data.armyName} (${data.faction}) — ${data.unitCount} unité${data.unitCount > 1 ? 's' : ''}`)
            await queryClient.invalidateQueries({ queryKey: ['session'] })
            await invalidateArmyState(queryClient, router)
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
                  Aucune partie jouée pour le moment
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {timeline.map((entry) => (
                    <TimelineEntry
                      key={entry.matchId}
                      matchId={entry.matchId}
                      matchType={entry.matchType as MatchType | undefined}
                      opponent={entry.opponent
                        ? {
                            name: entry.opponent.name ?? entry.opponent.playerName,
                            faction: entry.opponent.faction ?? '',
                            playerName: entry.opponent.playerName,
                          }
                        : null
                      }
                      result={toValidResult(entry.result)}
                      date={entry.date}
                      hasEvolutions={entry.hasEvolutions}
                      isEditable={!isGuest}
                      isLatestMatch={entry.isLatestMatch}
                      onResultSubmit={handleResultSubmit}
                      onEvolutionStart={handleEvolutionStart}
                      onPostMatchReentry={handlePostMatchReentry}
                      onUnitSelectionStart={handleUnitSelectionStart}
                      unitSelectionCompletedAt={entry.unitSelectionCompletedAt ?? null}
                      opponentUnitSelectionCompletedAt={entry.opponentUnitSelectionCompletedAt ?? null}
                      initialXpSkipped={entry.matchType === 'initial_setup' && !!army.initialXpCompletedAt && !entry.hasEvolutions}
                      onSkipInitialXp={entry.matchType === 'initial_setup' && !army.initialXpCompletedAt ? handleSkipInitialXp : undefined}
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
                      armyTotals={entry.armyTotals}
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
