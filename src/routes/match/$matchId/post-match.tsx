// Campaign TOW — /match/$matchId/post-match route
// Story 4.1: Post-match flow — XP entry per unit & character
// Server functions: loadPostMatchDataFn, submitUnitXpFn, completeEvolutionsFn

import { createFileRoute, useRouter, Link, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useEffect } from 'react'
import { useHydrated } from '../../../lib/useHydrated'
import { authMiddleware } from '../../../lib/middleware'
import { submitUnitXpSchema, completeEvolutionsSchema, loadPostMatchDataSchema } from '../../../lib/validators'
import { PostMatchWizard } from '../../../components/post-match-wizard'
import type { ServerResult } from '../../../lib/types'

// ---------------------------------------------------------------------------
// Loader data type
// ---------------------------------------------------------------------------

type PostMatchLoaderData = {
  alreadyCompleted: boolean
  matchId: string
  matchParticipantId: string
  units: Array<{ id: string; name: string; type: string; xp: number; previousXpGained: number | null }>
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
    const { getPlayerArmy, getMatchParticipantForEvolution, getUnitsForArmy, getMatchXpEntries } = await import('../../../db/queries')
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
    const units = unitsRaw.map((u) => ({
      id: u.id,
      name: u.name,
      type: u.type,
      xp: u.xp,
      previousXpGained: entryMap.get(u.id) ?? null,
    }))
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

  const handleCompleteEvolutions = async (mId: string) => {
    return completeEvolutionsFn({ data: { matchId: mId } })
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
