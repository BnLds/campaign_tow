---
title: 'Initial XP Entry Flow'
slug: 'initial-xp-entry'
created: '2026-03-24'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['TanStack Start', 'Drizzle ORM', 'React', 'Tailwind v4', 'Zod v4', 'Vitest']
files_to_modify:
  - src/db/schema.ts
  - src/db/queries/matches.ts
  - src/db/queries/evolutions.ts
  - src/routes/index.tsx
  - src/routes/match/$matchId/post-match.tsx
  - src/components/post-match-wizard.tsx
  - src/components/timeline-entry.tsx
  - src/lib/validators.ts
code_patterns:
  - 'Server functions: createServerFn({ method }) .middleware([authMiddleware]) .inputValidator(schema) .handler()'
  - 'DB queries: standalone async functions in src/db/queries/'
  - 'Wizard props: injectable onSubmitUnitXp / onCompleteEvolutions for testing'
  - 'Re-entry: latest-match TOCTOU guard inside transaction (SELECT FOR UPDATE)'
  - 'Atomic commit: completeEvolutionsWithGainsTransaction() handles gains + consequences + statModifiers'
  - 'Timeline: loadCampaignTimelineFn returns timeline[] + pendingMatches[], ActionChip rendered per pending'
test_patterns:
  - 'Vitest with describe/it/expect'
  - 'Component tests in src/components/__tests__/ with @testing-library/react'
  - 'Wizard tests: render(<PostMatchWizard ... onSubmitUnitXp={vi.fn()} onCompleteEvolutions={vi.fn()} />)'
  - 'Server/integration tests in tests/ or src/routes/__tests__/'
---

# Tech-Spec: Initial XP Entry Flow

**Created:** 2026-03-24

## Overview

### Problem Statement

When a player joins a campaign mid-way, their army units already have accumulated XP, tier-up gains, and potentially losses/injuries. Without a mechanism to enter this initial state, there will be a discrepancy between the army's real state and what the app tracks. The player needs to fill in this baseline before their first real match.

### Solution

Create an "initial setup" match type (`initial_setup`) that appears as a special entry in the campaign timeline. The player clicks "Remplir l'XP initiale" and enters the full post-match wizard flow with one difference: Phase 1 uses a **direct numeric input** (total XP per unit) instead of the dynamic condition checkboxes. Phases for consequences (injuries/destructions) and tier-ups remain identical to the standard post-match flow. The initial match is re-entrable using the same guards as regular matches (latest `evolutionsEnteredAt` only).

### Scope

**In Scope:**
- `needsInitialXp` boolean flag on `armies` table
- `initial_setup` match type in schema
- Special timeline entry with ActionChip "Remplir l'XP initiale"
- Post-match wizard variant: numeric XP input in Phase 1
- Consequences and tier-up phases unchanged (full flow)
- Auto-creation of the initial match when flag is active
- Re-entry support identical to standard post-match (latest match only)
- Same architecture as standard post-match (route, server functions, wizard component)

**Out of Scope:**
- Automatic XP import from external files
- Changes to the standard post-match flow (checkboxes)
- Multi-army management

## Context for Development

### Codebase Patterns

