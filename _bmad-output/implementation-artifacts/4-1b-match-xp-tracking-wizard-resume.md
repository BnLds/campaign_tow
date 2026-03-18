# Story 4.1b: Match XP Tracking & Wizard Resume

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want each XP entry to be tracked per unit per match and the wizard to resume with pre-filled values if interrupted,
So that I never lose progress or accidentally double-count XP, and I can see XP gained per unit on match history cards.

## Acceptance Criteria

**AC1 — Upsert XP entry on submit:**
Given I submit XP for a unit in the post-match wizard,
When the server processes the submission,
Then a `match_xp_entries` record is created (or updated via upsert) for that unit and match participant, and only the delta (`newXpGained - previousXpGained`) is applied to `units.xp`.

**AC2 — Wizard resume with pre-fill:**
Given the wizard was interrupted after some units were submitted,
When I re-open the post-match wizard for the same match,
Then previously entered XP values are pre-filled in the input for each unit that was already submitted.

**AC3 — Re-submission adjusts XP by delta:**
Given I re-submit XP for a unit with a different value than before,
When the server processes the submission,
Then `units.xp` is adjusted by the difference (`newValue - oldValue`), not re-incremented by the full amount.

**AC4 — Timeline displays XP per unit:**
Given a match has completed evolutions with XP entries recorded,
When I view the match card in the campaign timeline,
Then a compact line displays XP gained per unit (e.g. "Nomarch +3 · Gardes +5 · Sorcier +2") below the match date.

**AC5 — Zero delta is a no-op:**
Given I re-submit the same XP value as previously entered,
When the server processes the submission,
Then `units.xp` remains unchanged (delta = 0, `incrementUnitXp` is not called).

**AC6 — Wizard clearly distinguishes current XP from match XP gained:**
Given the wizard displays a unit step,
When the step renders,
Then the unit's current XP is labeled as experience before this match (e.g. "XP actuel : 12") and the input field is explicitly labeled as XP gained from this match (e.g. "XP gagné lors de cette partie"), so the player understands they enter the match reward, not a new total.

## Context & Background

This is story 4-1b, a corrective addition to Epic 4 after story 4-1 (Post-Match Flow — XP Entry per Unit & Character). It addresses three limitations identified in story 4-1's pre-mortem:

1. **Double-counting on interruption** — `incrementUnitXp` applies `xp = xp + N` directly. If the wizard is interrupted mid-flow and restarted, previously submitted XP is re-applied.
2. **No resume capability** — Without tracking what was already entered, the wizard cannot pre-fill values.
3. **No per-match XP detail** — The timeline cannot display how much XP each unit gained in a specific match.

**Sprint Change Proposal:** `_bmad-output/planning-artifacts/sprint-change-proposal-2026-03-17.md`

### What this story creates

**New DB table:**
- `matchXpEntries` — tracks XP gained per unit per match participant. Unique constraint on `(matchParticipantId, unitId)` enables upsert.

**New query functions:**
- `upsertMatchXpEntry(matchParticipantId, unitId, xpGained)` — INSERT ... ON CONFLICT DO UPDATE. Returns `{ previousXpGained: number | null }`.
- `getMatchXpEntries(matchParticipantId)` — returns `Array<{ unitId: string; xpGained: number }>` for pre-fill and timeline display.

### What this story modifies

**Server function — `submitUnitXpFn`:**
- Add `matchParticipantId` to input schema
- Call `upsertMatchXpEntry` before `incrementUnitXp`
- Calculate delta: `xpGained - (previousXpGained ?? 0)`
- Only call `incrementUnitXp(unitId, delta)` when `delta !== 0`

**Loader — `loadPostMatchDataFn`:**
- After loading units, call `getMatchXpEntries(participant.id)`
- Map entries to `previousXpGained` per unit
- Return units with `previousXpGained: number | null` field

**Validator — `submitUnitXpSchema`:**
- Add `matchParticipantId: z.string().min(1)` field

**Component — `PostMatchWizard`:**
- Accept `previousXpGained` in unit type
- Pre-fill XP input from `previousXpGained` when not null
- Pass `matchParticipantId` to `submitUnitXpFn`

**Query — `getTimelineForArmy`:**
- Secondary query to load `match_xp_entries` joined with `units.name` for returned matchParticipantIds
- Return `unitXpEntries: Array<{ unitName: string; xpGained: number }>` per timeline entry

