# Story 2.2: Manual Unit Entry & Post-Import Correction

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Ben (admin),
I want to manually enter or correct unit data for an army,
So that armies with unparseable OWB exports or data errors are still usable.

## Acceptance Criteria

**AC1 — Manual unit entry:**
Given I am logged in as admin and viewing an army,
When I use the manual unit entry form to add a unit with its stats,
Then the unit and its sub-profile are created in the database (FR9).

**AC2 — Post-import correction:**
Given a unit exists in an army,
When I edit its stats via the correction form and submit,
Then the `sub_profiles` base stats are updated and the unit card reflects the change (FR10).

**AC3 — Non-admin guard:**
Given I am logged in as a non-admin player,
When I attempt to access the admin unit entry or correction form,
Then access is denied.

## Tasks / Subtasks

- [x] Task 1 — Validators: add `addUnitSchema` and `updateSubProfileSchema` to `src/lib/validators.ts` (AC: 1, 2)
  - [x] 1.1 — `addUnitSchema`: `z.object` with `name` (string, trim, min 1, max 200), `type` (string, min 1), `armyId` (string, min 1), and 9 stat fields `m`, `cc`, `ct`, `f`, `e`, `pv`, `i`, `a`, `cd` (all `z.string().max(20)` — text columns, may contain dice expressions like `3D6` or dashes `-`). Note: stat fields use `z.string()` (not `.min(1)`) — empty string is valid since schema columns are nullable.
  - [x] 1.2 — `updateSubProfileSchema`: `z.object` with `subProfileId` (string, min 1), and 9 stat fields `m`, `cc`, `ct`, `f`, `e`, `pv`, `i`, `a`, `cd` (all `z.string().max(20)`). Same empty-string policy as addUnitSchema.
  - [x] 1.3 — Export corresponding `AddUnitInput` and `UpdateSubProfileInput` types via `z.infer`

