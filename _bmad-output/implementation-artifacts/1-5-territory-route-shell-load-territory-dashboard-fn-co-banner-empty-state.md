# Story 1.5: Territory Route Shell — `loadTerritoryDashboardFn` + `CoBanner` + Empty State

Status: review

## Story

As a player,
I want to tap the "Territoires" tab and land on a dashboard showing my CO balance in a sticky navy banner and an empty-state illustration with a "Configurer mes territoires" CTA button,
so that I have immediate feedback that the module is alive and know how to get started.

## Acceptance Criteria

1. **Route shell with explicit `validateSearch`** — `src/routes/territories.tsx` (currently a placeholder, see Dev Notes §Existing-state) is rewritten to:
   - export `createFileRoute('/territories')({ validateSearch, loader, component })` with the schema:
     ```ts
     const territorySearchSchema = z.object({
       tile: z.string().optional(),
       view: z.enum(['grid', 'history']).default('grid'),
       setup: z.number().optional(),
     })
     ```
   - the schema MUST live at module scope (not inline in `createFileRoute`) so it can be re-exported as `territorySearchSchema` for downstream consumers (Story 2.x will import it).
   - guest sessions and unauthenticated users MUST be redirected to `/login` via the route's `beforeLoad` (mirror the redirect pattern already in `src/routes/__root.tsx:34–45`). This story does NOT introduce a new route-level `authMiddleware` (TanStack Router routes use `beforeLoad`, not `createMiddleware`); auth on server functions is via `authMiddleware` from `src/lib/middleware.ts`.

2. **Server function `loadTerritoryDashboardFn`** — new file `src/server-fns/territory-queries.ts`:
   ```ts
   export const loadTerritoryDashboardFn = createServerFn({ method: 'GET' })
     .middleware([authMiddleware])
     .handler(async ({ context }): Promise<ServerResult<TerritoryDashboardData>> => { ... })
   ```
   - return type `TerritoryDashboardData = { coBalance: number; factionId: string; factionDisplayName: string; setupCompletedAt: string | null }` exported from the same file (ISO string for `setupCompletedAt`, NOT `Date` — Date is not serialisable through TanStack Start's RPC envelope).
   - Guest branch: if `context.session.isGuest`, return `{ success: false, error: { code: 'FORBIDDEN', message: 'Les invités ne peuvent pas accéder aux territoires' } }`. Do NOT bootstrap a territory for guests (they have no `players` row that could carry a CASCADE).
   - Player branch:
     1. Look up the player's army to get the canonical `factionId`. Reuse `getPlayerArmy(playerId)` from `src/db/queries`. If the player has no army, return `{ success: false, error: { code: 'NOT_FOUND', message: 'Aucune armée importée — importez une armée avant d\'accéder aux territoires' } }` (mirrors the existing "no army" UX gate).
     2. Look up the faction display name. Add a new query `getFactionById(factionId)` to `src/db/queries/factions.ts` (new file — there is currently no `factions.ts` in `src/db/queries/`; verified by `ls src/db/queries/`). Return shape: `{ id: string; name: string; displayName: string } | null`. Re-export from `src/db/queries/index.ts`. If the lookup returns null, return `{ success: false, error: { code: 'SERVER_ERROR', message: 'Faction introuvable' } }` — this would be a referential-integrity bug since `armies.faction` has a FK to `factions.id` (Story 1.1).
     3. Call `getOrCreatePlayerTerritory(session.playerId)` from `src/db/queries/territory.ts` (Story 1.4 helper) to lazily bootstrap the territory.
     4. Return `{ success: true, data: { coBalance: territory.coBalance, factionId: army.faction, factionDisplayName: faction.displayName, setupCompletedAt: territory.setupCompletedAt?.toISOString() ?? null } }`.
   - The handler MUST NOT import Drizzle tables or `db` directly — all DB access goes through `src/db/queries/*` per `architecture-territory/project-structure-boundaries.md#Architectural-Boundaries` (Data Access Boundary).
   - The handler MUST use the dynamic-import pattern for `db/queries` (mirror `src/server-fns/campaign-queries.ts:8`: `const { ... } = await import('../db/queries')`). This keeps the server-only modules out of the client bundle.

3. **TanStack Query options factory + STALE_TIME constant** — new file `src/integrations/territory-queries.ts` (per `architecture-territory/project-structure-boundaries.md`):
   ```ts
   import { queryOptions } from '@tanstack/react-query'
   import { STALE_TIME_TERRITORY } from '@/lib/query-constants'
   import { loadTerritoryDashboardFn, type TerritoryDashboardData } from '@/server-fns/territory-queries'
   import type { ServerResult } from '@/lib/types'

   export const territoryDashboardQueryOptions = (playerId: string) =>
     queryOptions<ServerResult<TerritoryDashboardData>>({
       queryKey: ['territory', playerId],
       queryFn: () => loadTerritoryDashboardFn(),
       staleTime: STALE_TIME_TERRITORY,
       enabled: !!playerId,
     })
   ```
   - Append `export const STALE_TIME_TERRITORY = 30_000` to `src/lib/query-constants.ts` (30 seconds, matches `architecture-territory/implementation-patterns-consistency-rules.md#Query-keys`). Do NOT modify the existing exports.
   - Query key is `['territory', playerId]` (literal array, per the Naming Patterns table). Do NOT use `['territory']` with no playerId — multi-tenant cache safety.

4. **Route loader bridges query options into the cache** — in `territories.tsx`:
   ```ts
   loader: async ({ context }) => {
     const { session } = context
     if (!session || session.isGuest) return null
     await context.queryClient.ensureQueryData(territoryDashboardQueryOptions(session.playerId))
     return null
   },
   ```
   - The `context.session` is available because `__root.tsx` populates it in `beforeLoad` (line 42–57). Do NOT re-fetch the session here — read it from `useRouteContext({ from: '__root__' })` in the component (mirror `__root.tsx:82`).
   - The loader returning `null` is intentional — the component reads from TanStack Query's cache via `useQuery(territoryDashboardQueryOptions(playerId))` so cache invalidation works without a full route reload.
   - `beforeLoad` redirect for unauthenticated/guest users runs BEFORE the loader (TanStack Router execution order). Loader assumes a non-guest session.

5. **`CoBanner` component** — new file `src/components/territory/CoBanner.tsx`:
   - Props: `{ coBalance: number; factionDisplayName: string; isFetching?: boolean }`. Default `isFetching = false`.
   - Layout (Tailwind classes only, no inline CSS — per `core-architectural-decisions.md#Frontend-Architecture` Technology Priority Rule):
     ```tsx
     <div className="sticky top-0 z-10 bg-[var(--color-brand-dark)] text-white px-4 py-3">
       <div className="max-w-[720px] mx-auto flex items-baseline justify-between gap-3">
         <div>
           <div className="text-xs uppercase tracking-wider opacity-70">Trésor royal</div>
           <div
             aria-live="polite"
             className="font-display text-3xl font-bold tabular-nums"
           >
             {coBalance.toLocaleString('fr-FR')} CO
             {isFetching && <span className="ml-2 inline-block h-2 w-2 animate-pulse rounded-full bg-white/60" aria-hidden />}
           </div>
           <div className="text-xs opacity-70 mt-0.5">{factionDisplayName}</div>
         </div>
         <div className="text-right text-xs opacity-70">
           <div>Revenu hebdo</div>
           <div className="font-mono text-base">—</div>
         </div>
       </div>
     </div>
     ```
   - The `var(--color-brand-dark)` token (#1e293b) is already defined in `src/styles/globals.css` per MEMORY.md "Palette validée v4.0".
   - The placeholder `—` for "Revenu hebdo" is documented as a TODO for Epic 5 (`generateWeeklyIncomeFn`) — add a single inline JSX comment `{/* TODO Epic 5: estimated weekly income */}` ABOVE the placeholder div. No other comments anywhere.
   - The component is a leaf, no `useQuery` inside — props-only. Parent (`TerritoriesView`) owns the query and passes `isFetching`.
   - shadcn primitives: there is no shadcn primitive for "banner" — the bare div is correct (custom domain component per `architecture-territory/component-strategy.md`). Do NOT add a shadcn `Card` wrapper just to "use shadcn".
   - WCAG: white text on `#1e293b` is ~16:1 contrast — well above AAA. Opacity `0.7` whites yield ~11:1, still AAA.

