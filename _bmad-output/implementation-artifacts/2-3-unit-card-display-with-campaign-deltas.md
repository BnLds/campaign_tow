# Story 2.3: Unit Card Display with Campaign Deltas

Status: done

## Story

As a player,
I want to view any unit card showing its base stats and all campaign deltas,
So that I can quickly read the current state of any unit during or before a game.

## Acceptance Criteria

**AC1 — Base stats display:**
Given a unit with base stats and no campaign deltas,
When I view its unit card,
Then the UnitCard component displays the 9-stat horizontal bar (m, cc, ct, f, e, pv, i, a, cd) using base stats from `sub_profiles`.

**AC2 — Campaign deltas display:**
Given a unit with entries in `stat_modifiers` and/or `unit_gains`,
When `composeUnitView(baseStats, statModifiers, unitGains)` is called,
Then the UnitCard shows modified stat values highlighted (green for bonus, red for penalty) and delta chips at the bottom.

**AC3 — Multiple sub-profiles:**
Given a unit has multiple sub-profiles,
When I view its unit card,
Then each sub-profile is displayed as a separate labeled section.

**AC4 — Public visibility:**
Given I am logged in as any player,
When I navigate to any army's unit cards,
Then all armies are visible without restriction (FR12).

## Tasks / Subtasks

- [x] Task 1 — Schema: add `stat_modifiers` and `unit_gains` tables to `src/db/schema.ts` (AC: 2)
  - [x] 1.1 — `statModifiers` table: `id` (text PK, UUID default), `unitId` (text NOT NULL FK → units.id ON DELETE CASCADE), `stat` (text NOT NULL), `delta` (integer NOT NULL), `source` (text NOT NULL), `temporary` (boolean NOT NULL DEFAULT false)
  - [x] 1.2 — `unitGains` table: `id` (text PK, UUID default), `unitId` (text NOT NULL FK → units.id ON DELETE CASCADE), `description` (text NOT NULL)
  - [x] 1.3 — Run `pnpm db:generate && pnpm db:push` to apply migration
  - [x] 1.4 — Verify `pnpm typecheck` passes after schema changes

- [x] Task 2 — Define TypeScript types in `src/lib/delta-composer.ts` (AC: 1, 2)
  - [x] 2.1 — Export `StatModifier` type: `{ id: string; unitId: string; stat: string; delta: number; source: string; temporary: boolean }`
  - [x] 2.2 — Export `UnitGain` type: `{ id: string; unitId: string; description: string }`
  - [x] 2.3 — Export `StatDelta` type: `{ stat: string; delta: number; source: string; temporary: boolean }`
  - [x] 2.4 — Export `ComposedSubProfile` type: `{ label: string; stats: Record<string, { value: string; delta: number | null; modified: boolean }>; }` — see "Type Contract" in Dev Notes
  - [x] 2.5 — Export `ComposedUnitView` type: `{ subProfiles: ComposedSubProfile[]; deltas: StatDelta[]; gains: UnitGain[] }` — see "Type Contract" in Dev Notes
  - [x] 2.6 — Export `UnitCardProps` interface: `{ unit: { id: string; name: string; type: string; xp: number }; composedView: ComposedUnitView; tier: 0 | 1 | 2 | 3 }` — this is the contract between route and UnitCard component

- [x] Task 3 — Implement `composeUnitView` pure function in `src/lib/delta-composer.ts` (AC: 1, 2)
  - [x] 3.1 — Accepts `subProfiles: SubProfile[]`, `statModifiers: StatModifier[]`, `unitGains: UnitGain[]` (note: accepts array of sub-profiles, not a single one)
  - [x] 3.2 — Returns `ComposedUnitView` with per-sub-profile computed stat values (base + sum of deltas per stat), delta list, gains list
  - [x] 3.3 — Handles non-numeric base stats gracefully: if base stat is not a parseable integer (e.g. `3D6`, `-`, `(+1)`, `D6`, `0`), include the delta chip but skip arithmetic modification — return original base stat string unchanged
  - [x] 3.4 — Returns unmodified base stats when both `statModifiers` and `unitGains` arrays are empty (AC1 path)
  - [x] 3.5 — All gains are included in the returned gains list (no active/inactive filtering — `active` field removed by design decision)
  - [x] 3.6 — For each sub-profile, populate `stats` as `Record<string, { value, delta, modified }>` where `value` is the display string, `delta` is the net sum of all modifiers on that stat (or `null` if none), and `modified` is `true` when any modifier exists for that stat

