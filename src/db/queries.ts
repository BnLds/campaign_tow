// Campaign TOW — Reusable DB query functions
// All direct drizzle-orm and DB access for named operations lives here.

import { eq } from 'drizzle-orm'
import { db } from './index'
import { players } from './schema'

export async function markPlayerWelcomeSeen(playerId: string): Promise<void> {
  await db.update(players).set({ hasSeenWelcome: true }).where(eq(players.id, playerId))
}

export async function updatePlayerDisplayName(playerId: string, displayName: string): Promise<void> {
  await db.update(players).set({ displayName }).where(eq(players.id, playerId))
}