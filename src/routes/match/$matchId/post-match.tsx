// Campaign TOW — /match/$matchId/post-match route
// Story 4.1: Post-match flow — XP entry per unit & character
// Server functions: loadPostMatchDataFn, submitUnitXpFn, completeEvolutionsFn

import { createFileRoute, useRouter, Link, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useEffect } from 'react'
import { useHydrated } from '../../../lib/useHydrated'
import { authMiddleware } from '../../../lib/middleware'
import { submitUnitXpSchema, completeEvolutionsSchema, loadPostMatchDataSchema, submitTierUpSchema, completeEvolutionsWithGainsSchema } from '../../../lib/validators'
import type { ConsequenceEntry } from '../../../lib/validators'
import { PostMatchWizard } from '../../../components/post-match-wizard'
import type { ServerResult } from '../../../lib/types'

// ---------------------------------------------------------------------------
// Loader data type
// ---------------------------------------------------------------------------

type PostMatchLoaderData = {
  alreadyCompleted: boolean
  matchId: string
  matchParticipantId: string
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
    const { getPlayerArmy, getMatchParticipantForEvolution, getUnitsForArmy, getMatchXpEntries, getUnitDeltas } = await import('../../../db/queries')
    const army = await getPlayerArmy(context.session.playerId)
    if (!army) {
      throw new Error('FORBIDDEN')
    }
    const participant = await getMatchParticipantForEvolution(data.matchId, army.id)
    if (!participant) {
      throw new Error('FORBIDDEN')
    }
    if (participant.evolutionsEnteredAt !== null) {
      return {
        alreadyCompleted: true,
        matchId: data.matchId,
        matchParticipantId: participant.id,
        units: [],
      }
    }
    // Returns all army units (no per-match composition tracking exists yet).
    // The player enters 0 XP for units that didn't participate.
    const unitsRaw = await getUnitsForArmy(army.id)
    const existingEntries = await getMatchXpEntries(participant.id)
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
      matchId: data.matchId,
      matchParticipantId: participant.id,
      units,
    }
  })

// ---------------------------------------------------------------------------
// Server function — submit XP for one unit (POST)
// ---------------------------------------------------------------------------

export const submitUnitXpFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator(submitUnitXpSchema)
  .handler(async ({ context, data }): Promise<ServerResult<{ unitId: string; newXp: number }>> => {
    if (context.session.isGuest) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Connexion requise' } }
    }
    const { getPlayerArmy, getUnitById, getMatchParticipantArmyId, upsertMatchXpEntry, incrementUnitXp } = await import('../../../db/queries')
    const army = await getPlayerArmy(context.session.playerId)
    if (!army) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Aucune armee assignee' } }
    }
    const participantArmyId = await getMatchParticipantArmyId(data.matchParticipantId)
    if (participantArmyId !== army.id) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Participant invalide' } }
    }
    // Note: we verify unit ownership (same army), but cannot verify the unit was
    // actually fielded in this match — no per-match composition table exists yet.
    // The wizard presents all army units; the player assigns XP only to those that fought.
    const unit = await getUnitById(data.unitId)
    if (!unit || unit.armyId !== army.id) {
      return { success: false, error: { code: 'FORBIDDEN', message: "Cette unite n'appartient pas a votre armee" } }
    }
    const { previousXpGained } = await upsertMatchXpEntry(data.matchParticipantId, data.unitId, data.xpGained)
    const delta = data.xpGained - (previousXpGained ?? 0)
    let newXp: number
    if (delta !== 0) {
      const result = await incrementUnitXp(data.unitId, delta)
      if (!result) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Unite introuvable' } }
      }
      newXp = result.xp
    } else {
      // delta === 0: refetch current XP to avoid returning a stale value
      // (unit was fetched before the upsert — another request may have changed xp since)
      const freshUnit = await getUnitById(data.unitId)
      newXp = freshUnit!.xp
    }
    return { success: true, data: { unitId: data.unitId, newXp } }
  })

// ---------------------------------------------------------------------------
// Server function — complete evolutions (POST)
// @deprecated — Replaced by completeEvolutionsWithGainsFn (batch commit).
// Kept for backward compatibility with story 4-1 tests. Do not use in new code.
// ---------------------------------------------------------------------------