- Post-match wizard is a 3-phase component in `post-match-wizard.tsx` (~1400 lines): Phase 1 (XP entry per unit) -> Phase 1.5 (consequences) -> Phase 2 (tier-ups) -> atomic commit
- XP conditions defined in `xp-conditions.ts` with `getXpConditionsForType()` and `computeXpTotal()`
- Timeline uses `TimelineEntry` for completed matches and `ActionChip` for pending actions
- All gains/consequences committed atomically via `completeEvolutionsWithGainsFn` in a single DB transaction
- Re-entry guard: only the latest match (by `evolutionsEnteredAt`) can be re-entered, enforced server-side in `completeEvolutionsWithGainsTransaction` with SELECT FOR UPDATE + latest-match check (TOCTOU-safe)
- Match data loaded via `loadPostMatchDataFn` which computes `previousXpGained` per unit for re-entry
- Server functions follow pattern: `createServerFn({ method }).middleware([authMiddleware]).inputValidator(schema).handler()` returning `ServerResult<T>`
- Wizard accepts injectable `onSubmitUnitXp` and `onCompleteEvolutions` props for testing
- `submitUnitXpFn` input: `{ matchParticipantId, unitId, xpGained: number (0-99) }` — numeric payload reusable, but max must stay 99 for standard matches; a separate schema is needed for initial XP (0-999)
- `upsertMatchXpEntryWithIncrement` handles both first-entry and re-entry (upsert + delta increment on `units.xp`)
- **No `type` field on `matches` table currently** — all matches are generic. Need to add `matchType` enum column.
- **No flags on `armies` table currently** — need to add `needsInitialXp` boolean column.
- `matchParticipants` has unique constraint `(matchId, playerId)` — initial match has only 1 participant (no opponent)
- Pending matches: `getPendingMatches()` returns rows where `result IS NULL OR evolutionsEnteredAt IS NULL`
- Action chips in campaign view: iterate `pendingMatches`, render result-picker chip or post-match link chip

### Files to Reference

| File | Purpose | Key lines |
| ---- | ------- | --------- |
| `src/db/schema.ts` | DB schema — `matches` (L108-115), `matchParticipants` (L117-133), `armies` (L35-44), `units` (L46-61), `matchXpEntries` (L136-148) | Add `matchType` enum + column, add `needsInitialXp` on armies |
| `src/db/queries/matches.ts` | Timeline queries — `getPendingMatches()`, `getTimelineForArmy()` | Filter/display initial_setup matches differently |
| `src/db/queries/evolutions.ts` | `upsertMatchXpEntryWithIncrement()`, `completeEvolutionsWithGainsTransaction()` | Clear `needsInitialXp` flag at commit |
| `src/routes/index.tsx` | Campaign view — `loadCampaignTimelineFn()`, ActionChip rendering (L265-303) | Add initial XP action chip, auto-create initial match |
| `src/routes/match/$matchId/post-match.tsx` | `loadPostMatchDataFn`, `submitUnitXpFn`, `completeEvolutionsWithGainsFn` | Pass `mode` to wizard, handle single-participant match |
| `src/components/post-match-wizard.tsx` | Wizard — props (L77-101), Phase 1 checkboxes (L1114-1252), phase transitions (L388-406) | Add `mode` prop, conditional numeric input |
| `src/lib/xp-conditions.ts` | `XpCondition` type, `computeXpTotal()`, condition lists | Unchanged — numeric mode bypasses this |
| `src/lib/tier.ts` | `detectTierCrossings(oldXp, newXp, unitType)` | Unchanged — initial mode: oldXp=0, newXp=entered value |
| `src/lib/validators.ts` | `submitUnitXpSchema` (xpGained: 0-99 currently), `completeEvolutionsWithGainsSchema` | Add `submitInitialXpSchema` (0-999) for initial XP; keep `submitUnitXpSchema` at max 99 |
| `src/components/timeline-entry.tsx` | Match card display | Handle initial_setup display (no opponent, special label) |
| `src/components/action-chip.tsx` | Pending action chip | Unchanged — reuse with different label |
| `src/components/__tests__/post-match-wizard.test.tsx` | Wizard tests — render pattern, mock functions | Add initial-xp mode tests |

### Technical Decisions

