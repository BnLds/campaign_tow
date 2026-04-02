// Campaign TOW — /match/$matchId/post-match route
// Story 4.1: Post-match flow — XP entry per unit & character
// Server functions: loadPostMatchDataFn, submitUnitXpFn, completeEvolutionsWithGainsFn

import { createFileRoute, useRouter, Link, redirect } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import React, { useEffect } from 'react'
import { useHydrated } from '../../../lib/useHydrated'
import { authMiddleware } from '../../../lib/middleware'
import { submitInitialXpSchema, loadPostMatchDataSchema, completeEvolutionsWithGainsSchema } from '../../../lib/validators'
import type { ConsequenceEntry } from '../../../lib/validators'
import { PostMatchWizard } from '../../../components/post-match-wizard'
import type { ServerResult } from '../../../lib/types'
import { invalidateArmyState } from '../../../lib/invalidation-helpers'

// ---------------------------------------------------------------------------
// Loader data type
// ---------------------------------------------------------------------------

type PostMatchLoaderData = {
  alreadyCompleted: boolean
  reentry: boolean
  matchId: string
  matchParticipantId: string
  opponentPlayerName: string
  mode: 'post-match' | 'initial-xp'
  units: Array<{ id: string; name: string; type: string; xp: number; previousXpGained: number | null; previousDerouteXpLost: number; hasMount: boolean; existingGains: Array<{description: string; type: string}>; clearedHonours: string[]; commandement: number; effectiveStats: Record<string, number | null> }>
  campaignPlayers?: Array<{ playerId: string; playerDisplayName: string }>
  catchupBonusXp: number
  catchupDeltaXp: number
}

// ---------------------------------------------------------------------------
// Server function — load post-match data
// ---------------------------------------------------------------------------

const loadPostMatchDataFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .inputValidator(loadPostMatchDataSchema)
  .handler(async ({ context, data }): Promise<PostMatchLoaderData> => {
    if (context.session.isGuest) {
      throw redirect({ to: '/' })
    }
    const { getPlayerArmy, getMatchParticipantForEvolutionByPlayer, getLatestMatchIdForArmy, getUnitsForArmy, getMatchXpEntries, getUnitDeltas, getAllPlayersWithArmyInfo, getArmyXpAndPointsTotalsBatch, getUnitSelectionForParticipant, getUnitsTotalsByIds } = await import('../../../db/queries')

    // Load drizzle deps before round 1 (needed for match type + opponent query)
    const [
      { db },
      { matchParticipants: mpTable, players: playersTable, matches: matchesTable, unitGains: unitGainsTable },
      { and: dbAnd, eq: dbEq, ne: dbNe, inArray: dbInArray },
      { alias },
    ] = await Promise.all([
      import('../../../db/index'),
      import('../../../db/schema'),
      import('drizzle-orm'),
      import('drizzle-orm/pg-core'),
    ])
    const oppParticipant = alias(mpTable, 'opp_mp')
    const oppPlayerAlias = alias(playersTable, 'opp_player')

    // Round 1 (parallel): army + participant + opponent name + matchType
    const [army, participant, oppRows, matchRows] = await Promise.all([
      getPlayerArmy(context.session.playerId),
      getMatchParticipantForEvolutionByPlayer(data.matchId, context.session.playerId),
      db
        .select({ playerName: oppPlayerAlias.username, oppArmyId: oppParticipant.armyId })
        .from(oppParticipant)
        .innerJoin(oppPlayerAlias, dbEq(oppParticipant.playerId, oppPlayerAlias.id))
        .where(dbAnd(dbEq(oppParticipant.matchId, data.matchId), dbNe(oppParticipant.playerId, context.session.playerId)))
        .limit(1),
      db
        .select({ matchType: matchesTable.matchType })
        .from(matchesTable)
        .where(dbEq(matchesTable.id, data.matchId))
        .limit(1),
    ])

    if (!army) {
      throw new Error('ARMY_REQUIRED')
    }
    if (!participant) {
      throw new Error('FORBIDDEN')
    }

    const matchType = matchRows[0]?.matchType ?? 'standard'
    const mode: 'post-match' | 'initial-xp' = matchType === 'initial_setup' ? 'initial-xp' : 'post-match'
    // For initial_setup matches, there's no opponent
    const opponentPlayerName = matchType === 'initial_setup' ? '' : (oppRows[0]?.playerName ?? 'Adversaire')

    // Check re-entry eligibility: only the army's latest match can be re-entered
    // Skip for initial_setup — it's a one-off match whose 1993 date is always excluded by the gte filter
    const isReentry = participant.evolutionsEnteredAt !== null
    if (isReentry && matchType !== 'initial_setup') {
      const latestMatchId = await getLatestMatchIdForArmy(army.id, army.initialXpCompletedAt)
      if (data.matchId !== latestMatchId) {
        return {
          alreadyCompleted: true,
          reentry: false,
          matchId: data.matchId,
          matchParticipantId: participant.id,
          opponentPlayerName,
          mode,
          units: [],
          catchupBonusXp: 0,
          catchupDeltaXp: 0,
        }
      }
    }
    // Load unit selection for filtering (if player has completed selection)
    const playerSelectionUnitIds = participant.unitSelectionCompletedAt
      ? await getUnitSelectionForParticipant(participant.id)
      : null // null = no selection, load all units

    // Compute catchup bonus XP — use per-participant selected totals when available
    const oppArmyId = oppRows[0]?.oppArmyId ?? null
    // Get opponent participant for their selection
    const oppParticipantRows = oppArmyId
      ? await db
          .select({ id: mpTable.id, unitSelectionCompletedAt: mpTable.unitSelectionCompletedAt })
          .from(mpTable)
          .where(dbAnd(dbEq(mpTable.matchId, data.matchId), dbNe(mpTable.playerId, context.session.playerId)))
          .limit(1)
      : []
    const oppParticipantInfo = oppParticipantRows[0] ?? null

    // Player totals: from selection if exists, else full army
    let playerTotal: { totalXp: number; totalPoints: number }
    if (playerSelectionUnitIds && playerSelectionUnitIds.length > 0) {
      playerTotal = await getUnitsTotalsByIds(playerSelectionUnitIds)
    } else {
      const totalsMap = await getArmyXpAndPointsTotalsBatch([army.id])
      playerTotal = totalsMap.get(army.id) ?? { totalXp: 0, totalPoints: 0 }
    }

    // Opponent totals: from their selection if exists, else full army
    let opponentTotal: { totalXp: number; totalPoints: number } = { totalXp: 0, totalPoints: 0 }
    if (oppArmyId) {
      if (oppParticipantInfo?.unitSelectionCompletedAt) {
        const oppSelectedIds = await getUnitSelectionForParticipant(oppParticipantInfo.id)
        opponentTotal = oppSelectedIds.length > 0 ? await getUnitsTotalsByIds(oppSelectedIds) : { totalXp: 0, totalPoints: 0 }
      } else {
        const totalsMap = await getArmyXpAndPointsTotalsBatch([oppArmyId])
        opponentTotal = totalsMap.get(oppArmyId) ?? { totalXp: 0, totalPoints: 0 }
      }
    }
    const catchupDeltaXp = mode === 'initial-xp' ? 0 : Math.max(0, opponentTotal.totalXp - playerTotal.totalXp)
    const catchupBonusXp = Math.floor(catchupDeltaXp / 10)

    // Reentry: restore persisted bonusXp instead of live-computed value
    let finalCatchupBonusXp = catchupBonusXp
    let finalCatchupDeltaXp = catchupDeltaXp
    if (isReentry) {
      const participantRows = await db
        .select({ bonusXp: mpTable.bonusXp })
        .from(mpTable)
        .where(dbEq(mpTable.id, participant.id))
        .limit(1)
      const persistedBonus = participantRows[0]?.bonusXp
      if (persistedBonus != null) {
        finalCatchupBonusXp = persistedBonus
        finalCatchupDeltaXp = 0
      }
    }

    // Round 2 (parallel): units + xp entries
    const [allUnitsRaw, existingEntries] = await Promise.all([
      getUnitsForArmy(army.id),
      getMatchXpEntries(participant.id),
    ])
    // Filter units by selection if player has completed unit selection
    const selectedSet = playerSelectionUnitIds ? new Set(playerSelectionUnitIds) : null
    const unitsRaw = selectedSet ? allUnitsRaw.filter((u) => selectedSet.has(u.id)) : allUnitsRaw
    const entryMap = new Map(existingEntries.map((e) => [e.unitId, { xpGained: e.xpGained, derouteXpLost: e.derouteXpLost }]))
    // Load existing unit_gains — filter out gains from the current participant
    // (defense in depth: with batch commit there should be no partial gains,
    // but this protects against legacy orphaned gains from older code).
    const unitIds = unitsRaw.map((u) => u.id)
    const { statModifiers: allStatModifiers, unitGains: allExistingGains } = unitIds.length > 0
      ? await getUnitDeltas(unitIds)
      : { statModifiers: [], unitGains: [] }
    const historicalGains = allExistingGains.filter((g) => g.matchParticipantId !== participant.id)
    const gainsByUnit = new Map<string, Array<{description: string; type: string}>>()
    for (const g of historicalGains) {
      const arr = gainsByUnit.get(g.unitId) ?? []
      arr.push({ description: g.description, type: g.type })
      gainsByUnit.set(g.unitId, arr)
    }
    // Reentry: load honours cleared by this participant so the wizard can restore the UI state
    const HONOUR_TYPES = ['honour_banner', 'honour_champion', 'honour_musician'] as const
    const clearedHonoursByUnit = new Map<string, string[]>()
    if (isReentry && unitIds.length > 0) {
      const clearedRows = await db
        .select({ unitId: unitGainsTable.unitId, type: unitGainsTable.type })
        .from(unitGainsTable)
        .where(dbAnd(
          dbInArray(unitGainsTable.unitId, unitIds),
          dbEq(unitGainsTable.cleared, true),
          dbEq(unitGainsTable.clearedByMatchParticipantId, participant.id),
          dbInArray(unitGainsTable.type, [...HONOUR_TYPES]),
        ))
      for (const row of clearedRows) {
        const arr = clearedHonoursByUnit.get(row.unitId) ?? []
        arr.push(row.type)
        clearedHonoursByUnit.set(row.unitId, arr)
      }
    }

    // Group stat modifiers by unit
    const statModsByUnit = new Map<string, typeof allStatModifiers>()
    for (const mod of allStatModifiers) {
      const arr = statModsByUnit.get(mod.unitId) ?? []
      arr.push(mod)
      statModsByUnit.set(mod.unitId, arr)
    }

    const { parseGainStat } = await import('../../../lib/delta-composer')

    const units = unitsRaw.map((u) => {
      const unitGains = gainsByUnit.get(u.id) ?? []
      // Compute current Commandement: base CD from first non-mount sub-profile + CD gains
      const riderProfile = u.subProfiles.find((sp) => !sp.isMount) ?? u.subProfiles[0]
      if (!riderProfile) {
        return {
          id: u.id, name: u.name, nickname: u.nickname, type: u.type, xp: u.xp,
          previousXpGained: entryMap.get(u.id)?.xpGained ?? null,
          previousDerouteXpLost: entryMap.get(u.id)?.derouteXpLost ?? 0,
          hasMount: false, existingGains: unitGains, clearedHonours: clearedHonoursByUnit.get(u.id) ?? [], commandement: 0,
          effectiveStats: { m: null, cc: null, ct: null, f: null, e: null, pv: null, i: null, a: null, cd: null },
        }
      }
      const baseCd = riderProfile.cd ? parseInt(riderProfile.cd, 10) : 0
      const cdGains = unitGains.filter((g) => /^\+\d+ Commandement/i.test(g.description)).length

      // Compute effectiveStats: base numeric stats + stat_modifiers + historical gains
      const STAT_KEYS = ['m', 'cc', 'ct', 'f', 'e', 'pv', 'i', 'a', 'cd'] as const
      const baseStats: Record<string, number | null> = {}
      for (const key of STAT_KEYS) {
        const raw = riderProfile[key]
        if (raw == null || raw === '-') {
          baseStats[key] = null
        } else {
          const parsed = parseInt(raw, 10)
          baseStats[key] = isNaN(parsed) || String(parsed) !== raw.trim() ? null : parsed
        }
      }

      // Apply stat_modifiers deltas
      const unitMods = statModsByUnit.get(u.id) ?? []
      for (const mod of unitMods) {
        if (baseStats[mod.stat] != null) {
          baseStats[mod.stat] = (baseStats[mod.stat] as number) + mod.delta
        }
      }

      // Apply historical gain deltas
      for (const gain of unitGains) {
        const parsed = parseGainStat(gain.description)
        if (parsed && baseStats[parsed.stat] != null) {
          baseStats[parsed.stat] = (baseStats[parsed.stat] as number) + parsed.delta
        }
      }

      return {
        id: u.id,
        name: u.name,
        nickname: u.nickname,
        type: u.type,
        xp: u.xp,
        previousXpGained: entryMap.get(u.id)?.xpGained ?? null,
        previousDerouteXpLost: entryMap.get(u.id)?.derouteXpLost ?? 0,
        hasMount: u.subProfiles.some((sp) => sp.isMount),
        existingGains: unitGains,
        clearedHonours: clearedHonoursByUnit.get(u.id) ?? [],
        commandement: (isNaN(baseCd) ? 0 : baseCd) + cdGains,
        effectiveStats: baseStats,
      }
    })
    // Load campaign players for initial-xp mode (Haine/Rancune picker)
    let campaignPlayers: Array<{ playerId: string; playerDisplayName: string }> | undefined
    if (mode === 'initial-xp') {
      const allPlayers = await getAllPlayersWithArmyInfo()
      campaignPlayers = allPlayers
        .filter((p) => p.playerId !== context.session.playerId)
        .map((p) => ({ playerId: p.playerId, playerDisplayName: p.username }))
    }

    return {
      alreadyCompleted: false,
      reentry: isReentry,
      matchId: data.matchId,
      matchParticipantId: participant.id,
      opponentPlayerName,
      mode,
      units,
      campaignPlayers,
      catchupBonusXp: finalCatchupBonusXp,
      catchupDeltaXp: finalCatchupDeltaXp,
    }
  })