export const completeEvolutionsFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator(completeEvolutionsSchema)
  .handler(async ({ context, data }): Promise<ServerResult<{ matchId: string }>> => {
    if (context.session.isGuest) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Connexion requise' } }
    }
    const { getPlayerArmy, getMatchParticipantForEvolution, markEvolutionsEntered } = await import('../../../db/queries')
    const army = await getPlayerArmy(context.session.playerId)
    if (!army) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Aucune armee assignee' } }
    }
    // Single query: verifies participation AND checks idempotency
    const participant = await getMatchParticipantForEvolution(data.matchId, army.id)
    if (!participant) {
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: "Vous n'etes pas participant de cette partie" },
      }
    }
    // Idempotent: return success without re-stamping if evolutionsEnteredAt already set
    if (participant.evolutionsEnteredAt !== null) {
      return { success: true, data: { matchId: data.matchId } }
    }
    await markEvolutionsEntered(participant.id)
    return { success: true, data: { matchId: data.matchId } }
  })

// ---------------------------------------------------------------------------
// Server function — submit tier-up improvement selections (POST)
// @deprecated — Replaced by completeEvolutionsWithGainsFn (batch commit).
// The wizard no longer calls this; gains are accumulated client-side and
// committed atomically at the end. Kept for existing test contracts.
// ---------------------------------------------------------------------------

export const submitTierUpFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator(submitTierUpSchema)
  .handler(async ({ context, data }): Promise<ServerResult<{ unitId: string; gainsCreated: number }>> => {
    if (context.session.isGuest) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Connexion requise' } }
    }
    // C3: insertUnitGain calls committed atomically per improvement.description (via insertUnitGainsTransaction)
    const { getPlayerArmy, getUnitById, getMatchParticipantArmyId, getMatchParticipantEvolutionsStatus, insertUnitGainsTransaction } = await import('../../../db/queries')
    const army = await getPlayerArmy(context.session.playerId)
    if (!army) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Aucune armee assignee' } }
    }
    // C4 — verify participant belongs to the player's army
    const participantArmyId = await getMatchParticipantArmyId(data.matchParticipantId)
    if (participantArmyId !== army.id) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Participant invalide' } }
    }
    // C4+M2 — verify the match is still open (evolutionsEnteredAt must be null)
    const { found, evolutionsEnteredAt } = await getMatchParticipantEvolutionsStatus(data.matchParticipantId)
    if (!found) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Participant introuvable' } }
    }
    if (evolutionsEnteredAt !== null) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Evolutions deja saisies pour cette partie' } }
    }
    // C4 — verify the unit belongs to the player's army
    const unit = await getUnitById(data.unitId)
    if (!unit || unit.armyId !== army.id) {
      return { success: false, error: { code: 'FORBIDDEN', message: "Cette unite n'appartient pas a votre armee" } }
    }
    await insertUnitGainsTransaction(data.unitId, data.improvements.map((i) => i.description), data.matchParticipantId)
    return { success: true, data: { unitId: data.unitId, gainsCreated: data.improvements.length } }
  })

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
    const { getPlayerArmy, getMatchParticipantForEvolution, completeEvolutionsWithGainsTransaction } = await import('../../../db/queries')
    const army = await getPlayerArmy(context.session.playerId)
    if (!army) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Aucune armee assignee' } }
    }
    const participant = await getMatchParticipantForEvolution(data.matchId, army.id)
    if (!participant) {
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: "Vous n'etes pas participant de cette partie" },
      }
    }
    // Idempotent: return success if already completed
    if (participant.evolutionsEnteredAt !== null) {
      return { success: true, data: { matchId: data.matchId } }
    }
    // Story 4.3: pass consequences and armyId for temporary modifier cleanup (AC24)
    await completeEvolutionsWithGainsTransaction(data.matchParticipantId, data.gains, data.consequences ?? [], army.id)
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
  const { alreadyCompleted, matchId, matchParticipantId, units } = loaderData as PostMatchLoaderData
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
  ) => {
    return completeEvolutionsWithGainsFn({ data: { matchId: mId, matchParticipantId: mParticipantId, gains, consequences } })
  }

  return (
    <main style={{ padding: '1rem', maxWidth: '480px', margin: '0 auto' }}>
      <PostMatchWizard
        matchId={matchId}
        matchParticipantId={matchParticipantId}
        units={units}
        onComplete={handleComplete}
        onCancel={handleComplete}
        onSubmitUnitXp={handleSubmitUnitXp}
        onCompleteEvolutions={handleCompleteEvolutions}
      />
    </main>
  )
}
