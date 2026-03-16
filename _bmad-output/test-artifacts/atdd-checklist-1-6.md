---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-03-13'
workflowType: 'testarch-atdd'
inputDocuments:
  - '_bmad-output/implementation-artifacts/1-6-admin-player-account-list-delete.md'
  - 'src/routes/__root.tsx'
  - 'src/routes/admin/index.tsx'
  - 'src/db/queries.ts'
  - 'e2e/global-setup.ts'
  - 'e2e/admin.spec.ts'
  - 'tests/integration/admin.test.ts'
  - 'playwright.config.ts'
  - '_bmad/tea/config.yaml'
---

# ATDD Checklist — Epic 1, Story 1.6: Admin Player Account List & Delete

**Date:** 2026-03-13
**Author:** Ben
**Primary Test Level:** Integration (Vitest file-contract) + E2E (Playwright)
**TDD Phase:** 🔴 RED — Failing tests generated, awaiting implementation

---

## Story Summary

As Ben (admin), I want to view all player accounts and delete them if needed, so that I can manage campaign participants throughout the season.
The "Administration" link is added to AppHeader (replacing the link removed from CampaignView). The admin page gains a player list with delete capability, protected by both a UI guard and a server-side self-delete check.

**As a** Ben (admin)
**I want** to view all player accounts and delete them from the admin page
**So that** I can manage campaign participants throughout the season

---

## Acceptance Criteria

1. **AC1** — Admin sees "Administration" link in AppHeader (profile/session area, below "Se déconnecter"). Link absent from DOM for non-admin and guests.
2. **AC2** — Admin page shows a player list (username, displayName, isAdmin, createdAt). Ghost player (`isGuest`) excluded once column exists (story 1.7).
3. **AC3** — Tapping "Supprimer" on a player row requires confirmation before proceeding (`window.confirm()`).
4. **AC4** — Confirmed deletion removes the player from `players` table; `sessions` rows cascade-deleted via FK. Player list refreshes.
5. **AC5** — Admin cannot delete their own account: server returns FORBIDDEN; UI guard also hides the delete button on admin's own row.

---

## Failing Tests Created (RED Phase)

### Integration Tests — Vitest (20 tests)

**File:** `tests/integration/admin-list-delete.test.ts` (approx. 130 lines)

Project pattern: static file-contract tests (read source, assert structure) — no `test.skip()`, tests fail naturally when source doesn't match expectations.

| Test ID | Priority | AC | Status | Verifies |
|---|---|---|---|---|
| `[1.6-INT-001]` | P0 | AC1 | 🔴 RED | `session.isAdmin` coupled with "Administration" text in `__root.tsx` |
| `[1.6-INT-002]` | P0 | AC1 | 🔴 RED | `data-testid="admin-link"` present in `__root.tsx` |
| `[1.6-INT-003]` | P0 | AC1 | 🔴 RED | `admin-link` testid and `/admin` navigation in same element |
| `[1.6-INT-004]` | P1 | AC1 | 🔴 RED | `index.tsx` no longer has `isAdmin` + `href="/admin"` (moved to AppHeader) |
| `[1.6-INT-005]` | P0 | AC2 | 🔴 RED | `getAllPlayers` exported from `queries.ts` as async function |
| `[1.6-INT-006]` | P0 | AC2 | 🔴 RED | `getAllPlayers` uses `.from(players)` (coupled inside function body) |
| `[1.6-INT-007]` | P0 | AC4 | 🔴 RED | `deletePlayer` exported from `queries.ts` as async function |
| `[1.6-INT-008]` | P0 | AC4 | 🔴 RED | `deletePlayer` uses `.delete(players)` (coupled inside function body) |
| `[1.6-INT-009]` | P0 | AC2 | 🔴 RED | `listPlayersFn = createServerFn` (same declaration) |
| `[1.6-INT-010]` | P0 | AC2 | 🔴 RED | `listPlayersFn` chain includes `.middleware([adminMiddleware])` |
| `[1.6-INT-011]` | P0 | AC2 | 🔴 RED | `listPlayersFn` uses `method: 'GET'` (loader pattern) |
| `[1.6-INT-012]` | P0 | AC4 | 🔴 RED | `deletePlayerFn = createServerFn` (same declaration) |
| `[1.6-INT-013]` | P0 | AC4 | 🔴 RED | `deletePlayerFn` chain includes `.middleware([adminMiddleware])` |
| `[1.6-INT-014]` | P0 | AC4 | 🔴 RED | `deletePlayerFn` uses `method: 'POST'` (mutation pattern) |
| `[1.6-INT-015]` | P0 | AC4 | 🔴 RED | `deletePlayerFn` chain includes `.validator(z.object` (coupled) |
| `[1.6-INT-016]` | P0 | AC5 | 🔴 RED | `deletePlayerFn` handler returns `FORBIDDEN` (self-delete guard, coupled) |
| `[1.6-INT-017]` | P0 | AC5 | 🔴 RED | `deletePlayerFn` handler compares `data.playerId` to `context.session.playerId` |
| `[1.6-INT-018]` | P1 | AC2 | 🔴 RED | Admin page contains "Joueurs" section heading |
| `[1.6-INT-019]` | P1 | AC3 | 🔴 RED | Delete buttons use `data-testid="delete-player-${id}"` pattern |
| `[1.6-INT-020]` | P1 | AC4 | 🔴 RED | `deletePlayerFn`/`listPlayersFn` handlers use dynamic `import()` for DB queries |