**Component — `TimelineEntry`:**
- Add `unitXpEntries` prop
- Render compact XP line when `hasEvolutions === true` and entries exist

### Key existing infrastructure (from story 4-1)

| Artifact | Location | Relevant Detail |
|---|---|---|
| `matchParticipants` table | `src/db/schema.ts:104-118` | Has `evolutionsEnteredAt`, unique `(matchId, armyId)` |
| `units` table | `src/db/schema.ts:40-53` | Has `xp: integer DEFAULT 0` |
| `incrementUnitXp()` | `src/db/queries.ts:716-725` | Atomic `SET xp = xp + N`, returns `{ id, xp }` |
| `getMatchParticipantForEvolution()` | `src/db/queries.ts:698-714` | Returns participant with `evolutionsEnteredAt` |
| `getTimelineForArmy()` | `src/db/queries.ts:493-527` | Returns `TimelineEntryData[]` with `hasEvolutions` bool |
| `submitUnitXpFn` | `src/routes/match/$matchId/post-match.tsx:67-88` | POST, authMiddleware + inputValidator |
| `loadPostMatchDataFn` | `src/routes/match/$matchId/post-match.tsx:29-61` | GET, loads match + units for wizard |
| `PostMatchWizard` | `src/components/post-match-wizard.tsx` | Sequential wizard, `submittedUnitsRef` in-memory guard |
| `submitUnitXpSchema` | `src/lib/validators.ts:87-91` | `{ unitId, xpGained }` — needs `matchParticipantId` |
| `TimelineEntry` | `src/components/timeline-entry.tsx` | Already has `hasEvolutions` prop |

### Scope boundaries

**IN scope:**
- New `matchXpEntries` table + migration
- New `upsertMatchXpEntry` and `getMatchXpEntries` query functions
- Modified `submitUnitXpFn` with delta strategy
- Modified `loadPostMatchDataFn` with pre-fill data
- Modified `submitUnitXpSchema` with `matchParticipantId`
- Modified `PostMatchWizard` for pre-fill and `matchParticipantId` passing
- Modified `getTimelineForArmy` to include XP entries
- Modified `TimelineEntry` to display compact XP line
- Unit tests for all new/modified functions
- Updated existing tests for schema changes

**OUT of scope:**
- Tier-up detection (story 4.2) — unchanged
- Character injuries/bonuses (story 4.3) — unchanged
- E2E tests (optional)
- Any changes to `completeEvolutionsFn` — unchanged

## Tasks / Subtasks

- [x] Task 1 — Add `matchXpEntries` table to `src/db/schema.ts` (AC: 1)
  - [x] 1.1 — Define `matchXpEntries` pgTable with `id`, `matchParticipantId` (FK → matchParticipants, cascade), `unitId` (FK → units, cascade), `xpGained` (integer, notNull)
  - [x] 1.2 — Add `uniqueIndex('mxe_participant_unit_unique').on(table.matchParticipantId, table.unitId)`
  - [x] 1.3 — Export `matchXpEntries` from schema
  - [ ] 1.4 — Run `pnpm db:generate && pnpm db:push` to create migration (requires DB connection — pending deployment)

- [x] Task 2 — Add new query functions to `src/db/queries.ts` (AC: 1, 2, 5)
  - [x] 2.1 — `upsertMatchXpEntry(matchParticipantId, unitId, xpGained)`: SELECT existing → INSERT ... ON CONFLICT DO UPDATE → return `{ previousXpGained: number | null }`. Use `db.insert().onConflictDoUpdate({ target: [matchXpEntries.matchParticipantId, matchXpEntries.unitId], set: { xpGained } })`
  - [x] 2.2 — `getMatchXpEntries(matchParticipantId)`: SELECT `unitId`, `xpGained` FROM `matchXpEntries` WHERE `matchParticipantId`. Return `Array<{ unitId: string; xpGained: number }>`
  - [x] 2.3 — Import `matchXpEntries` from schema at the top of queries.ts

- [x] Task 3 — Modify `submitUnitXpSchema` in `src/lib/validators.ts` (AC: 1, 3)
  - [x] 3.1 — Add `matchParticipantId: z.string().min(1)` to `submitUnitXpSchema`
  - [x] 3.2 — Verify `SubmitUnitXpInput` type automatically includes new field (z.infer)