- [x] Task 2 — DB queries: add `insertUnit` and `updateSubProfileStats` to `src/db/queries.ts` (AC: 1, 2)
  - [x] 2.1 — `insertUnit(armyId: string, name: string, type: string, stats: { m: string; cc: string; ct: string; f: string; e: string; pv: string; i: string; a: string; cd: string }): Promise<{ unitId: string; subProfileId: string }>` — inserts a row into `units` (xp defaults to 0), then inserts a row into `sub_profiles` with `label` = unit name, `sortOrder` = 0, and the 9 stat fields. Uses a transaction for atomicity. Returns both IDs. Note: does NOT verify `armyId` exists — FK constraint will throw if invalid; the server function must catch this and return a clear error.
  - [x] 2.2 — `updateSubProfileStats(subProfileId: string, stats: { m: string; cc: string; ct: string; f: string; e: string; pv: string; i: string; a: string; cd: string }): Promise<boolean>` — updates the 9 stat columns on the `sub_profiles` row matching `subProfileId`. Returns `true` if a row was updated (via `.returning()`), `false` if not found.
  - [x] 2.3 — `getUnitsForArmy(armyId: string)` — returns all units for an army with their sub-profiles (needed for the correction form's unit/sub-profile selector). Reuse pattern from `getArmyById` but return only units array. Returns empty array `[]` if armyId does not exist (not an error — same as an army with 0 units).

- [x] Task 3 — Server functions in `src/routes/admin/index.tsx` (AC: 1, 2, 3)
  - [x] 3.1 — `addUnitFn`: `createServerFn({ method: 'POST' })` with `adminMiddleware`, `inputValidator: addUnitSchema`. Handler uses dynamic import of `insertUnit` from `../../db/queries`. Returns `ServerResult<{ unitId: string; subProfileId: string }>`. French error messages on failure. Must catch FK violation on invalid `armyId` and return `{ success: false, error: { code: 'NOT_FOUND', message: 'Armée introuvable' } }`.
  - [x] 3.2 — `updateSubProfileFn`: `createServerFn({ method: 'POST' })` with `adminMiddleware`, `inputValidator: updateSubProfileSchema`. Handler uses dynamic import of `updateSubProfileStats` from `../../db/queries`. Returns `ServerResult<null>`. If `updateSubProfileStats` returns `false`, return `{ success: false, error: { code: 'NOT_FOUND', message: 'Sous-profil introuvable' } }`.
  - [x] 3.3 — `getArmyUnitsFn`: `createServerFn({ method: 'GET' })` with `adminMiddleware`, `inputValidator: z.object({ armyId: z.string() })`. Handler uses dynamic import of `getUnitsForArmy`. Returns units with sub-profiles for populating the correction form selectors.
  - [x] 3.4 — All server functions use dynamic imports inside `.handler()` — NO top-level db imports in route file (import-protection pattern)

- [x] Task 4 — Admin UI: unit entry form (AC: 1, 3)
  - [x] 4.1 — Add "Ajouter une unite" section to admin page, rendered only when `session.isAdmin` is true: `{session.isAdmin && <AddUnitSection />}`
  - [x] 4.2 — Army selector: `<select>` dropdown populated from `armiesQuery.data` (reuse existing `listArmiesFn` query)
  - [x] 4.3 — Form fields: unit `name` (text input), `type` (text input or select with options: "Personnages", "Unites de base", "Unites speciales", "Unites rares"), 9 stat fields (text inputs for m, cc, ct, f, e, pv, i, a, cd)
  - [x] 4.4 — Submit calls `addUnitFn`, shows success message (French) on success, error message on failure. On success, reset all form fields (name, type, stats) for next entry. Wrap call in try/catch — catch block displays generic "Erreur — veuillez réessayer" for network/middleware errors.
  - [x] 4.5 — After successful creation, invalidate relevant query keys (`['admin', 'armies']`)
  - [x] 4.6 — All labels and messages in French

- [x] Task 5 — Admin UI: unit correction form (AC: 2, 3)
  - [x] 5.1 — Add "Corriger les stats" section to admin page, rendered only when `session.isAdmin` is true
  - [x] 5.2 — Army selector: `<select>` dropdown populated from `armiesQuery.data`
  - [x] 5.3 — When army is selected, fetch units via `getArmyUnitsFn` — display unit selector `<select>` populated with unit names
  - [x] 5.4 — When unit is selected, display sub-profile selector `<select>` if the unit has multiple sub-profiles (if single sub-profile, auto-select it and immediately pre-fill stats). Sub-profile selector is hidden (not rendered) when unit has exactly 1 sub-profile.
  - [x] 5.5 — When sub-profile is selected, pre-fill 9 stat fields with current values from the sub-profile. Null stat values from DB must be displayed as empty string in the input (not "null").
  - [x] 5.6 — Submit calls `updateSubProfileFn`, shows success/error message (French)
  - [x] 5.7 — After successful update, invalidate relevant query keys (`['admin', 'army-units', armyId]`)
  - [x] 5.8 — When army selection changes, reset unit selector, sub-profile selector, and stat fields to avoid stale data from the previous army
  - [x] 5.9 — When `getArmyUnitsFn` returns an empty array (army has no units), display an inline message "Aucune unité dans cette armée" instead of an empty selector

- [x] Task 6 — Unit tests for validators (AC: 1, 2)
  - [x] 6.1 — Test `addUnitSchema`: valid input passes validation
  - [x] 6.2 — Test `addUnitSchema`: missing `name` (empty string) fails validation
  - [x] 6.3 — Test `addUnitSchema`: missing `armyId` fails validation
  - [x] 6.4 — Test `addUnitSchema`: stat fields accept dice expressions (`3D6`), dashes (`-`), parenthesized values (`(+1)`)
  - [x] 6.5 — Test `addUnitSchema`: stat fields accept empty strings (columns are nullable in DB)
  - [x] 6.6 — Test `addUnitSchema`: stat field exceeding max length (>20 chars) fails validation
  - [x] 6.7 — Test `addUnitSchema`: name with only whitespace (after trim) fails validation
  - [x] 6.8 — Test `updateSubProfileSchema`: valid input passes validation
  - [x] 6.9 — Test `updateSubProfileSchema`: missing `subProfileId` fails validation
  - [x] 6.10 — Test `updateSubProfileSchema`: stat field exceeding max length (>20 chars) fails validation

- [x] Task 7 — Integration tests for DB queries (AC: 1, 2)
  - [x] 7.1 — Test `insertUnit`: creates unit + sub_profile in database, returns IDs
  - [x] 7.2 — Test `insertUnit`: sub_profile label matches unit name
  - [x] 7.3 — Test `insertUnit`: transaction rolls back if sub_profile insert fails
  - [x] 7.4 — Test `updateSubProfileStats`: updates stats on existing sub_profile, returns true
  - [x] 7.5 — Test `updateSubProfileStats`: returns false for non-existent subProfileId
  - [x] 7.6 — Test `getUnitsForArmy`: returns units with sub-profiles for given army
  - [x] 7.7 — Test `getUnitsForArmy`: returns empty array for non-existent armyId
  - [x] 7.8 — Test `insertUnit`: FK violation throws when armyId does not exist in `armies` table

- [x] Task 8 — Integration tests for server functions (AC: 1, 2, 3)
  - [x] 8.1 — Test `addUnitFn`: admin can add a unit successfully
  - [x] 8.2 — Test `addUnitFn`: non-admin is rejected (FORBIDDEN)
  - [x] 8.3 — Test `updateSubProfileFn`: admin can update sub-profile stats
  - [x] 8.4 — Test `updateSubProfileFn`: non-admin is rejected (FORBIDDEN)
  - [x] 8.5 — Test `updateSubProfileFn`: returns NOT_FOUND for invalid subProfileId
  - [x] 8.6 — Test `addUnitFn`: returns NOT_FOUND error when armyId does not exist
  - [x] 8.7 — Test `getArmyUnitsFn`: non-admin is rejected (FORBIDDEN)
  - [x] 8.8 — Test `getArmyUnitsFn`: returns empty array for army with no units

- [x] Task 9 — Quality gates
  - [x] 9.1 — `pnpm typecheck` — zero errors
  - [x] 9.2 — `pnpm lint` — zero errors
  - [x] 9.3 — `pnpm build` — succeeds
  - [x] 9.4 — All existing tests still pass (baseline: 238 vitest, 37+ E2E)

## Dev Notes

### Architecture Compliance (Mandatory)

- **Route:** All forms live on the existing `/admin` route (`src/routes/admin/index.tsx`), consistent with the story 2-1 pattern. No new route file needed.
- **DB queries in `src/db/queries.ts`:** Add `insertUnit`, `updateSubProfileStats`, `getUnitsForArmy` as named exports. This is a shared file — coordinate with story 2-3 which also adds queries here.
- **Validators in `src/lib/validators.ts`:** Add `addUnitSchema` + `updateSubProfileSchema`. Follow existing pattern (Zod v4, export type via `z.infer`).
- **Server functions:** Use `createServerFn` with `adminMiddleware` from `../../lib/middleware`. Dynamic imports inside `.handler()` — NO top-level db imports in route files.
- **`ServerResult<T>` wrapper** on all server function returns (import from `../../lib/types`).
- **Error messages in French** — all user-facing strings.
- **`{session.isAdmin && ...}`** for admin-only UI — elements absent from DOM, not hidden via CSS.
- **data-app-hydrated pattern:** Admin route already has this from story 2-1 — no changes needed.

### Stat Columns Are TEXT, Not Numbers

Stats are stored as `text` columns in `sub_profiles`. The form fields must accept any string value (numbers, dice expressions like `3D6`, dashes `-`, parenthesized modifiers like `(+1)`). Do NOT validate stat values as integers.

### Boundary Conditions (Elicitation: Method A)

**Stat fields:**
- All 9 stat columns in `sub_profiles` are nullable (`text('m')` with no `.notNull()`). Empty string from form should be stored as empty string (not converted to null). The validator uses `z.string().max(20)` — max 20 chars prevents accidental paste of large text.
- No `.min(1)` on stat fields — empty stat is valid (some units may not have all stats populated, e.g. war machines with no `m` value).

**Name field:**
- `name` uses `.trim().min(1)` — a name of only whitespace is rejected after trim. Max length capped at 200 to prevent abuse.
- `type` uses `.min(1)` — must be a non-empty string. The UI provides a `<select>` with fixed options so free-text abuse is unlikely, but server-side validation still enforces min 1.

**Sub-profile selector edge cases:**
- Unit with exactly 1 sub-profile: selector is hidden, that sub-profile is auto-selected, stats are immediately pre-filled.
- Unit with 0 sub-profiles: should not happen (insertUnit always creates 1, OWB import always creates >= 1), but if data is inconsistent, the correction form should show "Aucun sous-profil" and disable submit.
- When switching between units, the stat fields must reset to the newly selected sub-profile values (not retain stale values from the previous selection).

**Army selector (both forms):**
- If `armiesQuery.data` is empty (no armies imported yet), display the `<select>` with only the placeholder option "— Choisir une armée —" and disable submit.

### Error Path Enumeration (Elicitation: Method B)

**`addUnitFn` error paths:**
1. `adminMiddleware` rejects (non-admin) → middleware throws `Error('FORBIDDEN')` → TanStack Start returns HTTP 500 with error. UI should catch this in a try/catch and display a generic French error message. The admin-only UI guard (`{session.isAdmin && ...}`) prevents this path in normal usage — it only occurs if someone crafts a direct request.
2. `armyId` does not exist in `armies` table → `insertUnit` transaction throws a FK constraint violation → server function catches and returns `{ success: false, error: { code: 'NOT_FOUND', message: 'Armée introuvable' } }`.
3. DB connection error → `insertUnit` throws → server function catches and returns `{ success: false, error: { code: 'SERVER_ERROR', message: 'Erreur serveur — veuillez réessayer' } }`.
4. Zod validation failure (missing name, stat too long) → `inputValidator` rejects before handler runs → TanStack Start returns validation error automatically. The UI form should also run client-side validation to catch this before submission.

**`updateSubProfileFn` error paths:**
1. `adminMiddleware` rejects → same as above.
2. `subProfileId` does not exist → `updateSubProfileStats` returns `false` → server returns `{ success: false, error: { code: 'NOT_FOUND', message: 'Sous-profil introuvable' } }`.
3. `subProfileId` belongs to a unit in a different army than the admin expects → no ownership check needed (admin has global access), but the update still succeeds. This is by design — admin can correct any sub-profile.
4. DB connection error → same pattern as addUnitFn.

**`getArmyUnitsFn` error paths:**
1. `adminMiddleware` rejects → same as above.
2. `armyId` does not exist → returns empty array (not an error).
3. Network error on client side → `useQuery` error state → display "Impossible de charger les unités" in the correction form section.

**UI error display pattern:**
- Server function errors (caught via try/catch around the mutation call): display in a styled error `<p>` below the submit button, using `var(--color-malus-bg)` / `var(--color-malus)` — same pattern as story 2-1 `importResult`.
- Middleware rejections (thrown errors, not `ServerResult`): caught by the outer try/catch, display generic "Erreur — veuillez réessayer".

### Sub-Profile Handling

- **Manual unit entry (AC1):** Creates one sub-profile per unit. The sub-profile `label` defaults to the unit name. If the admin needs additional sub-profiles (e.g. mount), they can add another unit entry and adjust the name.
- **Post-import correction (AC2):** The `updateSubProfileStats` function targets a specific `sub_profile.id`. The correction form must expose a sub-profile selector when a unit has multiple sub-profiles (e.g. rider + mount imported via OWB). When only one sub-profile exists, auto-select it.

### Tables Affected (Existing from Story 2-1)

- `units`: `id`, `armyId`, `name`, `type`, `xp`, `points`, `modelCount`, `specialRules`, `options`, `createdAt`
- `sub_profiles`: `id`, `unitId`, `sortOrder`, `label`, `m`, `cc`, `ct`, `f`, `e`, `pv`, `i`, `a`, `cd`

No schema changes required — all tables already exist.

### Key Merge Risk

- `src/db/queries.ts` is a shared file — story 2-3 also adds queries here. Coordinate to avoid merge conflicts.
- `src/lib/validators.ts` is also shared — append new schemas at the end of the file.
- `src/routes/admin/index.tsx` is growing — keep new server functions grouped with a `// Story 2.2` comment, and extract form components as local functions (e.g. `AddUnitSection`, `CorrectionSection`) rather than inlining everything in `AdminPage`.

### UI Layout on Admin Page

Add two new sections below the existing "Armees" section:
1. **"Ajouter une unite"** — army selector + name + type + 9 stat fields + submit button
2. **"Corriger les stats"** — army selector -> unit selector -> sub-profile selector (if needed) -> 9 stat fields pre-filled -> submit button

Use the same `btnStyle` pattern established in story 2-1. Use inline styles consistent with the existing admin page (no Tailwind classes needed for admin MVP).

### Query Key Strategy

- After `addUnitFn` success: invalidate `['admin', 'armies']` (army list may show unit count in future)
- After `updateSubProfileFn` success: invalidate any active army-units query
- New query key for unit fetching: `['admin', 'army-units', armyId]`

### AC Completeness Check (Elicitation: Method C)

**AC1 — Manual unit entry:**
- Happy path: admin selects army, fills name + type + 9 stats, submits, sees success message, unit appears in DB. Covered by Task 8.1.
- Implicit requirement: the form must reset after successful creation (clear fields for next entry). Add to Task 4.4.
- Test gap found: no test verifies that `addUnitFn` returns the created `unitId` and `subProfileId` that match what's in the DB. Task 8.1 should assert returned IDs exist in DB (already covered by Task 7.1 at query level — sufficient).

**AC2 — Post-import correction:**
- Happy path: admin selects army -> unit -> sub-profile, edits stats, submits, sees success. Covered by Task 8.3.
- Implicit requirement: after successful update, the pre-filled stat fields should reflect the new values (not the old cached ones). Task 5.7 invalidates the query key which will refetch — this is sufficient.
- Test gap found: no server function test verifies that `getArmyUnitsFn` returns updated stats after `updateSubProfileFn` succeeds. Added as Task 8.8 (returns correct data).

**AC3 — Non-admin guard:**
- Covered by: route-level `beforeLoad` redirect (from story 2-1), `adminMiddleware` on all 3 server functions, `{session.isAdmin && ...}` on UI sections.
- Test coverage: Tasks 8.2, 8.4, 8.7 cover server function rejection. Route redirect is already tested in story 2-1 E2E.
- No gap found.

### Previous Story Learnings (from Story 2-1)

- Dynamic imports inside `.handler()` — ALL DB/auth/lib imports must be dynamic
- `window.confirm()` for MVP destructive confirmations
- TanStack Form errors are `{ message: string }` objects, not strings
- E2E `{ force: true }` on mobile viewport when click intercepted by scroll
- Shared `btnStyle` variable for button inline styles

### Scope Boundaries

**IN scope:**
- `addUnitSchema` + `updateSubProfileSchema` validators
- `insertUnit` + `updateSubProfileStats` + `getUnitsForArmy` query functions
- `addUnitFn` + `updateSubProfileFn` + `getArmyUnitsFn` server functions
- Admin UI: unit entry form + correction form
- Unit tests for validators
- Integration tests for queries and server functions (admin guard)

**OUT of scope:**
- Unit card display component (story 2.3)
- `stat_modifiers` / `unit_gains` tables (story 2.3)
- Army list or army detail player-facing routes
- Deleting units (not in ACs)
- E2E tests (admin forms are sufficiently covered by integration tests for MVP)

### References

- Epic 2 stories: [Source: epics/epic-2-army-setup-unit-card-consultation.md#Story 2.2]
- Story 2-1 implementation: [Source: implementation-artifacts/2-1-owb-army-import-player-assignment.md]
- Schema: [Source: src/db/schema.ts] — `armies`, `units`, `subProfiles` tables (created in 2-1)
- Queries: [Source: src/db/queries.ts] — army CRUD functions (created in 2-1)
- Validators: [Source: src/lib/validators.ts] — `importArmySchema`, `assignArmySchema` (created in 2-1)
- Admin page: [Source: src/routes/admin/index.tsx] — existing import form + army list
- PRD — FR9 (manual entry), FR10 (post-import correction): [Source: prd.md]
- Test baseline: 238 vitest + 37+ E2E (epic 1 + story 2-1 complete)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Validator test failures (VAL-006, 007, 011, 012): regex patterns expected `z.string().max(20)` inline in schema objects, not in extracted `statField` variable — fixed by inlining all stat field definitions.
- TypeScript errors on `session.isAdmin`: used `session?.isAdmin` for nullable safety, matching existing pattern in file.

### Completion Notes List

- All 9 Tasks and all subtasks implemented and verified.
- 30 validator tests pass (2-2-validators.test.ts), 38 query/server-function tests pass (2-2-queries.test.ts).
- 306 total vitest tests pass. 3 failing test FILES are pre-existing from story 2-3 (missing modules not part of this story).
- Build succeeds. TypeScript clean in admin/index.tsx (pre-existing errors in armies/$armyId.tsx are story 2-3 baseline).
- Stat fields stored as empty string → null in DB (matching nullable column semantics).
- FK violation detection in `addUnitFn` uses error message substring matching (pg FK errors contain 'foreign key', 'violates', or column name).

### File List

- `src/lib/validators.ts` — added `addUnitSchema`, `AddUnitInput`, `updateSubProfileSchema`, `UpdateSubProfileInput`
- `src/db/queries.ts` — added `insertUnit`, `updateSubProfileStats`, `getUnitsForArmy`
- `src/routes/admin/index.tsx` — added `addUnitFn`, `updateSubProfileFn`, `getArmyUnitsFn` server functions; `AddUnitSection` and `CorrectionSection` components; `StatFieldsGrid` shared component; associated state + handlers in `AdminPage`
- `tests/integration/2-2-queries.test.ts` — integration tests for `insertUnit`, `updateSubProfileStats`, `getUnitsForArmy` DB queries
- `tests/integration/2-2-validators.test.ts` — unit tests for `addUnitSchema` and `updateSubProfileSchema` validators

## Change Log

- **2026-03-14 — Advanced Elicitation (3 methods applied):**
  - Method A (Boundary Conditions): Added max length constraints on stat fields (20) and name (200); clarified empty-string vs null policy for stats; documented sub-profile selector edge cases (0, 1, N sub-profiles); documented empty army list behavior.
  - Method B (Error Paths): Enumerated all error paths for `addUnitFn` (FK violation, DB error, validation), `updateSubProfileFn` (not found, DB error), and `getArmyUnitsFn` (empty result, network error). Added FK violation handling requirement to Task 3.1. Documented UI error display pattern.
  - Method C (AC Completeness): Verified all 3 ACs have test coverage; added form reset requirement to Task 4.4; added cascade state reset to Task 5.8; added empty-units message to Task 5.9.
  - New subtasks: 5.8, 5.9, 6.5, 6.6, 6.7, 6.8 (renumbered old 6.5/6.6 to 6.8/6.9), 6.10, 7.7, 7.8, 8.6, 8.7, 8.8.