// ---------------------------------------------------------------------------
// Server function — submit XP for one unit (POST)
// ---------------------------------------------------------------------------

export const submitUnitXpFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator(submitInitialXpSchema)
  .handler(async ({ context, data }): Promise<ServerResult<{ unitId: string; newXp: number }>> => {
    if (context.session.isGuest) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Connexion requise' } }
    }
    const { getPlayerArmy, getUnitById, getMatchParticipantArmyId, upsertMatchXpEntryWithIncrement } = await import('../../../db/queries')

    // Server-side gate: look up matchType to enforce max 99 XP for standard matches
    const [{ db }, { matches: matchesTable, matchParticipants: mpTable }, { eq: dbEq, and: dbAnd, isNull: dbIsNull }] = await Promise.all([
      import('../../../db/index'),
      import('../../../db/schema'),
      import('drizzle-orm'),
    ])
    const matchRows = await db
      .select({ matchType: matchesTable.matchType })
      .from(mpTable)
      .innerJoin(matchesTable, dbEq(mpTable.matchId, matchesTable.id))
      .where(dbEq(mpTable.id, data.matchParticipantId))
      .limit(1)
    const matchType = matchRows[0]?.matchType ?? 'standard'
    if (matchType === 'standard' && data.xpGained > 200) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'XP maximum 200 pour une partie standard' } }
    }

    const army = await getPlayerArmy(context.session.playerId)
    if (!army) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Aucune armée assignée' } }
    }
    const participantArmyId = await getMatchParticipantArmyId(data.matchParticipantId)
    if (participantArmyId !== army.id) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Participant invalide' } }
    }
    const unit = await getUnitById(data.unitId)
    if (!unit || unit.armyId !== army.id) {
      return { success: false, error: { code: 'FORBIDDEN', message: "Cette unité n'appartient pas à votre armée" } }
    }
    const { newUnitXp } = await upsertMatchXpEntryWithIncrement(data.matchParticipantId, data.unitId, data.xpGained, data.derouteXpLost)
    // Persist bonusXp on first unit submission (idempotent: WHERE bonus_xp IS NULL)
    if (data.bonusXp != null) {
      await db.update(mpTable).set({ bonusXp: data.bonusXp }).where(dbAnd(dbEq(mpTable.id, data.matchParticipantId), dbIsNull(mpTable.bonusXp)))
    }
    return { success: true, data: { unitId: data.unitId, newXp: newUnitXp } }
  })