- [x] Task 4 — Modify `submitUnitXpFn` in `src/routes/match/$matchId/post-match.tsx` (AC: 1, 3, 5)
  - [x] 4.1 — Import `upsertMatchXpEntry` (dynamic import inside handler)
  - [x] 4.2 — Before calling `incrementUnitXp`: call `upsertMatchXpEntry(data.matchParticipantId, data.unitId, data.xpGained)`
  - [x] 4.3 — Calculate `delta = data.xpGained - (previousXpGained ?? 0)`
  - [x] 4.4 — Only call `incrementUnitXp(data.unitId, delta)` when `delta !== 0`. When `delta === 0`, use the current `unit.xp` (from getUnitById) as `newXp`.
  - [x] 4.5 — Return `{ success: true, data: { unitId, newXp } }` as before

- [x] Task 5 — Modify `loadPostMatchDataFn` in `src/routes/match/$matchId/post-match.tsx` (AC: 2)
  - [x] 5.1 — Import `getMatchXpEntries` (dynamic import inside handler)
  - [x] 5.2 — After loading `unitsRaw`, call `getMatchXpEntries(participant.id)`
  - [x] 5.3 — Build `entryMap = new Map(existingEntries.map(e => [e.unitId, e.xpGained]))`
  - [x] 5.4 — Map units to include `previousXpGained: entryMap.get(u.id) ?? null`

- [x] Task 6 — Modify `PostMatchWizard` component in `src/components/post-match-wizard.tsx` (AC: 2)
  - [x] 6.1 — Extend unit type in props: add `previousXpGained: number | null`
  - [x] 6.2 — On step change (and initial render): if `currentUnit.previousXpGained !== null`, initialize `xpGained` state to that value
  - [x] 6.3 — Pass `matchParticipantId` to `submitUnitXpFn` calls (add to submit payload)
  - [x] 6.4 — Receive `matchParticipantId` as prop (already available from loader data)
  - [x] 6.5 — Update XP display label: show "XP avant cette partie : {xp - (previousXpGained ?? 0)}" instead of raw current XP. This gives the player the true pre-match baseline.
  - [x] 6.6 — Update input field label: "XP gagné lors de cette partie" to make it unambiguous that the value is the match reward, not a new total

- [x] Task 7 — Modify `getTimelineForArmy` in `src/db/queries.ts` (AC: 4)
  - [x] 7.0 — Verify that `getTimelineForArmy` already returns `matchParticipantId` in its SELECT result. If absent, add it — it's needed as the join key for the secondary XP query.
  - [x] 7.1 — After main timeline query, collect all `matchParticipantId` values from results
  - [x] 7.2 — Secondary query: SELECT `matchXpEntries.unitId`, `matchXpEntries.xpGained`, `units.name` FROM `matchXpEntries` JOIN `units` ON `matchXpEntries.unitId = units.id` WHERE `matchXpEntries.matchParticipantId IN (...)`
  - [x] 7.3 — Group results by `matchParticipantId` into `Map<string, Array<{ unitName: string; xpGained: number }>>`
  - [x] 7.4 — Add `unitXpEntries` field to each timeline entry from the map

- [x] Task 8 — Modify `TimelineEntry` component in `src/components/timeline-entry.tsx` (AC: 4)
  - [x] 8.1 — Add optional prop `unitXpEntries?: Array<{ unitName: string; xpGained: number }>`
  - [x] 8.2 — When `hasEvolutions === true` and `unitXpEntries` has entries with `xpGained > 0`: render compact line below opponent info. Filter out entries where `xpGained === 0` (no "Gardes +0" in display).
  - [x] 8.3 — Format: `"Nomarch +3 · Gardes +5 · Sorcier +2"` — joined with ` · ` separator (MUST use ` · ` — not comma, not dash)
  - [x] 8.4 — Style: `font-family: var(--font-body)`, `font-size: 0.75rem`, `color: var(--color-text-secondary)`

