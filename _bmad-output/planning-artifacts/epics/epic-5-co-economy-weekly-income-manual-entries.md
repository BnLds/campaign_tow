# Epic 5 — CO Economy: Weekly Income & Manual Entries

**Goal:** Deliver the CO economy heartbeat — automatic weekly income generation (idempotent, cron-driven) and manual income/expense entries. After this epic, players see their CO balance grow each week from tiles + buildings + faction modifiers, and can record arbitrary one-off adjustments (gifts, penalties, corrections) through a Sheet-based UI with AlertDialog confirmation. Every CO movement flows through the `withCoTransaction` utility and lands in `co_transactions` for full auditability.

**Scope:** FR22, FR23, FR24, FR25, FR26, FR27, FR28, FR30.
**NFRs:** NFR2 (<2s income calculation), NFR9 (income idempotence per week).
**UX-DRs:** UX-DR12 (IncomeBreakdown component), UX-DR14 (AlertDialog for CO mutations), UX-DR23 (blocked action toast).

## Story 5.1 — `campaign_settings` Table & Weekly Cron Endpoint

**As** a campaign operator
**I want** a persisted campaign week counter with an authenticated cron endpoint to advance it
**So that** the server has a single source of truth for "the current week" and a secure way for the VPS cron to tick it forward every Monday

**Acceptance Criteria:**

**Given** the Drizzle schema in `src/db/schema.ts`
**When** Story 5.1 is complete
**Then** a new `campaign_settings` table exists with columns: `id` (integer PK, always 1 — single-row pattern), `campaign_week` (integer, default 1, not null), `campaign_started_at` (timestamp, not null, default `now()`), `updated_at` (timestamp, not null, default `now()`)
**And** a seed inserts the singleton row (`id=1, campaign_week=1`) if absent — idempotent so re-running the seed does nothing
**And** a query helper `getCampaignWeek()` returns the current week as a number, memoised per request via TanStack Query key `['campaign-week']` with `staleTime: 60_000`

**Given** the cron endpoint
**When** `POST /api/cron/advance-week` is called with header `X-Cron-Secret: <env.CRON_SECRET>`
**Then** the endpoint increments `campaign_week` by 1 atomically (`UPDATE … SET campaign_week = campaign_week + 1, updated_at = now() WHERE id = 1`), returns `{ ok: true, newWeek: <n> }` with 200
**And** requests without the header or with a wrong secret return 401 with no side effect
**And** the endpoint invokes `generateWeeklyIncomeFn` (Story 5.3) for every player in `player_territories` inside the same response — the endpoint returns the per-player result summary `[{ playerId, amount, skipped }]`
**And** the handler is exported from a route file (TanStack Start server route, NOT a `createServerFn`) so that the VPS cron can hit it via plain `curl`

**Given** integration tests
**When** they run
**Then** a test asserts the seed is idempotent (run twice, still one row)
**And** a test asserts the cron endpoint rejects missing/wrong secret (401)
**And** a test asserts the cron endpoint increments the week and returns the new value

## Story 5.2 — `calculateWeeklyIncome` Pure Library

**As** the CO economy engine
**I want** a pure, side-effect-free function that computes a player's weekly CO income from their territory state
**So that** both the cron-driven generation (Story 5.3) and the UI preview (Story 5.4) share the same math and stay trivially testable

**Acceptance Criteria:**

**Given** the file `src/lib/income-calc.ts`
**When** Story 5.2 is complete
**Then** it exports a pure function `calculateWeeklyIncome(snapshot: TerritorySnapshot): IncomeBreakdown` where `TerritorySnapshot` contains `{ playerId, factionId, tiles: TileWithBuildings[] }` and `IncomeBreakdown` is `{ total: number, lines: IncomeLine[] }` with each `IncomeLine = { source: 'tile' | 'building' | 'faction_bonus', tileId, label, amount }`
**And** the function takes NO database connection — callers pass a pre-loaded snapshot so the function is 100% testable without mocks
**And** the function iterates tiles, adds each tile's base income (from `TILE_CATALOG` in Story 2.2), adds each building's income delta (farm +20, scierie +30, mine +40, faction buildings per `BUILDING_CATALOG`), and applies faction-specific bonuses:
  - **Grand Cathay:** +10 CO for each `plaine_fluviale` tile adjacent to a Cathay **city** (using the existing adjacency helper if present, or a TODO stub with a unit test that asserts the rule is applied when the helper lands)
  - **Wood Elves Bosquet Sacré:** replaces scierie income (+40 instead of +30) — handled via the building catalog definition, no special case needed in the calc
  - **Daemons of Chaos Portal / Major Portal:** +40 / +80 CO contributed as building income
  - **Marauders / Warriors of Chaos:** no weekly income modifier (pillage rule is battle-resolution, not weekly)