// completeEvolutionsFn and submitTierUpFn have been removed.
// They were @deprecated and replaced by completeEvolutionsWithGainsFn (batch commit).
// Removing them prevents bypass of the atomic batch commit flow via direct HTTP calls.

// ---------------------------------------------------------------------------
// Server function — batch commit: complete evolutions with all gains (POST)
// Replaces the separate submitTierUpFn + completeEvolutionsFn flow.
// Accepts gains: [] for the no-tierup path (equivalent to old completeEvolutionsFn).
// ---------------------------------------------------------------------------

export const completeEvolutionsWithGainsFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator(completeEvolutionsWithGainsSchema)
  .handler(async ({ context, data }): Promise<ServerResult<{ matchId: string }>> => {
    if (context.session.isGuest) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Connexion requise' } }
    }
    const { getPlayerArmy, getMatchParticipantForEvolutionByPlayer, getLatestMatchIdForArmy, completeEvolutionsWithGainsTransaction } = await import('../../../db/queries')
    const army = await getPlayerArmy(context.session.playerId)
    if (!army) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Aucune armée assignée' } }
    }
    const participant = await getMatchParticipantForEvolutionByPlayer(data.matchId, context.session.playerId)
    if (!participant) {
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: "Vous n'êtes pas participant de cette partie" },
      }
    }
    // Verify matchParticipantId matches the actual participant (prevents cross-match injection)
    if (data.matchParticipantId !== participant.id) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Participant invalide' } }
    }
    // Load matchType server-side (do not trust client input) for initial_setup flag handling
    const { db: dbInst } = await import('../../../db/index')
    const { matches: matchesTable } = await import('../../../db/schema')
    const { eq: dbEqFn } = await import('drizzle-orm')
    const matchTypeRows = await dbInst
      .select({ matchType: matchesTable.matchType })
      .from(matchesTable)
      .where(dbEqFn(matchesTable.id, data.matchId))
      .limit(1)
    const resolvedMatchType = matchTypeRows[0]?.matchType ?? 'standard'
    // Re-entry guard: only the army's latest match can be re-entered
    // Skip for initial_setup — it's a one-off match whose 1993 date is always excluded by the gte filter
    if (participant.evolutionsEnteredAt !== null && resolvedMatchType !== 'initial_setup') {
      const latestMatchId = await getLatestMatchIdForArmy(army.id, army.initialXpCompletedAt)
      if (data.matchId !== latestMatchId) {
        return { success: false, error: { code: 'FORBIDDEN', message: 'Seule la dernière partie peut être modifiée' } }
      }
    }
    // Verify all unitIds in gains and consequences belong to this army
    if (data.gains.length > 0 || (data.consequences && data.consequences.length > 0)) {
      const { getUnitsForArmy } = await import('../../../db/queries')
      const armyUnits = await getUnitsForArmy(army.id)
      const armyUnitIds = new Set(armyUnits.map((u) => u.id))
      const invalidGain = data.gains.find((g) => !armyUnitIds.has(g.unitId))
      if (invalidGain) {
        return { success: false, error: { code: 'FORBIDDEN', message: "Une unité des gains n'appartient pas à votre armée" } }
      }
      const invalidConsequence = (data.consequences ?? []).find((c) => !armyUnitIds.has(c.unitId))
      if (invalidConsequence) {
        return { success: false, error: { code: 'FORBIDDEN', message: "Une unité des conséquences n'appartient pas à votre armée" } }
      }
    }

    // Story 4.3: pass consequences, armyId, championKilledIds for full post-match processing
    try {
      await completeEvolutionsWithGainsTransaction(data.matchParticipantId, data.matchId, data.gains, data.consequences ?? [], army.id, data.championKilledIds, resolvedMatchType)
    } catch (err) {
      if (err instanceof Error && err.message === 'NOT_LATEST_MATCH') {
        return { success: false, error: { code: 'FORBIDDEN', message: 'Seule la dernière partie peut être modifiée' } }
      }
      return { success: false, error: { code: 'SERVER_ERROR', message: 'Une erreur inattendue est survenue. Veuillez réessayer.' } }
    }
    return { success: true, data: { matchId: data.matchId } }
  })

