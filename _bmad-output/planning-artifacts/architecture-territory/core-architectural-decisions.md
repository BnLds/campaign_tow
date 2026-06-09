# Core Architectural Decisions

## Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Data model (tables, relationships, CO ledger design)
- Faction rule engine (data-driven config vs DB)
- CO transaction atomicity pattern
- Campaign week mechanism (income generation idempotency)

**Important Decisions (Shape Architecture):**
- Server function organization and granularity
- Frontend state management (TanStack search params vs React state)
- Component file organization
- UNDO mechanism design

**Deferred Decisions (Post-MVP):**
- Automatic weekly income generation (cron — Phase 2)
- Territory statistics and progression over time
- 2D campaign map with spatial rules

## Data Architecture

**Database Tables (7 new tables):**

| Table | Role | Key Relationships |
|---|---|---|
| `factions` | Canonical faction list | PK `id`, `name`, `display_name` — FK target from `armies.faction` |
| `campaign_settings` | Global key-value settings | `campaign_week` (incremented weekly by VPS cron) |
| `player_territories` | Player territory state | FK `player_id` (1:1 with players), `co_balance`, `last_income_week`, `setup_completed_at` |
| `tiles` | Owned tile | FK `player_territory_id`, terrain type, name, river adjacency flag |
| `colonies` | Village/city/portal on a tile | FK `tile_id` (0:1), type enum, `dedicated_god` nullable (Chaos factions) |
| `buildings` | Constructed building | FK `tile_id` (required) + FK `colony_id` (nullable — null for mine/sawmill on mountain/forest tiles without colony) |
| `co_transactions` | Append-only CO ledger | FK `player_territory_id`, type enum, amount, label, `related_entity_type`/`related_entity_id`, `week_number`, `reversed_transaction_id` |

**Transaction type enum:** `income_generation`, `colony_construction`, `colony_upgrade`, `building_construction`, `manual_expense`, `manual_income`, `reversal`

**Faction rule engine:** TypeScript config file (`src/lib/faction-config.ts`) referencing faction IDs from the `factions` DB table. Contains all colonization rules, building availability, special structures, automatic bonuses. Static data — changes only with campaign rule updates (= redeployment).

**Data validation:** Zod schemas in `src/lib/validators/territory.ts`. Validated server-side (source of truth) + client-side via TanStack Form (Standard Schema, immediate feedback).

**Migration:** Drizzle migrations. Backfill `armies.faction` (free text → FK to `factions` table).

## Authentication & Security

**No new middleware required.** Territory ownership is implicit via `session.playerId` — `player_territories` is 1:1 with players. All territory server functions use `authMiddleware` only. Server functions query `player_territories WHERE player_id = session.playerId`.

Admin bypass handled at handler level where needed (consistent with existing patterns).

**CO balance is server-authoritative** — no client-side balance computation. All mutations go through server functions with DB transactions.

## API & Communication Patterns

**Server functions — 3 files, ~15 functions:**

| File | Functions |
|---|---|
| `src/server-fns/territory-queries.ts` | `loadTerritoryDashboardFn` (GET), `loadTransactionHistoryFn` (GET), `getEstimatedWeeklyIncomeFn` (GET), `exportTerritoryMarkdownFn` (GET) |
| `src/server-fns/territory-mutations.ts` | `addTileFn`, `removeTileFn`, `toggleRiverAdjacencyFn`, `buildColonyFn`, `upgradeColonyFn`, `buildBuildingFn`, `cancelTransactionFn` |
| `src/server-fns/territory-economy.ts` | `generateWeeklyIncomeFn`, `addManualEntryFn`, `setupTerritoryFn` (wizard bootstrap) |

**CO atomicity pattern:** Every CO-mutating operation runs in a single `db.transaction()`:
1. Verify sufficient balance (if expense)
2. Create/modify entity (building, colony)
3. Insert `co_transaction` entry
4. Update `player_territories.co_balance`

All 4 steps atomic — no observable intermediate state.