6. **Empty state** — when `setupCompletedAt === null`, the dashboard area below the `CoBanner` shows:
   ```tsx
   <div className="max-w-[720px] mx-auto px-4 py-12 text-center">
     <div aria-hidden className="mx-auto mb-4 text-5xl opacity-40">📜</div>
     <p className="font-body text-base text-[var(--color-text-primary)] mb-2">
       Configurez vos territoires pour commencer
     </p>
     <p className="font-body text-sm text-[var(--color-text-secondary)] mb-6">
       Importez votre solde actuel, vos tuiles, vos colonies et vos bâtiments
       pour démarrer le suivi de votre empire.
     </p>
     <button
       type="button"
       onClick={() => { /* TODO Epic 7: open setup wizard */ }}
       className="inline-flex items-center justify-center rounded-md bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
     >
       Configurer mes territoires
     </button>
   </div>
   ```
   - The button click handler is a no-op placeholder for Epic 7 (`territory-setup-wizard`). The TODO inline comment is the ONLY allowed comment in this block.
   - The illustration is a plain emoji (📜). Do NOT pull in an icon library or SVG asset for the MVP — keeps the bundle untouched.
   - When `setupCompletedAt !== null`, the empty state is NOT rendered. Instead, render a simple placeholder block:
     ```tsx
     <div className="max-w-[720px] mx-auto px-4 py-12 text-center text-[var(--color-text-secondary)]">
       Tableau de bord à venir (Epic 2 — tuiles).
     </div>
     ```
     This branch exists to prove the conditional logic works; Epic 2 replaces it with the tile grid. No comment needed beyond the JSX text.

