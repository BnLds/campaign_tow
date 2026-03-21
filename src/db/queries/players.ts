import { eq } from 'drizzle-orm'
import { db } from '../index'
import { players, armies } from '../schema'

export async function getPlayerById(playerId: string): Promise<{ id: string; displayName: string } | null> {
  const rows = await db
    .select({ id: players.id, displayName: players.displayName })
    .from(players)
    .where(eq(players.id, playerId))
    .limit(1)
  return rows.length > 0 ? rows[0] : null
}

export async function markPlayerWelcomeSeen(playerId: string): Promise<void> {
  await db.update(players).set({ hasSeenWelcome: true }).where(eq(players.id, playerId))
}

export async function updatePlayerDisplayName(playerId: string, displayName: string): Promise<void> {
  await db.update(players).set({ displayName }).where(eq(players.id, playerId))
}

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
    .where(eq(players.isGuest, false))
    .orderBy(players.createdAt)
}

export async function deletePlayer(playerId: string): Promise<void> {
  await db.delete(players).where(eq(players.id, playerId))
}

export async function ensureGhostPlayer(): Promise<string> {
  await db.insert(players).values({
    username: '__guest__',
    passwordHash: '!no-login!',
    displayName: 'Invité',
    isGuest: true,
    isAdmin: false,
    hasSeenWelcome: true,
  }).onConflictDoNothing({ target: players.username })

  const result = await db
    .select({ id: players.id })
    .from(players)
    .where(eq(players.username, '__guest__'))
    .limit(1)

  return result[0].id
}

export async function getAllPlayersWithArmyInfo(): Promise<Array<{ playerId: string; displayName: string; armyId: string | null; armyName: string | null; faction: string | null }>> {
  return db
    .select({
      playerId: players.id,
      displayName: players.displayName,
      armyId: armies.id,
      armyName: armies.name,
      faction: armies.faction,
    })
    .from(players)
    .leftJoin(armies, eq(armies.playerId, players.id))
    .where(eq(players.isGuest, false))
    .orderBy(players.displayName)
}

export async function getGhostPlayerId(): Promise<string | null> {
  const result = await db
    .select({ id: players.id })
    .from(players)
    .where(eq(players.username, '__guest__'))
    .limit(1)
  return result.length > 0 ? result[0].id : null
}