- **`matchType` enum on `matches` table**: New enum `('standard', 'initial_setup')` with default `'standard'`. All existing matches are standard. The initial match has `matchType = 'initial_setup'` and a single `matchParticipant` with `result = NULL` (no battle result needed).
- **Numeric input in Phase 1 only**: The wizard receives a `mode: 'post-match' | 'initial-xp'` prop. Phase 1 renders a number input per unit instead of checkboxes. `submitUnitXpFn` receives the same `xpGained: number` payload but uses `submitInitialXpSchema` (max 999) when the match is `initial_setup`, keeping `submitUnitXpSchema` (max 99) for standard matches. The server function checks `matchType` to select the correct validator.
- **`needsInitialXp` flag on `armies`**: Boolean, default `true`. Set to `true` on army creation/import. Cleared to `false` in `completeEvolutionsWithGainsTransaction` when the match is `initial_setup` type. Controls visibility of the timeline action chip.
- **Auto-creation of initial match**: Separated from the GET loader to respect idempotence. A dedicated POST server function `createInitialSetupMatchFn` is called by the client when `army.needsInitialXp === true` and no `initial_setup` match exists. The GET loader (`loadCampaignTimelineFn`) only reads state. The client triggers creation on first render if needed, then the chip links to the match.
- **Re-entry**: Same mechanism as regular matches — guard checks latest `evolutionsEnteredAt`. The initial match is treated identically. When re-entered, the wizard shows `previousXpGained` as hint for each unit.
- **Timeline display**: Initial setup match shown as a special `TimelineEntry` variant — no opponent name, label "XP Initiale" instead of "vs Adversaire", no result badge.
- **Phase 1.5 (consequences) and Phase 2 (tier-ups)**: Unchanged. For initial XP, `oldXp = 0` and `newXp = entered value`, so all tier crossings from 0 to the entered XP are detected. Player selects improvements for each tier crossed. Consequences (injuries, destructions) are available for pre-campaign state.

## Implementation Plan

### Tasks

- [ ] Task 1: Add `matchType` enum and column to `matches` table
  - File: `src/db/schema.ts`
  - Action: Create `matchTypeEnum` pgEnum with values `('standard', 'initial_setup')`. Add `matchType` column to `matches` table with default `'standard'`.
  - Notes: All existing matches are implicitly `standard`. Default ensures backward compatibility.

- [ ] Task 2: Add `needsInitialXp` boolean column to `armies` table
  - File: `src/db/schema.ts`
  - Action: Add `needsInitialXp` boolean column to `armies` table, default `true`, not null.
  - Notes: Default `true` means every new/imported army needs initial XP entry. Existing armies in DB will need a migration to set this to `false` (they already have matches).

- [ ] Task 3: Run Drizzle migration
  - Action: `pnpm db:generate && pnpm db:push`
  - Notes: After schema changes. Write a manual SQL migration to set `needsInitialXp = false` for all existing armies that already have at least one match with `evolutionsEnteredAt IS NOT NULL`.

- [ ] Task 4: Add `createInitialSetupMatch` query function
  - File: `src/db/queries/matches.ts`
  - Action: Create `createInitialSetupMatch(playerId: string, armyId: string): Promise<string>` that inserts a `matches` row with `matchType = 'initial_setup'`, `createdByPlayerId = playerId`, `date = NOW()` and a single `matchParticipants` row with `playerId`, `armyId`, `result = NULL`, `evolutionsEnteredAt = NULL`. Return the match ID. Guard: if an `initial_setup` match already exists for this army, return the existing match ID (idempotent).
  - Notes: No opponent participant. The match `date` is the creation date (not a battle date).

- [ ] Task 5: Add `getInitialSetupMatchForArmy` query function
  - File: `src/db/queries/matches.ts`
  - Action: Create `getInitialSetupMatchForArmy(armyId: string): Promise<{ matchId: string; matchParticipantId: string; evolutionsEnteredAt: Date | null } | null>` that joins `matches` + `matchParticipants` where `matchType = 'initial_setup'` and `matchParticipants.armyId = armyId`.
  - Notes: Used by campaign view to check if initial match exists and its status.

- [ ] Task 6a: Add `createInitialSetupMatchFn` POST server function
  - File: `src/routes/index.tsx`
  - Action: Create a POST server function `createInitialSetupMatchFn` that calls `createInitialSetupMatch(playerId, army.id)` and returns the match ID. Middleware: `authMiddleware`. This separates the mutation from the GET loader.
  - Notes: Called by the client component when `needsInitialXp === true` and no initial match exists yet.

