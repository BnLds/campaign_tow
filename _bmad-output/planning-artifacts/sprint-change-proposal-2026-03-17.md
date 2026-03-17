# Sprint Change Proposal — Match XP Tracking & Wizard Resume

**Date:** 2026-03-17
**Triggered by:** Story 4-1 (Post-Match Flow — XP Entry per Unit & Character)
**Scope classification:** Minor — Direct implementation by dev team
**Approved by:** (pending)

---

## 1. Issue Summary

### Problem Statement

The post-match wizard (story 4-1) uses `incrementUnitXp` which applies `xp = xp + N` directly to `units.xp` in the database on each "Suivant" click. There is no per-unit-per-match XP tracking table. This creates three problems:

1. **Double-counting on interruption** — If the wizard is interrupted mid-flow (browser crash, refresh, navigation), it restarts at step 0. Previously submitted XP values are already applied to `units.xp` but there is no record to detect or compensate for this. Re-entry risks double-counting.
2. **No resume capability** — Without tracking what was already entered, the wizard cannot pre-fill previously entered values on resume.
3. **No per-match XP detail** — The timeline cannot display how much XP each unit gained in a specific match, reducing the historical value of match cards.

### Discovery Context

Identified during story 4-1 implementation review. The story's pre-mortem explicitly documented this as an MVP limitation ("no `match_unit_evolutions` table"). The client-side `submittedUnitsRef` guard prevents double-click but does not survive page refresh.

### Evidence

- `incrementUnitXp` (queries.ts:716-725): atomic SQL `SET xp = xp + N` with no join table
- `submittedUnitsRef` (post-match-wizard.tsx:34): in-memory Set, lost on unmount/refresh
- Story 4-1 spec pre-mortem: "Acceptable: Player can correct via direct edit (story 2.4)"

---

## 2. Impact Analysis

### Epic Impact

| Epic | Impact | Details |
|------|--------|---------|
| Epic 4 (Post-Match Flow) | **Modified** | Add story 4-1b within existing epic scope |
| Epic 1-3 | None | No dependencies affected |
| Epic 5 | None | Reference tables unrelated |

### Story Impact

| Story | Impact | Details |
|-------|--------|---------|
| 4-1 | **Retroactive fix** | Add `match_xp_entries` table, modify `submitUnitXpFn` to upsert, modify loader to pre-fill |
| 4-2 | None | Tier-up detection reads from `units.xp` (unchanged) |
| 4-3 | None | Injuries/bonuses use `stat_modifiers` table (unchanged) |

### Artifact Conflicts

| Artifact | Impact | Sections |
|----------|--------|----------|
| PRD | None | No conflict with goals or MVP scope |
| Architecture — schema.ts | **New table** | Add `matchXpEntries` with unique constraint |
| Architecture — queries.ts | **New functions** | `upsertMatchXpEntry`, `getMatchXpEntries`, modify `getTimelineForArmy` |
| UI/UX — post-match-wizard.tsx | **Modified** | Pre-fill XP input from existing entries, delta logic |
| UI/UX — timeline-entry.tsx | **Modified** | Display compact XP line per unit |
| UI/UX — post-match route | **Modified** | Pass `matchParticipantId` to submit, load existing entries |
| Validators | **Modified** | Add `matchParticipantId` to `submitUnitXpSchema` |
| Tests | **Modified** | Adapt all 4-1 test files + add new coverage |

---

## 3. Recommended Approach

**Selected:** Direct Adjustment (Option 1)

**Rationale:**
- The change is purely additive — no existing data or logic is removed
- `incrementUnitXp` remains the source of truth for `units.xp`
- The new `match_xp_entries` table provides traceability without disrupting the existing flow
- Delta strategy (apply `newXp - previousXp` difference) minimizes changes to the core increment logic
- No rollback needed — story 4-1 implementation is sound, just missing a tracking layer

**Effort estimate:** Medium (new table + 6-8 file modifications + migration + test updates)
**Risk level:** Low (additive change, no data loss, backward compatible)
**Timeline impact:** None — this can be completed as story 4-1b before 4-2

---

## 4. Detailed Change Proposals

### 4.1 — New Schema: `matchXpEntries` table

**File:** `src/db/schema.ts`

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

**Unique constraint** `(matchParticipantId, unitId)` enables upsert and prevents duplicates.
**Cascade delete** on both FKs for automatic cleanup.

### 4.2 — New Query: `upsertMatchXpEntry`

**File:** `src/db/queries.ts`

```typescript
export async function upsertMatchXpEntry(
  matchParticipantId: string,
  unitId: string,
  xpGained: number,
): Promise<{ previousXpGained: number | null }> {
  // Check for existing entry
  const existing = await db.select({ xpGained: matchXpEntries.xpGained })
    .from(matchXpEntries)
    .where(and(
      eq(matchXpEntries.matchParticipantId, matchParticipantId),
      eq(matchXpEntries.unitId, unitId),
    ))
    .limit(1)

  const previousXpGained = existing.length > 0 ? existing[0].xpGained : null

  // Upsert: INSERT ... ON CONFLICT DO UPDATE
  await db.insert(matchXpEntries)
    .values({ matchParticipantId, unitId, xpGained })
    .onConflictDoUpdate({
      target: [matchXpEntries.matchParticipantId, matchXpEntries.unitId],
      set: { xpGained },
    })

  return { previousXpGained }
}
```

### 4.3 — New Query: `getMatchXpEntries`

**File:** `src/db/queries.ts`

