// tests/integration/auth.test.ts
// Story 1.2: Player Login & Session Management
// Status: RED — written before implementation (ATDD)
//
// Verifies: AC1 (redirect unauthenticated), AC2 (successful login),
//           AC3 (failed login), AC4 (session verification),
//           AC5 (army ownership — scaffolded)
//
// These tests check the structure and contracts of story 1.2 implementation.
// Tests fail until all story 1.2 tasks are complete.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Project root = two levels up from tests/integration/
const root = resolve(__dirname, '../..')

// ---------------------------------------------------------------------------
// AC2 / AC4 — DB Schema: players + sessions tables
// ---------------------------------------------------------------------------

describe('[AC2][AC4][P0] DB schema — players and sessions tables', () => {
  it('[1.2-INT-001] src/db/schema.ts exports players table', () => {
    const schema = readFileSync(resolve(root, 'src/db/schema.ts'), 'utf-8')
    expect(schema).toContain('export const players')
  })

  it('[1.2-INT-002] src/db/schema.ts exports sessions table', () => {
    const schema = readFileSync(resolve(root, 'src/db/schema.ts'), 'utf-8')
    expect(schema).toContain('export const sessions')
  })

  it('[1.2-INT-003] sessions table references players with cascade delete (same column)', () => {
    const schema = readFileSync(resolve(root, 'src/db/schema.ts'), 'utf-8')
    // Check the complete Drizzle FK expression — both conditions on the same reference
    expect(schema).toContain(".references(() => players.id, { onDelete: 'cascade' })")
  })

  it('[1.2-INT-004] players table has passwordHash column (snake_case in DB)', () => {
    const schema = readFileSync(resolve(root, 'src/db/schema.ts'), 'utf-8')
    expect(schema).toContain('password_hash')
  })

  it('[1.2-INT-005] sessions table has expiresAt column', () => {
    const schema = readFileSync(resolve(root, 'src/db/schema.ts'), 'utf-8')
    expect(schema).toContain('expires_at')
  })
})

// ---------------------------------------------------------------------------
// AC4 — Auth module: src/lib/auth.ts
// ---------------------------------------------------------------------------

describe('[AC4][P0] Auth module — src/lib/auth.ts', () => {
  it('[1.2-INT-006] src/lib/auth.ts exists', () => {
    expect(existsSync(resolve(root, 'src/lib/auth.ts'))).toBe(true)
  })

  it('[1.2-INT-007] auth.ts exports getSession as async function', () => {
    const auth = readFileSync(resolve(root, 'src/lib/auth.ts'), 'utf-8')
    expect(auth).toContain('export async function getSession')
  })

  it('[1.2-INT-008] auth.ts exports createSession as async function', () => {
    const auth = readFileSync(resolve(root, 'src/lib/auth.ts'), 'utf-8')
    expect(auth).toContain('export async function createSession')
  })

  it('[1.2-INT-009] auth.ts sets HTTP-only session cookie (security requirement)', () => {
    const auth = readFileSync(resolve(root, 'src/lib/auth.ts'), 'utf-8')
    expect(auth).toContain('httpOnly: true')
  })

  it('[1.2-INT-010] auth.ts exports authMiddleware using createMiddleware', () => {
    const auth = readFileSync(resolve(root, 'src/lib/auth.ts'), 'utf-8')
    // Both must appear on the same declaration line — not in separate places
    expect(auth).toMatch(/export const authMiddleware\s*=\s*createMiddleware/)
  })
})

// ---------------------------------------------------------------------------
// AC2 / AC3 — Login route: src/routes/login.tsx
// ---------------------------------------------------------------------------

describe('[AC2][AC3][P0] Login route — src/routes/login.tsx', () => {
  it('[1.2-INT-011] src/routes/login.tsx exists', () => {
    expect(existsSync(resolve(root, 'src/routes/login.tsx'))).toBe(true)
  })

  it('[1.2-INT-012] login.tsx exports loginFn as a server function', () => {
    const login = readFileSync(resolve(root, 'src/routes/login.tsx'), 'utf-8')
    // loginFn must be assigned to createServerFn — not two independent occurrences
    expect(login).toMatch(/loginFn\s*=\s*createServerFn/)
  })

  it('[1.2-INT-013] loginFn returns same error message for wrong user and wrong password (no username enumeration)', () => {
    const login = readFileSync(resolve(root, 'src/routes/login.tsx'), 'utf-8')
    expect(login).toContain('Identifiant ou mot de passe incorrect')
  })

  it('[1.2-INT-014] auth.ts uses bcryptjs compare (not string equality) for password verification', () => {
    const auth = readFileSync(resolve(root, 'src/lib/auth.ts'), 'utf-8')
    // compare must be imported from bcryptjs specifically — not from another source
    expect(auth).toMatch(/import\s*\{[^}]*compare[^}]*\}\s*from\s*['"]bcryptjs['"]/)
  })

  it('[1.2-INT-015] src/lib/validators.ts exports loginSchema', () => {
    expect(existsSync(resolve(root, 'src/lib/validators.ts'))).toBe(true)
    const validators = readFileSync(resolve(root, 'src/lib/validators.ts'), 'utf-8')
    expect(validators).toContain('export const loginSchema')
  })
})

// ---------------------------------------------------------------------------
// AC1 — Route protection: src/routes/__root.tsx
// ---------------------------------------------------------------------------

describe('[AC1][P0] Route protection — src/routes/__root.tsx', () => {
  it('[1.2-INT-016] __root.tsx calls getSession for route protection', () => {
    const rootTsx = readFileSync(resolve(root, 'src/routes/__root.tsx'), 'utf-8')
    expect(rootTsx).toContain('getSession')
  })

  it('[1.2-INT-017] __root.tsx redirects unauthenticated users to /login', () => {
    const rootTsx = readFileSync(resolve(root, 'src/routes/__root.tsx'), 'utf-8')
    expect(rootTsx).toMatch(/['"]\/login['"]/)
  })
})

// ---------------------------------------------------------------------------
// AC2 — Admin seed script
// ---------------------------------------------------------------------------

describe('[AC2][P1] Admin seed script — src/db/seed-admin.ts', () => {
  it('[1.2-INT-018] src/db/seed-admin.ts exists', () => {
    expect(existsSync(resolve(root, 'src/db/seed-admin.ts'))).toBe(true)
  })

  it('[1.2-INT-019] seed-admin.ts uses bcryptjs (not native bcrypt — Railway compatibility)', () => {
    const seed = readFileSync(resolve(root, 'src/db/seed-admin.ts'), 'utf-8')
    expect(seed).toContain('bcryptjs')
    // Ensure it does NOT import the native bcrypt package
    expect(seed).not.toMatch(/from ['"]bcrypt['"]/)
  })

  it('[1.2-INT-020] package.json has seed:admin script', () => {
    const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'))
    expect(pkg.scripts).toHaveProperty('seed:admin')
  })
})

// ---------------------------------------------------------------------------
// AC5 — Army ownership middleware (scaffolded)
// ---------------------------------------------------------------------------

describe('[AC5][P2] Army ownership middleware — scaffolded in story 1.2', () => {
  it('[1.2-INT-021] auth.ts exports armyOwnerMiddleware', () => {
    const auth = readFileSync(resolve(root, 'src/lib/auth.ts'), 'utf-8')
    expect(auth).toContain('export const armyOwnerMiddleware')
  })

  it('[1.2-INT-022] armyOwnerMiddleware references FORBIDDEN error code', () => {
    const auth = readFileSync(resolve(root, 'src/lib/auth.ts'), 'utf-8')
    expect(auth).toContain('FORBIDDEN')
  })
})
