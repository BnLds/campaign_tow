// Campaign TOW — Route middleware (import-protected)
// These middlewares use dynamic imports to avoid leaking server-only modules (auth.ts)
// into the client bundle via TanStack Start's bundler.
// See: https://tanstack.com/start/latest/docs/framework/react/guide/import-protection
//
// Usage in route files:
//   import { authMiddleware } from '../lib/middleware'

import { createMiddleware } from '@tanstack/react-start'
import { redirect } from '@tanstack/react-router'

// authMiddleware: validates session, injects it into server function context.
// Dynamic import of getSession prevents auth.ts (which imports @tanstack/react-start/server)
// from leaking into the client bundle when authMiddleware is referenced at module scope
// in .middleware([authMiddleware]) chains.
export const authMiddleware = createMiddleware({ type: 'function' }).server(async ({ next }) => {
  const { getSession } = await import('./auth')
  const session = await getSession()
  if (!session) throw redirect({ to: '/login' })
  return next({ context: { session } })
})

// adminMiddleware: verifies session and admin flag. Chains authMiddleware so session is already populated.
// Throws FORBIDDEN if isAdmin is false — used on admin-only server functions and routes.
export const adminMiddleware = createMiddleware({ type: 'function' })
  .middleware([authMiddleware])
  .server(async ({ next, context }) => {
    if (!context.session.isAdmin) {
      throw new Error('FORBIDDEN')
    }
    return next({ context })
  })

// armyOwnerMiddleware: verifies army ownership.
// Depends on authMiddleware to ensure session is available in context.
// Expects server functions to receive { armyId: string } in their input data.
// Throws FORBIDDEN if session player doesn't own the army and is not admin.
// Contract: injects { armyId: string } into context (lightweight — no full army object).
// Consumers needing full army data must query getArmyById separately.
export const armyOwnerMiddleware = createMiddleware({ type: 'function' })
  .middleware([authMiddleware])
  .server(async ({ next, context, data }) => {
    if (context.session.isGuest) throw new Error('UNAUTHORIZED')
    const input = (data as unknown) as Record<string, unknown>
    const armyId = input.armyId
    if (typeof armyId !== 'string' || !armyId) throw new Error('BAD_REQUEST')
    const { getArmyOwner } = await import('../db/queries')
    const army = await getArmyOwner(armyId)
    if (!army) throw new Error('NOT_FOUND')
    if (army.playerId !== context.session.playerId && !context.session.isAdmin) {
      throw new Error('FORBIDDEN')
    }
    return next({ context: { ...context, armyId } })
  })