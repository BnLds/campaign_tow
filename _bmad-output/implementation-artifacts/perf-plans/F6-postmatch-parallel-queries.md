# Plan F6 — Parallelize Post-Match Loader Queries

**Priority:** P3 | **Effort:** M | **Dependencies:** none (backend-only, independent of other fixes)

## Objective

Restructure the `loadPostMatchDataFn` handler to execute independent database queries in parallel using `Promise.all`, reducing the loader time by 200-500ms.

## Current State

**File:** `src/routes/match/$matchId/post-match.tsx:34-163`

The handler executes ~8 database operations sequentially. Several groups are independent of each other.

### Current execution flow (sequential):

```
1. getPlayerArmy(playerId)                          // ~20-50ms
2. getMatchParticipantForEvolutionByPlayer(...)      // ~20-50ms  (independent of 1)
3. [early return if alreadyCompleted]
4. Raw drizzle query for opponent name               // ~20-50ms  (independent of 5,6)
5. getUnitsForArmy(army.id)                          // ~20-50ms  (depends on 1)
6. getMatchXpEntries(participant.id)                 // ~20-50ms  (depends on 2)
7. getUnitDeltas(unitIds)                            // ~30-80ms  (depends on 5)
8. Import parseGainStat + compute unit views         // ~5ms
```

**Total sequential:** ~155-380ms
**With parallelization:** ~70-180ms (2 parallel rounds instead of 7 sequential)

## Changes Required

### 1. Parallel round 1: army + participant

**Lines ~39-46.** These two queries are independent — parallelize:

```typescript
// BEFORE (sequential):
const army = await getPlayerArmy(context.session.playerId)
if (!army) throw new Error('ARMY_REQUIRED')
const participant = await getMatchParticipantForEvolutionByPlayer(data.matchId, context.session.playerId)
if (!participant) throw new Error('FORBIDDEN')

// AFTER (parallel):
const [army, participant] = await Promise.all([
  getPlayerArmy(context.session.playerId),
  getMatchParticipantForEvolutionByPlayer(data.matchId, context.session.playerId),
])
if (!army) throw new Error('ARMY_REQUIRED')
if (!participant) throw new Error('FORBIDDEN')
```

### 2. Early return stays the same

```typescript
if (participant.evolutionsEnteredAt !== null) {
  // Still need opponent name for the "already completed" view
  // ... (see step 3)
}
```

**Wait** — check if the `alreadyCompleted` branch returns `units: []` and `opponentPlayerName`. Currently lines 63-71 return early with `opponentPlayerName` but the opponent query runs before the early return check (lines 49-61). We need to reorganize:

- The opponent name query should run **inside** the `alreadyCompleted` branch too, OR
- Move the early return check **before** the opponent name query and handle both cases

**Recommended approach:** Fetch opponent name in parallel round 1 as well, since it's independent and needed in both paths:

```typescript
const [army, participant, oppRows] = await Promise.all([
  getPlayerArmy(context.session.playerId),
  getMatchParticipantForEvolutionByPlayer(data.matchId, context.session.playerId),
  db.select({ playerName: oppPlayerAlias.displayName })
    .from(oppParticipant)
    .innerJoin(oppPlayerAlias, dbEq(oppParticipant.playerId, oppPlayerAlias.id))
    .where(dbAnd(dbEq(oppParticipant.matchId, data.matchId), dbNe(oppParticipant.playerId, context.session.playerId)))
    .limit(1),
])
```

**Note:** The drizzle imports (`db`, `alias`, `eq`, `ne`, `and`, schema tables) need to be moved before the `Promise.all`. Currently they're on lines 49-53 — move them to the top of the handler (after the guest check).

### 3. Parallel round 2: units + xp entries (after early return check)

**Lines ~74-83.** `getUnitsForArmy` depends on `army.id`, `getMatchXpEntries` depends on `participant.id`. Both are available after round 1.

```typescript
// BEFORE (sequential):
const unitsRaw = await getUnitsForArmy(army.id)
const existingEntries = await getMatchXpEntries(participant.id)
const unitIds = unitsRaw.map((u) => u.id)
const { statModifiers, unitGains } = unitIds.length > 0
  ? await getUnitDeltas(unitIds)
  : { statModifiers: [], unitGains: [] }

// AFTER (parallel):
const [unitsRaw, existingEntries] = await Promise.all([
  getUnitsForArmy(army.id),
  getMatchXpEntries(participant.id),
])

const unitIds = unitsRaw.map((u) => u.id)
const { statModifiers: allStatModifiers, unitGains: allExistingGains } = unitIds.length > 0
  ? await getUnitDeltas(unitIds)
  : { statModifiers: [], unitGains: [] }
```

**Note:** `getUnitDeltas` depends on `unitIds` from `unitsRaw`, so it stays sequential after round 2. This is correct.

### 4. Reorganized handler structure

```
Round 1 (parallel): getPlayerArmy + getMatchParticipant + opponentName
  ├─ Validation: army? participant?
  ├─ Early return if alreadyCompleted (has opponentName from round 1)
  │
Round 2 (parallel): getUnitsForArmy + getMatchXpEntries
  │
Sequential: getUnitDeltas(unitIds)  — depends on round 2
  │
Compute: map units with stats, gains, effectiveStats
```

## Files Modified

| File | Change |
|------|--------|
| `src/routes/match/$matchId/post-match.tsx` | Restructure `loadPostMatchDataFn` handler with 2 parallel rounds |

## Acceptance Criteria

- [ ] Round 1 runs `getPlayerArmy`, `getMatchParticipantForEvolutionByPlayer`, and opponent name query in parallel
- [ ] Round 2 runs `getUnitsForArmy` and `getMatchXpEntries` in parallel
- [ ] `getUnitDeltas` still runs after round 2 (depends on unit IDs)
- [ ] `alreadyCompleted` early return still works correctly (with opponent name)
- [ ] All error handling preserved (ARMY_REQUIRED, FORBIDDEN)
- [ ] No changes to the return shape — component receives identical data
- [ ] `pnpm typecheck` passes
- [ ] E2E post-match tests pass

## Testing

- `pnpm typecheck`
- `pnpm exec playwright test` — post-match E2E tests
- Manual: navigate to post-match route → verify all unit data displays correctly
- Manual: navigate to an already-completed post-match → verify "already completed" message shows
- Performance: compare network timing before/after (expect ~50% reduction in loader time)

## Risk & Error Handling

- **Null returns vs exceptions:** `getPlayerArmy` and `getMatchParticipantForEvolutionByPlayer` return `null` on absence — they do not throw. The post-`Promise.all` validation (`if (!army) throw ...`, `if (!participant) throw ...`) handles this correctly. `Promise.all` only rejects if a query throws a real error (DB timeout, connection failure).

- **Distinguishing which query failed:** If a DB-level error occurs inside `Promise.all`, the rejection does not indicate which query failed. Wrap each promise to enrich the error:

```typescript
const [army, participant, oppRows] = await Promise.all([
  getPlayerArmy(playerId)
    .catch((e) => { throw new Error('ARMY_LOOKUP_FAILED', { cause: e }) }),
  getMatchParticipantForEvolutionByPlayer(matchId, playerId)
    .catch((e) => { throw new Error('PARTICIPANT_LOOKUP_FAILED', { cause: e }) }),
  db.select(/* ... */)
    .catch((e) => { throw new Error('OPPONENT_LOOKUP_FAILED', { cause: e }) }),
])
```

- **Import ordering:** Moving drizzle imports before `Promise.all` changes the dynamic import timing slightly. Verify the handler still works when the opponent query runs in parallel with the other two.