**Campaign week mechanism:**
- `campaign_settings` table stores `campaign_week` (integer, starts at 1)
- VPS cron job runs every Sunday at 00:01, calls `POST /api/cron/increment-week` (protected by `CRON_SECRET` env var)
- Income generation allowed when `player_territories.last_income_week < campaign_settings.campaign_week`
- Player increments `last_income_week` by 1 per generation — can generate multiple times to catch up on missed weeks

**UNDO mechanism (FR41):** Single `cancelTransactionFn` — reads last transaction's `type` and applies reversal logic:

| Transaction Type | Reversal Action |
|---|---|
| `building_construction` | Delete building + re-credit CO |
| `colony_construction` | Delete colony + re-credit CO |
| `colony_upgrade` | Downgrade (city → village) + re-credit CO |
| `income_generation` | Debit amount + decrement `last_income_week` |
| `manual_expense` | Re-credit amount |
| `manual_income` | Debit amount |
| `reversal` | Not cancellable |

Multiple consecutive cancellations supported (LIFO stack).

## Frontend Architecture

**Technology priority rule (mandatory):**
1. **State:** TanStack first (Router search params, Query, Form) → React state only for ephemeral non-navigable UI (open dialog, form in progress)
2. **Styling:** Tailwind classes only → never inline CSS or per-component CSS files
3. **UI components:** shadcn/ui first → custom component only when no shadcn primitive covers the need

**Route:** Single route `src/routes/territories.tsx` (no sub-routes). Internal state via TanStack Router search params:

```typescript
validateSearch: z.object({
  tile: z.string().optional(),                        // expanded tile
  view: z.enum(['grid', 'history']).default('grid'),  // grid vs transaction history
  setup: z.number().optional(),                       // wizard step (if in setup flow)
})
```

**Query keys & stale times:**

| Query | Key | Stale Time |
|---|---|---|
| Territory dashboard | `['territory', playerId]` | 30s |
| Transaction history | `['territory-history', playerId]` | 30s |
| Campaign week | `['campaign-week']` | 5 min |

Invalidate `['territory', playerId]` + `['territory-history', playerId]` after every CO mutation.

**Component organization:**

```
src/components/territory/
├── CoBanner.tsx
├── TileCard.tsx
├── BuildingSlot.tsx
├── BuildingOption.tsx
├── TransactionEntry.tsx
├── IncomeBreakdown.tsx
└── territory-setup-wizard/
    ├── index.tsx            (reducer + phases — same pattern as post-match-wizard)
    ├── phase-balance.tsx
    ├── phase-tiles.tsx
    ├── phase-buildings.tsx
    └── phase-summary.tsx
```

**Faction config client-side:** `src/lib/faction-config.ts` is importable on both server and client. Client uses it for immediate UX filtering (available buildings, valid terrain options). Server re-validates all faction rules on every mutation.

## Infrastructure & Deployment

**No new infrastructure.** Territory module deploys with the existing app (same Docker image, same VPS, same Traefik).

**Cron — campaign week increment:**
```
1 0 * * 0  curl -X POST https://<app-domain>/api/cron/increment-week -H "Authorization: Bearer $CRON_SECRET"
```
Server endpoint: `src/routes/api/cron/increment-week.ts` — validates `CRON_SECRET`, increments `campaign_settings.campaign_week` by 1.

**DB migration:** Drizzle migration adding 7 new tables + backfill `armies.faction` to FK.

## Decision Impact Analysis

**Implementation Sequence:**
1. DB migration (factions table + backfill armies.faction) — unblocks everything
2. Faction config TypeScript module — unblocks all faction-aware features
3. Territory tables (player_territories, tiles, colonies, buildings, co_transactions, campaign_settings)
4. Territory server functions (queries first, then mutations, then economy)
5. Territory route + components (dashboard, then actions, then setup wizard)
6. Cron setup (campaign week increment)

**Cross-Component Dependencies:**
- Faction config → used by server functions (validation) AND client components (UX filtering)
- CO transaction design → constrains UNDO mechanism, income generation, and all mutation handlers
- Campaign week → affects income generation server function AND CoBanner UI (show current week, enable/disable generate button)
