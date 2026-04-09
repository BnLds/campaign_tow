import { and, eq, ilike, isNull, ne, sql } from 'drizzle-orm'
import { db } from '../index'
import { players, armies } from '../schema'
import { invariant } from '../../lib/invariant'

export async function getPlayerById(playerId: string): Promise<{ id: string; username: string } | null> {
  const rows = await db
    .select({ id: players.id, username: players.username })
    .from(players)
    .where(eq(players.id, playerId))
    .limit(1)
  return rows[0] ?? null
}

export async function updatePlayerUsername(playerId: string, username: string): Promise<void> {
  const result = await db.update(players).set({ username }).where(eq(players.id, playerId)).returning({ id: players.id })
  if (result.length === 0) throw new Error('Player not found')
}

export async function checkUsernameExists(username: string, excludePlayerId?: string): Promise<boolean> {
  const conditions = [ilike(players.username, username)]
  if (excludePlayerId !== undefined) {
    conditions.push(ne(players.id, excludePlayerId))
  }
  const existing = await db
    .select({ id: players.id })
    .from(players)
    .where(and(...conditions))
    .limit(1)
  return existing.length > 0
}

export async function createPlayer(
  username: string,
): Promise<{ id: string; username: string; inviteToken: string }> {
  const inviteToken = crypto.randomUUID()
  const [row] = await db
    .insert(players)
    .values({
      username,
      passwordHash: null,
      isAdmin: false,
      inviteToken,
    })
    .returning({ id: players.id, username: players.username, inviteToken: players.inviteToken })
  const player = invariant(row, 'INSERT into players must return one row')
  return {
    id: player.id,
    username: player.username,
    inviteToken: invariant(player.inviteToken, 'inviteToken must be set after createPlayer'),
  }
}

export async function getAllPlayers() {
  return db
    .select({
      id: players.id,
      username: players.username,
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
    isGuest: true,
    isAdmin: false,
  }).onConflictDoNothing({ target: players.username })

  const [row] = await db
    .select({ id: players.id })
    .from(players)
    .where(eq(players.username, '__guest__'))
    .limit(1)

  return invariant(row, '[DB] Ghost player lookup failed').id
}

export async function getAllPlayersWithArmyInfo(): Promise<Array<{ playerId: string; username: string; armyId: string | null; armyName: string | null; faction: string | null }>> {
  return db
    .select({
      playerId: players.id,
      username: players.username,
      armyId: armies.id,
      armyName: armies.name,
      faction: armies.faction,
    })
    .from(players)
    .leftJoin(armies, eq(armies.playerId, players.id))
    .where(eq(players.isGuest, false))
    .orderBy(players.username)
}

export async function getGhostPlayerId(): Promise<string | null> {
  const result = await db
    .select({ id: players.id })
    .from(players)
    .where(eq(players.username, '__guest__'))
    .limit(1)
  return result[0]?.id ?? null
}

export async function getPlayerByInviteToken(
  token: string,
): Promise<{ id: string; username: string; passwordHash: string | null; inviteToken: string } | null> {
  const [row] = await db
    .select({
      id: players.id,
      username: players.username,
      passwordHash: players.passwordHash,
      inviteToken: players.inviteToken,
    })
    .from(players)
    .where(eq(players.inviteToken, token))
    .limit(1)
  if (row === undefined) return null
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.passwordHash,
    inviteToken: invariant(row.inviteToken, 'inviteToken must be set when looked up by token'),
  }
}

export async function activatePlayer(
  playerId: string,
  passwordHash: string,
  username: string,
): Promise<void> {
  const result = await db
    .update(players)
    .set({ passwordHash, username })
    .where(and(eq(players.id, playerId), isNull(players.passwordHash)))
    .returning({ id: players.id })
  if (result.length === 0) {
    throw new Error('Player already activated')
  }
}

export async function regenerateInviteToken(playerId: string): Promise<string | null> {
  const newToken = crypto.randomUUID()
  const [row] = await db
    .update(players)
    .set({ inviteToken: newToken })
    .where(eq(players.id, playerId))
    .returning({ inviteToken: players.inviteToken })
  if (row === undefined) return null
  return invariant(row.inviteToken, 'inviteToken must be set after regenerateInviteToken')
}

export async function updatePlayerPassword(playerId: string, passwordHash: string): Promise<void> {
  await db.update(players).set({ passwordHash }).where(eq(players.id, playerId))
}

export async function getPlayerInviteToken(
  playerId: string,
): Promise<{ inviteToken: string | null } | null> {
  const [row] = await db
    .select({ inviteToken: players.inviteToken })
    .from(players)
    .where(eq(players.id, playerId))
    .limit(1)
  if (row === undefined) return null
  return { inviteToken: row.inviteToken ?? null }
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