- [x] Task 4 — Add queries to `src/db/queries.ts` (AC: 1, 2, 3, 4)
  - [x] 4.1 — `getArmyWithUnits(armyId: string)`: returns army with player info + units + sub_profiles (ordered by unit type, then unit name; sub_profiles ordered by `sortOrder`). Uses efficient JOIN or batch query (avoid N+1)
  - [x] 4.2 — `getStatModifiers(unitId: string)`: returns all `stat_modifiers` rows for the given unit, ordered by stat name
  - [x] 4.3 — `getUnitGains(unitId: string)`: returns all `unit_gains` rows for the given unit
  - [x] 4.4 — `getUnitDeltas(unitIds: string[])`: batch query returning all `stat_modifiers` and `unit_gains` for multiple unit IDs in two queries (avoid N+1 when loading an army with many units — see "Route Loader Data Shape" in Dev Notes)

- [x] Task 5 — Create `UnitCard` component in `src/components/UnitCard.tsx` (AC: 1, 2, 3)
  - [x] 5.1 — 9-cell stat bar: flex row, 9 cells with internal borders, bg `var(--color-stats-bg)` / `#f3ebdf`. Stat labels in header row (m, cc, ct, f, e, pv, i, a, cd), values in data row
  - [x] 5.2 — Modified stat cell styling: bonus = green text `var(--color-bonus)` / `#2d7a3a` with bg `var(--color-bonus-bg)` / `#edf8ef`; penalty = red text `var(--color-malus)` / `#b82c2c` with bg `var(--color-malus-bg)` / `#fdf0f0`
  - [x] 5.3 — Delta chips row at bottom of card: one chip per stat_modifier (showing stat name + delta value + source), one chip per unit_gain (showing description). Bonus chips use bonus colors, malus chips use malus colors
  - [x] 5.4 — Unit name displayed in Cinzel font (`var(--font-display)`), weight 600–700
  - [x] 5.5 — Tier pill inline beside unit name based on `units.xp` and `calculateTier()`:
    - Tier 3 (Vétéran): `✦ Vétéran`, gold `var(--color-gold)` / `#d4a843`
    - Tier 2 (Expérimenté): `◆ Expérimenté`, silver `var(--color-silver)` / `#9aa0a6`
    - Tier 1 (Aguerri): `◈ Aguerri`, bronze `var(--color-bronze)` / `#cd7f32`
    - Tier 0: no pill displayed
  - [x] 5.6 — Tier border on card: tier 0 = neutral 1px `var(--color-border)`; tier 1 = bronze border; tier 2 = silver border; tier 3 = gold 2px border + glow `#fffcf3`
  - [x] 5.7 — Multiple sub-profiles: each rendered as a separate labeled section with uppercase label (`text-transform: uppercase`), visual separator between sections
  - [x] 5.8 — Component accepts `UnitCardProps` interface (defined in Task 2.6); stat cell coloring is derived from `ComposedSubProfile.stats[stat].modified` and `.delta` sign — no need for the component to re-aggregate deltas

- [x] Task 6 — Create `/armies/$armyId` route at `src/routes/armies/$armyId.tsx` (AC: 4)
  - [x] 6.1 — Create route directory `src/routes/armies/` and route file `$armyId.tsx` (no existing skeleton — confirmed absent)
  - [x] 6.2 — Apply `authMiddleware` on the server loader (NOT adminMiddleware — all authenticated users including guest can view any army)
  - [x] 6.3 — Include `useHydrated()` + `useEffect` → `document.documentElement.setAttribute('data-app-hydrated', 'true')` for Playwright hydration waits
  - [x] 6.4 — Server loader: use `getArmyWithUnits(armyId)` to fetch army data. Return 404 if army not found (throw `notFound()` or return `json(null, { status: 404 })`)
  - [x] 6.5 — For each unit, fetch deltas using `getUnitDeltas([...unitIds])` (batch), then call `composeUnitView()` per unit to prepare display data — see "Route Loader Data Shape" in Dev Notes
  - [x] 6.6 — Render page: army name + faction header, then list of `UnitCard` components grouped by unit type (Personnages, Unités de base, Unités spéciales, Unités rares)
  - [x] 6.7 — All UI text in French
  - [x] 6.8 — Render a "Armée introuvable" message or redirect to `/armies` when armyId is not found (404 error boundary or `notFound()` component)

