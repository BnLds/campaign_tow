# Project Structure & Boundaries

## Complete Project Directory Structure (Territory Module additions only)

```
src/
├── db/
│   ├── schema.ts                          # MODIFIED — add 7 new tables + factions enum
│   ├── queries/
│   │   └── territory.ts                   # NEW — all territory DB queries + withCoTransaction()
│   └── migrations/
│       └── XXXX_territory_module.ts       # NEW — Drizzle migration
│
├── lib/
│   ├── faction-config.ts                  # NEW — FactionConfig interface + FACTION_CONFIGS record
│   ├── territory-income.ts                # NEW — pure function: calculate weekly income from tiles/buildings
│   ├── territory-export.ts                # NEW — pure function: generate markdown export
│   ├── validators/
│   │   └── territory.ts                   # NEW — Zod schemas (addTileSchema, buildColonySchema, etc.)
│   ├── query-constants.ts                 # MODIFIED — add STALE_TIME_TERRITORY, STALE_TIME_CAMPAIGN_WEEK
│   └── __tests__/
│       ├── faction-config.test.ts         # NEW — describe.each over 15 factions × terrains × buildings
│       └── territory-income.test.ts       # NEW — truth tables, it.each
│
├── server-fns/
│   ├── territory-queries.ts               # NEW — loadTerritoryDashboardFn, loadTransactionHistoryFn, etc.
│   ├── territory-mutations.ts             # NEW — addTileFn, buildColonyFn, buildBuildingFn, cancelTransactionFn, etc.
│   ├── territory-economy.ts              # NEW — generateWeeklyIncomeFn, addManualEntryFn, setupTerritoryFn
│   └── __tests__/
│       ├── territory-cancel.integration.test.ts    # NEW — LIFO cancel with real DB
│       └── territory-income.integration.test.ts    # NEW — idempotency with real DB
│
├── routes/
│   ├── territories.tsx                    # MODIFIED — replace placeholder with full dashboard
│   └── api/
│       └── cron/
│           └── increment-week.ts          # NEW — POST endpoint, CRON_SECRET protected
│
├── components/
│   └── territory/
│       ├── CoBanner.tsx                   # NEW
│       ├── TileCard.tsx                   # NEW
│       ├── BuildingSlot.tsx               # NEW
│       ├── BuildingOption.tsx             # NEW
│       ├── TransactionEntry.tsx           # NEW
│       ├── IncomeBreakdown.tsx            # NEW
│       └── territory-setup-wizard/
│           ├── index.tsx                  # NEW — reducer + phases
│           ├── phase-balance.tsx          # NEW
│           ├── phase-tiles.tsx            # NEW
│           ├── phase-buildings.tsx        # NEW
│           └── phase-summary.tsx          # NEW
│
└── integrations/
    └── territory-queries.ts               # NEW — TanStack Query options factories
```

## Architectural Boundaries

**Data Access Boundary:**
- All DB access goes through `src/db/queries/territory.ts` — server functions NEVER import Drizzle tables directly
- `withCoTransaction()` is the ONLY way to mutate CO balance
- Pure logic (income calculation, faction filtering) lives in `src/lib/` — no DB imports

**Auth Boundary:**
- `authMiddleware` on all territory server functions
- Server functions query by `session.playerId` — ownership implicit
- Cron endpoint uses `CRON_SECRET` header — no session auth

**Faction Config Boundary:**
- `src/lib/faction-config.ts` is the single source of truth for faction rules
- Imported by server functions (validation) AND client components (UX filtering)
- Server ALWAYS re-validates — client filtering is UX convenience only

**Client/Server Boundary:**
- CO balance is server-authoritative — client never computes balance
- Faction config is shared (same file, both sides)
- Search params define navigable state, React state handles ephemeral UI

## Requirements to Structure Mapping

| FR Domain | DB | Server Functions | Lib | Components |
|---|---|---|---|---|
| Faction Data (FR1-3) | `factions` table, `armies.faction` FK | — | `faction-config.ts` | — |
| Tile Management (FR4-8) | `tiles` | `territory-mutations.ts` | `validators/territory.ts` | `TileCard.tsx` |
| Colony Management (FR9-15) | `colonies` | `territory-mutations.ts` | `faction-config.ts` | `TileCard.tsx`, `BuildingSlot.tsx` |
| Building Construction (FR16-21) | `buildings` | `territory-mutations.ts` | `faction-config.ts`, `validators/territory.ts` | `BuildingSlot.tsx`, `BuildingOption.tsx` |
| CO Income (FR22-25) | `co_transactions`, `campaign_settings` | `territory-economy.ts` | `territory-income.ts` | `CoBanner.tsx`, `IncomeBreakdown.tsx` |
| CO Manual Entries (FR26-28) | `co_transactions` | `territory-economy.ts` | `validators/territory.ts` | `CoBanner.tsx` |
| CO Balance & History (FR29-31) | `player_territories`, `co_transactions` | `territory-queries.ts` | — | `CoBanner.tsx`, `TransactionEntry.tsx` |
| Dashboard & Export (FR32-33) | all territory tables | `territory-queries.ts` | `territory-export.ts` | all territory components |
| Initial Setup (FR34-37) | all territory tables | `territory-economy.ts` | `validators/territory.ts` | `territory-setup-wizard/*` |
| Chaos Consecration (FR38-40) | `colonies.dedicated_god` | `territory-mutations.ts` | `faction-config.ts` | `TileCard.tsx` |
| Error Correction (FR41) | `co_transactions` | `territory-mutations.ts` | — | `TransactionEntry.tsx` |

## Data Flow

```
User action (tap "Build")
  → TileCard.tsx (search param navigation)
  → BuildingOption.tsx (Sheet, faction-filtered list)
  → AlertDialog (CO confirmation)
  → buildBuildingFn (server function)
    → authMiddleware (session check)
    → Zod validation (buildBuildingSchema)
    → db.transaction():
      1. Verify faction rules (FACTION_CONFIGS)
      2. Verify slot availability
      3. Verify CO balance
      4. Insert building
      5. withCoTransaction(tx, ...) → insert co_transaction + update co_balance
    → ServerResult<{ buildingId }>
  → Query invalidation (['territory', playerId])
  → CoBanner re-renders (new balance, localized loading)
  → TileCard re-renders (new building in slot)
```
