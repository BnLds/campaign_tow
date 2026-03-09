// Campaign TOW — Auth module
// Single source of truth for session management and auth middleware.
// Architecture boundary: this is the ONLY module that reads/writes sessions and cookies.

import { createMiddleware } from '@tanstack/react-start'
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
  displayName: string
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
      displayName: players.displayName,
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
    displayName: row.displayName,
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
    secure: process.env.NODE_ENV === 'production',
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

  const valid = await compare(password, player.passwordHash)
  if (!valid) return false

  await createSession(player.id)
  return true
}

// authMiddleware: validates session and injects it into server function context
export const authMiddleware = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const session = await getSession()
    if (!session) throw new Error('UNAUTHORIZED')
    return next({ context: { session } })
  },
)

// armyOwnerMiddleware: verifies army ownership (pass-through scaffold — fully implemented in Epic 2)
// Depends on authMiddleware to ensure session is available in context.
// In Epic 2: will query armies table and check army.playerId === session.playerId (or isAdmin bypass)
// Throws FORBIDDEN if ownership check fails.
export const armyOwnerMiddleware = createMiddleware({ type: 'function' })
  .middleware([authMiddleware])
  .server(async ({ next, context }) => {
    // FORBIDDEN check will be enforced in story 2.1 when armies table exists.
    // Pattern:
    // const army = await db.query.armies.findFirst({ where: eq(armies.id, data.armyId) })
    // if (!army) throw new Error('NOT_FOUND')
    // if (army.playerId !== context.session.playerId && !context.session.isAdmin)
    //   throw new Error('FORBIDDEN')
    return next({ context })
  })