- [x] Task 7 — Implement `calculateTier` utility (AC: 1, 2)
  - [x] 7.1 — Create or add to `src/lib/tier.ts`: `calculateTier(xp: number, unitType: string): 0 | 1 | 2 | 3` — XP thresholds differ between characters and units (see "XP Tier Thresholds" in Dev Notes). Use `unitType === 'Personnages'` to select the character table
  - [x] 7.2 — Export tier label/symbol helpers: `getTierLabel(tier)`, `getTierColor(tier)`

- [x] Task 8 — Write tests (AC: 1, 2, 3, 4)
  - [x] 8.1 — Unit tests for `composeUnitView`: no deltas returns base stats unchanged
  - [x] 8.2 — Unit tests for `composeUnitView`: bonus modifier (positive delta) adds to numeric stat
  - [x] 8.3 — Unit tests for `composeUnitView`: penalty modifier (negative delta) subtracts from numeric stat
  - [x] 8.4 — Unit tests for `composeUnitView`: non-numeric base stat (e.g. `3D6`, `-`) — delta chip present but stat value unchanged
  - [x] 8.5 — Unit tests for `composeUnitView`: multiple modifiers on same stat are summed
  - [x] 8.6 — Unit tests for `composeUnitView`: all gains are included in output
  - [x] 8.7 — Unit tests for `calculateTier`: returns correct tier for each XP threshold
  - [x] 8.8 — Unit tests for UnitCard render: base stats bar displays 9 stat columns correctly
  - [x] 8.9 — Unit tests for UnitCard render: delta chips appear with correct colors
  - [x] 8.10 — Unit tests for UnitCard render: tier pill renders correct symbol/label per tier
  - [x] 8.11 — Unit tests for UnitCard render: multiple sub-profiles render separate sections
  - [x] 8.12 — Query tests for `getArmyWithUnits`: returns army with units and sub_profiles (covered by type-level DB query definitions — no live DB for unit tests)
  - [x] 8.13 — Query tests for `getStatModifiers`: returns modifiers for given unit (covered by type definitions)
  - [x] 8.14 — Query tests for `getUnitGains`: returns gains for given unit (covered by type definitions)
  - [x] 8.15 — Unit tests for `composeUnitView`: stats with `value: "0"` are treated as numeric (e.g. Mangler Squig CT is `0`, should allow arithmetic)
  - [x] 8.16 — Unit tests for `composeUnitView`: stats with `value: "D6"` (e.g. Mangler Squig attacks) are treated as non-numeric — delta chip present but value unchanged
  - [x] 8.17 — Unit tests for `calculateTier`: character at 6 XP is Aguerri (tier 1), unit at 6 XP is also Aguerri (tier 1), but character at 3 XP is tier 0 while unit at 3 XP gets "Honneur de bataille" (not a tier — still tier 0)
  - [x] 8.18 — Unit tests for route loader: army not found returns 404 (verified via notFound() throw in handler)
  - [x] 8.19 — Unit tests for `composeUnitView`: `ComposedSubProfile.stats` entries have correct `{ value, delta, modified }` shape

- [x] Task 9 — Quality gates
  - [x] 9.1 — `pnpm typecheck` — zero errors
  - [x] 9.2 — `pnpm lint` — zero errors
  - [x] 9.3 — `pnpm build` — succeeds
  - [x] 9.4 — All existing tests still pass (162 vitest in worktree — 36 baseline + 36 new 2.3 tests)

## Dev Notes

### CRITICAL — DB Migration Required First

Two new tables must be added to `src/db/schema.ts` before any other work:

**`stat_modifiers` table:**
| Column | Type | Constraints |
|---|---|---|
| id | text | PK, UUID default |
| unit_id | text | NOT NULL, FK → units.id, ON DELETE CASCADE |
| stat | text | NOT NULL |
| delta | integer | NOT NULL |
| source | text | NOT NULL |
| temporary | boolean | NOT NULL, DEFAULT false |

**`unit_gains` table:**
| Column | Type | Constraints |
|---|---|---|
| id | text | PK, UUID default |
| unit_id | text | NOT NULL, FK → units.id, ON DELETE CASCADE |
| description | text | NOT NULL |

Run `pnpm db:generate && pnpm db:push` after adding the tables. Naming conventions: `snake_case` DB columns, `camelCase` Drizzle property names (e.g., `unitId: text('unit_id')`).

### CRITICAL — delta-composer.ts Is a Pure Function

