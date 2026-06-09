# Implementation Patterns & Consistency Rules

## Pattern Categories Defined

**Critical Conflict Points Identified:** 6 areas where AI agents could make different choices, refined through peer review (Amelia/Dev, Sally/UX, Murat/Test).

## Naming Patterns

| Layer | Convention | Territory Example |
|---|---|---|
| DB tables | `snake_case` plural | `player_territories`, `co_transactions` |
| DB columns | `snake_case` | `player_territory_id`, `last_income_week` |
| DB enums | `camelCase` values | `'income_generation'`, `'colony_construction'` |
| Server functions | `camelCase` + `Fn` suffix | `buildColonyFn`, `loadTerritoryDashboardFn` |
| Components | `PascalCase` file + export | `TileCard.tsx`, `CoBanner.tsx` |
| Zod validators | `camelCase` + `Schema` suffix | `addTileSchema`, `buildColonySchema` |
| Query keys | literal array | `['territory', playerId]` |
| Search params | `camelCase` | `?tile=uuid&view=history` |
| Faction config keys | faction `id` from DB | `FACTION_CONFIGS[factionId]` |

## Structure Patterns

**Faction config TypeScript shape (`src/lib/faction-config.ts`):**

```typescript
type TerrainType = 'port' | 'plaines' | 'plaine_agricole' | 'lisiere_forestiere'
  | 'montagnes' | 'foret' | 'plaine_fluviale' | 'marais'
type ColonyType = 'village' | 'city'
type BuildingId = 'caserne' | 'caserne_upgraded' | 'ecuries' | 'ecuries_upgraded'
  | 'menagerie' | 'menagerie_upgraded' | 'atelier' | 'atelier_upgraded'
  | 'tour_sorcier' | 'grande_tour' | 'tour_arcanes'
  | 'barbier' | 'forge' | 'ferme' | 'scierie' | 'mine'
  | 'comptoir' | 'comptoir_renforce' | 'grand_comptoir'
  | 'camp_entrainement'

interface FactionConfig {
  id: string
  displayName: string
  colonization: {
    canBuildVillage: boolean
    canBuildCity: boolean
    alternativeStructure?: {
      name: string
      baseCost: number
      upgradeCost?: number
      baseIncome: number
      upgradeIncome?: number
      baseArmyPoints: number
      upgradeArmyPoints?: number
      baseSlots: number
      upgradeSlots?: number
    }
  }
  terrainRestrictions: TerrainType[]
  availableBuildings: BuildingId[]
  automaticBuildings: Array<{
    terrain: TerrainType
    building: BuildingId
    colonyType: ColonyType
  }>
  godConsecration?: {
    gods: string[]
    unitsPerVillage: number
    unitsPerCity: number
  }
}

export const FACTION_CONFIGS: Record<string, FactionConfig> = { ... }
```

All agents MUST respect this interface exactly. Any extension requires architectural discussion.

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
    ├── index.tsx            (reducer + phases)
    ├── phase-balance.tsx
    ├── phase-tiles.tsx
    ├── phase-buildings.tsx
    └── phase-summary.tsx
```

## Format Patterns

**CO transaction creation — mandatory shared utility:**

```typescript
// src/db/queries/territory.ts
// Signature takes DrizzleTransaction — NEVER accesses global db directly.
// This prevents nested transactions when called from an already-transactional context.

async function withCoTransaction(
  tx: DrizzleTransaction,
  playerTerritoryId: string,
  type: TransactionType,
  amount: number,          // positive = credit, negative = debit
  label: string,
  relatedEntity?: { type: string; id: string },
  weekNumber?: number,
): Promise<string> {
  const [txn] = await tx.insert(coTransactions).values({
    id: crypto.randomUUID(),
    playerTerritoryId,
    type,
    amount,
    label,
    relatedEntityType: relatedEntity?.type ?? null,
    relatedEntityId: relatedEntity?.id ?? null,
    weekNumber: weekNumber ?? null,
    reversedTransactionId: null,
  }).returning({ id: coTransactions.id })

  await tx.update(playerTerritories)
    .set({ coBalance: sql`co_balance + ${amount}` })
    .where(eq(playerTerritories.id, playerTerritoryId))

  return txn.id
}
```

Every CO mutation calls this utility inside its `db.transaction()`. Never update `co_balance` directly.

**DB constraint — buildings double FK integrity:**

Buildings have `tile_id` (required) + `colony_id` (nullable). When `colony_id` is set, the colony MUST belong to the same tile. Enforcement:

- Preferred: CHECK constraint at DB level (if Drizzle supports sub-select CHECK)
- Fallback: application-level guard — every `buildBuildingFn` handler MUST verify `colony.tileId === data.tileId` before insert

This prevents a building being linked to a colony on a different tile — a silent data corruption.

**UNDO LIFO — optimistic lock pattern:**

```typescript
// cancelTransactionFn handler — inside db.transaction() with serializable isolation:
const lastTx = await tx.query.coTransactions.findFirst({
  where: and(
    eq(coTransactions.playerTerritoryId, playerTerritoryId),
    ne(coTransactions.type, 'reversal'),
  ),
  orderBy: [desc(coTransactions.createdAt)],
})

