import { createServerFn } from '@tanstack/react-start'
import { authMiddleware } from '../lib/middleware'
import type { ServerResult } from '../lib/types'
import type { SessionData } from '../lib/auth'

export type TerritoryDashboardData = {
  coBalance: number
  factionId: string
  factionDisplayName: string
  setupCompletedAt: string | null
}

// Extracted handler logic — directly unit-testable (the createServerFn wrapper is not).
export async function buildTerritoryDashboard(
  session: SessionData,
): Promise<ServerResult<TerritoryDashboardData>> {
  if (session.isGuest) {
    return { success: false, error: { code: 'FORBIDDEN', message: 'Les invités ne peuvent pas accéder aux territoires' } }
  }
  const { getPlayerArmy, getFactionById, getOrCreatePlayerTerritory } = await import('../db/queries')
  const army = await getPlayerArmy(session.playerId)
  if (!army) {
    return { success: false, error: { code: 'NOT_FOUND', message: "Aucune armée importée — importez une armée avant d'accéder aux territoires" } }
  }
  const faction = await getFactionById(army.faction)
  if (!faction) {
    return { success: false, error: { code: 'SERVER_ERROR', message: 'Faction introuvable' } }
  }
  const territory = await getOrCreatePlayerTerritory(session.playerId)
  return {
    success: true,
    data: {
      coBalance: territory.coBalance,
      factionId: army.faction,
      factionDisplayName: faction.displayName,
      setupCompletedAt: territory.setupCompletedAt?.toISOString() ?? null,
    },
  }
}

export const loadTerritoryDashboardFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => buildTerritoryDashboard(context.session))