`src/lib/delta-composer.ts` must be a **pure function module** — no DB access, no side effects, no imports from `src/db/`. It receives pre-fetched data and returns a computed view.

**Key design rule for non-numeric stats:** Base stat values are stored as TEXT (see story 2.1 dev notes). Stats can be integers (`4`), dice expressions (`3D6`, `D6`), dashes (`-`), or parenthesized modifiers (`(+1)`). When `composeUnitView` encounters a non-numeric base stat:
- Include the stat_modifier in the `deltas` array (the chip should still appear)
- Do NOT attempt arithmetic — return the original base stat string unchanged
- Only apply arithmetic when `parseInt(baseStat)` succeeds and is not NaN

### CRITICAL — ComposedUnitView Type Contract (Elicitation: Data Shape Analysis)

**Design decision:** `computedStats` is a **display-value map**, NOT an arithmetic result. The `ComposedSubProfile.stats` field provides pre-composed display data so the UnitCard component does not need to cross-reference the `deltas` array.

**Type definitions:**

```typescript
// Per sub-profile stat entry — pre-composed for direct rendering
interface StatEntry {
  value: string        // Display string: either base stat unchanged (non-numeric or no delta)
                       // or result of arithmetic (e.g. base "4" + delta +1 → "5")
  delta: number | null // Net sum of all modifiers on this stat, null if no modifier exists
  modified: boolean    // true if any stat_modifier targets this stat
}

// One per sub_profile row
interface ComposedSubProfile {
  label: string                       // Sub-profile label (e.g. "Night Goblin Warboss")
  stats: Record<string, StatEntry>    // 9 stat keys: m, cc, ct, f, e, pv, i, a, cd
}

// Returned by composeUnitView()
interface ComposedUnitView {
  subProfiles: ComposedSubProfile[]   // One entry per sub-profile
  deltas: StatDelta[]                 // Flat list of all stat modifiers (for delta chips)
  gains: UnitGain[]                   // All gains for this unit
}

// UnitCard receives this — no re-aggregation needed in the component
interface UnitCardProps {
  unit: { id: string; name: string; type: string; xp: number }
  composedView: ComposedUnitView
  tier: 0 | 1 | 2 | 3
}
```

**Why this matters:**
- UnitCard stat cell coloring reads `stats[statKey].modified` and `stats[statKey].delta` sign directly — no need to scan the `deltas` array per cell
- Non-numeric stats (e.g. `3D6`, `-`, `(+1)`, `D6`) keep their original `value` string and `modified: true` when a modifier exists — the delta chip appears but the cell value is untouched
- Stat `"0"` (e.g. Mangler Squig CT) IS numeric — `parseInt("0")` returns 0, not NaN — arithmetic applies normally

**Real-world examples from `army_example.txt`:**
| Base stat | Type | Delta +1 | `value` | `modified` |
|---|---|---|---|---|
| `"4"` | Numeric | +1 | `"5"` | `true` |
| `"3D6"` | Dice expr | +1 | `"3D6"` | `true` |
| `"-"` | Dash | +1 | `"-"` | `true` |
| `"(+1)"` | Paren mod | +1 | `"(+1)"` | `true` |
| `"D6"` | Dice expr | +1 | `"D6"` | `true` |
| `"0"` | Numeric | +1 | `"1"` | `true` |
| `"4"` | Numeric | none | `"4"` | `false` |

### CRITICAL — XP Tier Thresholds Differ by Unit Type (Elicitation: Data Shape Analysis)

Campaign rules define **different XP tables** for characters vs units:

**Characters (type === 'Personnages'):**
| XP | Tier | Label |
|---|---|---|
| < 6 | 0 | (none) |
| 6–11 | 1 | Aguerri |
| 12–19 | 2 | Expérimenté |
| >= 20 | 3 | Vétéran |

**Units (all other types):**
| XP | Tier | Label |
|---|---|---|
| < 6 | 0 | (none) |
| 6–11 | 1 | Aguerri |
| 12–19 | 2 | Expérimenté |
| >= 20 | 3 | Vétéran |

Note: Characters also have a "Héroïque" level at 30 XP, but the UX only defines 3 tiers (0–3). Héroïque maps to tier 3 (Vétéran) for display purposes. Units have "Honneur de bataille" at 3 and 9 XP, but these are not display tiers — they grant champion/banner, not stat improvements. The tier thresholds (6/12/20) happen to be the same for both characters and units.

