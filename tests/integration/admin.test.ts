// tests/integration/admin.test.ts
// Story 1.4: Admin — Player Account Creation
// Status: RED — written before implementation (ATDD)
//
// Verifies: AC1 (admin sees form), AC2 (player created with bcrypt hash),
//           AC4 (non-admin denied), AC5 (duplicate username rejected)
//
// These tests check the structure and contracts of story 1.4 implementation.
// Tests fail until all story 1.4 tasks are complete.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Project root = two levels up from tests/integration/
const root = resolve(__dirname, '../..')

// ---------------------------------------------------------------------------
// AC4 — adminMiddleware: src/lib/middleware.ts
// ---------------------------------------------------------------------------

describe('[AC4][P0] adminMiddleware — src/lib/middleware.ts', () => {
  it('[1.4-INT-001] middleware.ts exports adminMiddleware using createMiddleware (same declaration)', () => {
    const middleware = readFileSync(resolve(root, 'src/lib/middleware.ts'), 'utf-8')
    expect(middleware).toMatch(/export const adminMiddleware\s*=\s*createMiddleware/)
  })

  it('[1.4-INT-002] adminMiddleware chains authMiddleware — session already populated, no re-auth needed', () => {
    const middleware = readFileSync(resolve(root, 'src/lib/middleware.ts'), 'utf-8')
    // adminMiddleware and its .middleware([authMiddleware]) chain must be in the same declaration
    expect(middleware).toMatch(/adminMiddleware[\s\S]{0,400}\.middleware\(\[authMiddleware\]\)/)
  })

  it('[1.4-INT-003] adminMiddleware throws FORBIDDEN error for non-admin users (access control enforcement)', () => {
    const middleware = readFileSync(resolve(root, 'src/lib/middleware.ts'), 'utf-8')
    // FORBIDDEN must appear inside the adminMiddleware declaration (not just anywhere in file)
    expect(middleware).toMatch(/adminMiddleware[\s\S]{0,600}FORBIDDEN/)
  })
})

// ---------------------------------------------------------------------------
// AC2 / AC5 — Validator: createPlayerSchema
// ---------------------------------------------------------------------------