if (!lastTx) return { success: false, error: { code: 'NOT_FOUND', message: 'Aucune transaction à annuler' } }
if (lastTx.type === 'reversal') return { success: false, error: { code: 'BAD_REQUEST', message: "Impossible d'annuler une annulation" } }
```

Race condition prevention: the entire cancel operation runs in a serializable transaction. Two concurrent cancels on the same player will serialize — second one sees the reversal and refuses.

**Error codes — territory-specific:**

| Situation | Code | Message pattern |
|---|---|---|
| Insufficient balance | `BAD_REQUEST` | `Solde insuffisant (besoin : X CO)` |
| Income already generated | `CONFLICT` | `Revenu déjà généré pour cette semaine` |
| Faction forbids action | `FORBIDDEN` | Context-specific |
| No slots available | `BAD_REQUEST` | Context-specific |
| Transaction not cancellable | `BAD_REQUEST` | Context-specific |
| Territory not initialized | `NOT_FOUND` | Context-specific |

## Communication Patterns

**Query keys & invalidation:**

| Query | Key | Stale Time |
|---|---|---|
| Territory dashboard | `['territory', playerId]` | 30s |
| Transaction history | `['territory-history', playerId]` | 30s |
| Campaign week | `['campaign-week']` | 5 min |

After every CO mutation:
```typescript
queryClient.invalidateQueries({ queryKey: ['territory', playerId] })
queryClient.invalidateQueries({ queryKey: ['territory-history', playerId] })
```

**Route search params — explicit Zod validation (mandatory):**

```typescript
// src/routes/territories.tsx
export const Route = createFileRoute('/territories')({
  validateSearch: z.object({
    tile: z.string().optional(),
    view: z.enum(['grid', 'history']).default('grid'),
    setup: z.number().optional(),
  }),
})
```

Without explicit `validateSearch`, search params are `unknown` at runtime — type errors in components. Every search param MUST be declared in this schema.

## Process Patterns

**CoBanner — localized loading state:**

After "Generate income" or any CO mutation, the CoBanner MUST show a localized loading indicator (spinner or skeleton on the balance amount). Never trigger a full-page reload or global loading state. Use TanStack Query's `isFetching` on the territory query to drive this.

**Tile expand — scrollIntoView on search param change:**

When `?tile=uuid` changes (tile expanded), the TileCard MUST call `scrollIntoView({ behavior: 'smooth', block: 'start' })` via a ref + useEffect. Without this, expand can happen off-screen on mobile, disorienting the player.

```typescript
// TileCard.tsx
const tileRef = useRef<HTMLDivElement>(null)
const { tile: expandedTile } = Route.useSearch()
const isExpanded = expandedTile === tile.id

useEffect(() => {
  if (isExpanded && tileRef.current) {
    tileRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}, [isExpanded])
```

## Testing Strategy

**Unit tests (pure logic):**

| Target | Location | Pattern |
|---|---|---|
| Income calculation | `src/lib/__tests__/` | Truth tables, `it.each` over terrain × building combos |
| Faction config validation | `src/lib/__tests__/` | `describe.each` over all 15 factions × terrain × building |
| Automatic free buildings | `src/lib/__tests__/` | Rule logic, edge cases |
| UNDO reversal logic (per type) | `src/lib/__tests__/` | Pure function, 6 type variants |

**Integration tests (real DB — 2 targeted tests):**

| Target | Location | What it proves |
|---|---|---|
| `cancelTransactionFn` LIFO | `src/server-fns/__tests__/` | Insert 3 real transactions, cancel in order, verify LIFO constraint holds |
| `generateWeeklyIncomeFn` idempotency | `src/server-fns/__tests__/` | Call twice with same week, verify single insert produced |

These 2 integration tests run against a real PostgreSQL instance (test DB). They cover risks that unit tests with mocked DB cannot: transaction isolation, LIFO ordering, idempotency at the SQL level.

**Server function testing approach:** `createServerFn` handlers are not directly unit-testable (middleware chain + context). Extract business logic into pure functions, test those. Integration tests cover the full handler path.

## Enforcement Guidelines

**All AI Agents MUST:**
- Use `withCoTransaction(tx, ...)` for every CO mutation — never update `co_balance` directly
- Pass `DrizzleTransaction` to `withCoTransaction`, never the global `db`
- Verify `colony.tileId === data.tileId` before building insert (double FK integrity)
- Use serializable transaction isolation in cancel operations (optimistic lock)
- Respect the `FactionConfig` interface exactly — no extension without architectural discussion
- Declare all search params in `validateSearch` Zod schema on the route
- Implement `scrollIntoView` on tile expand
- Show localized loading in CoBanner, never full-page loading
- Use TanStack search params for navigable state, React state only for ephemeral UI
- Tailwind classes only — never inline CSS
- shadcn/ui first — custom component only when no shadcn primitive covers the need
- Validate faction rules server-side even if client already filters