7. **Loading and error states**:
   - **Initial load:** while the query is in flight (`status === 'pending'`), render `<div className="text-center py-8 text-[var(--color-text-secondary)]">Chargement…</div>` (matches the existing app pattern — grep for `Chargement` in `src/routes/` to confirm before deviating).
   - **Refetch:** subsequent fetches MUST NOT replace the dashboard with the loading text. Drive the small loading dot inside `CoBanner` from `query.isFetching && !query.isPending` (when both are true, the dashboard is in initial-load mode and the centered `Chargement…` is shown instead). This complies with `implementation-patterns-consistency-rules.md#CoBanner-localized-loading-state`.
   - **Server error (`success: false`):** render `<div className="text-center py-8 text-[var(--color-malus)]">{result.error.message}</div>`. Use `var(--color-malus)` (#b82c2c) — already defined per MEMORY.md palette.
   - **Network/throw error:** TanStack Query `query.error` — render the same `text-[var(--color-malus)]` block with `query.error.message`. Do NOT crash; do NOT throw to ErrorBoundary.

8. **Hydration marker for e2e parity** — the existing placeholder sets `data-app-hydrated="true"` on the html element via `useHydrated`. Preserve this exact pattern (mirror `src/routes/territories.tsx:13–19`) so e2e tests can wait on hydration. Do NOT switch to a different signal.

9. **No e2e (Playwright) test in this story** — `@playwright/test` is in `package.json` but no Playwright config, no `e2e/` directory, and no fixtures exist (verified: `find . -name "playwright.config.*"` returns 0 results, `e2e/` does not exist). Bootstrapping Playwright is OUT OF SCOPE for this story — it requires a separate epic-level decision (config + global-setup + auth fixtures + storageState directory). Document this explicitly in `_bmad-output/implementation-artifacts/deferred-work.md` under a new heading "Playwright E2E bootstrap (deferred from Story 1.5)" — append, do not rewrite the file. Coverage from vitest unit/integration tests is sufficient for Story 1.5: see AC #10.

10. **Tests** — three new test files, all under existing conventions:
   - **`src/server-fns/__tests__/territory-queries.test.ts`** (new directory `src/server-fns/__tests__/` — verified absent; create it). Integration test mirroring the boilerplate in `src/db/__tests__/factions-seed.test.ts:1–20` (Pool + drizzle + DATABASE_URL guard + `afterAll(pool.end())`). Setup helper inserts a throwaway `players` row with username `terr-q-test-${crypto.randomUUID()}`, an `armies` row with `faction = 'kingdom-of-bretonnia'` (canonical id seeded by Story 1.1). Cleanup in `afterAll` MUST surface delete failures (Story 1.3 review item — no `.catch(() => {})`).
     - **[1.5-INT-001][P0]** Calling `loadTerritoryDashboardFn` for a player with no territory yet returns `{ success: true, data: { coBalance: 0, factionId: 'kingdom-of-bretonnia', factionDisplayName: 'Royaume de Bretonnie', setupCompletedAt: null } }`. Single coupled assertion: `expect(result).toMatchObject({ success: true, data: { coBalance: 0, factionId: 'kingdom-of-bretonnia', setupCompletedAt: null } })`. **Note:** the handler relies on `getSession()`, which reads from a request cookie. Since the integration test cannot easily fake a TanStack Start request context, test the *handler logic* by extracting it into a pure helper `buildTerritoryDashboard(session: { playerId, isGuest, isAdmin })` exported from `territory-queries.ts` and calling that helper directly. The `createServerFn` wrapper itself (middleware + envelope) is NOT directly testable per `architecture-territory/implementation-patterns-consistency-rules.md#Testing-Strategy` ("`createServerFn` handlers are not directly unit-testable"). The exported helper is the seam.
     - **[1.5-INT-002][P0]** Second call for the same player returns the SAME `coBalance` and the existing territory id is reused (no second insert): `const count = (await db.select().from(playerTerritories).where(eq(playerTerritories.playerId, playerId))).length; expect(count).toBe(1)`.
     - **[1.5-INT-003][P0]** A player with no army returns `{ success: false, error: { code: 'NOT_FOUND', message: ... } }`. Single coupled assertion: `expect(result).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } })`. After the call, assert no `player_territories` row was created for that player (defensive — confirms early-exit before bootstrap): `expect((await db.select().from(playerTerritories).where(eq(playerTerritories.playerId, playerId))).length).toBe(0)`.
     - **[1.5-INT-004][P1]** A guest session returns `{ success: false, error: { code: 'FORBIDDEN' } }`. Pass `{ playerId: 'unused', isGuest: true, isAdmin: false }` to `buildTerritoryDashboard`. Single coupled assertion: `expect(result).toMatchObject({ success: false, error: { code: 'FORBIDDEN' } })`.
   - **`src/db/queries/__tests__/factions-query.test.ts`** (new file under existing `src/db/queries/__tests__/` — verify directory: `ls src/db/queries/__tests__` should exist after Story 1.1; if it doesn't, create it). Integration test for `getFactionById`:
     - **[1.5-QRY-001][P0]** `getFactionById('kingdom-of-bretonnia')` returns `{ id: 'kingdom-of-bretonnia', name: <english>, displayName: 'Royaume de Bretonnie' }` (single coupled assertion on id+displayName).
     - **[1.5-QRY-002][P1]** `getFactionById('does-not-exist')` returns `null`.
   - **`src/components/territory/__tests__/CoBanner.test.tsx`** (new directory `src/components/territory/__tests__/` — create it; verified `src/components/territory/` does not exist yet). Component test using `@testing-library/react` (already in scaffold per MEMORY.md):
     - **[1.5-UI-001][P1]** Renders `1 234 CO` formatted via `toLocaleString('fr-FR')` for `coBalance={1234}`. Single coupled assertion: `expect(screen.getByText(/1\s*234\s*CO/)).toBeInTheDocument()` (the `\s*` accommodates the ` ` narrow no-break space that `fr-FR` locale uses as thousands separator on Node 20+).
     - **[1.5-UI-002][P1]** Balance node has `aria-live="polite"`. Single coupled assertion: `expect(screen.getByText(/1\s*234\s*CO/).closest('[aria-live]')).toHaveAttribute('aria-live', 'polite')`.
     - **[1.5-UI-003][P1]** Faction display name is rendered: `expect(screen.getByText('Bretonniens')).toBeInTheDocument()` (use `factionDisplayName="Bretonniens"` to keep the assertion stable independent of the seed data).
     - **[1.5-UI-004][P2]** When `isFetching=true`, a pulsing dot is rendered with `aria-hidden`: `expect(container.querySelector('[aria-hidden].animate-pulse')).not.toBeNull()`.
     - **vitest config note:** `src/**/*.test.tsx` is already in the `include` glob per MEMORY.md vitest.config snippet. The new file will auto-discover. The `environment` is `'node'`, but `@testing-library/react` requires `jsdom` — confirm via the existing test `src/components/timeline-entry.test.tsx`: it must already be using `jsdom` (likely via `// @vitest-environment jsdom` directive at the top of the file). Mirror whatever pattern that file uses; if it uses a directive, add the same directive to `CoBanner.test.tsx`. If `vitest.config.ts` has been updated to per-file env overrides, follow that pattern instead.

11. **No type errors, no new lint failures, no new dependencies**:
   - `pnpm typecheck` — green.
   - `pnpm lint` — pre-existing failure in `src/lib/faction-resolver.ts` (Story 1.3 `no-irregular-whitespace`) remains; no new lint failures introduced.
   - `pnpm vitest run src/server-fns/__tests__/territory-queries.test.ts src/db/queries/__tests__/factions-query.test.ts src/components/territory/__tests__/CoBanner.test.tsx` — all green.
   - `pnpm vitest run` — total failure count unchanged (still the 3 pre-existing failures: `1.1-UNIT-006`, `3.3-QRY-008`, `4.1-QRY-007`).
   - `package.json` unchanged — no new deps. shadcn primitives are NOT pulled in for this story (no Sheet/Dialog/AlertDialog needed for the shell + empty state).

## Tasks / Subtasks

- [x] **Task 1: Add `STALE_TIME_TERRITORY` to query-constants** (AC: #3)
  - [x] Append `export const STALE_TIME_TERRITORY = 30_000 // 30 seconds` to `src/lib/query-constants.ts` (after `REFETCH_INTERVAL_CAMPAIGN_TIMELINE`). Do NOT touch existing exports.

- [x] **Task 2: Create `getFactionById` query + tests** (AC: #2, #10)
  - [x] Create `src/db/queries/factions.ts`:
    ```ts
    import { eq } from 'drizzle-orm'
    import { db } from '../index'
    import { factions } from '../schema'
    export type Faction = typeof factions.$inferSelect
    export async function getFactionById(id: string): Promise<Faction | null> {
      const rows = await db.select().from(factions).where(eq(factions.id, id)).limit(1)
      return rows[0] ?? null
    }
    ```
  - [x] Append `export * from './factions'` to `src/db/queries/index.ts`.
  - [x] Create `src/db/queries/__tests__/factions-query.test.ts` with the 2 assertions from AC #10. Boilerplate copied verbatim from `src/db/__tests__/factions-seed.test.ts:1–20` (Pool, drizzle, DATABASE_URL guard, `afterAll(pool.end())`). The factions table is already seeded by Story 1.1 — no additional setup needed; just call `getFactionById('kingdom-of-bretonnia')`.

- [x] **Task 3: Create `loadTerritoryDashboardFn` + extracted helper** (AC: #2, #10)
  - [x] Create `src/server-fns/territory-queries.ts`:
    ```ts
    import { createServerFn } from '@tanstack/react-start'
    import { authMiddleware } from '../lib/middleware'
    import type { ServerResult } from '../lib/types'
    import type { SessionData } from '../lib/auth'

    export type TerritoryDashboardData = {
      coBalance: number
      factionId: string
      factionDisplayName: string
      setupCompletedAt: string | null
    }

    // Extracted handler logic — directly unit-testable (the createServerFn wrapper is not).
    export async function buildTerritoryDashboard(
      session: SessionData,
    ): Promise<ServerResult<TerritoryDashboardData>> {
      if (session.isGuest) {
        return { success: false, error: { code: 'FORBIDDEN', message: 'Les invités ne peuvent pas accéder aux territoires' } }
      }
      const { getPlayerArmy, getFactionById, getOrCreatePlayerTerritory } = await import('../db/queries')
      const army = await getPlayerArmy(session.playerId)
      if (!army) {
        return { success: false, error: { code: 'NOT_FOUND', message: "Aucune armée importée — importez une armée avant d'accéder aux territoires" } }
      }
      const faction = await getFactionById(army.faction)
      if (!faction) {
        return { success: false, error: { code: 'SERVER_ERROR', message: 'Faction introuvable' } }
      }
      const territory = await getOrCreatePlayerTerritory(session.playerId)
      return {
        success: true,
        data: {
          coBalance: territory.coBalance,
          factionId: army.faction,
          factionDisplayName: faction.displayName,
          setupCompletedAt: territory.setupCompletedAt?.toISOString() ?? null,
        },
      }
    }

    export const loadTerritoryDashboardFn = createServerFn({ method: 'GET' })
      .middleware([authMiddleware])
      .handler(async ({ context }) => buildTerritoryDashboard(context.session))
    ```
  - [x] Create `src/server-fns/__tests__/territory-queries.test.ts` with the 4 INT assertions from AC #10. Real DB harness mirrors `src/db/__tests__/factions-seed.test.ts:1–20`. Use `crypto.randomUUID()` for usernames. Cleanup via `inArray` delete on collected player ids; surface failures (no `.catch`).

- [x] **Task 4: Create `CoBanner` component + tests** (AC: #5, #10)
  - [x] Create `src/components/territory/CoBanner.tsx` exactly per AC #5 layout (Tailwind only, no inline CSS).
  - [x] Create `src/components/territory/__tests__/CoBanner.test.tsx` with the 4 UI assertions from AC #10. Match the env directive used in `src/components/timeline-entry.test.tsx` (likely `// @vitest-environment jsdom`).

- [x] **Task 5: Create TanStack Query options factory** (AC: #3)
  - [x] Create `src/integrations/territory-queries.ts` per AC #3 snippet. The `enabled: !!playerId` guard prevents firing when guest path passes `''`.

- [x] **Task 6: Rewrite the route shell** (AC: #1, #4, #6, #7, #8)
  - [ ] Replace `src/routes/territories.tsx` with the full implementation:
    ```tsx
    import { createFileRoute, redirect, useRouteContext } from '@tanstack/react-router'
    import { useQuery } from '@tanstack/react-query'
    import { useEffect } from 'react'
    import { z } from 'zod'
    import { useHydrated } from '../lib/useHydrated'
    import { CoBanner } from '../components/territory/CoBanner'
    import { territoryDashboardQueryOptions } from '../integrations/territory-queries'

    export const territorySearchSchema = z.object({
      tile: z.string().optional(),
      view: z.enum(['grid', 'history']).default('grid'),
      setup: z.number().optional(),
    })

    export const Route = createFileRoute('/territories')({
      validateSearch: territorySearchSchema,
      beforeLoad: ({ context }) => {
        const session = (context as { session?: { isGuest: boolean } | null }).session
        if (!session) throw redirect({ to: '/login' })
        if (session.isGuest) throw redirect({ to: '/login' })
      },
      loader: async ({ context }) => {
        const session = (context as { session?: { playerId: string; isGuest: boolean } | null }).session
        if (!session || session.isGuest) return null
        await (context as { queryClient: import('@tanstack/react-query').QueryClient })
          .queryClient.ensureQueryData(territoryDashboardQueryOptions(session.playerId))
        return null
      },
      component: TerritoriesView,
    })

    function TerritoriesView() {
      const hydrated = useHydrated()
      useEffect(() => {
        if (hydrated) document.documentElement.setAttribute('data-app-hydrated', 'true')
      }, [hydrated])

      const { session } = useRouteContext({ from: '__root__' })
      const playerId = session && !session.isGuest ? session.playerId : ''
      const query = useQuery(territoryDashboardQueryOptions(playerId))

      if (query.isPending) {
        return <div className="text-center py-8 text-[var(--color-text-secondary)]">Chargement…</div>
      }
      if (query.error) {
        return <div className="text-center py-8 text-[var(--color-malus)]">{query.error.message}</div>
      }
      const result = query.data
      if (!result) return null
      if (!result.success) {
        return <div className="text-center py-8 text-[var(--color-malus)]">{result.error.message}</div>
      }
      const { coBalance, factionDisplayName, setupCompletedAt } = result.data
      const isFetching = query.isFetching && !query.isPending
      return (
        <main>
          <CoBanner coBalance={coBalance} factionDisplayName={factionDisplayName} isFetching={isFetching} />
          {setupCompletedAt === null ? (
            <div className="max-w-[720px] mx-auto px-4 py-12 text-center">
              <div aria-hidden className="mx-auto mb-4 text-5xl opacity-40">📜</div>
              <p className="font-body text-base text-[var(--color-text-primary)] mb-2">
                Configurez vos territoires pour commencer
              </p>
              <p className="font-body text-sm text-[var(--color-text-secondary)] mb-6">
                Importez votre solde actuel, vos tuiles, vos colonies et vos bâtiments pour démarrer le suivi de votre empire.
              </p>
              {/* TODO Epic 7: open setup wizard */}
              <button
                type="button"
                onClick={() => { /* placeholder */ }}
                className="inline-flex items-center justify-center rounded-md bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                Configurer mes territoires
              </button>
            </div>
          ) : (
            <div className="max-w-[720px] mx-auto px-4 py-12 text-center text-[var(--color-text-secondary)]">
              Tableau de bord à venir (Epic 2 — tuiles).
            </div>
          )}
        </main>
      )
    }
    ```
  - [x] Verify with the dev server: `pnpm dev`, log in as a non-guest user with an imported army, navigate to `/territories`. CoBanner shows balance `0 CO`, faction display name, empty-state CTA visible. Clicking the CTA does nothing (placeholder). Refreshing the page does NOT show "Chargement…" if cache is fresh; subsequent navigations re-render from cache. Manually inspect: no inline `style` attributes, only Tailwind classes (grep with `git diff src/routes/territories.tsx | grep "style="` should be empty).

- [x] **Task 7: Defer Playwright bootstrap to a future story** (AC: #9)
  - [x] Append the following entry to `_bmad-output/implementation-artifacts/deferred-work.md`:
    ```markdown
    ## Playwright E2E bootstrap (deferred from Story 1.5)
    ...
    ```
  - [x] Do NOT create any `e2e/` files or `playwright.config.*` in this story.

- [x] **Task 8: Verification** (AC: #11)
  - [x] `pnpm typecheck` — green.
  - [x] `pnpm lint` — only pre-existing `faction-resolver.ts` failure remains.
  - [x] `pnpm vitest run src/server-fns/__tests__/territory-queries.test.ts src/db/queries/__tests__/factions-query.test.ts src/components/territory/__tests__/CoBanner.test.tsx` — all green.
  - [x] `pnpm vitest run` — total failure count unchanged (3 pre-existing).
  - [x] `pnpm dev` smoke (described in Task 6 verification step).

## Dev Notes

### Existing-state references

- **Placeholder route:** `src/routes/territories.tsx` (45 lines) — uses inline `style` attributes (legacy from earlier scaffolding; Tailwind v4 + tokens are the current convention). The `useHydrated` + `data-app-hydrated` setattr pattern at lines 13–19 MUST be preserved verbatim.
- **`src/components/territory/` directory does not yet exist** — verified via `ls`. Create it with the new files. This is the first story to populate it.
- **`src/server-fns/__tests__/` directory does not yet exist** — verified via `ls src/server-fns/__tests__` (errored). Create it as part of Task 3.
- **`src/db/queries/factions.ts` does not exist** — `src/db/queries/` currently contains `armies.ts evolutions.ts index.ts matches/ players.ts territory.ts units.ts` (territory.ts added by Story 1.4). No symbol conflict.
- **`STALE_TIME_TERRITORY` is not defined** — `src/lib/query-constants.ts` currently exports SESSION, UNIT_DELTAS, CAMPAIGN_TIMELINE, REFETCH_INTERVAL_CAMPAIGN_TIMELINE only.

### Architecture compliance

- **Naming** ([Source: architecture-territory/implementation-patterns-consistency-rules.md#Naming-Patterns]):
  - Server function `loadTerritoryDashboardFn` — camelCase + `Fn` suffix ✓
  - Component `CoBanner` — PascalCase file + export ✓
  - Query key `['territory', playerId]` — literal array ✓
  - Search params `tile`, `view`, `setup` — camelCase ✓
- **Auth boundary** ([Source: core-architectural-decisions.md#Authentication-Security]): "ownership implicit via `session.playerId` — `player_territories` is 1:1 with players. All territory server functions use `authMiddleware` only." This story respects the rule — `authMiddleware` only, no new ownership middleware. The 1:1 enforcement is the DB unique index from Story 1.4.
- **Data Access Boundary** ([Source: project-structure-boundaries.md#Architectural-Boundaries]): "All DB access goes through `src/db/queries/territory.ts` — server functions NEVER import Drizzle tables directly." `loadTerritoryDashboardFn` MUST go through `getOrCreatePlayerTerritory`, `getPlayerArmy`, `getFactionById`. NEVER `import { playerTerritories, armies, factions } from '@/db/schema'` in `territory-queries.ts`.
- **Route search params** ([Source: implementation-patterns-consistency-rules.md#Route-search-params]): "Without explicit `validateSearch`, search params are `unknown` at runtime — type errors in components." The Zod schema is mandatory and MUST be exported (downstream stories like 2.5 will import the same schema for tile-expand state).
- **Localized loading** ([Source: implementation-patterns-consistency-rules.md#Process-Patterns]): "After every CO mutation, the CoBanner MUST show a localized loading indicator. Never trigger a full-page reload or global loading state. Use TanStack Query's `isFetching`." This story implements the pattern via the pulsing-dot prop on `CoBanner`. No CO mutation exists yet — the pattern is exercised when the cache refreshes.
- **`withCoTransaction` is NOT in scope** ([Source: implementation-patterns-consistency-rules.md#Format-Patterns]): the shared CO-transaction utility lands in Story 3.2. This story does NOT mutate `co_balance` (the lazy bootstrap inserts a row with default `0`). Resist the urge to pre-stub it.

### Library / framework requirements

- **TanStack Router beforeLoad redirect:** mirror the `__root.tsx:34–45` pattern. The `context` argument shape inside route `beforeLoad` and `loader` is the union of root `beforeLoad` returns + `MyRouterContext` (queryClient). Cast via `as { session?: ... }` at the top of the function — TypeScript can't infer cross-route context shapes without `RouterContext` discriminators (this is a known TanStack Router pain point; the cast is the project convention until/unless typed routes are introduced).
- **TanStack Start `createServerFn`:** identical pattern to existing handlers in `src/server-fns/campaign-queries.ts` and `src/lib/server-fns/player-import-army.ts`. The `.middleware([authMiddleware])` line is mandatory. Dynamic-import the `db/queries` namespace (do NOT static-import) to keep server modules out of the client bundle.
- **TanStack Query 5.x:** `queryOptions` is the documented options factory. The query key MUST be a literal array. Stale time `30_000` (30s) per architecture spec.
- **Zod v4 (already installed):** the search schema uses `z.enum`, `z.string().optional()`, `z.number().optional()`. No new Zod APIs required. Do NOT pull `@tanstack/zod-form-adapter` — per MEMORY.md, that package is obsolete; Zod v4 plugs into TanStack Form natively via Standard Schema (not relevant to this story but worth knowing for Epic 7).
- **`@testing-library/react` + jsdom:** already in scaffold per MEMORY.md TanStack CLI notes. Use the existing pattern from `src/components/timeline-entry.test.tsx`. Do NOT add `happy-dom` or any other DOM env.
- **shadcn/ui:** no shadcn primitives needed for this story (no Sheet/Dialog/AlertDialog/Select/Input). Architecture allows custom domain components when no primitive fits ([Source: core-architectural-decisions.md#Frontend-Architecture] Technology Priority Rule). `CoBanner` is a domain component — `Card` would be wrong (it's not a card; it's a sticky banner).
- **No new dependencies.** `package.json` unchanged.

### File structure

```
src/
├── routes/
│   └── territories.tsx                                          ← MODIFIED (Task 6) — full rewrite of placeholder
├── server-fns/
│   ├── territory-queries.ts                                     ← NEW (Task 3) — buildTerritoryDashboard + loadTerritoryDashboardFn
│   └── __tests__/
│       └── territory-queries.test.ts                            ← NEW (Task 3) — 4 INT-* tests
├── components/
│   └── territory/
│       ├── CoBanner.tsx                                         ← NEW (Task 4)
│       └── __tests__/
│           └── CoBanner.test.tsx                                ← NEW (Task 4) — 4 UI-* tests
├── db/queries/
│   ├── factions.ts                                              ← NEW (Task 2) — getFactionById
│   ├── index.ts                                                 ← MODIFIED (Task 2) — append export
│   └── __tests__/
│       └── factions-query.test.ts                               ← NEW (Task 2) — 2 QRY-* tests
├── integrations/
│   └── territory-queries.ts                                     ← NEW (Task 5) — TanStack Query options factory
└── lib/
    └── query-constants.ts                                       ← MODIFIED (Task 1) — append STALE_TIME_TERRITORY

_bmad-output/implementation-artifacts/
└── deferred-work.md                                             ← MODIFIED (Task 7) — append Playwright bootstrap entry
```

**Do NOT create:** `e2e/*`, `playwright.config.*`, `src/server-fns/territory-mutations.ts`, `src/server-fns/territory-economy.ts`, any other component under `src/components/territory/` (TileCard, BuildingSlot, etc. — all reserved for later epics), nor any setup-wizard component.

### Testing requirements

- **Test DB harness:** copy boilerplate from `src/db/__tests__/factions-seed.test.ts:1–20` (Pool, drizzle, DATABASE_URL guard, `afterAll(pool.end())`). Inline — do NOT extract a helper module yet.
- **Assertion-coupling rule (MEMORY.md) — MANDATORY.** Every assertion that ties two facts MUST be a single coupled expression. The "wrong-faction-still-passes" foot-gun:
  ```ts
  // ❌ BAD — passes if any successful result is returned, even with wrong faction
  expect(result.success).toBe(true)
  expect(result.data.factionId).toBe('kingdom-of-bretonnia')

  // ✅ GOOD — couples success branch + factionId in one assertion
  expect(result).toMatchObject({ success: true, data: { factionId: 'kingdom-of-bretonnia' } })
  ```
- **Cleanup discipline:** `afterAll` deletes MUST surface failures (`inArray` delete with no `.catch(() => {})`). Story 1.3 review explicitly flagged this; Story 1.4 followed the rule. Do not regress.
- **`fr-FR` locale narrow no-break space (Node 20+):** `(1234).toLocaleString('fr-FR')` returns `'1 234'` (narrow no-break space, U+202F), NOT `'1 234'` with a regular space. The CoBanner text test MUST use `/1\s*234\s*CO/` regex (the `\s*` matches ` `). Hard-coded string equality `'1 234 CO'` would fail on Node 20+. Verify locally with `node -e "console.log(JSON.stringify((1234).toLocaleString('fr-FR')))"`.
- **`@vitest-environment jsdom` directive:** required at the top of `CoBanner.test.tsx` because the project's vitest.config has `environment: 'node'` (per MEMORY.md). Verify by checking the directive on `src/components/timeline-entry.test.tsx` and copying it. Without the directive, `screen` and DOM queries throw "document is not defined".

### Previous story intelligence

**Story 1.4** (`player_territories` table + lazy bootstrap):
- `getOrCreatePlayerTerritory(playerId)` is the helper to call. Returns `PlayerTerritory` with `coBalance: 0`, `lastIncomeWeek: 0`, `setupCompletedAt: null` on first call.
- `setupCompletedAt` is a `Date | null` from the schema. Convert with `.toISOString() ?? null` before placing in the `ServerResult` envelope (Date is not RPC-serialisable).
- The helper is in `src/db/queries/territory.ts`, re-exported from `@/db/queries` index.
- The integration test pattern uses `crypto.randomUUID()` for unique usernames + `inArray` for cleanup. Copy the exact harness.

**Story 1.3** (faction resolver):
- `.catch(() => {})` in `afterAll` was a code-review reject. Surface delete failures.
- The `faction-resolver.ts` `no-irregular-whitespace` lint failure is pre-existing and out of scope.

**Story 1.2** (faction config):
- `FACTION_CONFIGS` exports faction rules but is NOT used by this story (Epic 2+ surfaces it). The `factionDisplayName` for the banner comes from the DB `factions.display_name` column (Story 1.1 seed), NOT from `FACTION_CONFIGS`. Two sources, one canonical: the DB is authoritative for display strings; the config is authoritative for rules. They cross-check via shared `id`.

**Story 1.1** (factions table + backfill):
- `factions` table seeded with 18 rows. `kingdom-of-bretonnia` / `Royaume de Bretonnie` is one of them — safe to use as the test fixture's army faction.
- `armies.faction` FK uses `ON DELETE RESTRICT`. The test must clean up the army before the player to avoid a CASCADE chain hitting `armies` from `players` deletion (player → armies SET NULL is the rule per `armies` schema line 75: `playerId.references(() => players.id, { onDelete: 'set null' })`). Verify the cleanup order in the integration test.

### Git intelligence summary

Recent commits:
- `40e12c1 story 1.4: player_territories table + lazy bootstrap helper` — most recent. Provides `getOrCreatePlayerTerritory`. Static-SQL test pattern + integration-test pattern both established.
- `bf9db9c story 1.3: canonical faction resolver wired into OWB import` — establishes `armies.faction` is now a canonical FK value. Safe to read directly into `factionId` without re-mapping.
- `03cf754 story 1.2: faction-config module + 18-faction registry` — `FACTION_CONFIGS` typed by `CanonicalFactionId` from the seeds module.
- `a31a82e cleanup: remove obsolete test-artifacts scaffolding` — unrelated.
- `dba3e22 story 1.1: factions table + backfill armies.faction FK` — `factions.display_name` is the source of truth for `factionDisplayName`.

### Latest tech information

- **TanStack Router v1 (current — already installed):** `beforeLoad` is sync-or-async, runs before `loader`. `redirect({ to: '/login' })` is the canonical guard pattern. `useRouteContext({ from: '__root__' })` reads the parent context — typed safely.
- **TanStack Query v5 (already installed):** `queryOptions` is the recommended factory shape. `useQuery(options)` works without explicit `select`. `query.isPending` (not `isLoading`) is the v5 first-load flag; `isFetching` is true on every refetch. The CoBanner pulse uses `isFetching && !isPending`.
- **TanStack Start (already installed):** `createServerFn({ method: 'GET' }).middleware([authMiddleware]).handler(...)` — identical to existing usage. The `.middleware([])` chaining returns a builder; do NOT use `.middleware(authMiddleware)` (single arg, not array — would be a type error).
- **Sentry:** the `RootErrorComponent` already captures uncaught errors via `Sentry.captureException`. This story's component-level error handling (`query.error` rendering) prevents errors from bubbling up — that's intentional. No additional Sentry calls needed.

### Project context reference

- **MEMORY.md — assertion-coupling rule:** MANDATORY for every test in this story (see Testing requirements §Assertion-coupling rule above and Story 1.3 review history).
- **MEMORY.md — Tailwind v4 + tokens chain:** `src/styles.css` imports `./styles/globals.css`; tokens like `--color-brand-dark`, `--color-malus`, `--color-text-primary`, `--color-text-secondary`, `--color-bg`, `--color-surface`, `--color-brand` are all defined there. Use `bg-[var(--color-brand-dark)]` / `text-[var(--color-malus)]` Tailwind arbitrary-value syntax — no new tokens needed.
- **MEMORY.md — TanStack Form note:** does NOT apply to this story (no form). Reserved for Epic 7 wizard.
- **MEMORY.md — env var guard pattern:** the existing `src/db/index.ts` enforces `if (!DATABASE_URL) throw`. The new test files MUST replicate the same guard at the top (mirror `factions-seed.test.ts:11–13`).
- **MEMORY.md — TanStack CLI scaffold notes:** scaffold already done; no relevance here.
- **Story files location:** `_bmad-output/implementation-artifacts/<key>.md` ✓.

### References

- [Source: `_bmad-output/planning-artifacts/epics/epic-1-territory-foundation-faction-recognition.md#Story-1.5`] — full ACs and business context.
- [Source: `_bmad-output/planning-artifacts/architecture-territory/core-architectural-decisions.md#Authentication-Security`] — ownership via `session.playerId`, no new middleware.
- [Source: `_bmad-output/planning-artifacts/architecture-territory/core-architectural-decisions.md#Frontend-Architecture`] — Technology Priority Rule (TanStack first, Tailwind only, shadcn first).
- [Source: `_bmad-output/planning-artifacts/architecture-territory/implementation-patterns-consistency-rules.md#Naming-Patterns`] — server-fn / component / query-key naming.
- [Source: `_bmad-output/planning-artifacts/architecture-territory/implementation-patterns-consistency-rules.md#Route-search-params`] — explicit Zod `validateSearch`.
- [Source: `_bmad-output/planning-artifacts/architecture-territory/implementation-patterns-consistency-rules.md#Process-Patterns`] — CoBanner localized loading state.
- [Source: `_bmad-output/planning-artifacts/architecture-territory/implementation-patterns-consistency-rules.md#Testing-Strategy`] — `createServerFn` handlers not directly unit-testable; extract pure helpers.
- [Source: `_bmad-output/planning-artifacts/architecture-territory/project-structure-boundaries.md#Architectural-Boundaries`] — Data Access Boundary (no direct schema imports in server-fns).
- [Source: `_bmad-output/planning-artifacts/ux-design-specification-territory.md#Component-Strategy`] — `CoBanner` purpose, content, states.
- [Source: `_bmad-output/planning-artifacts/ux-design-specification-territory.md#Empty-States-Loading`] — empty-state copy and "Chargement…" centered text convention.
- [Source: `_bmad-output/implementation-artifacts/1-4-db-migration-player-territories-table-lazy-bootstrap.md`] — `getOrCreatePlayerTerritory` contract, lazy-bootstrap behaviour.
- [Source: `_bmad-output/implementation-artifacts/1-3-owb-import-script-canonical-faction-detection-and-assignment.md#Review-Findings`] — `.catch(() => {})` anti-pattern.
- [Source: `src/routes/__root.tsx:34–58, 82, 88`] — `beforeLoad` redirect, `useRouteContext`, session-from-context pattern.
- [Source: `src/server-fns/campaign-queries.ts:1–8`] — `createServerFn` + dynamic-import `db/queries` pattern.
- [Source: `src/lib/middleware.ts:16–22`] — `authMiddleware` definition; do NOT redefine.
- [Source: `src/lib/types.ts:1–11`] — `ServerResult<T>` and `ErrorCode` union.
- [Source: `src/lib/auth.ts:14–22`] — `SessionData` type (`playerId`, `isGuest`, `isAdmin`).
- [Source: `src/lib/session-queries.ts:43–50`] — `queryOptions` factory pattern.
- [Source: `src/db/__tests__/factions-seed.test.ts:1–20`] — integration-test boilerplate to copy.
- [Source: `src/db/queries/players.ts`] — query module pattern (Drizzle `select` + `eq` + `limit(1)` returning `rows[0] ?? null`).
- [Source: `src/db/schema.ts:53–69`] — `factions` and `playerTerritories` table definitions.
- [Source: `src/components/timeline-entry.test.tsx`] — existing component-test env directive pattern.

### Project Structure Notes

- All new files land in greenfield directories within established conventions. No conflicts with existing modules.
- `src/integrations/territory-queries.ts` is a NEW location — verify `src/integrations/` exists (`ls src/integrations/` should show `tanstack-query/` at minimum). If only the `tanstack-query/` subfolder exists, the new file at `src/integrations/territory-queries.ts` is fine alongside it (per `architecture-territory/project-structure-boundaries.md`).
- `src/db/queries/__tests__/` may not exist as a directory yet (Stories 1.1–1.4 placed DB tests under `src/db/__tests__/`, not `src/db/queries/__tests__/`). **Decision:** put `factions-query.test.ts` under `src/db/__tests__/factions-query.test.ts` (existing directory) to stay consistent with the existing test layout. Update Task 2 path accordingly.
- The route component currently uses inline `style={{ ... }}` on the placeholder. The rewrite removes ALL inline styles in favour of Tailwind classes — this is a deliberate cleanup, not a regression (architecture mandate: Tailwind only).
- No changes to `tsconfig.json`, `vitest.config.ts`, `eslint.config.js`, `package.json`, `drizzle.config.ts`, `drizzle/*`. No new migration in this story.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Lint TER-006: `fontFamily...display` regex failed because the new route uses Tailwind classes, not inline styles. Updated the test to match the actual new implementation (CoBanner import).
- Lint fix: `import()` type annotation in loader → extracted `import type { QueryClient }` at file top.
- Lint fix: `no-unnecessary-condition` on `if (!result)` — TQ v5 discriminated union guarantees `data` is defined after `isPending` + `error` checks; removed the redundant guard.
- Lint fix: `no-non-null-assertion` in test — replaced `rows[0]!.id` with explicit guard + throw.
- Tests `src/routes/__tests__/-territories.test.tsx` (story 3.1b) — 7 tests verified the old placeholder content. Updated to match the new story 1.5 implementation (CoBanner import, query options, empty state CTA, `loader: async`, Tailwind classes).

### Completion Notes List

- `getFactionById` query created in `src/db/queries/factions.ts`, re-exported via index.
- `buildTerritoryDashboard` extracted as a pure, testable helper in `src/server-fns/territory-queries.ts`. The `loadTerritoryDashboardFn` is a thin wrapper calling it via `authMiddleware`.
- `CoBanner` component: Tailwind-only, sticky navy banner, `aria-live="polite"` on balance, pulsing dot when `isFetching`, locale-formatted CO balance.
- `territories.tsx` fully rewritten: `validateSearch` with exported `territorySearchSchema`, `beforeLoad` guest redirect, `loader` seeding TQ cache, component with loading/error/empty-state/placeholder-grid branches.
- `src/routes/__tests__/-territories.test.tsx` updated (story 3.1b placeholder tests) to reflect the new route implementation.
- 10 new tests added: 2 QRY, 4 INT, 4 UI — all green. 3 pre-existing failures unchanged.
- `deferred-work.md` updated with Playwright bootstrap deferral entry.

### File List

- `src/lib/query-constants.ts` — modified (added STALE_TIME_TERRITORY)
- `src/db/queries/factions.ts` — new
- `src/db/queries/index.ts` — modified (added factions re-export)
- `src/db/__tests__/factions-query.test.ts` — new (2 tests: QRY-001, QRY-002)
- `src/server-fns/territory-queries.ts` — new (buildTerritoryDashboard + loadTerritoryDashboardFn)
- `src/server-fns/__tests__/territory-queries.test.ts` — new (4 tests: INT-001..004)
- `src/components/territory/CoBanner.tsx` — new
- `src/components/territory/__tests__/CoBanner.test.tsx` — new (4 tests: UI-001..004)
- `src/integrations/territory-queries.ts` — new (territoryDashboardQueryOptions)
- `src/routes/territories.tsx` — modified (full rewrite of placeholder)
- `src/routes/__tests__/-territories.test.tsx` — modified (updated 7 tests from placeholder to new implementation)
- `_bmad-output/implementation-artifacts/deferred-work.md` — modified (Playwright bootstrap entry)

## Change Log

- 2026-04-25: Story implemented by claude-sonnet-4-6. Added getFactionById query, buildTerritoryDashboard helper + server fn, CoBanner component, territory query options factory, rewritten territories route with validateSearch/beforeLoad/loader/component. 10 new tests (2 QRY, 4 INT, 4 UI), all green. Updated 7 stale placeholder tests from story 3.1b. Playwright bootstrap deferred to a future story.
