// Campaign TOW — Auth module
// Single source of truth for session management (getSession, createSession, deleteSession, loginPlayer).
// Middleware (authMiddleware, armyOwnerMiddleware) lives in src/lib/middleware.ts.

import { getCookie, setCookie, deleteCookie } from '@tanstack/react-start/server'
import { compare } from 'bcryptjs'
import { eq, and, gt } from 'drizzle-orm'
import { db } from '../db/index'
import { sessions, players } from '../db/schema'

const SESSION_COOKIE = 'session_id'
const SESSION_DURATION_DAYS = 30

export type SessionData = {
  playerId: string
  isAdmin: boolean
  username: string
  isGuest: boolean
}

export async function getSession(): Promise<SessionData | null> {
  const sessionId = getCookie(SESSION_COOKIE)
  if (!sessionId) return null

  const now = new Date()

  const result = await db
    .select({
      playerId: sessions.playerId,
      expiresAt: sessions.expiresAt,
      isAdmin: players.isAdmin,
      isGuest: players.isGuest,
      username: players.username,
    })
    .from(sessions)
    .innerJoin(players, eq(sessions.playerId, players.id))
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, now)))
    .limit(1)

  if (result.length === 0) return null

  const row = result[0]
  return {
    playerId: row.playerId,
    isAdmin: row.isAdmin,
    isGuest: row.isGuest,
    username: row.username,
  }
}

export async function createSession(playerId: string): Promise<void> {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS)

  const [session] = await db
    .insert(sessions)
    .values({ playerId, expiresAt })
    .returning({ id: sessions.id })

  setCookie(SESSION_COOKIE, session.id, {
    httpOnly: true,
    secure: process.env.HTTPS === 'true',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  })
}

export async function deleteSession(): Promise<void> {
  const sessionId = getCookie(SESSION_COOKIE)
  if (sessionId) {
    await db.delete(sessions).where(eq(sessions.id, sessionId))
  }
  deleteCookie(SESSION_COOKIE)
}

// loginPlayer: verifies credentials, creates session if valid, returns true/false
// Centralises all DB access for auth in this module (architecture boundary).
export async function loginPlayer(username: string, password: string): Promise<boolean> {
  const player = await db.query.players.findFirst({
    where: eq(players.username, username),
  })

  if (!player) return false

  // Null passwordHash means account not yet activated — must use invite link first
  if (!player.passwordHash) return false

  const valid = await compare(password, player.passwordHash)
  if (!valid) return false

  await createSession(player.id)
  return true
}

// deletePlayerSessions: invalidates all sessions for a player (used on auto-login via invite)
export async function deletePlayerSessions(playerId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.playerId, playerId))
}