**Verified RED run:** `19 failed | 1 passed` (20 new tests — INT-004 already GREEN: `index.tsx` n'utilise pas `href="/admin"`, donc le pattern est déjà absent)

### E2E Tests — Playwright (6 tests)

**File:** `e2e/admin-list-delete.spec.ts` (approx. 140 lines)

Auth: `e2e_admin` (`.auth/admin.json`) for admin scenarios; `e2e_returning` (`.auth/returning.json`) for non-admin scenario.

| Test ID | Priority | AC | Status | Verifies |
|---|---|---|---|---|
| `[1.6-E2E-001]` | P0 | AC1 | 🔴 RED | Admin sees `data-testid="admin-link"` on `/` — clicking navigates to `/admin` |
| `[1.6-E2E-002]` | P0 | AC1 | 🔴 RED | Non-admin: `admin-link` absent from DOM (`toHaveCount(0)`) |
| `[1.6-E2E-003]` | P0 | AC2 | 🔴 RED | `/admin` shows "Joueurs" section, `e2e_returning` and `e2e_first_login` visible in list |
| `[1.6-E2E-004]` | P1 | AC3 | 🔴 RED | Dismissing `window.confirm()` on delete → player count unchanged |
| `[1.6-E2E-005]` | P1 | AC3+AC4 | 🔴 RED | Accepting `window.confirm()` → throwaway player disappears from list |
| `[1.6-E2E-006]` | P0 | AC5 | 🔴 RED | Admin's own row (`e2e_admin`) has no delete button (`toHaveCount(0)`) |

**Expected E2E baseline after RED run:** 6 new tests fail — 18 existing pass (no regressions expected)

---

## Required data-testid Attributes

### `__root.tsx` — AppHeader component

| data-testid | Element | Description |
|---|---|---|
| `admin-link` | `<a>` or `<button>` | "Administration" — navigates to `/admin`, visible only when `session.isAdmin === true` |

### `src/routes/admin/index.tsx` — Player list

| data-testid | Element | Description |
|---|---|---|
| `delete-player-{playerId}` | `<button>` | "Supprimer" — one per player row, absent on admin's own row |

---

## Fixtures / Auth

No new fixtures needed. Existing global-setup creates:
- `e2e_admin` → `.auth/admin.json` (admin)
- `e2e_returning` → `.auth/returning.json` (non-admin)
- `e2e_first_login` → `.auth/first-login.json` (non-admin, used in list assertions)

Test `[1.6-E2E-005]` creates a throwaway player inline (`e2e_del_${Date.now()}`) and deletes it within the test — no cleanup needed (deletion is the action under test).

---

## Mock Requirements

None. All tests use real database via global-setup direct DB connection. `window.confirm()` handled via Playwright's dialog event listener.

---

## Implementation Checklist

### Tests → Implementation mapping

#### `[1.6-INT-001..004]` — Admin link in AppHeader

- [ ] Add `{session.isAdmin && <a ... data-testid="admin-link" ...>Administration</a>}` to `AppHeader` in `__root.tsx`
- [ ] Use `router.navigate({ to: '/admin' })` for SPA navigation (not raw anchor reload)
- [ ] Wrap in `{session.isAdmin && ...}` — absent from DOM, not `display: none`
- [ ] Remove lines 67-71 from `src/routes/index.tsx` (old `isAdmin && <a href="/admin">` block)
- [ ] Run: `pnpm test --reporter=verbose tests/integration/admin-list-delete.test.ts`
- [ ] ✅ INT-001..004 pass (green)

#### `[1.6-INT-005..008]` — DB queries

- [ ] Add `getAllPlayers()`: `db.select().from(players).orderBy(players.createdAt)` in `queries.ts`
- [ ] Add `deletePlayer(playerId)`: `db.delete(players).where(eq(players.id, playerId))` in `queries.ts`
- [ ] ✅ INT-005..008 pass (green)

#### `[1.6-INT-009..011]` — listPlayersFn

- [ ] Add `listPlayersFn = createServerFn({ method: 'GET' }).middleware([adminMiddleware]).handler(async () => { const { getAllPlayers } = await import('../../db/queries'); return getAllPlayers() })` in `admin/index.tsx`
- [ ] ✅ INT-009..011 pass (green)

#### `[1.6-INT-012..017]` — deletePlayerFn

- [ ] Add `deletePlayerFn = createServerFn({ method: 'POST' }).middleware([adminMiddleware]).validator(z.object({ playerId: z.string() })).handler(async ({ context, data }) => { if (data.playerId === context.session.playerId) return { success: false, error: { code: 'FORBIDDEN', ... } }; ... })` in `admin/index.tsx`
- [ ] ✅ INT-012..017 pass (green)

#### `[1.6-INT-018..020]` — Player list UI

- [ ] Add "Joueurs" section in admin page below creation form
- [ ] Render each player as a row with `data-testid="delete-player-${player.id}"` on the delete button
- [ ] Hide delete button on admin's own row: `{player.id !== currentPlayerId && <button ...>Supprimer</button>}`
- [ ] Use dynamic import: `const { deletePlayer } = await import('../../db/queries')` inside handler
- [ ] ✅ INT-018..020 pass (green)

#### E2E tests

- [ ] Run: `pnpm exec playwright test e2e/admin-list-delete.spec.ts`
- [ ] ✅ All 6 E2E tests pass (green)

#### Quality gates

- [ ] `pnpm test` — 156 passing, 0 failing
- [ ] `pnpm exec playwright test` — 24 passing, 0 failing
- [ ] `pnpm typecheck` — 0 errors
- [ ] `pnpm lint` — 0 errors
- [ ] `pnpm build` — succeeds

---

## Running Tests

```bash
# Run new integration tests only (RED phase verification)
pnpm test tests/integration/admin-list-delete.test.ts

# Run all integration tests (regression check)
pnpm test

# Run new E2E tests only
pnpm exec playwright test e2e/admin-list-delete.spec.ts

# Run all E2E tests
pnpm exec playwright test

# Run E2E tests in headed mode (see browser)
pnpm exec playwright test e2e/admin-list-delete.spec.ts --headed

# Debug specific E2E test
pnpm exec playwright test e2e/admin-list-delete.spec.ts --debug
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

**TEA Agent Responsibilities:**

- ✅ 20 integration tests written (file-contract structural checks)
- ✅ 6 E2E tests written (user journey checks)
- ✅ All tests designed to fail before implementation
- ✅ data-testid requirements listed
- ✅ Implementation checklist created

**Verification:**

- Integration tests: `19 failed | 137 passed (156 total)` — zero regressions ✅
- E2E tests: expected to fail (6 new tests) once run against current implementation

---

### GREEN Phase (DEV Agent — Next Steps)

1. **Pick one failing test** from implementation checklist (start with INT-001..004, AppHeader)
2. **Read the test** to understand expected structure
3. **Implement minimal code** to make that test pass
4. **Run the test** — verify green
5. **Check off the task**, move to next test
6. **Repeat until all 26 tests pass** (20 integration + 6 E2E)

**Key principles:**
- One logical group at a time (AppHeader → DB queries → listPlayersFn → deletePlayerFn → UI)
- Minimal implementation — no over-engineering
- Follow architecture patterns from story dev notes
- Run `pnpm test` after each group to catch regressions

---

### REFACTOR Phase

After all 26 tests pass:
- Review `admin/index.tsx` for size/readability
- Verify import-protection pattern is consistent
- Ensure error messages are in French throughout
- Confirm `data-app-hydrated` pattern still present
- Update story status to `done` in `sprint-status.yaml`

---

## Knowledge Base References Applied

- **test-quality.md** — No hard waits, deterministic assertions, explicit expectations
- **selector-resilience.md** — `data-testid` hierarchy, `getByRole`, `getByTestId` for E2E
- **data-factories.md** — Throwaway player pattern in test 005 (`e2e_del_${Date.now()}`)
- **auth-session.md** — `storageState` reuse across E2E tests (existing global-setup pattern)
- **MEMORY.md** — Coupled assertions rule (A+B on same construction), `data-app-hydrated` pattern

---

## Notes

- **No schema changes** — No new tables or columns; `sessions.playerId` FK cascade already in place (verified by `[1.2-INT-003]`).
- **No `isGuest` filtering** — `getAllPlayers()` returns all players for now; story 1.7 adds the column and filter.
- **E2E test 005 creates a throwaway player** inline — no global-setup change needed. Player is deleted as part of the test.
- **`window.confirm()` in E2E** — Playwright's `page.on('dialog', ...)` handles native browser dialogs. Must be registered before the click that triggers the dialog.
- **`data-testid` selector for admin row** — Test `[1.6-E2E-006]` uses `.locator('..').filter({ hasText: 'e2e_admin' })` to find the parent container of delete buttons and asserts none contain admin's username. Adjust if row element type requires a more specific selector during GREEN phase.

---

**Generated by BMad TEA Agent** — 2026-03-13