// ---------------------------------------------------------------------------
// Error boundary for PostMatchWizard
// ---------------------------------------------------------------------------

class PostMatchErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) return <div style={{ padding: '2rem', textAlign: 'center' }}><h2>Une erreur est survenue</h2><p>{this.state.error.message}</p><button onClick={() => this.setState({ error: null })}>Réessayer</button></div>
    return this.props.children
  }
}

// ---------------------------------------------------------------------------
// Route definition
// ---------------------------------------------------------------------------

export const Route = createFileRoute('/match/$matchId/post-match')({
  loader: async ({ params }): Promise<PostMatchLoaderData> => {
    return loadPostMatchDataFn({ data: { matchId: params.matchId } })
  },
  component: PostMatchRoute,
})

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function PostMatchRoute() {
  const loaderData = Route.useLoaderData()
  const { alreadyCompleted, reentry: _reentry, matchId, matchParticipantId, opponentPlayerName, mode, units, campaignPlayers } = loaderData as PostMatchLoaderData
  const hydrated = useHydrated()
  const router = useRouter()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (hydrated) {
      document.documentElement.setAttribute('data-app-hydrated', 'true')
    }
  }, [hydrated])

  if (alreadyCompleted) {
    return (
      <main style={{ padding: '1rem', maxWidth: '480px', margin: '0 auto', textAlign: 'center' }}>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            color: 'var(--color-text-secondary)',
            marginBottom: '1.5rem',
          }}
        >
          Évolutions déjà saisies pour cette partie
        </p>
        <Link
          to="/"
          style={{
            fontFamily: 'var(--font-body)',
            color: 'var(--color-brand)',
            textDecoration: 'underline',
          }}
        >
          Retour à la campagne
        </Link>
      </main>
    )
  }

  const handleComplete = async () => {
    await invalidateArmyState(queryClient, router)
    await router.navigate({ to: '/' })
  }

  const handleSubmitUnitXp = async (unitId: string, xpGained: number, mParticipantId: string, derouteXpLost?: number, bonusXpParam?: number) => {
    return submitUnitXpFn({ data: { matchParticipantId: mParticipantId, unitId, xpGained, derouteXpLost: derouteXpLost ?? 0, bonusXp: bonusXpParam } })
  }

  const handleCompleteEvolutions = async (
    mId: string,
    mParticipantId: string,
    gains: Array<{ unitId: string; descriptions: string[] }>,
    consequences?: ConsequenceEntry[],
    championKilledIds?: string[],
  ) => {
    return completeEvolutionsWithGainsFn({ data: { matchId: mId, matchParticipantId: mParticipantId, gains, consequences, championKilledIds } })
  }

  return (
    <main style={{ padding: '1rem', maxWidth: '480px', margin: '0 auto' }}>
      <PostMatchErrorBoundary>
        <PostMatchWizard
          matchId={matchId}
          matchParticipantId={matchParticipantId}
          opponentPlayerName={opponentPlayerName}
          mode={mode}
          units={units}
          campaignPlayers={campaignPlayers}
          catchupBonusXp={loaderData.catchupBonusXp}
          catchupDeltaXp={loaderData.catchupDeltaXp}
          onComplete={handleComplete}
          onCancel={handleComplete}
          onSubmitUnitXp={handleSubmitUnitXp}
          onCompleteEvolutions={handleCompleteEvolutions}
        />
      </PostMatchErrorBoundary>
    </main>
  )
}
