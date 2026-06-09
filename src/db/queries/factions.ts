import { eq } from 'drizzle-orm'
import { db } from '../index'
import { factions } from '../schema'

export type Faction = typeof factions.$inferSelect

export async function getFactionById(id: string): Promise<Faction | null> {
  const rows = await db.select().from(factions).where(eq(factions.id, id)).limit(1)
  return rows[0] ?? null
}