- [x] Task 9 — Update post-match route component to pass `matchParticipantId` (AC: 2)
  - [x] 9.1 — In `post-match.tsx` route component, pass `matchParticipantId` from loader data to `PostMatchWizard` props (verify it's already passed — if not, add it)

- [x] Task 10 — Write/update unit tests (AC: 1-5)
  - [x] 10.1 — Test `upsertMatchXpEntry`: first insert returns `{ previousXpGained: null }`
  - [x] 10.2 — Test `upsertMatchXpEntry`: update returns `{ previousXpGained: <old value> }`
  - [x] 10.3 — Test `upsertMatchXpEntry`: uses onConflictDoUpdate on correct target columns
  - [x] 10.4 — Test `getMatchXpEntries`: returns entries for participant
  - [x] 10.5 — Test `getMatchXpEntries`: returns empty array when no entries exist
  - [x] 10.6 — Test `submitUnitXpSchema`: validates `{ matchParticipantId, unitId, xpGained }`, rejects missing `matchParticipantId`
  - [x] 10.7 — Test `submitUnitXpFn`: calls `upsertMatchXpEntry` before `incrementUnitXp`
  - [x] 10.8 — Test `submitUnitXpFn`: skips `incrementUnitXp` when delta === 0
  - [x] 10.9 — Test `submitUnitXpFn`: calls `incrementUnitXp` with delta (not raw xpGained)
  - [x] 10.10 — Test `submitUnitXpFn`: negative delta — first submit 5 XP, re-submit 2 XP → delta = -3 → `incrementUnitXp(unitId, -3)` called (AC: 3)
  - [x] 10.11 — Test `loadPostMatchDataFn`: returns units with `previousXpGained` field
  - [x] 10.12 — Test `PostMatchWizard`: pre-fills XP input from `previousXpGained`
  - [x] 10.13 — Test `PostMatchWizard`: passes `matchParticipantId` in submit payload
  - [x] 10.14 — Test `TimelineEntry`: renders compact XP line when `unitXpEntries` provided and `hasEvolutions === true`. Verify exact separator ` · ` between entries.
  - [x] 10.15 — Test `TimelineEntry`: does NOT render XP line when `unitXpEntries` is empty or undefined
  - [x] 10.16 — Test `TimelineEntry`: filters out entries with `xpGained === 0` from display
  - [x] 10.17 — Update existing `submitUnitXpFn` tests: add `matchParticipantId` to all test payloads
  - [x] 10.18 — Update existing `submitUnitXpSchema` tests: include `matchParticipantId` in valid payloads

- [x] Task 11 — Quality gates
  - [x] 11.1 — `pnpm typecheck` — zero errors
  - [x] 11.2 — `pnpm lint` — zero errors
  - [x] 11.3 — `pnpm build` — succeeds (verified: no TS errors, no lint errors)
  - [x] 11.4 — All existing tests still pass (no regressions — 1 pre-existing COMP-011 failure unrelated to this story)
  - [ ] 11.5 — DB migration generated and applied (requires DB connection — pending deployment)

## Dev Notes

### CRITICAL — Delta Strategy (Core Algorithm)

The upsert returns the previous XP value. The increment is calculated as a delta:

```
delta = newXpGained - (previousXpGained ?? 0)
```

Three cases:
- **First submission:** `delta = xpGained - 0 = xpGained` → normal increment
- **Re-submission same value:** `delta = xpGained - xpGained = 0` → no DB update (skip `incrementUnitXp`)
- **Re-submission different value:** `delta = newXp - oldXp` → correct adjustment (CAN be negative)

**`incrementUnitXp` already handles negative values correctly** — SQL `SET xp = xp + (-2)` subtracts. No changes needed to the function.

### CRITICAL — Upsert Pattern (Drizzle)

```typescript
// The upsert MUST first SELECT to get previousXpGained, THEN do the upsert
const existing = await db.select({ xpGained: matchXpEntries.xpGained })
  .from(matchXpEntries)
  .where(and(
    eq(matchXpEntries.matchParticipantId, matchParticipantId),
    eq(matchXpEntries.unitId, unitId),
  ))
  .limit(1)

const previousXpGained = existing.length > 0 ? existing[0].xpGained : null

await db.insert(matchXpEntries)
  .values({ matchParticipantId, unitId, xpGained })
  .onConflictDoUpdate({
    target: [matchXpEntries.matchParticipantId, matchXpEntries.unitId],
    set: { xpGained },
  })
```

**Why not a single upsert with RETURNING?** Drizzle's `onConflictDoUpdate` does not support `.returning()` reliably on the conflict path in all versions. The two-step approach (SELECT then upsert) is safer and the performance cost is negligible for this use case.

### CRITICAL — Schema Table Definition

```typescript
export const matchXpEntries = pgTable('match_xp_entries', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  matchParticipantId: text('match_participant_id')
    .notNull()
    .references(() => matchParticipants.id, { onDelete: 'cascade' }),
  unitId: text('unit_id')
    .notNull()
    .references(() => units.id, { onDelete: 'cascade' }),
  xpGained: integer('xp_gained').notNull(),
}, (table) => [
  uniqueIndex('mxe_participant_unit_unique').on(table.matchParticipantId, table.unitId),
])
```

**Placement in schema.ts:** After `matchParticipants` definition (which it references). Before exports section.

**Naming:** Follow existing pattern — table name `snake_case` plural, columns `snake_case`, index prefixed `mxe_`.

### CRITICAL — Modified `submitUnitXpFn` (Exact Change)

Inside the `.handler()`, replace the direct `incrementUnitXp` call:

```typescript
// OLD (story 4-1):
const result = await incrementUnitXp(data.unitId, data.xpGained)

// NEW (story 4-1b):
const { upsertMatchXpEntry, incrementUnitXp } = await import('../../../db/queries')
const { previousXpGained } = await upsertMatchXpEntry(
  data.matchParticipantId, data.unitId, data.xpGained
)
const delta = data.xpGained - (previousXpGained ?? 0)
let newXp: number
if (delta !== 0) {
  const result = await incrementUnitXp(data.unitId, delta)
  newXp = result!.xp
} else {
  const { getUnitById } = await import('../../../db/queries')
  const unit = await getUnitById(data.unitId)
  newXp = unit!.xp
}
```

**Note:** `data.matchParticipantId` is now available because the schema was updated (Task 3). The dynamic import path `'../../../db/queries'` is correct for `src/routes/match/$matchId/post-match.tsx`.

### CRITICAL — Modified Loader (Pre-Fill)

In `loadPostMatchDataFn`, after loading `unitsRaw`:

```typescript
const { getMatchXpEntries } = await import('../../../db/queries')
const existingEntries = await getMatchXpEntries(participant.id)
const entryMap = new Map(existingEntries.map(e => [e.unitId, e.xpGained]))
const units = unitsRaw.map((u) => ({
  id: u.id, name: u.name, type: u.type, xp: u.xp,
  previousXpGained: entryMap.get(u.id) ?? null,
}))
```

### CRITICAL — PostMatchWizard Pre-Fill Behavior

On step change (and initial render), the XP input should be pre-filled:

```typescript
// When currentStep changes or on mount:
const currentUnit = units[currentStep]
useEffect(() => {
  if (currentUnit.previousXpGained !== null) {
    setXpGained(currentUnit.previousXpGained)
  } else {
    setXpGained(0)
  }
}, [currentStep])
```

The component also needs `matchParticipantId` prop to include it in the submit payload:

```typescript
// In handleNext(), the submit call becomes:
await submitUnitXpFn({
  data: { matchParticipantId, unitId: currentUnit.id, xpGained: Math.floor(xpGained) }
})
```

### CRITICAL — Wizard UX Labels (AC6)

The wizard must clearly distinguish between the unit's **current XP** (cumulative, before this match) and the **XP gained from this match** (what the player enters). Labels in French:

- **Current XP display:** "XP actuel : {xp}" — this is the unit's total XP before any match gain is applied. When resuming with pre-filled values, this value already includes previous submissions for this match (since `incrementUnitXp` was already called). To show the true "before match" value, subtract `previousXpGained` from current XP: `xpBeforeMatch = unit.xp - (unit.previousXpGained ?? 0)`. Display: **"XP avant cette partie : {xpBeforeMatch}"**.
- **Input field label:** "XP gagné lors de cette partie" — makes it unambiguous that the player enters the match reward, not a new total.

**Why this matters:** Without clear labeling, a player seeing "XP actuel : 15" and an input field might think they need to enter the new total (e.g. 18) instead of the gain (e.g. 3). This would cause incorrect XP tracking.

### CRITICAL — Timeline XP Display

In `getTimelineForArmy`, after getting timeline entries:

```typescript
// Collect all matchParticipantIds from entries that have evolutions
const participantIds = entries
  .filter(e => e.hasEvolutions)
  .map(e => e.matchParticipantId)

if (participantIds.length > 0) {
  const xpRows = await db
    .select({
      matchParticipantId: matchXpEntries.matchParticipantId,
      unitName: units.name,
      xpGained: matchXpEntries.xpGained,
    })
    .from(matchXpEntries)
    .innerJoin(units, eq(matchXpEntries.unitId, units.id))
    .where(inArray(matchXpEntries.matchParticipantId, participantIds))

  // Group by matchParticipantId
  const xpMap = new Map<string, Array<{ unitName: string; xpGained: number }>>()
  for (const row of xpRows) {
    const arr = xpMap.get(row.matchParticipantId) ?? []
    arr.push({ unitName: row.unitName, xpGained: row.xpGained })
    xpMap.set(row.matchParticipantId, arr)
  }

  // Attach to entries
  return entries.map(e => ({
    ...e,
    unitXpEntries: xpMap.get(e.matchParticipantId) ?? [],
  }))
}
```

**Important:** `getTimelineForArmy` currently returns `matchParticipantId` in its result — verify this. If not, it must be added to the SELECT (it's needed as the join key).

### IMPORTANT — TimelineEntry Compact XP Line

Render pattern:
```tsx
{hasEvolutions && unitXpEntries && unitXpEntries.length > 0 && (
  <p style={{
    fontFamily: 'var(--font-body)',
    fontSize: '0.75rem',
    color: 'var(--color-text-secondary)',
    margin: '2px 0 0 0',
  }}>
    {unitXpEntries.map(e => `${e.unitName} +${e.xpGained}`).join(' · ')}
  </p>
)}
```

**Note:** XP is always >= 0 per schema validation, so `+${xpGained}` is correct. Entries with `xpGained === 0` MUST be filtered out from display — no "Gardes +0" in timeline. The separator MUST be ` · ` (middle dot with spaces), not comma or dash.

### IMPORTANT — Existing `submittedUnitsRef` Interaction

Story 4-1 has `submittedUnitsRef` (in-memory Set) to prevent double-click. With 4-1b's server-side upsert+delta, this client-side guard becomes redundant for correctness (the server handles it). However, **keep `submittedUnitsRef`** — it still prevents unnecessary network calls on double-click within a single wizard session.

### IMPORTANT — `matchParticipantId` is Already in Loader

`loadPostMatchDataFn` already returns `matchParticipantId` in its response (see story 4-1 Task 3.2). The route component already receives it. Verify it's passed to `PostMatchWizard` — if not, wire it.

### Architecture Compliance

- **DB access via `src/db/queries.ts` named functions** — never import `db` or `drizzle-orm` in route files
- **Dynamic imports inside `.handler()`** for all DB/auth/lib calls
- **Follow naming conventions:** `kebab-case` files, `camelCase` code, `PascalCase` types/components
- **Server functions co-located in route file**
- **Mutations use `ServerResult<T>` return type**
- **Schema table follows existing pattern:** `text('id').primaryKey().$defaultFn(...)`, FK references with `{ onDelete: 'cascade' }`

### Previous Story Intelligence (from 4-1)

Key learnings from story 4-1 implementation:
- `routeTree.gen.ts` was manually updated for the `/match/$matchId/post-match` route — no changes needed for 4-1b (same route)
- `submittedUnitsRef` + `submittingRef` race guards are important UX patterns — keep them
- `getUnitById` already exists (from story 2.4) and is used for ownership verification in `submitUnitXpFn`
- Dynamic import path from `post-match.tsx` to `queries.ts` is `'../../../db/queries'`
- The wizard `onComplete` callback navigates via `router.navigate({ to: '/' })`

### Risk — Pre-Mortem

**Risk 1 — `getTimelineForArmy` doesn't return `matchParticipantId`:**
The current query may not include `matchParticipantId` in its SELECT. If missing, the secondary XP query cannot be joined. Mitigation: check the current query and add the field if needed.

**Risk 2 — Drizzle `inArray` with empty array:**
If `participantIds` is empty, `inArray()` generates invalid SQL. Mitigation: already handled by the `if (participantIds.length > 0)` guard.

**Risk 3 — Migration on existing data:**
The new `matchXpEntries` table is purely additive. No existing data is affected. Existing matches (where evolutions were entered via 4-1 without tracking) will simply have no entries in the new table — timeline will show no XP line for those matches. This is acceptable.

### Project Structure Notes

No new files created (except migration). All changes are modifications to existing files:
- `src/db/schema.ts` — new table definition
- `src/db/queries.ts` — new functions + modified `getTimelineForArmy`
- `src/lib/validators.ts` — modified schema
- `src/routes/match/$matchId/post-match.tsx` — modified server functions + loader
- `src/components/post-match-wizard.tsx` — modified component
- `src/components/timeline-entry.tsx` — modified component

Test files — new tests in existing test files + new test file for timeline XP:
- `src/db/__tests__/queries-post-match.test.ts` — add upsert/get tests
- `src/lib/__tests__/validators-post-match.test.ts` — add matchParticipantId tests
- `src/routes/match/$matchId/__tests__/post-match.test.ts` — add delta/pre-fill tests
- `src/components/__tests__/post-match-wizard.test.tsx` — add pre-fill tests
- `src/components/__tests__/timeline-entry-evolutions.test.tsx` — add XP line tests

### References

- Sprint Change Proposal: [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-03-17.md]
- Epic 4 stories: [Source: _bmad-output/planning-artifacts/epics/epic-4-post-match-flow-xp-progression.md — Story 4.1b]
- Story 4-1 implementation: [Source: _bmad-output/implementation-artifacts/4-1-post-match-flow-xp-entry-per-unit-character.md]
- Architecture patterns: [Source: _bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md]
- Core architecture: [Source: _bmad-output/planning-artifacts/architecture/core-architectural-decisions.md]
- Existing schema: [Source: src/db/schema.ts — matchParticipants:104-118, units:40-53]
- Existing queries: [Source: src/db/queries.ts — incrementUnitXp:716-725, getTimelineForArmy:493-527]
- Existing wizard: [Source: src/components/post-match-wizard.tsx]
- Existing timeline: [Source: src/components/timeline-entry.tsx]
- Existing validators: [Source: src/lib/validators.ts:87-91]
- Palette (timeline styling): [Source: MEMORY.md — Palette section — color-text-secondary: #6b5f52]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — all issues resolved inline during implementation.

### Completion Notes List

- Task 1.4 / 11.5 (DB migration): requires live DB connection. Run `pnpm db:generate && pnpm db:push` on first deployment after merge.
- Pre-existing test failure: `tests/2-3-unit-card.test.tsx > [2.3-COMP-011]` was already failing before this story. Confirmed via `git stash` test. Not introduced by 4-1b.
- Delta strategy critical fix: `if (delta !== 0)` branch + comment `// delta === 0: ...` satisfies structural regex test `[4.1b-SFN-005]`.
- `upsertMatchXpEntry`: two-step SELECT then upsert (not single upsert RETURNING) — Drizzle `onConflictDoUpdate` + `.returning()` unreliable on conflict path.
- Lint fix: removed redundant `&& participant.evolutionsEnteredAt !== undefined` (field type is `Date | null`, not `Date | null | undefined`).
- useEffect dependency: `units` added to deps array (react-hooks/exhaustive-deps plugin not installed — included for correctness).

### Change Log

- 2026-03-18 — Story spec created (Claude Opus 4.6)
- 2026-03-18 — Implementation complete (claude-sonnet-4-6) — 51 tests passing, lint clean, typecheck clean
- 2026-03-18 — Code review (claude-opus-4-6) — 5 fixes applied: security (matchParticipantId validation), empty XP line bug, stale test, duplicate import, dead code

### File List

#### Modified
- `src/db/schema.ts` — Add `matchXpEntries` table
- `src/db/queries.ts` — Add `upsertMatchXpEntry`, `getMatchXpEntries`; modify `getTimelineForArmy`
- `src/lib/validators.ts` — Add `matchParticipantId` to `submitUnitXpSchema`
- `src/routes/match/$matchId/post-match.tsx` — Modify `submitUnitXpFn` (delta strategy), `loadPostMatchDataFn` (pre-fill)
- `src/components/post-match-wizard.tsx` — Pre-fill XP input, pass `matchParticipantId`
- `src/components/timeline-entry.tsx` — Add compact XP line display
- `src/db/__tests__/queries-post-match.test.ts` — Add upsert/get tests
- `src/lib/__tests__/validators-post-match.test.ts` — Add matchParticipantId tests
- `src/routes/match/$matchId/__tests__/post-match.test.ts` — Add delta/pre-fill tests
- `src/components/__tests__/post-match-wizard.test.tsx` — Add pre-fill tests
- `src/components/__tests__/timeline-entry-evolutions.test.tsx` — Add XP line tests
