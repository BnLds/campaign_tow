# Sprint Change Proposal — Sub-Profile Mount Flag

**Date:** 2026-03-16
**Triggered by:** Story 2.4 (Direct Edit of Unit & Character Deltas) — post-completion testing
**Scope classification:** Minor — direct implementation by dev team
**Approved:** Pending

---

## 1. Issue Summary

### Problem Statement

Stat modifiers (`stat_modifiers` table) are applied to ALL sub-profiles of a unit in `composeUnitView()`, including mounts. Only combatant profiles (rider, champion, herder) should receive campaign delta modifications — mounts should display base stats only.

### Discovery Context

During functional testing of story 2.4, Ben identified that editing stat modifiers on a dual-profile unit (e.g., Night Goblin Warboss on Giant Cave Squig) applies the delta to both profiles. The Warboss line AND the Giant Cave Squig line both show the modified stat, when only the Warboss should be affected.

### Why Index-Based Fix Is Insufficient

Initial analysis proposed applying modifiers only to sub-profile at index 0. Ben correctly identified a counter-example: the Night Goblin Squig Herd has two sub-profiles (Squig Herder + Cave Squig) where BOTH are combatants, not a rider/mount pair. An explicit `isMount` boolean on each sub-profile is the robust solution.

---

## 2. Impact Analysis

### Epic Impact

| Epic | Status | Impact |
|---|---|---|
| Epic 2 (Army Setup) | done | Bugfix on completed stories 2.3 + 2.4 — no epic reopening needed |
| Epic 3 (Timeline & Matches) | backlog | None |
| Epic 4 (Post-Match Flow) | backlog | Preventive fix — story 4.3 (Character Injuries) creates stat_modifiers that would exhibit the same bug |
| Epic 5 (References) | backlog | None |

### Artifact Conflicts

| Artifact | Conflict | Action |
|---|---|---|
| PRD (FR13, FR14) | No explicit mention of mount exclusion | Add clarification note to FR13 |
| Architecture — Data Architecture | `sub_profiles` schema incomplete | Add `isMount` column documentation |
| Architecture — Implementation Patterns | No mention of mount handling | Add pattern note for `composeUnitView()` |
| UX Design | No mount indicator in UnitCard | Optional: add visual mount label |
| Epic 2 story specs | Mount handling not considered | No change needed (stories are done) |

### Technical Impact

- **Schema migration required:** `ALTER TABLE sub_profiles ADD COLUMN is_mount boolean NOT NULL DEFAULT false`
- **Existing data:** All current sub-profiles default to `isMount: false` — players must manually flag mounts via edit UI
- **No API breaking changes:** The `isMount` field propagates through existing data flow transparently

---

## 3. Recommended Approach

**Selected path:** Direct Adjustment — add `isMount` boolean field and implement toggle UI

**Rationale:**
- Low effort (one dev session), low risk (retrocompatible default `false`)
- Prevents the same bug from surfacing in Epic 4 (post-match flow)
- Explicit mount flag is more maintainable than heuristic-based detection
- Auto-detection at OWB import time was evaluated and rejected — label patterns vary by faction and are unreliable

**Effort estimate:** Low
**Risk level:** Low
**Timeline impact:** None — can be implemented as a bugfix before Epic 3 starts

---

## 4. Detailed Change Proposals

### 4.1 — Schema: `sub_profiles` table

**File:** `src/db/schema.ts`

```
OLD:
export const subProfiles = pgTable('sub_profiles', {
  ...
  cd: text('cd'),
})

NEW:
export const subProfiles = pgTable('sub_profiles', {
  ...
  cd: text('cd'),
  isMount: boolean('is_mount').notNull().default(false),
})
```

**Rationale:** Explicit boolean flag — simple, unambiguous, queryable.

### 4.2 — OWB Parser: `ParsedSubProfile` interface

**File:** `src/lib/owb-parser.ts`

```
OLD:
export interface ParsedSubProfile {
  label: string
  m: string | null
  ...
}

NEW:
export interface ParsedSubProfile {
  label: string
  isMount: boolean   // Always false at import time — user flags manually
  m: string | null
  ...
}
```

**Rationale:** Parser output must match DB schema shape. Default `false` — no auto-detection.

### 4.3 — Delta Composer: `composeUnitView()`

**File:** `src/lib/delta-composer.ts`

```
OLD:
subProfiles.map((sp) => {
  for (const key of STAT_KEYS) {
    const mods = modsByStat.get(key) ?? []

NEW:
subProfiles.map((sp) => {
  for (const key of STAT_KEYS) {
    const mods = sp.isMount ? [] : (modsByStat.get(key) ?? [])
```

**Rationale:** Mount sub-profiles always display base stats. One-line conditional.

### 4.4 — DB Queries

**File:** `src/db/queries.ts`

- Add `updateSubProfileIsMount(subProfileId: string, isMount: boolean)` query function
- Propagate `isMount` field in `createArmyWithUnits()` insert mapping
- Include `isMount` in `getArmyWithUnits()` sub-profile selection

### 4.5 — Server Function + UI Toggle

**File:** `src/routes/armies/$armyId.tsx`

- Add `toggleMountFn` server function protected by `armyOwnerMiddleware`
- Input: `{ armyId, subProfileId, isMount }`
- Validates sub-profile belongs to a unit of the specified army

**File:** `src/components/UnitEditPanel.tsx`

- Add "Sub-profiles" section listing sub-profiles with a "Mount" toggle (shadcn Switch)
- Only visible for units with 2+ sub-profiles (single-profile units cannot have mounts)

### 4.6 — Tests

**File:** `tests/2-3-delta-composer.test.ts`

- Add `isMount: false` to all existing `makeSubProfile()` fixtures
- Add test `[2.3-UNIT-014]`: dual-profile unit with `isMount: true` on second profile — modifiers apply only to first profile, second profile shows base stats

**New test coverage:**
- `toggleMountFn` server function validation
- `updateSubProfileIsMount` query function
- `UnitEditPanel` mount toggle rendering (only when 2+ sub-profiles)

### 4.7 — PRD Clarification

**File:** `_bmad-output/planning-artifacts/prd.md`

```
OLD:
- **FR13 :** Un joueur peut éditer directement les bonus, malus et blessures d'une unité de sa propre armée sans passer par le flow post-match

NEW:
- **FR13 :** Un joueur peut éditer directement les bonus, malus et blessures d'une unité de sa propre armée sans passer par le flow post-match. Les modificateurs ne s'appliquent qu'aux profils combattants — les sous-profils marqués comme montures conservent leurs stats de base.
```

---

## 5. Implementation Handoff

**Change scope:** Minor — direct implementation by dev agent

**Recommended implementation vehicle:** Quick Tech Spec → `quick-dev` workflow

**Implementation sequence:**
1. Schema migration (add `is_mount` column)
2. Update OWB parser interface + `createArmyWithUnits()` propagation
3. Fix `composeUnitView()` (the actual bug fix)
4. Add `toggleMountFn` server function + query
5. Add mount toggle UI in `UnitEditPanel`
6. Update tests
7. Update PRD note
8. Quality gates: typecheck, lint, build, test suite

**Success criteria:**
- Stat modifiers on a dual-profile unit only affect non-mount sub-profiles
- Players can toggle `isMount` on sub-profiles via edit panel
- All existing tests pass (no regressions)
- New tests cover mount exclusion logic

**Post-deployment action:**
- Players with mounted characters manually flag their mounts via the edit panel (one-time)
