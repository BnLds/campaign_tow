// tests/integration/admin-list-delete.test.ts
// Story 1.6: Admin — Player Account List & Delete
// Status: RED — written before implementation (ATDD)
//
// Verifies: AC1 (admin link in AppHeader, removed from index.tsx),
//           AC2 (getAllPlayers + listPlayersFn + player list UI),
//           AC3 (delete button present, confirmation via window.confirm),
//           AC4 (deletePlayer + deletePlayerFn cascade),
//           AC5 (self-delete guard FORBIDDEN)
//
// Project pattern: static file-contract tests (read source, assert structure).
// No test.skip() — tests fail naturally when source doesn't match expectations.
// Tests pass once all story 1.6 tasks are complete.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { readAllQueries } from '../helpers/read-queries'

// Project root = two levels up from tests/integration/
const root = resolve(__dirname, '../..')

// ---------------------------------------------------------------------------
// AC1 — Admin link in AppHeader: src/routes/__root.tsx
// ---------------------------------------------------------------------------

describe('[AC1][P0] Admin link in AppHeader — src/routes/__root.tsx', () => {
  it('[1.6-INT-001] __root.tsx renders "Administration" link gated behind session.isAdmin (absent from DOM for non-admin)', () => {
    const rootTsx = readFileSync(resolve(root, 'src/routes/__root.tsx'), 'utf-8')
    // session.isAdmin condition and Administration text must be coupled — link absent from DOM for non-admin
    expect(rootTsx).toMatch(/session\.isAdmin[\s\S]{0,300}Administration/)
  })

  it('[1.6-INT-002] Administration link has data-testid="admin-link" (E2E selector contract)', () => {
    const rootTsx = readFileSync(resolve(root, 'src/routes/__root.tsx'), 'utf-8')
    expect(rootTsx).toContain('data-testid="admin-link"')
  })

  it('[1.6-INT-003] data-testid="admin-link" and /admin navigation are in the same element (coupled)', () => {
    const rootTsx = readFileSync(resolve(root, 'src/routes/__root.tsx'), 'utf-8')
    // admin-link testid and /admin route must be on the same element — not two independent occurrences
    expect(rootTsx).toMatch(/admin-link[\s\S]{0,200}\/admin/)
  })
})

// ---------------------------------------------------------------------------
// AC1 — Admin link removed from CampaignView: src/routes/index.tsx
// ---------------------------------------------------------------------------