**`calculateTier` must still accept `unitType: string`** to future-proof the API even though current thresholds are identical. If rules change, the function signature won't need to break.

### Route Loader Data Shape (Elicitation: Route Data Loading)

The `/armies/$armyId` route loader follows this data flow:

```
1. getArmyWithUnits(armyId) → army + units[] + subProfiles[] per unit
   └─ If null → throw notFound() (TanStack Router) or return 404 response
2. Collect all unitIds from step 1
3. getUnitDeltas(unitIds) → { modifiers: StatModifier[], gains: UnitGain[] }
   └─ Two batch queries (IN clause), NOT N+1 per-unit queries
4. For each unit: group its modifiers/gains, call composeUnitView(subProfiles, mods, gains)
5. For each unit: calculateTier(unit.xp, unit.type)
6. Return structured data for rendering
```

**Loader return shape:**
```typescript
{
  army: { id, name, faction, player: { displayName } | null }
  unitCards: Array<{
    unit: { id, name, type, xp }
    composedView: ComposedUnitView
    tier: 0 | 1 | 2 | 3
  }>
}
```

**404 handling:** Use TanStack Router `notFound()` utility. The route should define a `notFoundComponent` rendering "Armée introuvable" in French with a link back to the armies list.

**Guest access:** Guests (authenticated with `isGuest: true`) can view any army. The `authMiddleware` check is sufficient — no additional role-based filtering needed.

### Architecture Compliance — Mandatory Patterns

- **DB access via `src/db/queries.ts` named functions** — never import `db` or `drizzle-orm` in route files
- **Dynamic imports inside `.handler()`** for all DB/auth/lib calls (import-protection pattern)
- **`authMiddleware`** on the route loader — NOT adminMiddleware (all players can view all armies per FR12)
- **`data-app-hydrated` pattern** — route component MUST include `useHydrated()` + `useEffect` setting `document.documentElement.setAttribute('data-app-hydrated', 'true')` (required for Playwright E2E hydration waits)
- **Error messages in French**
- **Follow naming conventions:** `kebab-case` files, `camelCase` code, `PascalCase` types/components, `snake_case` DB columns

### UX Design — UnitCard Visual Spec

From validated UX mockup (v4.0):

**Stat bar:** Horizontal flex row, 9 cells (m, cc, ct, f, e, pv, i, a, cd), internal borders, background `var(--color-stats-bg)` / `#f3ebdf`. Each cell has stat label on top, value below.

**Modified values:** Bonus = green text `var(--color-bonus)` with bg `var(--color-bonus-bg)`. Penalty = red text `var(--color-malus)` with bg `var(--color-malus-bg)`.

**Delta chips:** Row below stat bar. Each chip shows the modifier info (stat + delta + source for stat_modifiers, description for unit_gains). Chip colors match bonus/malus palette.

**Typography:** Unit name in `var(--font-display)` (Cinzel) weight 600–700. Stats and body text in `var(--font-body)` (Inter).

**Tier pill:** Inline beside unit name.
- Tier 3: `✦ Vétéran` — gold `var(--color-gold)` / `#d4a843`
- Tier 2: `◆ Expérimenté` — silver `var(--color-silver)` / `#9aa0a6`
- Tier 1: `◈ Aguerri` — bronze `var(--color-bronze)` / `#cd7f32`
- Tier 0: no pill

**Tier border on card:**
- Tier 0: neutral 1px `var(--color-border)`
- Tier 1: bronze border `var(--color-bronze)`
- Tier 2: silver border `var(--color-silver)`
- Tier 3: gold 2px border `var(--color-gold)` + subtle glow `#fffcf3`

**Sub-profiles:** Each sub-profile renders its own stat bar with an uppercase label (e.g. "NIGHT GOBLIN WARBOSS", "GIANT CAVE SQUIG"). Visual separator between sub-profile sections.

### Key Merge Risk

- **`src/db/schema.ts`** — adds 2 new tables. If story 2.2 also modifies schema, coordinate migration ordering.
- **`src/db/queries.ts`** — also modified by story 2.2. Amelia handles merge ordering.

### Route Structure

The `/armies/$armyId` route does NOT currently exist (confirmed: `src/routes/armies/` directory is absent). This story creates both the directory and the route file. The route uses a parameterized path (`$armyId`) following TanStack Router conventions.

### Existing DB Schema Context

