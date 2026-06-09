# Epic 6 — Transaction History, UNDO & Discord Export

**Goal:** Give players full visibility and control over their CO ledger. After this epic, players can browse a paginated history of every CO movement, cancel the last action LIFO-style with a single tap (server cascades the state rollback — deleted building, colony, or tile — atomically), and copy a Discord-ready markdown summary of their territory to paste into the campaign chat.

**Scope:** FR31, FR33, FR41.
**NFRs:** NFR9 (UNDO atomicity), NFR2 (history query <2s).
**UX-DRs:** UX-DR13 (TransactionEntry component), UX-DR14 (AlertDialog for CO mutations), UX-DR19 (UNDO hidden when not applicable).

## Story 6.1 — Paginated Transaction History & TransactionEntry Component

**As** Thomas auditing my past CO movements
**I want** a paginated chronological list of every transaction with a clear label, amount, and timestamp
**So that** I can verify where my CO went and spot any discrepancy

**Acceptance Criteria:**

**Given** `src/server/territory-queries.ts`
**When** Story 6.1 is complete
**Then** a `getTerritoryHistoryFn = createServerFn({ method: 'GET' }).validator(z.object({ playerId: z.string().uuid(), cursor: z.string().datetime().optional(), limit: z.number().int().min(1).max(50).default(20) })).middleware([authMiddleware]).handler(…)` returns `ServerResult<{ entries: TransactionEntryDto[], nextCursor: string | null }>`
**And** the query orders by `created_at DESC, id DESC` (stable secondary sort for same-timestamp ties), filters by `player_id`, and uses keyset pagination on `created_at` (NOT offset) for NFR2 compliance
**And** authorization restricts the query to the territory owner — non-owners receive `FORBIDDEN`
**And** each `TransactionEntryDto` exposes `{ id, type, amount, createdAt, label, metadata }` where `label` is computed server-side from `type` + `metadata` (e.g., `'manual_income'` + `{reason: 'Don'}` → "Recette manuelle — Don", `'income_generation'` + `{week: 3}` → "Revenu hebdomadaire — Semaine 3", `'building_construction'` + `{buildingType: 'forge'}` → "Construction — Forge")

**Given** `src/components/territory/TransactionEntry.tsx`
**When** Story 6.1 is complete
**Then** the component accepts `{ entry: TransactionEntryDto, canUndo: boolean, onUndo?: () => void }` and renders a flex row with: an icon matching the transaction type (coin up/down, colony, building, reversal arrow), the `label` in primary text, the amount in bonus-green or malus-red, and the timestamp in secondary text (relative format "il y a 2h" via `date-fns` locale `fr`)
**And** when `canUndo === true`, an "Annuler" text button appears on the right — only visible on the topmost entry in the list (UX-DR19 hides it everywhere else)

**Given** the Territory route
**When** the player opens the "Historique" tab in the bottom Sheet
**Then** the Sheet renders an infinite-scroll list using TanStack Query's `useInfiniteQuery` with key `['territory-history', playerId]` and `getNextPageParam = (lastPage) => lastPage.nextCursor`
**And** a skeleton is shown during the first page load, an empty state ("Aucun mouvement pour le moment") is shown if the ledger has 0 entries
**And** scrolling near the bottom triggers the next page fetch

**Given** integration tests
**When** they run
**Then** a test seeds a player with 25 `co_transactions` rows spaced 1 minute apart, calls `getTerritoryHistoryFn({ limit: 10 })` three times following the cursor, asserts pages 1 and 2 return 10 entries each, page 3 returns 5 with `nextCursor: null`, and the chronological order is strict descending
**And** a test seeds two transactions with the SAME `created_at` and asserts the tie-break via `id DESC` keeps pagination stable across page boundaries

## Story 6.2 — `undoLastTransactionFn` LIFO Cancellation with State Cascade

**As** Thomas realizing I just misclicked and built the wrong building
**I want** a one-tap UNDO that reverts both the CO balance AND the underlying territory state (deleted building, colony, or tile) atomically
**So that** mistakes cost nothing and I don't have to manually clean up the ledger

**Acceptance Criteria:**

**Given** `src/server/territory-economy.ts`
**When** Story 6.2 is complete
**Then** an `undoLastTransactionFn = createServerFn({ method: 'POST' }).validator(z.object({ playerId: z.string().uuid() })).middleware([authMiddleware]).handler(…)` returns `ServerResult<{ reversedTransactionId: string, newBalance: number }>`
**And** the handler runs inside `db.transaction({ isolationLevel: 'serializable' })` to prevent racing two undos on the same ledger
**And** it SELECTs `FOR UPDATE` the most recent transaction where `player_id = $1 AND type NOT IN ('reversal')` ordered `created_at DESC, id DESC LIMIT 1` — if none exists, return `BAD_REQUEST` "Aucune action à annuler"
**And** if the most recent transaction is already flagged `reversed_at IS NOT NULL` (a later reversal row points back to it), return `BAD_REQUEST` — this cannot normally happen under LIFO but the guard is belt-and-braces

**Given** the migration for `co_transactions`
**When** Story 6.2 is complete
**Then** the table gains a nullable `reversed_by_transaction_id` (uuid) column — when an undo is performed, the reversed row is updated to reference the new `reversal` row, giving a permanent audit trail