**Given** tiles with zero buildings
**When** income is calculated
**Then** each tile contributes exactly its base income (e.g., plaine 30, forêt 50, marais 20)
**And** the total matches the sum of lines byte-for-byte (invariant test)

**Given** unit tests in `src/lib/income-calc.test.ts`
**When** they run
**Then** at least one test covers: empty territory (total = 0), vanilla plaine village (30), plaine with 2 farms (30 + 40 = 70), Daemon player with 3 Portals + 1 Major Portal (40*3 + 80 = 200), Wood Elf forest village with Bosquet Sacré (50 + 40 = 90, no scierie)
**And** a test measures execution time with 50 tiles + 150 buildings and asserts it runs in under 50ms (covers NFR2 — the full server-side generation has plenty of headroom under the 2s budget)

## Story 5.3 — `generateWeeklyIncomeFn` Idempotent Server Function

**As** the server
**I want** a server function that generates one player's weekly income, refusing to double-generate within the same week
**So that** re-running the cron, manually retrying, or racing cron + cron never produces duplicate CO credits

**Acceptance Criteria:**

**Given** the file `src/server/territory-economy.ts`
**When** Story 5.3 is complete
**Then** it exports `generateWeeklyIncomeFn = createServerFn({ method: 'POST' }).validator(z.object({ playerId: z.string().uuid() })).middleware([authMiddleware]).handler(…)` returning `ServerResult<{ amount: number, week: number, skipped: boolean }>`
**And** the handler loads the current `campaign_week`, loads the player's full territory snapshot (tiles + buildings), calls `calculateWeeklyIncome`, then inside `db.transaction()` calls `withCoTransaction(tx, { playerId, type: 'income_generation', amount: total, metadata: { week, lines } })`
**And** idempotence is enforced via a check inside the transaction: `SELECT 1 FROM co_transactions WHERE player_id = $1 AND type = 'income_generation' AND (metadata->>'week')::int = $2 LIMIT 1 FOR UPDATE` — if a row exists, the handler short-circuits and returns `{ amount: 0, week, skipped: true }` without mutating balance
**And** a partial unique index on `co_transactions ((player_id), ((metadata->>'week')::int)) WHERE type = 'income_generation'` is added via Drizzle migration as a belt-and-braces guarantee against race conditions — if the insert ever violates the index (because two parallel transactions slipped past the SELECT), the handler catches the unique violation and returns the same `skipped: true` result
**And** the transaction uses `isolation level serializable` for weekly income inserts

**Given** the UI calls `generateWeeklyIncomeFn` for a player who already received income this week
**When** the response returns `skipped: true`
**Then** the UI shows a toast "Revenu déjà généré pour la semaine {week}" using the shadcn `Sonner` toaster (UX-DR23)
**And** the query cache for `['territory', playerId]` and `['territory-history', playerId]` is NOT invalidated (no state changed)

**Given** integration tests against real PostgreSQL
**When** they run
**Then** a test seeds 1 player with 3 plaines + 2 farms (income = 3*30 + 2*20 = 130), calls `generateWeeklyIncomeFn` twice in the same week, asserts first call returns `{ amount: 130, skipped: false }` and second returns `{ amount: 0, skipped: true }`, and asserts `co_transactions` has exactly one row of type `income_generation` for that player-week
**And** a test increments the campaign week (via direct SQL to simulate the cron), calls the function again, and asserts a new row is inserted with `amount = 130` for the new week
**And** a test runs two `generateWeeklyIncomeFn` calls in parallel via `Promise.all` for the same player-week and asserts exactly one succeeds and one returns `skipped: true` (the race-condition guarantee)

## Story 5.4 — `IncomeBreakdown` Component & CoBanner Preview

**As** Thomas checking his territory
**I want** to see a preview of my estimated weekly income broken down by source
**So that** I can reason about my economy before the cron ticks the week forward

**Acceptance Criteria:**

