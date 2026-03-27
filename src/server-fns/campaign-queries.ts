import { createServerFn } from '@tanstack/react-start'
import { authMiddleware } from '../lib/middleware'
import type { TimelineEntryData } from '../db/queries'

export const loadCampaignTimelineFn = createServerFn({ method: 'GET' })
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
      army ? getTimelineForArmy(army.id, army.initialXpCompletedAt) : Promise.resolve([] as TimelineEntryData[]),
      army && !army.initialXpCompletedAt ? getInitialSetupMatchForArmy(army.id) : Promise.resolve(null),
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
