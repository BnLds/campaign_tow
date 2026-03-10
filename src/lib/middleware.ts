// Campaign TOW — Route middleware (import-protected)
// These middlewares use dynamic imports to avoid leaking server-only modules (auth.ts)
// into the client bundle via TanStack Start's bundler.
// See: https://tanstack.com/start/latest/docs/framework/react/guide/import-protection
//
// Usage in route files:
//   import { authMiddleware } from '../lib/middleware'

import { createMiddleware } from '@tanstack/react-start'

// authMiddleware: validates session, injects it into server function context.
// Dynamic import of getSession prevents auth.ts (which imports @tanstack/react-start/server)
// from leaking into the client bundle when authMiddleware is referenced at module scope
// in .middleware([authMiddleware]) chains.
export const authMiddleware = createMiddleware({ type: 'function' }).server(async ({ next }) => {
  const { getSession } = await import('./auth')
  const session = await getSession()
  if (!session) throw new Error('UNAUTHORIZED')
  return next({ context: { session } })
})

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