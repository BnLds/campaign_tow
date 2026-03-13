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

// Story 1.4 — Admin: player account creation

export async function checkUsernameExists(username: string): Promise<boolean> {
  const existing = await db
    .select({ id: players.id })
    .from(players)
    .where(eq(players.username, username))
    .limit(1)
  return existing.length > 0
}

export async function createPlayer(
  username: string,
  passwordHash: string,
): Promise<{ id: string; username: string; displayName: string }> {
  const [player] = await db
    .insert(players)
    .values({
      username,
      passwordHash,
      displayName: username,
      isAdmin: false,
      hasSeenWelcome: false,
    })
    .returning({ id: players.id, username: players.username, displayName: players.displayName })
  return player
}

// Story 1.6 — Admin: player account list & delete

export async function getAllPlayers() {
  return db
    .select({
      id: players.id,
      username: players.username,
      displayName: players.displayName,
      isAdmin: players.isAdmin,
      createdAt: players.createdAt,
    })
    .from(players)
    .orderBy(players.createdAt)
}

export async function deletePlayer(playerId: string): Promise<void> {
  await db.delete(players).where(eq(players.id, playerId))
}