- [ ] Task 6b: Update `loadCampaignTimelineFn` and campaign view component
  - File: `src/routes/index.tsx`
  - Action: In the GET loader, if `army.needsInitialXp === true`, call `getInitialSetupMatchForArmy(army.id)` and return `initialSetupMatch` data (or `null`). In the component: if `needsInitialXp && !initialSetupMatch`, call `createInitialSetupMatchFn` on mount (useEffect with a `useRef` guard to prevent double invocation in React Strict Mode), then display ActionChip. If `initialSetupMatch` exists and `evolutionsEnteredAt === null`, display two ActionChips: "XP initiale a remplir" linking to `/match/{matchId}/post-match`, and "Passer l'XP initiale" which calls `skipInitialXpFn` (see Task 6c).
  - Notes: The initial XP chips should appear BEFORE regular pending match chips (higher priority). Once `evolutionsEnteredAt` is set, the chips disappear. Once `needsInitialXp` is cleared to `false`, the entire check is skipped. The `useRef` guard pattern: `const calledRef = useRef(false); useEffect(() => { if (calledRef.current) return; calledRef.current = true; createInitialSetupMatchFn(...) }, [])`.

- [ ] Task 6c: Add `skipInitialXpFn` POST server function
  - File: `src/routes/index.tsx`
  - Action: Create a POST server function `skipInitialXpFn` that sets `armies.needsInitialXp = false` for the player's army. If an incomplete `initial_setup` match exists, delete it (and its `matchParticipants` row). Middleware: `authMiddleware`.
  - Notes: Allows the player to skip the initial XP flow entirely (e.g., army genuinely starts at 0 XP). The "Passer l'XP initiale" chip calls this, then the page reloads and no initial XP chip appears.

- [ ] Task 7: Update `getPendingMatches` and `getTimelineForArmy` to handle `initial_setup`
  - File: `src/db/queries/matches.ts`
  - Action:
    1. Add `WHERE matchType != 'initial_setup'` filter to `getPendingMatches()` query so initial matches never appear as regular pending items.
    2. Update `getTimelineForArmy()`: include `matchType` in returned data; change the opponent JOIN from INNER to LEFT JOIN so `initial_setup` matches (no opponent participant) are still returned. Return `opponent: null` when the LEFT JOIN yields no row.
    3. Audit any other query in `matches.ts` that assumes an opponent participant exists (e.g. `getMatchParticipantByMatchAndPlayer`) and add `matchType` awareness or LEFT JOIN where needed.
  - Notes: **Tasks 1, 2, and 7 MUST be deployed together in a single commit before Task 3 (migration).** The schema adds the column with default `'standard'`, so existing rows are safe. But the query filter must be present in the same deployment to prevent ghost ActionChips for any `initial_setup` match created between deploy and migration.

- [ ] Task 8: Update `loadPostMatchDataFn` to handle `initial_setup` match
  - File: `src/routes/match/$matchId/post-match.tsx`
  - Action: In the loader, load the match row to get `matchType`. If `matchType === 'initial_setup'`: skip opponent name lookup (no opponent), set `opponentPlayerName = null`. Pass `mode: 'initial-xp'` in returned data. For re-entry check: same logic applies (latest match guard). The initial match may be the only match, in which case it is always the latest.
  - Notes: The route component reads `mode` from loader data and passes it as prop to the wizard.

