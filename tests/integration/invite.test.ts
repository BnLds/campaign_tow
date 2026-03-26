// tests/integration/invite.test.ts
// Invite link authentication — structural contract tests
// Verifies: AC1 (schema), AC3 (setup route), AC4 (auto-login), AC5 (invalid token), AC13 (rate limit)

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { readAllQueries } from '../helpers/read-queries'

const root = resolve(__dirname, '../..')

// ---------------------------------------------------------------------------
// Schema — inviteToken column + nullable passwordHash
// ---------------------------------------------------------------------------

describe('[AC1][P0] Schema — players table invite columns', () => {
  it('[invite-INT-001] schema.ts adds inviteToken column with .unique()', () => {
    const schema = readFileSync(resolve(root, 'src/db/schema.ts'), 'utf-8')
    expect(schema).toMatch(/inviteToken.*text.*invite_token.*\.unique\(\)/)
  })

  it('[invite-INT-002] schema.ts passwordHash column is nullable (no .notNull())', () => {
    const schema = readFileSync(resolve(root, 'src/db/schema.ts'), 'utf-8')
    // passwordHash line should NOT have .notNull() after it
    expect(schema).not.toMatch(/password_hash['"]\s*\)\.notNull\(\)/)
  })

  it('[invite-INT-003] schema.ts does not contain hasSeenWelcome column', () => {
    const schema = readFileSync(resolve(root, 'src/db/schema.ts'), 'utf-8')
    expect(schema).not.toContain('hasSeenWelcome')
    expect(schema).not.toContain('has_seen_welcome')
  })
})

// ---------------------------------------------------------------------------
// DB queries — new invite functions
// ---------------------------------------------------------------------------

describe('[AC3][AC4][P0] DB queries — invite functions', () => {
  it('[invite-INT-004] queries export getPlayerByInviteToken as async function', () => {
    const queries = readAllQueries()
    expect(queries).toContain('export async function getPlayerByInviteToken')
  })

  it('[invite-INT-005] queries export activatePlayer as async function', () => {
    const queries = readAllQueries()
    expect(queries).toContain('export async function activatePlayer')
  })

  it('[invite-INT-006] activatePlayer throws if player already activated (optimistic lock)', () => {
    const queries = readAllQueries()
    expect(queries).toMatch(/activatePlayer[\s\S]{0,600}throw/)
  })

  it('[invite-INT-007] queries export regenerateInviteToken as async function', () => {
    const queries = readAllQueries()
    expect(queries).toContain('export async function regenerateInviteToken')
  })

  it('[invite-INT-008] queries export generateAllMissingInviteTokens — uses gen_random_uuid() for bulk SQL', () => {
    const queries = readAllQueries()
    expect(queries).toMatch(/generateAllMissingInviteTokens[\s\S]{0,400}gen_random_uuid/)
  })

  it('[invite-INT-009] generateAllMissingInviteTokens excludes ghost player sentinel', () => {
    const queries = readAllQueries()
    expect(queries).toMatch(/generateAllMissingInviteTokens[\s\S]{0,600}no-login/)
  })

  it('[invite-INT-010] getPlayerInviteToken fetches single token on-demand (not included in getAllPlayers)', () => {
    const queries = readAllQueries()
    expect(queries).toContain('export async function getPlayerInviteToken')
    // getAllPlayers should NOT include inviteToken in its SELECT
    expect(queries).not.toMatch(/getAllPlayers[\s\S]{0,400}inviteToken/)
  })
})

// ---------------------------------------------------------------------------
// auth.ts — deletePlayerSessions + nullable passwordHash handling
// ---------------------------------------------------------------------------

describe('[AC4][P0] auth.ts — invite-related functions', () => {
  it('[invite-INT-011] auth.ts exports deletePlayerSessions as async function', () => {
    const auth = readFileSync(resolve(root, 'src/lib/auth.ts'), 'utf-8')
    expect(auth).toContain('export async function deletePlayerSessions')
  })

  it('[invite-INT-012] loginPlayer returns false immediately if passwordHash is null (coupled check)', () => {
    const auth = readFileSync(resolve(root, 'src/lib/auth.ts'), 'utf-8')
    // null check must be before bcrypt.compare call
    expect(auth).toMatch(/passwordHash[\s\S]{0,100}return false[\s\S]{0,200}compare/)
  })
})

// ---------------------------------------------------------------------------
// Route /invite/$token
// ---------------------------------------------------------------------------

describe('[AC3][AC5][P0] Route /invite/$token', () => {
  it('[invite-INT-013] src/routes/invite.$token.tsx exists', () => {
    expect(existsSync(resolve(root, 'src/routes/invite.$token.tsx'))).toBe(true)
  })

  it('[invite-INT-014] invite route exports Route via createFileRoute("/invite/$token")', () => {
    const route = readFileSync(resolve(root, 'src/routes/invite.$token.tsx'), 'utf-8')
    expect(route).toMatch(/createFileRoute\(['"]\/invite\/\$token['"]/)
  })

  it('[invite-INT-015] invite route uses loader (not beforeLoad) for auto-login side-effect', () => {
    const route = readFileSync(resolve(root, 'src/routes/invite.$token.tsx'), 'utf-8')
    expect(route).toContain('loader:')
    expect(route).not.toMatch(/beforeLoad[\s\S]{0,200}autoLogin/)
  })

  it('[invite-INT-016] invite route has in-memory rate limiter (same pattern as login.tsx)', () => {
    const route = readFileSync(resolve(root, 'src/routes/invite.$token.tsx'), 'utf-8')
    expect(route).toMatch(/Map[\s\S]{0,200}resetAt/)
  })

  it('[invite-INT-017] completeInviteSetupFn hashes password with bcryptjs (12 rounds)', () => {
    const route = readFileSync(resolve(root, 'src/routes/invite.$token.tsx'), 'utf-8')
    expect(route).toMatch(/bcryptjs[\s\S]{0,300}hash[\s\S]{0,100}12/)
  })

  it('[invite-INT-018] autoLoginViaInviteFn calls deletePlayerSessions before createSession (coupled — session takeover protection)', () => {
    const route = readFileSync(resolve(root, 'src/routes/invite.$token.tsx'), 'utf-8')
    expect(route).toMatch(/deletePlayerSessions[\s\S]{0,200}createSession/)
  })

  it('[invite-INT-019] __root.tsx excludes /invite paths from beforeLoad auth check', () => {
    const root_tsx = readFileSync(resolve(root, 'src/routes/__root.tsx'), 'utf-8')
    expect(root_tsx).toMatch(/startsWith\(['"]\/invite['"]/)
  })
})

// ---------------------------------------------------------------------------
// Admin — invite link server functions
// ---------------------------------------------------------------------------

describe('[AC2][AC6][P0] Admin route — invite link server functions', () => {
  it('[invite-INT-020] admin route exports getInviteLinkFn using createServerFn (coupled)', () => {
    const adminPlayers = readFileSync(resolve(root, 'src/server-fns/admin-players.ts'), 'utf-8')
    expect(adminPlayers).toMatch(/getInviteLinkFn\s*=\s*createServerFn/)
  })

  it('[invite-INT-021] admin route exports regenerateInviteTokenFn using createServerFn (coupled)', () => {
    const adminPlayers = readFileSync(resolve(root, 'src/server-fns/admin-players.ts'), 'utf-8')
    expect(adminPlayers).toMatch(/regenerateInviteTokenFn\s*=\s*createServerFn/)
  })

  it('[invite-INT-022] regenerateInviteTokenFn guards admin self-regen (FORBIDDEN)', () => {
    const adminPlayers = readFileSync(resolve(root, 'src/server-fns/admin-players.ts'), 'utf-8')
    expect(adminPlayers).toMatch(/regenerateInviteTokenFn[\s\S]{0,600}FORBIDDEN/)
  })

  it('[invite-INT-023] admin route has generateAllMissingTokensFn server function', () => {
    const adminPlayers = readFileSync(resolve(root, 'src/server-fns/admin-players.ts'), 'utf-8')
    expect(adminPlayers).toContain('generateAllMissingTokensFn')
  })
})
