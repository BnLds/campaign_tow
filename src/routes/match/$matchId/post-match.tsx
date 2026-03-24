// Campaign TOW — /match/$matchId/post-match route
// Story 4.1: Post-match flow — XP entry per unit & character
// Server functions: loadPostMatchDataFn, submitUnitXpFn, completeEvolutionsWithGainsFn

import { createFileRoute, useRouter, Link, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useEffect } from 'react'
import { useHydrated } from '../../../lib/useHydrated'
import { authMiddleware } from '../../../lib/middleware'
import { submitInitialXpSchema, loadPostMatchDataSchema, completeEvolutionsWithGainsSchema } from '../../../lib/validators'
import type { ConsequenceEntry } from '../../../lib/validators'
import { PostMatchWizard } from '../../../components/post-match-wizard'
import type { ServerResult } from '../../../lib/types'

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
  units: Array<{ id: string; name: string; type: string; xp: number; previousXpGained: number | null; hasMount: boolean; existingGains: string[]; commandement: number; effectiveStats: Record<string, number | null> }>
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
    const { getPlayerArmy, getMatchParticipantForEvolutionByPlayer, getLatestMatchIdForArmy, getUnitsForArmy, getMatchXpEntries, getUnitDeltas } = await import('../../../db/queries')

    // Load drizzle deps before round 1 (needed for match type + opponent query)
    const [
      { db },
      { matchParticipants: mpTable, players: playersTable, matches: matchesTable },
      { and: dbAnd, eq: dbEq, ne: dbNe },
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
        .select({ playerName: oppPlayerAlias.displayName })
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
    const isReentry = participant.evolutionsEnteredAt !== null
    if (isReentry) {
      const latestMatchId = await getLatestMatchIdForArmy(army.id)
      if (data.matchId !== latestMatchId) {
        return {
          alreadyCompleted: true,
          reentry: false,
          matchId: data.matchId,
          matchParticipantId: participant.id,
          opponentPlayerName,
          mode,
          units: [],
        }
      }
    }
    // Returns all army units (no per-match composition tracking exists yet).
    // The player enters 0 XP for units that didn't participate.

    // Round 2 (parallel): units + xp entries
    const [unitsRaw, existingEntries] = await Promise.all([
      getUnitsForArmy(army.id),
      getMatchXpEntries(participant.id),
    ])
    const entryMap = new Map(existingEntries.map((e) => [e.unitId, e.xpGained]))
    // Load existing unit_gains — filter out gains from the current participant
    // (defense in depth: with batch commit there should be no partial gains,
    // but this protects against legacy orphaned gains from older code).
    const unitIds = unitsRaw.map((u) => u.id)
    const { statModifiers: allStatModifiers, unitGains: allExistingGains } = unitIds.length > 0
      ? await getUnitDeltas(unitIds)
      : { statModifiers: [], unitGains: [] }
    const historicalGains = allExistingGains.filter((g) => g.matchParticipantId !== participant.id)
    const gainsByUnit = new Map<string, string[]>()
    for (const g of historicalGains) {
      const arr = gainsByUnit.get(g.unitId) ?? []
      arr.push(g.description)
      gainsByUnit.set(g.unitId, arr)
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
          id: u.id, name: u.name, type: u.type, xp: u.xp,
          previousXpGained: entryMap.get(u.id) ?? null,
          hasMount: false, existingGains: unitGains, commandement: 0,
          effectiveStats: { m: null, cc: null, ct: null, f: null, e: null, pv: null, i: null, a: null, cd: null },
        }
      }
      const baseCd = riderProfile.cd ? parseInt(riderProfile.cd, 10) : 0
      const cdGains = unitGains.filter((g) => /^\+\d+ Commandement/i.test(g)).length

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
      for (const gainDesc of unitGains) {
        const parsed = parseGainStat(gainDesc)
        if (parsed && baseStats[parsed.stat] != null) {
          baseStats[parsed.stat] = (baseStats[parsed.stat] as number) + parsed.delta
        }
      }

      return {
        id: u.id,
        name: u.name,
        type: u.type,
        xp: u.xp,
        previousXpGained: entryMap.get(u.id) ?? null,
        hasMount: u.subProfiles.some((sp) => sp.isMount),
        existingGains: unitGains,
        commandement: (isNaN(baseCd) ? 0 : baseCd) + cdGains,
        effectiveStats: baseStats,
      }
    })
    return {
      alreadyCompleted: false,
      reentry: isReentry,
      matchId: data.matchId,
      matchParticipantId: participant.id,
      opponentPlayerName,
      mode,
      units,
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
    const [{ db }, { matches: matchesTable, matchParticipants: mpTable }, { eq: dbEq }] = await Promise.all([
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
    if (matchType === 'standard' && data.xpGained > 99) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'XP maximum 99 pour une partie standard' } }
    }

    const army = await getPlayerArmy(context.session.playerId)
    if (!army) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Aucune armee assignee' } }
    }
    const participantArmyId = await getMatchParticipantArmyId(data.matchParticipantId)
    if (participantArmyId !== army.id) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Participant invalide' } }
    }
    const unit = await getUnitById(data.unitId)
    if (!unit || unit.armyId !== army.id) {
      return { success: false, error: { code: 'FORBIDDEN', message: "Cette unite n'appartient pas a votre armee" } }
    }
    const { newUnitXp } = await upsertMatchXpEntryWithIncrement(data.matchParticipantId, data.unitId, data.xpGained)
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
      return { success: false, error: { code: 'FORBIDDEN', message: 'Aucune armee assignee' } }
    }
    const participant = await getMatchParticipantForEvolutionByPlayer(data.matchId, context.session.playerId)
    if (!participant) {
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: "Vous n'etes pas participant de cette partie" },
      }
    }
    // Verify matchParticipantId matches the actual participant (prevents cross-match injection)
    if (data.matchParticipantId !== participant.id) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Participant invalide' } }
    }
    // Re-entry guard: only the army's latest match can be re-entered
    if (participant.evolutionsEnteredAt !== null) {
      const latestMatchId = await getLatestMatchIdForArmy(army.id)
      if (data.matchId !== latestMatchId) {
        return { success: false, error: { code: 'FORBIDDEN', message: 'Seule la derniere partie peut etre modifiee' } }
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

    // Story 4.3: pass consequences, armyId, championKilledIds for full post-match processing
    try {
      await completeEvolutionsWithGainsTransaction(data.matchParticipantId, data.matchId, data.gains, data.consequences ?? [], army.id, data.championKilledIds, resolvedMatchType)
    } catch (err) {
      if (err instanceof Error && err.message === 'NOT_LATEST_MATCH') {
        return { success: false, error: { code: 'FORBIDDEN', message: 'Seule la derniere partie peut etre modifiee' } }
      }
      throw err
    }
    return { success: true, data: { matchId: data.matchId } }
  })

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
  const { alreadyCompleted, reentry: _reentry, matchId, matchParticipantId, opponentPlayerName, mode, units } = loaderData as PostMatchLoaderData
  const hydrated = useHydrated()
  const router = useRouter()

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
          Evolutions déjà saisies pour cette partie
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
    await router.invalidate({ filter: (d) => d.routeId === '/' })
    await router.navigate({ to: '/' })
  }

  const handleSubmitUnitXp = async (unitId: string, xpGained: number, mParticipantId: string) => {
    return submitUnitXpFn({ data: { matchParticipantId: mParticipantId, unitId, xpGained } })
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
      <PostMatchWizard
        matchId={matchId}
        matchParticipantId={matchParticipantId}
        opponentPlayerName={opponentPlayerName}
        mode={mode}
        units={units}
        onComplete={handleComplete}
        onCancel={handleComplete}
        onSubmitUnitXp={handleSubmitUnitXp}
        onCompleteEvolutions={handleCompleteEvolutions}
      />
    </main>
  )
}
