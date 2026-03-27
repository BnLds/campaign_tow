import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { STALE_TIME_SESSION } from './query-constants'
import { authMiddleware } from './middleware'
import type { SessionData } from './auth'

// ---------------------------------------------------------------------------
// Server functions
// ---------------------------------------------------------------------------

// Reads session server-side.
// Dynamic import keeps auth.ts (server-only) out of the client bundle.
export const getSessionFn = createServerFn({ method: 'GET' }).handler(async () => {
  const { getSession } = await import('./auth')
  return getSession()
})

// Loads a player's army info + win/draw/loss record.
// Accepts playerId as input to avoid a redundant session read.
export const getPlayerArmyInfoFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .inputValidator(z.object({ playerId: z.string() }))
  .handler(async ({ context, data: { playerId } }) => {
    if (!context.session) throw new Error('UNAUTHORIZED')
    if (context.session.isGuest || context.session.playerId !== playerId) {
      return { army: null, record: null }
    }
    const { getPlayerArmy, getArmyRecord } = await import('../db/queries')
    const army = await getPlayerArmy(playerId)
    if (!army) return { army: null, record: null }
    const record = await getArmyRecord(army.id)
    return {
      army: { id: army.id, name: army.name, faction: army.faction, initialXpCompleted: !!army.initialXpCompletedAt },
      record,
    }
  })

// ---------------------------------------------------------------------------
// Query options
// ---------------------------------------------------------------------------

export const sessionQueryOptions = () =>
  queryOptions<SessionData | null>({
    queryKey: ['session'],
    queryFn: () => getSessionFn(),
    staleTime: STALE_TIME_SESSION,
    retry: 1,
  })

export const armyInfoQueryOptions = (playerId: string) =>
  queryOptions({
    queryKey: ['army-info', playerId],
    queryFn: () => getPlayerArmyInfoFn({ data: { playerId } }),
    staleTime: STALE_TIME_SESSION,
  })