- [ ] Task 9: Add `mode` prop to `PostMatchWizard` and implement numeric XP input
  - File: `src/components/post-match-wizard.tsx`
  - Action: Add `mode?: 'post-match' | 'initial-xp'` to `PostMatchWizardProps` (default `'post-match'`). Extract Phase 1 rendering into two internal sub-components: `XpCheckboxStep` (existing checkbox logic) and `XpNumericStep` (new numeric input). The wizard parent manages state; only the rendering differs. `XpNumericStep` renders `<input type="number" min={0} max={999} />` per unit. On "Suivant", call `submitUnitXpFn` with `xpGained = inputValue`. Store result in `xpResultsRef` identically. Phase header: show "XP initiale" instead of "XP gagne lors de cette partie". Re-entry hint: show `previousXpGained` as pre-filled value in the input.
  - Notes: All other phases (1.5 consequences, 2 tier-ups) remain completely unchanged. The `oldXp` for tier crossing detection = `unit.xp - (previousXpGained ?? 0)` which is 0 on first entry (unit starts at 0 XP). Extracting sub-components keeps the diff clean and the wizard readable. **Edge case: 0 units** — if `units.length === 0`, the wizard must skip Phase 1 entirely and proceed directly to the atomic commit with empty gains (no consequences, no tier-ups). This applies to both modes.

- [ ] Task 10: Update `completeEvolutionsWithGainsTransaction` to clear `needsInitialXp`
  - File: `src/db/queries/evolutions.ts`
  - Action: Accept an optional `matchType` parameter. If `matchType === 'initial_setup'`, at the end of the transaction (after all gains/consequences are inserted and `evolutionsEnteredAt` is set), update `armies SET needsInitialXp = false WHERE id = armyId`.
  - Notes: The `armyId` is already available in the transaction. The flag clear is atomic with the rest of the commit.

- [ ] Task 11: Update `completeEvolutionsWithGainsFn` server function to pass `matchType`
  - File: `src/routes/match/$matchId/post-match.tsx`
  - Action: In the handler, query the `matches` table by `matchId` to get `matchType` server-side (do NOT accept `matchType` from the client input — the client could lie). Use: `const [match] = await db.select({ matchType: matches.matchType }).from(matches).where(eq(matches.id, input.matchId))`. Pass `match.matchType` to `completeEvolutionsWithGainsTransaction()`.
  - Notes: The extra SELECT is cheap (PK lookup) and ensures the `matchType` is authoritative. Do not add `matchType` to the client-facing input schema.

- [ ] Task 12: Update `TimelineEntry` to display initial setup match
  - File: `src/components/timeline-entry.tsx`
  - Action: Add `matchType?: 'standard' | 'initial_setup'` to props (default `'standard'`). **Make `opponent` prop optional** (`opponent?: { name: string; faction: string; playerName?: string } | null`). Guard all `opponent.*` accesses with a null check. If `matchType === 'initial_setup'`: display "XP Initiale" as title instead of opponent name, hide result badge (no V/D/E), show date normally, show unit XP entries normally (same as regular match). For re-entry: show "Modifier" button if `isLatestMatch`.
  - Notes: Reuses existing component with conditional rendering, not a new component. The `opponent` prop MUST become optional because `getTimelineForArmy` will return `opponent: null` for `initial_setup` matches (LEFT JOIN yields no opponent row).

- [ ] Task 13: Add wizard tests for `initial-xp` mode
  - File: `src/components/__tests__/post-match-wizard.test.tsx`
  - Action: Add test suite `describe('initial-xp mode')` with tests:
    - Renders numeric input instead of checkboxes when `mode="initial-xp"`
    - Submits entered numeric value via `onSubmitUnitXp`
    - Proceeds through all units sequentially
    - Transitions to consequences phase after last unit
    - Transitions to tier-up phase when tier crossings detected
    - Shows `previousXpGained` as pre-filled value on re-entry
    - Shows "XP initiale" header instead of standard header
  - Notes: Follow existing test patterns — inject `onSubmitUnitXp` and `onCompleteEvolutions` as vi.fn() mocks.