describe('[AC1][P1] Admin link removed from CampaignView — src/routes/index.tsx', () => {
  it('[1.6-INT-004] index.tsx no longer has isAdmin-gated /admin href (moved to AppHeader in story 1.6)', () => {
    const indexRoute = readFileSync(resolve(root, 'src/routes/index.tsx'), 'utf-8')
    // The isAdmin + href="/admin" block from story 1.4 lines 67-71 must be removed entirely
    expect(indexRoute).not.toMatch(/isAdmin[\s\S]{0,200}href=["']\/admin["']/)
  })
})

// ---------------------------------------------------------------------------
// AC2 / AC4 — DB queries: getAllPlayers + deletePlayer
// ---------------------------------------------------------------------------

describe('[AC2][AC4][P0] DB queries — src/db/queries.ts', () => {
  it('[1.6-INT-005] queries.ts exports getAllPlayers as async function', () => {
    const queries = readAllQueries()
    expect(queries).toContain('export async function getAllPlayers')
  })

  it('[1.6-INT-006] getAllPlayers queries the players table — .from(players) inside the function body', () => {
    const queries = readAllQueries()
    // .from(players) must appear inside getAllPlayers — not just anywhere in the file
    expect(queries).toMatch(/getAllPlayers[\s\S]{0,300}\.from\(players\)/)
  })

  it('[1.6-INT-007] queries.ts exports deletePlayer as async function', () => {
    const queries = readAllQueries()
    expect(queries).toContain('export async function deletePlayer')
  })

  it('[1.6-INT-008] deletePlayer deletes from players table — .delete(players) inside the function body (cascade via FK)', () => {
    const queries = readAllQueries()
    // .delete(players) must be inside deletePlayer — not two independent occurrences
    expect(queries).toMatch(/deletePlayer[\s\S]{0,300}\.delete\(players\)/)
  })
})

// ---------------------------------------------------------------------------
// AC2 — listPlayersFn server function: src/routes/admin/index.tsx
// ---------------------------------------------------------------------------

describe('[AC2][P0] listPlayersFn server function — src/routes/admin/index.tsx', () => {
  it('[1.6-INT-009] listPlayersFn is assigned to createServerFn (same declaration)', () => {
    const adminRoute = readFileSync(resolve(root, 'src/routes/admin/index.tsx'), 'utf-8')
    expect(adminRoute).toMatch(/listPlayersFn\s*=\s*createServerFn/)
  })

  it('[1.6-INT-010] listPlayersFn uses .middleware([adminMiddleware]) — enforces admin-only access (coupled chain)', () => {
    const adminRoute = readFileSync(resolve(root, 'src/routes/admin/index.tsx'), 'utf-8')
    // listPlayersFn and .middleware([adminMiddleware]) must be in the same call chain
    expect(adminRoute).toMatch(/listPlayersFn\s*=\s*createServerFn[\s\S]{0,400}\.middleware\(\[adminMiddleware\]\)/)
  })

  it('[1.6-INT-011] listPlayersFn uses GET method (loader pattern — returns data directly, no ServerResult wrapper)', () => {
    const adminRoute = readFileSync(resolve(root, 'src/routes/admin/index.tsx'), 'utf-8')
    // method: 'GET' must be coupled with listPlayersFn declaration
    expect(adminRoute).toMatch(/listPlayersFn[\s\S]{0,200}method:\s*['"]GET['"]/)
  })
})

// ---------------------------------------------------------------------------
// AC4 / AC5 — deletePlayerFn server function: src/routes/admin/index.tsx
// ---------------------------------------------------------------------------

describe('[AC4][AC5][P0] deletePlayerFn server function — src/routes/admin/index.tsx', () => {
  it('[1.6-INT-012] deletePlayerFn is assigned to createServerFn (same declaration)', () => {
    const adminRoute = readFileSync(resolve(root, 'src/routes/admin/index.tsx'), 'utf-8')
    expect(adminRoute).toMatch(/deletePlayerFn\s*=\s*createServerFn/)
  })

  it('[1.6-INT-013] deletePlayerFn uses .middleware([adminMiddleware]) — enforces admin-only access (coupled chain)', () => {
    const adminRoute = readFileSync(resolve(root, 'src/routes/admin/index.tsx'), 'utf-8')
    // deletePlayerFn and .middleware([adminMiddleware]) must be in the same call chain
    expect(adminRoute).toMatch(/deletePlayerFn\s*=\s*createServerFn[\s\S]{0,400}\.middleware\(\[adminMiddleware\]\)/)
  })

  it('[1.6-INT-014] deletePlayerFn uses POST method (mutation pattern — returns ServerResult)', () => {
    const adminRoute = readFileSync(resolve(root, 'src/routes/admin/index.tsx'), 'utf-8')
    // method: 'POST' must be coupled with deletePlayerFn declaration
    expect(adminRoute).toMatch(/deletePlayerFn[\s\S]{0,200}method:\s*['"]POST['"]/)
  })

  it('[1.6-INT-015] deletePlayerFn has .inputValidator() with z.object (input validation — playerId required)', () => {
    const adminRoute = readFileSync(resolve(root, 'src/routes/admin/index.tsx'), 'utf-8')
    // .inputValidator and z.object must be coupled in the deletePlayerFn chain
    expect(adminRoute).toMatch(/deletePlayerFn[\s\S]{0,600}\.inputValidator\(z\.object/)
  })

  it('[1.6-INT-016] deletePlayerFn self-delete guard returns FORBIDDEN error code (AC5 — server-side protection)', () => {
    const adminRoute = readFileSync(resolve(root, 'src/routes/admin/index.tsx'), 'utf-8')
    // FORBIDDEN must be coupled with deletePlayerFn handler — guard must be inside the function
    expect(adminRoute).toMatch(/deletePlayerFn[\s\S]{0,800}FORBIDDEN/)
  })

  it('[1.6-INT-017] deletePlayerFn self-delete guard compares playerId to session.playerId (coupled comparison)', () => {
    const adminRoute = readFileSync(resolve(root, 'src/routes/admin/index.tsx'), 'utf-8')
    // data.playerId and context.session.playerId must be compared in deletePlayerFn handler
    expect(adminRoute).toMatch(/deletePlayerFn[\s\S]{0,800}data\.playerId[\s\S]{0,100}context\.session\.playerId/)
  })
})

// ---------------------------------------------------------------------------
// AC2 / AC3 — Player list UI: src/routes/admin/index.tsx
// ---------------------------------------------------------------------------

describe('[AC2][AC3][P1] Player list UI — src/routes/admin/index.tsx', () => {
  it('[1.6-INT-018] admin page renders a "Joueurs" section for the player list (AC2)', () => {
    const adminRoute = readFileSync(resolve(root, 'src/routes/admin/index.tsx'), 'utf-8')
    expect(adminRoute).toContain('Joueurs')
  })

  it('[1.6-INT-019] player delete buttons use data-testid="delete-player-{id}" pattern (E2E selector contract)', () => {
    const adminRoute = readFileSync(resolve(root, 'src/routes/admin/index.tsx'), 'utf-8')
    // Template literal with player ID — required for E2E tests to target specific player rows
    expect(adminRoute).toMatch(/delete-player-\$\{[^}]*[Ii][Dd][^}]*\}/)
  })

  it('[1.6-INT-020] deletePlayerFn and listPlayersFn handlers use dynamic import for DB queries (import-protection)', () => {
    const adminRoute = readFileSync(resolve(root, 'src/routes/admin/index.tsx'), 'utf-8')
    // Dynamic import inside .handler() — prevents server-only code from leaking into client bundle
    expect(adminRoute).toMatch(/import\(['"`][^'"]+db\/queries/)
  })
})