**Given** the handler dispatches the state cascade based on `type`
**When** the reversed transaction is of a given type
**Then** the handler applies the exact inverse within the same transaction:
  - `income_generation` / `manual_income` → no state cascade; only the `withCoTransaction(tx, { type: 'reversal', amount: -original.amount, metadata: { originalId } })` fires
  - `manual_expense` → same, only the ledger entry is reversed
  - `building_construction` → DELETE the `buildings` row referenced by `metadata.buildingId`. If the deleted building has `hasLevels = true` and metadata indicates it REPLACED a previous level (e.g., `grande_tour` replaced `tour_sorcier`), the previous level is RE-INSERTED from the snapshot stored in `metadata.replacedBuilding` — the transaction must capture this snapshot at construction time (Story 6.2 retrofits `buildBuildingFn` from Story 4.2 and Story 4.5 to persist the replaced building JSON into `metadata.replacedBuilding` when applicable)
  - `colony_construction` → DELETE the `colonies` row from `metadata.colonyId`. Any buildings on the colony are already protected: the handler refuses the undo if `buildings` rows still reference the colony, returning `BAD_REQUEST` "Supprimez d'abord les bâtiments de cette colonie"
  - `colony_upgrade` (village → city) → revert the colony's `type` from `'city'` to `'village'`. If the city has more than 1 building slot occupied, refuse (`BAD_REQUEST` "Supprimez d'abord les bâtiments excédentaires")

**Given** the Daemons of Chaos auto-portal rule (Story 3.5)
**When** a player undoes a `building_construction` of an automatically-created Portal
**Then** the normal building deletion applies — no special-casing, because the Portal is a regular building row. However, undoing the TILE that auto-created the portal (via undoing a tile-adding transaction type that doesn't exist today — tiles are added via a different workflow, out of Epic 6 scope) would need to cascade to delete the portal first; this is NOT required for MVP and is explicitly out of scope (document as a known limitation in the story notes)

**Given** the UI
**When** the topmost history entry's "Annuler" button is tapped
**Then** an AlertDialog confirms "Annuler cette action ?" with a one-line description of the transaction being reverted and `[Annuler] [Confirmer]` (UX-DR14)
**And** on success, a toast shows "Action annulée" and the queries `['territory', playerId]` and `['territory-history', playerId]` are invalidated
**And** on failure (e.g., refuses due to buildings blocking colony deletion), the error message from `ServerResult<Err>` is shown as an error toast — the AlertDialog remains closed

**Given** integration tests against real PostgreSQL
**When** they run
**Then** a test seeds a player with 500 CO, adds a tile (+30 CO base income assumed not relevant), builds a Forge (60 CO → balance 440), undoes → asserts balance is back to 500, the `buildings` row is deleted, and `co_transactions` contains 3 rows: construction, reversal pointing back, and the construction row's `reversed_by_transaction_id` is set
**And** a test seeds a player with a village + 1 Forge, tries to undo the village construction, and asserts `BAD_REQUEST` "Supprimez d'abord les bâtiments de cette colonie"
**And** a test seeds a player who built `tour_sorcier` then `grande_tour` (which deleted `tour_sorcier`), undoes → asserts `grande_tour` is deleted and `tour_sorcier` is reinstated from `metadata.replacedBuilding`, and CO balance matches the delta-refund (160 CO)
**And** a test calls `undoLastTransactionFn` twice in parallel via `Promise.all` on the same player and asserts exactly one succeeds (serializable isolation guarantees LIFO integrity)

## Story 6.3 — Discord Export: Markdown Territory Summary

**As** Thomas preparing my weekly campaign report
**I want** a one-tap button that generates a Discord-formatted markdown summary of my territory and copies it to clipboard
**So that** I can paste it directly into the campaign Discord without reformatting

**Acceptance Criteria:**

**Given** `src/lib/discord-export.ts`
**When** Story 6.3 is complete
**Then** it exports a pure function `formatTerritoryAsDiscordMarkdown(snapshot: TerritorySnapshot, factionDisplayName: string): string` that produces a string matching the following template (with real values substituted):

```
**Territoire — {faction}**
💰 **Solde :** {balance} CO  |  📈 **Revenu hebdo :** {weekly} CO

__Tuiles ({count})__
• {tileLabel} — {income} CO
  └ {buildingLabel}{level?}
  └ ...

__Colonies__
• {colonyName} ({village|ville}) — {filledSlots}/{maxSlots} bâtiments

__Derniers mouvements__
• {date} — {label} — {±amount} CO
```

**And** the function takes NO database connection — it operates purely on the snapshot passed in (matches the pattern from Story 5.2)
**And** for factions where special rules should be surfaced (e.g., Daemons of Chaos Portal count), a brief faction-specific header line is appended after the faction name — the implementation uses a small switch on `factionId` with a default branch that appends nothing

**Given** `src/server/territory-queries.ts`
**When** Story 6.3 is complete
**Then** a `getDiscordExportFn({ playerId })` server function loads the snapshot + weekly income breakdown + last 5 transactions, calls `formatTerritoryAsDiscordMarkdown`, and returns the rendered string inside `ServerResult<{ markdown: string }>`
**And** authorization restricts the call to the territory owner — non-owners receive `FORBIDDEN`

**Given** the `CoBanner` overflow menu
**When** the player taps "Exporter pour Discord"
**Then** the handler calls `getDiscordExportFn`, writes the returned markdown to `navigator.clipboard`, and shows a toast "Copié dans le presse-papiers"
**And** if the clipboard write fails (permissions, non-HTTPS context), a Sheet opens with the markdown pre-rendered in a `<textarea readonly>` with a "Sélectionner tout" button as fallback

**Given** unit tests in `src/lib/discord-export.test.ts`
**When** they run
**Then** a test asserts a minimal fixture (1 plaine tile, 1 village, 0 buildings) produces a string containing all 4 section headers, the correct CO amount, and no extra blank lines
**And** a test with a Daemons of Chaos fixture asserts the faction-specific header line is present
**And** a snapshot test pins the full rendered string for a rich fixture (3 tiles, 2 colonies, 5 buildings, 3 transactions) so future template tweaks are caught in review

---
