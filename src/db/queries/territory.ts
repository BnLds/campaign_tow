import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { playerTerritories } from '@/db/schema'

export type PlayerTerritory = typeof playerTerritories.$inferSelect

export async function getOrCreatePlayerTerritory(playerId: string): Promise<PlayerTerritory> {
  return db.transaction(async (tx) => {
    const existing = await tx.select().from(playerTerritories)
      .where(eq(playerTerritories.playerId, playerId)).limit(1)
    if (existing[0]) return existing[0]

    const [created] = await tx.insert(playerTerritories)
      .values({ playerId })
      .onConflictDoNothing({ target: playerTerritories.playerId })
      .returning()
    if (created) return created

    // Row won by a concurrent transaction — re-read.
    const [winner] = await tx.select().from(playerTerritories)
      .where(eq(playerTerritories.playerId, playerId)).limit(1)
    if (!winner) throw new Error('player_territories row vanished after ON CONFLICT DO NOTHING')
    return winner
  })
}