- [ ] Task 14: Add `submitInitialXpSchema` for initial XP validation
  - File: `src/lib/validators.ts`
  - Action: Keep `submitUnitXpSchema` unchanged (max 99). Add a new `submitInitialXpSchema` identical to `submitUnitXpSchema` but with `xpGained: z.number().int().min(0).max(999)`. Export both. In `submitUnitXpFn` (Task 8/post-match.tsx), select the correct schema based on `matchType`: use `submitInitialXpSchema` when `matchType === 'initial_setup'`, otherwise `submitUnitXpSchema`. The `matchType` is loaded server-side (same PK lookup as Task 11).
  - Notes: This prevents a client from submitting `xpGained: 500` on a standard match. Two schemas, one server-side gate.

- [ ] Task 15: Add integration tests for initial setup match lifecycle
  - File: `src/routes/__tests__/initial-xp.test.ts` (new)
  - Action: Add integration tests:
    - `createInitialSetupMatch` idempotency: calling twice for same army returns same match ID
    - `completeEvolutionsWithGainsTransaction` with `matchType='initial_setup'`: verify `armies.needsInitialXp` is set to `false`
    - `getPendingMatches` excludes `initial_setup` matches
    - `getTimelineForArmy` returns `initial_setup` matches with `opponent: null` (LEFT JOIN works)
    - `submitUnitXpFn` rejects `xpGained: 500` on a standard match (max 99 enforced)
    - `submitUnitXpFn` accepts `xpGained: 500` on an `initial_setup` match (max 999)
    - `skipInitialXpFn`: clears flag, deletes incomplete initial match and its participant row
    - Edge case: army with 0 units — wizard skips Phase 1, goes directly to commit with empty gains
    - Edge case: re-entry blocked after a standard match is completed (latest-match guard)
  - Notes: Follow existing integration test patterns in `src/routes/__tests__/`.

### Acceptance Criteria

- [ ] AC 1: Given a newly created/imported army, when the player opens the campaign view, then an ActionChip "XP initiale a remplir" is displayed in the action strip before any regular pending match chips.

- [ ] AC 2: Given the initial XP action chip is displayed, when the player taps it, then they are navigated to `/match/{initialMatchId}/post-match` and the wizard opens in `initial-xp` mode.

- [ ] AC 3: Given the wizard is in `initial-xp` mode Phase 1, when the player sees a unit step, then a numeric input (0-999) is shown instead of condition checkboxes, with label "XP totale" and the unit name/type displayed.

- [ ] AC 4: Given the wizard is in `initial-xp` mode, when the player enters XP for each unit and clicks "Suivant", then `submitUnitXpFn` is called with the entered numeric value and `units.xp` is incremented accordingly.

- [ ] AC 5: Given Phase 1 is complete in `initial-xp` mode, when any units have consequence flags (MHC/destruction) checked, then Phase 1.5 consequence flow is triggered identically to standard post-match.

- [ ] AC 6: Given Phase 1 (and optionally 1.5) is complete in `initial-xp` mode, when tier crossings are detected (from 0 to entered XP), then the tier-up improvement selection Phase 2 is triggered for each crossing, identically to standard post-match.

- [ ] AC 7: Given all phases are complete in `initial-xp` mode, when `completeEvolutionsWithGainsFn` commits, then `armies.needsInitialXp` is set to `false` and `matchParticipants.evolutionsEnteredAt` is set.

- [ ] AC 8: Given the initial XP flow has been completed, when the player opens the campaign view, then the "XP initiale a remplir" chip no longer appears, and the initial match is shown in the timeline as "XP Initiale" (no opponent, no result badge).

- [ ] AC 9: Given the initial XP match is the latest match (no other match completed after it), when the player views it in the timeline, then a "Modifier" button is available, and tapping it re-opens the wizard with `previousXpGained` pre-filled in the numeric inputs.

- [ ] AC 10: Given the initial XP match has been completed and a regular match is completed after it, when the player views the initial match in the timeline, then the "Modifier" button is NOT available (latest-match guard).