describe('[AC2][AC5][P0] Validator — createPlayerSchema', () => {
  it('[1.4-INT-004] validators.ts exports createPlayerSchema', () => {
    const validators = readFileSync(resolve(root, 'src/lib/validators.ts'), 'utf-8')
    expect(validators).toContain('export const createPlayerSchema')
  })

  it('[1.4-INT-005] validators.ts exports CreatePlayerInput type', () => {
    const validators = readFileSync(resolve(root, 'src/lib/validators.ts'), 'utf-8')
    expect(validators).toContain('export type CreatePlayerInput')
  })

  it('[1.4-INT-006] createPlayerSchema uses tempPassword field (not password — semantic clarity for admin flow)', () => {
    const validators = readFileSync(resolve(root, 'src/lib/validators.ts'), 'utf-8')
    // tempPassword must appear inside createPlayerSchema definition (not just anywhere)
    expect(validators).toMatch(/createPlayerSchema[\s\S]{0,300}tempPassword/)
  })

  it('[1.4-INT-007] username in createPlayerSchema applies .trim() before .min(2) — whitespace handling coupled', () => {
    const validators = readFileSync(resolve(root, 'src/lib/validators.ts'), 'utf-8')
    // .trim() must precede .min(2) in the chain — prevents single whitespace username
    expect(validators).toMatch(/\.trim\(\)\.min\(2/)
  })
})

// ---------------------------------------------------------------------------
// AC2 — DB queries: checkUsernameExists + createPlayer
// ---------------------------------------------------------------------------

describe('[AC2][AC5][P0] DB queries — src/db/queries.ts', () => {
  it('[1.4-INT-008] queries.ts exports checkUsernameExists as async function', () => {
    const queries = readFileSync(resolve(root, 'src/db/queries.ts'), 'utf-8')
    expect(queries).toContain('export async function checkUsernameExists')
  })

  it('[1.4-INT-009] queries.ts exports createPlayer as async function', () => {
    const queries = readFileSync(resolve(root, 'src/db/queries.ts'), 'utf-8')
    expect(queries).toContain('export async function createPlayer')
  })

  it('[1.4-INT-010] queries.ts does NOT import bcryptjs — password hashing belongs in the handler, not DB layer', () => {
    const queries = readFileSync(resolve(root, 'src/db/queries.ts'), 'utf-8')
    expect(queries).not.toContain('bcryptjs')
  })

  it('[1.4-INT-011] createPlayer inserts isAdmin: false — new players are never admins by default', () => {
    const queries = readFileSync(resolve(root, 'src/db/queries.ts'), 'utf-8')
    // isAdmin: false must be inside the createPlayer function body
    expect(queries).toMatch(/createPlayer[\s\S]{0,600}isAdmin:\s*false/)
  })

  it('[1.4-INT-012] createPlayer inserts hasSeenWelcome: false — new players get the welcome modal (AC3)', () => {
    const queries = readFileSync(resolve(root, 'src/db/queries.ts'), 'utf-8')
    // hasSeenWelcome: false must be inside the createPlayer function body
    expect(queries).toMatch(/createPlayer[\s\S]{0,600}hasSeenWelcome:\s*false/)
  })
})

// ---------------------------------------------------------------------------
// AC1 / AC2 / AC4 / AC5 — Admin route: src/routes/admin/index.tsx
// ---------------------------------------------------------------------------

describe('[AC1][AC2][AC4][AC5][P0] Admin route — src/routes/admin/index.tsx', () => {
  it('[1.4-INT-013] src/routes/admin/index.tsx exists', () => {
    expect(existsSync(resolve(root, 'src/routes/admin/index.tsx'))).toBe(true)
  })

  it('[1.4-INT-014] admin route exports Route constant via createFileRoute (TanStack Router file-based route)', () => {
    const adminRoute = readFileSync(resolve(root, 'src/routes/admin/index.tsx'), 'utf-8')
    // Route and createFileRoute must be on the same assignment
    expect(adminRoute).toMatch(/export const Route\s*=\s*createFileRoute/)
  })

  it('[1.4-INT-015] createPlayerFn is assigned to createServerFn (same declaration)', () => {
    const adminRoute = readFileSync(resolve(root, 'src/routes/admin/index.tsx'), 'utf-8')
    // Function name and createServerFn must be coupled on the same assignment
    expect(adminRoute).toMatch(/createPlayerFn\s*=\s*createServerFn/)
  })

  it('[1.4-INT-016] createPlayerFn uses .middleware([adminMiddleware]) — no inline session check in handler', () => {
    const adminRoute = readFileSync(resolve(root, 'src/routes/admin/index.tsx'), 'utf-8')
    // createPlayerFn and .middleware([adminMiddleware]) must be in the same call chain
    expect(adminRoute).toMatch(/createPlayerFn\s*=\s*createServerFn[\s\S]{0,400}\.middleware\(\[adminMiddleware\]\)/)
  })

  it('[1.4-INT-017] admin route has beforeLoad hook that checks isAdmin (route-level protection)', () => {
    const adminRoute = readFileSync(resolve(root, 'src/routes/admin/index.tsx'), 'utf-8')
    // beforeLoad and isAdmin must be coupled — not two independent occurrences
    expect(adminRoute).toMatch(/beforeLoad[\s\S]{0,300}isAdmin/)
  })

  it('[1.4-INT-018] admin route beforeLoad redirects non-admin to root ("/") — AC4', () => {
    const adminRoute = readFileSync(resolve(root, 'src/routes/admin/index.tsx'), 'utf-8')
    // redirect and target "/" must be coupled on the same expression
    expect(adminRoute).toMatch(/redirect[\s\S]{0,100}to:\s*['"]\/['"]/)
  })

  it('[1.4-INT-019] adminMiddleware is imported from lib/middleware in admin route (import-protection pattern)', () => {
    const adminRoute = readFileSync(resolve(root, 'src/routes/admin/index.tsx'), 'utf-8')
    // Import source must be lib/middleware — not defined locally, not from auth.ts
    expect(adminRoute).toMatch(/import\s*\{[^}]*adminMiddleware[^}]*\}\s*from\s*['"][^'"]*lib\/middleware['"]/)
  })

  it('[1.4-INT-020] admin route handler uses bcryptjs for password hashing (not queries.ts — separation of concerns)', () => {
    const adminRoute = readFileSync(resolve(root, 'src/routes/admin/index.tsx'), 'utf-8')
    // bcryptjs must be used in the admin route handler
    expect(adminRoute).toContain('bcryptjs')
  })
})

// ---------------------------------------------------------------------------
// AC1 — Admin navigation link: moved to src/routes/__root.tsx (AppHeader) by story 1.6
// ---------------------------------------------------------------------------

describe('[AC1][P1] Admin navigation link — src/routes/__root.tsx (AppHeader, updated by story 1.6)', () => {
  it('[1.4-INT-021] AppHeader shows admin link only when isAdmin is true (conditional rendering — moved from index.tsx to AppHeader in story 1.6)', () => {
    const rootTsx = readFileSync(resolve(root, 'src/routes/__root.tsx'), 'utf-8')
    // isAdmin condition and /admin link must be coupled — link gated behind admin check
    expect(rootTsx).toMatch(/isAdmin[\s\S]{0,300}\/admin/)
  })

  it('[1.4-INT-022] admin link navigates to /admin route (now in AppHeader — story 1.6)', () => {
    const rootTsx = readFileSync(resolve(root, 'src/routes/__root.tsx'), 'utf-8')
    // /admin target must appear as a navigation destination in __root.tsx
    expect(rootTsx).toMatch(/\/admin/)
  })
})