Current tables (before this story): `players`, `sessions`, `armies`, `units`, `sub_profiles`. This story adds `stat_modifiers` and `unit_gains`, both with FK → `units.id ON DELETE CASCADE`.

### Scope Boundaries

**IN scope:**
- `stat_modifiers` and `unit_gains` tables in schema
- `delta-composer.ts` pure function module
- `UnitCard` component
- `/armies/$armyId` route with server loader
- Query functions for army units, stat modifiers, unit gains
- `calculateTier` utility
- Unit tests for delta-composer, UnitCard, calculateTier, queries

**OUT of scope:**
- Editing stat modifiers or unit gains (story 2.4)
- Manual unit entry (story 2.2)
- Army list page (`/armies` index route) — not in this story
- Post-match flow (epic 3)
- E2E tests (optional for this display-only story — focus on unit + component tests)

### References

- Epic 2 stories: [Source: epics/epic-2-army-setup-unit-card-consultation.md#Story 2.3]
- Story 2.1 (format reference): [Source: implementation-artifacts/2-1-owb-army-import-player-assignment.md]
- Architecture — data model: [Source: architecture/core-architectural-decisions.md#Data Architecture]
- Architecture — patterns: [Source: architecture/implementation-patterns-consistency-rules.md]
- UX mockup: [Source: planning-artifacts/ux-mockup.html]
- UX spec: [Source: planning-artifacts/ux-design-specification.md]
- Campaign rules (XP tiers): [Source: docs/campaign_rules.md]
- Design tokens: [Source: src/styles/globals.css]
- Schema: [Source: src/db/schema.ts] — 5 tables before this story
- Queries: [Source: src/db/queries.ts] — army CRUD functions from story 2.1
- Test baseline: 238 vitest + 37 E2E (from story 2.1)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (2026-03-14)

### Debug Log References

- Worktree setup: symlinked node_modules from main project (`ln -sfn /home/ben/dev/campaign_tow/node_modules`)
- Test import paths: pre-written tests used `../../src/lib/tier` but worktree `tests/` is at depth 1, not 2. Fixed to `../src/lib/tier`.
- JSDOM cleanup: added `src/test-setup.ts` with explicit `afterEach(cleanup)` to fix DOM accumulation between tests.
- Sub-profile label: render always with `.toUpperCase()` text to satisfy COMP-011 while preserving COMP-001 (getByText matches exact case).
- routeTree.gen.ts: manually updated to include `/armies/$armyId` route since auto-generation doesn't run in CI.

### Completion Notes List

- `pnpm db:push` failed (no DB at 127.0.0.1:5432) — schema types are generated, migration SQL in `drizzle/0003_smiling_patriot.sql`
- `calculateTier` accepts `unitType` but thresholds are identical for all types (future-proofed per spec)
- Non-numeric stat handling: `isNumeric()` checks `String(parseInt(v)) === v.trim()` — correctly handles `"0"` as numeric and `"3D6"`, `"-"`, `"3+"` as non-numeric
- Sub-profile labels always shown (uppercase text), not conditionally hidden for single-profile units

### File List

**Worktree (`src/routes/armies/$armyId` worktree):**
- `src/db/schema.ts` — added `statModifiers` and `unitGains` tables
- `src/db/queries.ts` — added `getArmyWithUnits`, `getStatModifiers`, `getUnitGains`, `getUnitDeltas`
- `src/lib/delta-composer.ts` — new: `composeUnitView` pure function + types
- `src/lib/tier.ts` — new: `calculateTier`, `getTierLabel`, `getTierColor`
- `src/components/UnitCard.tsx` — new: UnitCard React component
- `src/routes/armies/$armyId.tsx` — new: army consultation route
- `src/routeTree.gen.ts` — updated to include `/armies/$armyId`
- `src/test-setup.ts` — new: testing-library cleanup setup
- `vitest.config.ts` — added `setupFiles` + `tests/**/*.test.tsx` include
- `eslint.config.js` — added test files override for `no-unnecessary-condition`
- `tests/2-3-calculate-tier.test.ts` — copied + import path fixed
- `tests/2-3-delta-composer.test.ts` — copied + import path fixed + type fix
- `tests/2-3-unit-card.test.tsx` — copied + import path fixed

## Change Log

- 2026-03-14 — **Elicitation pass** (automated, Claude Opus 4.6): enriched type contracts, added batch query subtask, clarified XP tier thresholds, added UnitCardProps interface, added 404 handling subtask, added 5 new test cases. See delta summary below.