```typescript
export async function getMatchXpEntries(
  matchParticipantId: string,
): Promise<Array<{ unitId: string; xpGained: number }>> {
  return db.select({
    unitId: matchXpEntries.unitId,
    xpGained: matchXpEntries.xpGained,
  })
  .from(matchXpEntries)
  .where(eq(matchXpEntries.matchParticipantId, matchParticipantId))
}
```

### 4.4 — Modified Server Function: `submitUnitXpFn`

**File:** `src/routes/match/$matchId/post-match.tsx`

**Delta strategy:** The upsert returns the previous XP value. The increment is `newXpGained - (previousXpGained ?? 0)`. This correctly handles:
- First submission: `delta = xpGained - 0 = xpGained` → normal increment
- Re-submission with same value: `delta = xpGained - xpGained = 0` → no change
- Re-submission with different value: `delta = newXp - oldXp` → correct adjustment (can be negative)

```
OLD:
  const result = await incrementUnitXp(data.unitId, data.xpGained)

NEW:
  const { upsertMatchXpEntry, incrementUnitXp } = await import('../../../db/queries')
  const { previousXpGained } = await upsertMatchXpEntry(data.matchParticipantId, data.unitId, data.xpGained)
  const delta = data.xpGained - (previousXpGained ?? 0)
  if (delta !== 0) {
    await incrementUnitXp(data.unitId, delta)
  }
```

**Note:** `matchParticipantId` must be added to the schema and passed from the client.

### 4.5 — Modified Validator: `submitUnitXpSchema`

**File:** `src/lib/validators.ts`

```
OLD:
  export const submitUnitXpSchema = z.object({
    unitId: z.string().min(1),
    xpGained: z.number().int().min(0).max(99),
  })

NEW:
  export const submitUnitXpSchema = z.object({
    matchParticipantId: z.string().min(1),
    unitId: z.string().min(1),
    xpGained: z.number().int().min(0).max(99),
  })
```

### 4.6 — Modified Loader: Pre-fill existing entries

**File:** `src/routes/match/$matchId/post-match.tsx` — `loadPostMatchDataFn`

```
OLD:
  const units = unitsRaw.map((u) => ({ id: u.id, name: u.name, type: u.type, xp: u.xp }))

NEW:
  const existingEntries = await getMatchXpEntries(participant.id)
  const entryMap = new Map(existingEntries.map(e => [e.unitId, e.xpGained]))
  const units = unitsRaw.map((u) => ({
    id: u.id, name: u.name, type: u.type, xp: u.xp,
    previousXpGained: entryMap.get(u.id) ?? null,
  }))
```

### 4.7 — Modified Component: `PostMatchWizard` pre-fill & resume

**File:** `src/components/post-match-wizard.tsx`

- Extend unit type: add `previousXpGained: number | null`
- On step change: if `previousXpGained !== null`, set `xpGained` to that value and mark unit as already submitted in `submittedUnitsRef`
- The submit handler now sends `matchParticipantId` alongside `unitId` and `xpGained`

### 4.8 — Modified Query: `getTimelineForArmy` — include XP entries

**File:** `src/db/queries.ts`

After fetching the main timeline rows, perform a secondary query to load `match_xp_entries` for all returned matchParticipantIds, joined with `units.name`. Return as:

```typescript
unitXpEntries: Array<{ unitName: string; xpGained: number }>
```

### 4.9 — Modified Component: `TimelineEntry` — compact XP line

**File:** `src/components/timeline-entry.tsx`

Add a new prop `unitXpEntries` and render a compact line below the date:

```
Nomarch +3 · Gardes +5 · Sorcier +2
```

Style: `font-family: var(--font-body)`, `font-size: 0.75rem`, `color: var(--color-text-secondary)`
Only shown when `hasEvolutions === true` and entries exist.

### 4.10 — Migration

```bash
pnpm db:generate && pnpm db:push
```

Creates migration for `match_xp_entries` table with unique index.

### 4.11 — Test Updates

| Test File | Changes |
|-----------|---------|
| `queries-post-match.test.ts` | Add tests for `upsertMatchXpEntry`, `getMatchXpEntries`, delta logic |
| `post-match-wizard.test.tsx` | Test pre-fill behavior, resume from partial, `matchParticipantId` passing |
| `post-match.test.ts` | Test `matchParticipantId` in submit schema, delta calculation |
| `validators-post-match.test.ts` | Test `matchParticipantId` validation |
| `timeline-entry-evolutions.test.tsx` | Test XP line rendering, empty entries case |

---

## 5. Implementation Handoff

**Scope:** Minor — Direct implementation by dev team

### Deliverables
1. New story spec: `4-1b-match-xp-tracking-wizard-resume.md`
2. DB migration for `match_xp_entries`
3. Modified server functions, queries, components, validators
4. Updated tests

### Implementation Order
1. Schema + migration
2. New query functions (`upsertMatchXpEntry`, `getMatchXpEntries`)
3. Modify `submitUnitXpFn` (delta strategy) + validator
4. Modify loader (pre-fill)
5. Modify `PostMatchWizard` (resume/pre-fill)
6. Modify `getTimelineForArmy` + `TimelineEntry` (XP line)
7. Update all tests

### Success Criteria
- [ ] Wizard can be interrupted and resumed with pre-filled values
- [ ] Re-submitting the same XP value does not double-count
- [ ] Re-submitting a different XP value correctly adjusts `units.xp`
- [ ] Timeline match cards display XP gained per unit in compact format
- [ ] All existing tests pass (adapted where needed)
- [ ] New tests cover upsert, delta, pre-fill, and timeline display
