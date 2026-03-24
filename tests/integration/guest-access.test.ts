// tests/integration/guest-access.test.ts
// Story 1.7: Guest Access (Read-Only)
// Status: RED — written before implementation (ATDD)
//
// Verifies: AC1 (guest link on login page),
//           AC2 (guest session creation via guestLoginFn + ghost player),
//           AC3 (guest read access — all tabs accessible),
//           AC4 (guest write blocking — WelcomeModal, getAllPlayers filter),
//           AC5 (identity indicator: "Invité" for guest),
//           AC6 (guest session menu: "Se connecter" not "Se déconnecter"),
//           AC8 (write route redirect — admin already protected by isAdmin guard)
//
// Project pattern: static file-contract tests (read source, assert structure).
// No test.skip() — tests fail naturally when source doesn't match expectations.
// Tests pass once all story 1.7 tasks are complete.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { readAllQueries } from '../helpers/read-queries'

// Project root = two levels up from tests/integration/
const root = resolve(__dirname, '../..')

// ---------------------------------------------------------------------------
// Schema — isGuest column in players table
// ---------------------------------------------------------------------------

describe('[AC2][P0] isGuest column in players schema — src/db/schema.ts', () => {
  it('[1.7-INT-001] schema.ts has isGuest boolean column in players table (not null, default false)', () => {
    const schema = readFileSync(resolve(root, 'src/db/schema.ts'), 'utf-8')
    // isGuest must be a boolean column inside the players table definition — coupled assertion
    expect(schema).toMatch(/isGuest\s*:\s*boolean\(['"]is_guest['"]\)[\s\S]{0,100}notNull\(\)[\s\S]{0,100}default\(false\)/)
  })
})

// ---------------------------------------------------------------------------
// Auth — SessionData.isGuest is boolean (not optional)
// ---------------------------------------------------------------------------

describe('[AC5][P0] SessionData.isGuest is boolean — src/lib/auth.ts', () => {
  it('[1.7-INT-002] SessionData.isGuest is typed as boolean (not isGuest?: boolean — must be non-optional)', () => {
    const authTs = readFileSync(resolve(root, 'src/lib/auth.ts'), 'utf-8')
    // isGuest: boolean must appear in the type definition (non-optional)
    expect(authTs).toMatch(/isGuest\s*:\s*boolean/)
    // isGuest?: boolean (optional) must NOT exist — replacing the optional field
    expect(authTs).not.toMatch(/isGuest\s*\?\s*:\s*boolean/)
  })

  it('[1.7-INT-003] getSession reads isGuest from DB (players.isGuest in select, row.isGuest in return — not hardcoded false)', () => {
    const authTs = readFileSync(resolve(root, 'src/lib/auth.ts'), 'utf-8')
    // players.isGuest must be in the .select() block of getSession — coupled assertion
    expect(authTs).toMatch(/\.select\([\s\S]{0,600}players\.isGuest/)
    // Return value must use row.isGuest — not hardcoded false
    expect(authTs).toMatch(/isGuest\s*:\s*row\.isGuest/)
  })
})

// ---------------------------------------------------------------------------
// Queries — ensureGhostPlayer + getGhostPlayerId + getAllPlayers filter
// ---------------------------------------------------------------------------

describe('[AC2][P0] Ghost player queries — src/db/queries.ts', () => {
  it('[1.7-INT-004] queries.ts exports ensureGhostPlayer as async function', () => {
    const queries = readAllQueries()
    expect(queries).toContain('export async function ensureGhostPlayer')
  })

  it('[1.7-INT-005] queries.ts exports getGhostPlayerId as async function', () => {
    const queries = readAllQueries()
    expect(queries).toContain('export async function getGhostPlayerId')
  })

  it("[1.7-INT-006] ensureGhostPlayer upserts player with username '__guest__' (coupled assertion)", () => {
    const queries = readAllQueries()
    // ensureGhostPlayer must reference '__guest__' username — not two unrelated occurrences
    expect(queries).toMatch(/ensureGhostPlayer[\s\S]{0,400}__guest__/)
  })
})

describe('[AC4][P0] getAllPlayers filters ghost player — src/db/queries.ts', () => {
  it('[1.7-INT-007] getAllPlayers filters out guest players — .where(eq(players.isGuest, false)) inside the function body', () => {
    const queries = readAllQueries()
    // isGuest filter must be inside getAllPlayers — coupled assertion (not two independent occurrences)
    expect(queries).toMatch(/getAllPlayers[\s\S]{0,500}isGuest[\s\S]{0,100}false/)
  })
})

// ---------------------------------------------------------------------------
// Login — guestLoginFn server function
// ---------------------------------------------------------------------------

describe('[AC1][AC2][P0] guestLoginFn server function — src/routes/login.tsx', () => {
  it('[1.7-INT-008] guestLoginFn is assigned to createServerFn (same declaration — coupled)', () => {
    const loginTsx = readFileSync(resolve(root, 'src/routes/login.tsx'), 'utf-8')
    expect(loginTsx).toMatch(/guestLoginFn\s*=\s*createServerFn/)
  })

  it('[1.7-INT-009] guestLoginFn uses ensureGhostPlayer and createSession in the same handler (coupled — both required for guest session)', () => {
    const loginTsx = readFileSync(resolve(root, 'src/routes/login.tsx'), 'utf-8')
    // Both ensureGhostPlayer and createSession must be inside guestLoginFn handler
    expect(loginTsx).toMatch(/guestLoginFn[\s\S]{0,600}ensureGhostPlayer/)
    expect(loginTsx).toMatch(/guestLoginFn[\s\S]{0,600}createSession/)
  })

  it("[1.7-INT-010] guestLoginFn has POST method and no middleware (public endpoint — like loginFn)", () => {
    const loginTsx = readFileSync(resolve(root, 'src/routes/login.tsx'), 'utf-8')
    // method: 'POST' must be coupled with guestLoginFn declaration
    expect(loginTsx).toMatch(/guestLoginFn[\s\S]{0,200}method:\s*['"]POST['"]/)
  })

  it('[1.7-INT-011] guestLoginFn handler uses dynamic imports for DB/auth calls (import-protection)', () => {
    const loginTsx = readFileSync(resolve(root, 'src/routes/login.tsx'), 'utf-8')
    // Dynamic import inside .handler() — prevents server-only code from leaking into client bundle
    // guestLoginFn and dynamic import must be coupled
    expect(loginTsx).toMatch(/guestLoginFn[\s\S]{0,800}import\(/)
  })
})

describe('[AC1][P0] Guest link UI — src/routes/login.tsx', () => {
  it('[1.7-INT-012] login page has guest link with data-testid="guest-login-link" (E2E selector contract)', () => {
    const loginTsx = readFileSync(resolve(root, 'src/routes/login.tsx'), 'utf-8')
    expect(loginTsx).toContain('data-testid="guest-login-link"')
  })

  it("[1.7-INT-013] guest link text 'Continuer en tant qu'invité' is coupled with data-testid='guest-login-link' (same element)", () => {
    const loginTsx = readFileSync(resolve(root, 'src/routes/login.tsx'), 'utf-8')
    // Text and testid must be on the same element — coupled assertion (not two separate occurrences)
    expect(loginTsx).toMatch(/guest-login-link[\s\S]{0,200}Continuer en tant qu'invité/)
  })
})

// ---------------------------------------------------------------------------
// Root layout — AppHeader identity indicator + session action button
// ---------------------------------------------------------------------------

describe('[AC5][P0] Identity indicator for guest — src/routes/__root.tsx', () => {
  it("[1.7-INT-014] AppHeader identity indicator shows 'Invité' when session.isGuest is true (coupled with isGuest condition)", () => {
    const rootTsx = readFileSync(resolve(root, 'src/routes/__root.tsx'), 'utf-8')
    // isGuest condition and 'Invité' text must be coupled — same ternary/conditional block
    expect(rootTsx).toMatch(/session\.isGuest[\s\S]{0,300}Invité/)
  })
})

describe('[AC6][P0] Session action button for guest — src/routes/__root.tsx', () => {
  it('[1.7-INT-015] AppHeader renders login-button (Se connecter) for guests — data-testid="login-button" coupled with isGuest condition', () => {
    const rootTsx = readFileSync(resolve(root, 'src/routes/__root.tsx'), 'utf-8')
    // login-button testid must be inside the isGuest branch
    expect(rootTsx).toMatch(/session\.isGuest[\s\S]{0,400}login-button/)
  })

  it('[1.7-INT-016] AppHeader login-button is in the isGuest branch, logout-button is in the Options modal', () => {
    const rootTsx = readFileSync(resolve(root, 'src/routes/__root.tsx'), 'utf-8')
    // login-button is rendered for guests via isGuest ternary
    expect(rootTsx).toMatch(/session\.isGuest[\s\S]{0,300}login-button/)
    // logout-button is in the Options Dialog modal (not in isGuest branch)
    expect(rootTsx).toMatch(/DialogTitle[\s\S]{0,500}logout-button/)
  })
})

// ---------------------------------------------------------------------------