- [ ] AC 11: Given the `initial_setup` match exists, when `getPendingMatches` is called, then the initial match is NOT included in the regular pending matches list (it has its own dedicated chip).

- [ ] AC 12: Given the initial XP chip is displayed, when the player taps "Passer l'XP initiale", then `armies.needsInitialXp` is set to `false`, any incomplete `initial_setup` match is deleted, and the chip disappears on reload.

- [ ] AC 13: Given a standard post-match, when `submitUnitXpFn` is called with `xpGained > 99`, then validation rejects the request (max 99 for standard matches). Given an `initial_setup` match, `xpGained` up to 999 is accepted.

## Additional Context

### Dependencies

- Existing post-match wizard infrastructure (Phase 1, 1.5, 2 flow)
- Existing timeline/action chip components
- Drizzle schema migration system (`pnpm db:generate && pnpm db:push`)
- Existing `submitUnitXpFn` and `completeEvolutionsWithGainsFn` server functions

### Testing Strategy

**Unit tests (Vitest + testing-library) — Task 13:**
- Wizard `initial-xp` mode: numeric input rendering, value submission, phase transitions, re-entry pre-fill
- Test that checkboxes are NOT rendered in `initial-xp` mode
- Test that numeric input accepts values 0-999
- Test "XP initiale" header text
- Test 0 units: wizard skips Phase 1 and commits immediately

**Integration tests — Task 15:**
- `createInitialSetupMatch` idempotency: calling twice returns same match ID
- `completeEvolutionsWithGainsTransaction` with `matchType='initial_setup'`: verify `needsInitialXp` is cleared
- `getPendingMatches` excludes `initial_setup` matches
- `getTimelineForArmy` returns `initial_setup` matches with `opponent: null` (LEFT JOIN)
- `loadPostMatchDataFn` returns `mode='initial-xp'` for initial setup matches
- `submitUnitXpFn` rejects `xpGained > 99` for standard matches, accepts up to 999 for `initial_setup`
- `skipInitialXpFn`: sets `needsInitialXp = false`, deletes incomplete initial match
- Edge case: army with 0 units — wizard skips Phase 1, commits empty
- Edge case: re-entry blocked after standard match completed (latest-match guard)

**Manual testing:**
- Create new army → verify initial XP chip + "Passer" chip appear
- Tap "Passer l'XP initiale" → verify both chips disappear, no timeline entry created
- Complete initial XP flow → verify chip disappears, timeline entry shows "XP Initiale"
- Re-enter initial XP flow → verify numeric inputs show previous values
- Complete a regular match after initial XP → verify initial match is no longer re-entrable
- Verify tier-up improvements are correctly computed from 0 → entered XP
- Verify data migration: existing armies have `needsInitialXp = false`

### Notes

- **Data migration for existing armies**: Existing armies that already have matches need `needsInitialXp = false`. Write a one-time migration: `UPDATE armies SET needsInitialXp = false WHERE id IN (SELECT DISTINCT a.id FROM armies a JOIN match_participants mp ON mp.army_id = a.id WHERE mp.evolutions_entered_at IS NOT NULL)`.
- **XP range**: `submitUnitXpSchema` stays at max 99 for standard matches. A separate `submitInitialXpSchema` (max 999) is used for `initial_setup` matches. Server-side gate in `submitUnitXpFn` selects the correct validator based on `matchType` (loaded from DB, not from client input).
- **No opponent**: The initial match has one `matchParticipant`. `getTimelineForArmy()` must use LEFT JOIN for the opponent participant so `initial_setup` matches are returned with `opponent: null`. `TimelineEntry.opponent` prop must be optional. All other queries that JOIN on opponent participant need auditing (Task 7 step 3).
- **Phase 1 checkbox "MHC/Detruit" toggles**: These consequence flag checkboxes (per unit) should remain available in `initial-xp` mode — the player may need to declare pre-campaign injuries/destructions.
- **Champion killed checkbox**: Also remains available in `initial-xp` mode for the same reason.