**Given** the file `src/components/territory/IncomeBreakdown.tsx`
**When** Story 5.4 is complete
**Then** the component accepts `{ breakdown: IncomeBreakdown }` (the shape returned by `calculateWeeklyIncome`) and renders a titled section "Revenu hebdomadaire estimé" with a right-aligned total in navy Cinzel
**And** below the total, a collapsed-by-default list groups lines by tile, each showing `{tile name/type}` → `{amount} CO` with building contributions nested under their tile as secondary lines
**And** the component uses a shadcn `Collapsible` with a chevron toggle — default collapsed on mobile, expanded on ≥ md breakpoints
**And** a `Skeleton` is shown while the snapshot query is pending (UX-DR12)

**Given** the `CoBanner` sticky header
**When** Story 5.4 is complete
**Then** the banner is extended to display the estimated weekly income next to the current balance in a smaller secondary font, format "+{n} CO / sem."
**And** tapping the secondary income figure opens a bottom Sheet containing the full `IncomeBreakdown` component
**And** the banner subscribes to the `['territory', playerId]` query — the income preview updates automatically when tiles/buildings change (no manual refresh)

**Given** a server function `getIncomePreviewFn({ playerId })`
**When** it is added alongside the existing territory queries
**Then** it loads the same snapshot used by `generateWeeklyIncomeFn` and returns `calculateWeeklyIncome(snapshot)` WITHOUT mutating any state or writing to `co_transactions`
**And** the result is cached under the `['territory', playerId, 'income-preview']` query key with `staleTime: 30_000`

**Given** component tests with Vitest + Testing Library
**When** they run
**Then** a test renders `IncomeBreakdown` with a fixture containing 2 tiles + 3 buildings and asserts the total matches the fixture's expected sum and each line is visible after expanding the collapsible
**And** a test asserts the Skeleton renders when `breakdown` is undefined

## Story 5.5 — Manual Income & Expense Entries

**As** Thomas recording a one-off adjustment (gift from a faction event, penalty from a scenario, correction of a past mistake)
**I want** to enter an arbitrary CO amount with a free-text reason through a Sheet UI
**So that** my ledger reflects reality without shoehorning ad-hoc events into the formal income/building system

**Acceptance Criteria:**

**Given** `src/server/territory-economy.ts`
**When** Story 5.5 is complete
**Then** it exports two server functions:
  - `manualIncomeFn({ playerId, amount, reason })` — validates `amount > 0` and `reason: z.string().min(1).max(200)`, wraps `withCoTransaction(tx, { type: 'manual_income', amount, metadata: { reason } })`, returns the new balance
  - `manualExpenseFn({ playerId, amount, reason })` — validates `amount > 0` (UI-facing sign) and the handler passes `amount = -Math.abs(input.amount)` to `withCoTransaction` with `type: 'manual_expense'`
**And** both handlers enforce authorization: the caller must be the territory owner OR (future extension, TODO comment) a campaign admin; for now, only the owner is allowed — non-owners return `FORBIDDEN`
**And** `manualExpenseFn` refuses to take the balance below 0 — if the resulting balance would be negative, return `BAD_REQUEST` "Solde insuffisant"

**Given** a new Sheet `ManualEntrySheet.tsx` mounted on the territory route
**When** a player taps a "Saisie manuelle" button in the `CoBanner` overflow menu
**Then** the Sheet opens with a segmented control `[Recette | Dépense]`, a numeric input for the amount, and a textarea for the reason (max 200 chars, counter visible)
**And** the primary submit button is disabled until amount > 0 and reason is non-empty
**And** on submit, an AlertDialog confirms "{+|−}{amount} CO — {reason} ?" with `[Annuler] [Confirmer]` (UX-DR14) before the server call fires
**And** on success, the Sheet closes, a toast shows "{±amount} CO enregistré", and the queries `['territory', playerId]` and `['territory-history', playerId]` are invalidated

**Given** integration tests
**When** they run
**Then** a test calls `manualIncomeFn({ amount: 150, reason: 'Don du Seigneur' })` and asserts `co_balance` grew by 150 and a `co_transactions` row exists with `type = 'manual_income'`, `amount = 150`, and `metadata.reason = 'Don du Seigneur'`
**And** a test calls `manualExpenseFn({ amount: 50, reason: 'Amende' })` and asserts balance decreased by 50 and a row exists with `amount = -50`, `type = 'manual_expense'`
**And** a test calls `manualExpenseFn` with an amount greater than the current balance and asserts `BAD_REQUEST` with message "Solde insuffisant" and no row inserted
**And** a test calls either function as a non-owner and asserts `FORBIDDEN`

---
