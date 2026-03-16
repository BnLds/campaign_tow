---
title: 'Sub-Profile Mount Flag — Bugfix'
slug: 'sub-profile-mount-flag'
created: '2026-03-16'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['drizzle-orm', 'tanstack-start', 'react', 'shadcn', 'vitest', 'zod']
files_to_modify: ['src/db/schema.ts', 'src/lib/owb-parser.ts', 'src/lib/delta-composer.ts', 'src/db/queries.ts', 'src/routes/armies/$armyId.tsx', 'src/components/UnitEditPanel.tsx', 'tests/2-3-delta-composer.test.ts']
code_patterns: ['server-functions-with-middleware', 'dynamic-imports-in-handlers', 'ServerResult-pattern', 'armyOwnerMiddleware', 'select()-without-explicit-columns-auto-includes-new-fields']
test_patterns: ['vitest-unit-tests', 'structural-contract-tests', 'makeSubProfile-factory-in-test-fixtures']
---

# Tech-Spec: Sub-Profile Mount Flag — Bugfix

**Created:** 2026-03-16

## Overview

### Problem Statement

`composeUnitView()` in `src/lib/delta-composer.ts` applies all `stat_modifiers` to every sub-profile of a unit, including mounts. In The Old World, mounted characters have two sub-profiles: the rider (first) and the mount (second). Campaign stat modifiers (tier-ups, injuries, bonuses) should only affect combatant profiles, not mounts. However, not all dual-profile units follow the rider/mount pattern — some (e.g., Night Goblin Squig Herd) have multiple combatant types. An explicit `isMount` flag is needed rather than index-based heuristics.

### Solution

Add an `isMount: boolean` column (default `false`) to the `sub_profiles` table. Update `composeUnitView()` to skip modifier application on mount sub-profiles. Provide a toggle in the existing `UnitEditPanel` so players can flag mounts manually. Propagate the field through the OWB parser interface and DB insertion path.

### Scope

**In Scope:**
- Schema migration: add `is_mount` boolean column to `sub_profiles`
- `ParsedSubProfile` interface: add `isMount` field (default `false`)
- `createArmyWithUnits()`: propagate `isMount` during insert
- `composeUnitView()`: skip modifiers for sub-profiles where `isMount === true`
- `SubProfile` interface in `delta-composer.ts`: add `isMount` field
- New query: `updateSubProfileIsMount(subProfileId, isMount)`
- New server function: `toggleMountFn` with `armyOwnerMiddleware`
- UI toggle in `UnitEditPanel` for units with 2+ sub-profiles
- Unit tests for delta-composer mount exclusion
- Unit tests for toggle server function

**Out of Scope:**
- Auto-detection of mounts during OWB import
- Visual mount indicator on `UnitCard` component
- Retro-flagging existing data (manual action post-deploy)
- Editing `isMount` from admin unit correction (story 2.2 scope)

## Context for Development

### Codebase Patterns

