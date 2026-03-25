import { and, eq, isNull, sql } from 'drizzle-orm'
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
  displayName?: string,
): Promise<{ id: string; username: string; displayName: string; inviteToken: string }> {
  const inviteToken = crypto.randomUUID()
  const [player] = await db
    .insert(players)
    .values({
      username,
      passwordHash: null,
      displayName: displayName ?? username,
      isAdmin: false,
      inviteToken,
    })
    .returning({ id: players.id, username: players.username, displayName: players.displayName, inviteToken: players.inviteToken })
  return { ...player, inviteToken: player.inviteToken! }
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
  }).onConflictDoNothing({ target: players.username })

  const result = await db
    .select({ id: players.id })
    .from(players)
    .where(eq(players.username, '__guest__'))
    .limit(1)

  if (result.length === 0) throw new Error('[DB] Ghost player lookup failed')
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

export async function getPlayerByInviteToken(
  token: string,
): Promise<{ id: string; username: string; displayName: string; passwordHash: string | null; inviteToken: string } | null> {
  const result = await db
    .select({
      id: players.id,
      username: players.username,
      displayName: players.displayName,
      passwordHash: players.passwordHash,
      inviteToken: players.inviteToken,
    })
    .from(players)
    .where(eq(players.inviteToken, token))
    .limit(1)
  if (result.length === 0) return null
  return { ...result[0], inviteToken: result[0].inviteToken! }
}

export async function activatePlayer(
  playerId: string,
  passwordHash: string,
  displayName: string,
): Promise<void> {
  const result = await db
    .update(players)
    .set({ passwordHash, displayName })
    .where(and(eq(players.id, playerId), isNull(players.passwordHash)))
    .returning({ id: players.id })
  if (result.length === 0) {
    throw new Error('Player already activated')
  }
}

export async function regenerateInviteToken(playerId: string): Promise<string | null> {
  const newToken = crypto.randomUUID()
  const result = await db
    .update(players)
    .set({ inviteToken: newToken })
    .where(eq(players.id, playerId))
    .returning({ inviteToken: players.inviteToken })
  if (result.length === 0) return null
  return result[0].inviteToken!
}

export async function updatePlayerPassword(playerId: string, passwordHash: string): Promise<void> {
  await db.update(players).set({ passwordHash }).where(eq(players.id, playerId))
}

export async function getPlayerInviteToken(
  playerId: string,
): Promise<{ inviteToken: string | null } | null> {
  const result = await db
    .select({ inviteToken: players.inviteToken })
    .from(players)
    .where(eq(players.id, playerId))
    .limit(1)
  if (result.length === 0) return null
  return { inviteToken: result[0].inviteToken ?? null }
}

export async function generateAllMissingInviteTokens(): Promise<number> {
  const result = await db
    .update(players)
    .set({ inviteToken: sql`gen_random_uuid()` })
    .where(sql`${players.inviteToken} IS NULL AND ${players.passwordHash} != '!no-login!'`)
    .returning({ id: players.id })
  return result.length
}

export async function hasMissingInviteTokens(): Promise<boolean> {
  const result = await db
    .select({ id: players.id })
    .from(players)
    .where(sql`${players.inviteToken} IS NULL AND ${players.passwordHash} != '!no-login!'`)
    .limit(1)
  return result.length > 0
}