- **Server functions** are co-located in route files, use `createServerFn()` with middleware chain
- **Dynamic imports** inside `.handler()` for all DB/lib calls (import-protection pattern)
- **`armyOwnerMiddleware`** validates `data.armyId` ownership — all mutations include `armyId`
- **`ServerResult<T>`** discriminated union for mutation returns
- **DB access** exclusively through named functions in `src/db/queries.ts`
- **Error messages** in French
- **Form UI** uses shadcn primitives (Button, Input, Select, Label, Switch)

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/db/schema.ts` | Drizzle table definitions — add `isMount` to `subProfiles` |
| `src/lib/owb-parser.ts` | `ParsedSubProfile` interface — add `isMount` field |
| `src/lib/delta-composer.ts` | `composeUnitView()` — core bug fix location |
| `src/db/queries.ts` | DB query functions — add `updateSubProfileIsMount()`, update `createArmyWithUnits()` |
| `src/routes/armies/$armyId.tsx` | Server functions + route component — add `toggleMountFn` |
| `src/components/UnitEditPanel.tsx` | Edit panel — add mount toggle UI section |
| `tests/2-3-delta-composer.test.ts` | Delta composer tests — add mount exclusion test |
| `_bmad-output/planning-artifacts/sprint-change-proposal-2026-03-16.md` | Full change proposal with rationale |

### Technical Decisions

- **Explicit `isMount` flag over index-based heuristic**: Some multi-profile units have multiple combatants (Squig Herd = Squig Herder + Cave Squig), so index 0 !== rider is not universally true.
- **No auto-detection at import**: Mount labels vary by faction (Giant Cave Squig, Destrier, Sanglier de Guerre…). Heuristic detection would be fragile and faction-specific. Manual flag is reliable.
- **Default `false`**: All existing sub-profiles keep receiving modifiers as before. Players flag mounts explicitly — this is a rare, one-time action per mounted character.
- **Toggle only visible for 2+ sub-profiles**: Single-profile units cannot have mounts by definition.

## Implementation Plan

### Tasks

- [x] Task 1: Add `isMount` column to `sub_profiles` schema
  - File: `src/db/schema.ts`
  - Action: Add `isMount: boolean('is_mount').notNull().default(false)` to the `subProfiles` table definition, after the `cd` column.
  - Notes: Default `false` ensures all existing sub-profiles continue to receive modifiers. No data loss.

- [x] Task 2: Generate and apply Drizzle migration
  - Action: Run `pnpm db:generate` to create migration SQL, then `pnpm db:push` to apply.
  - Notes: Migration will be `ALTER TABLE sub_profiles ADD COLUMN is_mount boolean NOT NULL DEFAULT false`. Verify migration file is created in `drizzle/` folder.

- [x] Task 3: Add `isMount` to `ParsedSubProfile` interface and parser output
  - File: `src/lib/owb-parser.ts`
  - Action: Add `isMount: boolean` to `ParsedSubProfile` interface. In the `parseSubProfile()` function return, add `isMount: false` to every parsed sub-profile.
  - Notes: No auto-detection. Always `false` at import time.

- [x] Task 4: Propagate `isMount` in `createArmyWithUnits()`
  - File: `src/db/queries.ts`
  - Action: In the `subProfiles` insert mapping inside `createArmyWithUnits()`, add `isMount: sp.isMount` alongside the existing stat fields.
  - Notes: The field flows from `ParsedSubProfile` → insert values → DB.

- [x] Task 5: Add `isMount` to `SubProfile` interface and fix `composeUnitView()`
  - File: `src/lib/delta-composer.ts`
  - Action:
    1. Add `isMount: boolean` to the internal `SubProfile` interface (line ~58-72).
    2. In `composeUnitView()`, modify the inner `for` loop inside `subProfiles.map()`. The full modified loop body must be:
    ```typescript
    for (const key of STAT_KEYS as readonly StatKey[]) {
      const baseValue = sp[key] ?? '-'
      const mods = sp.isMount ? [] : (modsByStat.get(key) ?? [])
      //          ^^^^^^^^^^^ — THIS is the only change: guard on isMount

      if (mods.length === 0) {
        stats[key] = { value: baseValue, delta: null, modified: false }
      } else {
        const netDelta = mods.reduce((sum, m) => sum + m.delta, 0)
        const numeric = isNumeric(baseValue)
        const displayValue = numeric
          ? String(parseInt(baseValue, 10) + netDelta)
          : baseValue
        stats[key] = { value: displayValue, delta: netDelta, modified: true }
      }
    }
    ```
    The change is ONLY on the `const mods = ...` line (line ~129). The rest of the loop body is unchanged. Do NOT wrap the entire `for` loop or move the conditional elsewhere.
  - Notes: This is the core bug fix. Mount sub-profiles will always hit the `mods.length === 0` branch, resulting in `modified: false` and `delta: null` for every stat. [Review F3]

- [x] Task 6: Add `updateSubProfileIsMount()` query function
  - File: `src/db/queries.ts`
  - Action: Add a new exported function:
    ```typescript
    export async function updateSubProfileIsMount(subProfileId: string, isMount: boolean): Promise<boolean> {
      const result = await db.update(subProfiles).set({ isMount }).where(eq(subProfiles.id, subProfileId)).returning({ id: subProfiles.id })
      return result.length > 0
    }
    ```
  - Notes: Returns `boolean` for consistency with other update functions (`updateUnitXp` pattern). Drizzle maps the JS property `isMount` to the DB column `is_mount` automatically — the `.set({ isMount })` call is correct. [Review F8]

- [x] Task 7: Add `getSubProfileById()` query function
  - File: `src/db/queries.ts`
  - Action: Add a new exported function:
    ```typescript
    export async function getSubProfileById(subProfileId: string) {
      const rows = await db.select().from(subProfiles).where(eq(subProfiles.id, subProfileId)).limit(1)
      return rows[0] ?? null
    }
    ```
  - Notes: Needed by `toggleMountFn` to verify the sub-profile belongs to the correct army (via `unitId` → `getUnitById` → `armyId` check).

- [x] Task 8: Add `toggleMountFn` server function
  - File: `src/routes/armies/$armyId.tsx`
  - Action: Add a new server function:
    ```typescript
    const toggleMountFn = createServerFn({ method: 'POST' })
      .middleware([armyOwnerMiddleware])
      .inputValidator(z.object({ armyId: z.string(), subProfileId: z.string(), isMount: z.boolean() }))
      .handler(async ({ data }) => {
        const { getSubProfileById, getUnitById, updateSubProfileIsMount } = await import('../../db/queries')
        const sp = await getSubProfileById(data.subProfileId)
        if (!sp) {
          return { success: false as const, error: { code: 'NOT_FOUND', message: 'Sous-profil introuvable' } }
        }
        const unit = await getUnitById(sp.unitId)
        if (!unit || unit.armyId !== data.armyId) {
          return { success: false as const, error: { code: 'FORBIDDEN', message: "Ce sous-profil n'appartient pas à cette armée" } }
        }
        const updated = await updateSubProfileIsMount(data.subProfileId, data.isMount)
        if (!updated) {
          return { success: false as const, error: { code: 'NOT_FOUND', message: 'Sous-profil introuvable' } }
        }
        return { success: true as const, data: null }
      })
    ```
  - Notes: Follows exact same authorization pattern as `removeStatModifierFn` (sub-entity → unit → army ownership check). French error messages. **Known limitation (consistent with codebase):** The 3 sequential queries (`getSubProfileById`, `getUnitById`, `updateSubProfileIsMount`) are not wrapped in a transaction. A concurrent request could delete the unit between the ownership check and the update. This matches the existing pattern in `removeStatModifierFn` / `removeUnitGainFn` and is acceptable at this app's scale (single-digit concurrent users). [Review F2]

- [x] Task 9: Pass sub-profile data and `toggleMountFn` to `UnitEditPanel`
  - File: `src/routes/armies/$armyId.tsx`
  - Action:
    1. In `loadArmyFn`, inside `army.units.map((unit) => ...)`, add a projected sub-profile array using an explicit `.map()` to avoid leaking all stat columns to the client:
    ```typescript
    const unitCards = army.units.map((unit) => {
      // ... existing composedView + tier code ...
      return {
        unit: { id: unit.id, name: unit.name, type: unit.type, xp: unit.xp },
        composedView,
        tier,
        subProfiles: unit.subProfiles.map((sp) => ({
          id: sp.id,
          label: sp.label,
          isMount: sp.isMount,
          sortOrder: sp.sortOrder,
        })),
      }
    })
    ```
    2. In the `ArmyView` component, pass `subProfiles={card.subProfiles}` and `toggleMountFn={toggleMountFn}` as new props to `UnitEditPanel`.
  - Notes: **CRITICAL:** Do NOT spread the full sub-profile DB row (`...sp`) into the client payload — this would leak all 9 stat columns unnecessarily. Use the explicit `.map()` projection above. [Review F1]
  - **Data flow for Switch sync after mutation [Review F5]:** When the user toggles `isMount`, the handler calls `toggleMountFn` then `onMutationSuccess()` which calls `router.invalidate()`. This re-runs `loadArmyFn`, which re-fetches `getArmyWithUnits()` from the DB (with the updated `isMount` value). The fresh `subProfiles` prop flows into `UnitEditPanel`, overwriting the Switch state with the authoritative server value. No optimistic state management needed — the data round-trip is fast enough.

- [x] Task 10: Add mount toggle section to `UnitEditPanel`
  - File: `src/components/UnitEditPanel.tsx`
  - Action:
    1. Add new props: `subProfiles: Array<{ id: string; label: string; isMount: boolean; sortOrder: number }>` and `toggleMountFn` (typed like other server fn props).
    2. Add a new section "Sous-profils" between the panel header and "Modificateurs de stats" section.
    3. Only render this section when `subProfiles.length >= 2`.
    4. For each sub-profile, display a row with the label and a shadcn `Switch` toggling `isMount`.
    5. On switch change, call `toggleMountFn({ data: { armyId, subProfileId, isMount } })` then `onMutationSuccess()`.
    6. Show loading state on the switch during the mutation.
    7. Labels in French: section title "Sous-profils", switch label "Monture".
  - Notes: Import `Switch` from `./ui/switch`. Follow existing section styling (h4 uppercase, same spacing). Add `data-testid="section-sub-profiles"` on the section wrapper. **Existing structural contract tests** in `tests/2-4-unit-edit-panel-component.test.ts` check for string presence (section names, data-testid) — adding a new section above "Modificateurs de stats" will NOT break them since they assert content existence, not ordering. [Review F11]

- [x] Task 11: Update delta-composer tests
  - File: `tests/2-3-delta-composer.test.ts`
  - Action:
    1. Add `isMount: false` to `makeSubProfile()` factory default return. **This single change fixes TypeScript compatibility for all 13 existing tests** — they call `makeSubProfile()` which must return an object matching the updated `SubProfile` interface (now requiring `isMount`). Since `isMount: false` is the default and means "apply modifiers normally", existing test behavior is unchanged. [Review F6]
    2. Add new test `[2.3-UNIT-014]`: create two sub-profiles (rider with `isMount: false`, mount with `isMount: true`), add a stat modifier, verify modifier applies only to rider profile (modified=true, delta present) and NOT to mount profile (modified=false, delta=null).
    3. Add new test `[2.3-UNIT-015]`: create two sub-profiles both with `isMount: false` (multi-combatant like Squig Herd), add a stat modifier, verify modifier applies to BOTH profiles.
  - Notes: Tests must use coupled assertions per memory rule.

- [x] Task 12: Add structural contract tests and integration test
  - File: `tests/bugfix-mount-flag.test.ts` (new file)
  - Action: **All tests in this file are structural contract tests** (file-content assertions using `fs.readFileSync` + string/regex matching), following the exact pattern in `tests/2-4-unit-edit-panel-component.test.ts`. No runtime mocking of middleware or dynamic imports is needed. [Review F7]
    1. **Structural:** `src/routes/armies/$armyId.tsx` contains `toggleMountFn` server function with `armyOwnerMiddleware` and `z.object({ armyId: z.string(), subProfileId: z.string(), isMount: z.boolean() })`.
    2. **Structural:** `toggleMountFn` handler contains ownership check pattern: `getSubProfileById` → `getUnitById` → `unit.armyId !== data.armyId`.
    3. **Structural:** `src/db/queries.ts` exports `updateSubProfileIsMount` and `getSubProfileById` functions.
    4. **Structural:** `src/components/UnitEditPanel.tsx` contains `data-testid="section-sub-profiles"` and `import { Switch }` (or `from './ui/switch'`).
    5. **Structural:** `UnitEditPanel.tsx` contains conditional render `subProfiles.length >= 2` guarding the sub-profiles section.
    6. **Integration test for mount → composedView path [Review F4]:** Call `composeUnitView()` with two sub-profiles (one `isMount: true`) and stat modifiers. Verify the returned `composedView.subProfiles[1].stats` has `modified: false` for all stats. This tests the full path that `loadArmyFn` relies on.
  - Notes: Tests 1-5 are structural. Test 6 is a unit test importing `composeUnitView` directly (same as `tests/2-3-delta-composer.test.ts` pattern). Together they cover the integration path: toggle → DB → loader → composeUnitView → no deltas on mount.

- [x] Task 13: Quality gates
  - Action: Run `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm test` — all must pass with zero errors.
  - Notes: No regressions allowed on the existing 73+ tests.

### Acceptance Criteria

- [x] AC1: Given a unit with two sub-profiles (rider `isMount=false`, mount `isMount=true`) and a stat modifier on that unit, when `composeUnitView()` is called, then the rider sub-profile shows the modified stat value and the mount sub-profile shows the original base stat value with `modified=false`.

- [x] AC2: Given a unit with two sub-profiles both with `isMount=false` (multi-combatant unit) and a stat modifier, when `composeUnitView()` is called, then both sub-profiles show the modified stat value.

- [x] AC3: Given I am the army owner viewing a unit with 2+ sub-profiles in the edit panel, when the panel opens, then I see a "Sous-profils" section listing each sub-profile with a "Monture" toggle switch.

- [x] AC4: Given I am the army owner and I toggle a sub-profile's mount switch to ON, when the mutation completes, then the sub-profile's `isMount` is `true` in the database and the unit card re-renders without deltas on that sub-profile.

- [x] AC5: Given I am the army owner viewing a unit with only 1 sub-profile, when the edit panel opens, then the "Sous-profils" section is NOT rendered.

- [x] AC6: Given a `toggleMountFn` request with a `subProfileId` belonging to a unit in a different army than `armyId`, when the server processes the request, then it returns `{ success: false, error: { code: 'FORBIDDEN' } }`.

- [x] AC7: Given a new army is imported via OWB parser, when `createArmyWithUnits()` inserts sub-profiles, then all sub-profiles have `isMount = false` by default.

- [x] AC8: Given all changes are applied, when the full test suite runs (`pnpm test`), then all existing tests pass (no regressions) and new tests pass.

## Additional Context

### Dependencies

- Drizzle migration must be generated and pushed before testing (`pnpm db:generate && pnpm db:push`)
- No new npm dependencies required
- shadcn `Switch` component already installed at `src/components/ui/switch.tsx`
- **Rollback plan [Review F9]:** If the deploy fails, the migration can be reversed with `ALTER TABLE sub_profiles DROP COLUMN is_mount`. Since the column has `DEFAULT false` and no other code depends on it before this bugfix, dropping it has no side effects. All other code changes are backward-compatible (the `isMount: false` default means the old behavior is preserved).

### Testing Strategy

- **Unit tests (Vitest)**: `composeUnitView()` mount exclusion, `updateSubProfileIsMount()` query, `toggleMountFn` server function validation
- **Structural contract tests**: `UnitEditPanel` mount toggle presence/absence based on sub-profile count
- **Regression**: Full test suite must pass (existing 73+ tests)

### Notes

- Post-deploy: players with mounted characters need to manually toggle `isMount` on their mounts via the edit panel. This is a small one-time action affecting only a few units per army. **Convenience SQL for bulk retro-flagging [Review F10]:** If Ben prefers a one-time admin SQL instead of manual toggles, this query flags the second sub-profile (sortOrder=1) of all character units as mounts. Review and adjust before running:
  ```sql
  UPDATE sub_profiles SET is_mount = true
  WHERE sort_order = 1
    AND unit_id IN (SELECT id FROM units WHERE type = 'Personnages')
    AND unit_id IN (
      SELECT unit_id FROM sub_profiles GROUP BY unit_id HAVING COUNT(*) >= 2
    );
  ```
  This is a heuristic (sortOrder=1 on characters with 2+ profiles). Verify results with `SELECT * FROM sub_profiles WHERE is_mount = true` before committing.
- This fix preventively resolves the same bug for Epic 4 (Post-Match Flow) where story 4.3 creates `stat_modifiers` for character injuries.
- High-risk item: the `loadArmyFn` handler passes `unit.subProfiles` to `composeUnitView()`. Since `getArmyWithUnits()` uses `.select()` without explicit columns, the `isMount` field will be present in the sub-profile objects automatically once the schema migration is applied. However, `composeUnitView()`'s internal `SubProfile` interface must be updated to include `isMount` for TypeScript to allow accessing it.
- The `ComposedSubProfile` output type does NOT need `isMount` — it only contains display data (`label` + `stats`). The mount flag is consumed during composition, not exposed in the output.

## Review Notes
- Adversarial review completed (2026-03-16)
- Findings: 10 total, 6 fixed, 4 skipped
- Resolution approach: auto-fix
- Fixed: F1 (silent failure), F2 (exception non capturée), F6 (feedback manquant), F7 (assertions couplées), F8 (isMount explicite dans insertUnit), F10 (projection dans getSubProfileById)
- Skipped: F3 (cohérent pattern existant), F4 (edge case hors scope UI), F5 (déltas unit-level par design), F9 (SQL retro-flagging déjà documenté)
