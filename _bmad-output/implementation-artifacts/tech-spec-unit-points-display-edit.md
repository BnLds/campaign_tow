---
title: 'Unit Points Display & Edit'
slug: 'unit-points-display-edit'
created: '2026-03-23'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['TanStack Start', 'React', 'Drizzle ORM', 'Tailwind v4', 'Zod']
files_to_modify:
  - 'src/routes/armies/$armyId.tsx'
  - 'src/components/unit-card.tsx'
  - 'src/components/unit-edit-panel.tsx'
  - 'src/db/queries/units.ts'
code_patterns:
  - 'Server fns: createServerFn + middleware chain (authMiddleware / armyOwnerMiddleware)'
  - 'DB mutations: thin query functions in src/db/queries/, called from server fn handlers'
  - 'Edit panel: server fn types passed as props to UnitEditPanel, not imported directly'
  - 'Loader returns serialized unit data — currently { id, name, type, xp }, needs points added'
test_patterns:
  - 'Unit tests: vitest + @testing-library/react in src/components/__tests__/'
  - 'DB query tests: vitest in src/db/__tests__/'
  - 'E2E: Playwright in e2e/'
---

# Tech-Spec: Unit Points Display & Edit

**Created:** 2026-03-23

## Overview

### Problem Statement

Unit points are already parsed from OWB exports and stored in the database (`units.points` column), but they are never displayed in the UI. There is no army-level points total. Additionally, the army XP total may not exclude graveyard units. Finally, there is no way to manually edit a unit's point cost after import.

### Solution

1. Display points per unit on every UnitCard (visible to all users), positioned before XP on the same line with a distinct color.
2. Show an army-level points total badge in the army header, next to the existing XP total badge.
3. Ensure both totals (XP and points) exclude graveyard units.
4. Add an editable "point cost" numeric field in the unit edit panel (owner only).

### Scope

**In Scope:**
- Display points per unit on UnitCard (before XP, distinct color, same line)
- Army-level points total badge in header alongside XP total badge
- Exclude graveyard units from both XP and points totals
- Editable point cost field in unit edit panel (owner only)

**Out of Scope:**
- OWB parser changes (points are already parsed and stored)
- Display of modelCount, specialRules, or options fields
- Army list validation / max points enforcement
- Points history or points change tracking
- Points display in the post-match wizard (separate spec if needed)

## Context for Development

### Codebase Patterns

- Server functions use `createServerFn` with middleware chains (`authMiddleware`, `armyOwnerMiddleware`)
- Unit data flows: DB query → `loadArmyFn` (line 34) → route loader → components
- `loadArmyFn` returns `unit: { id, name, type, xp }` per card — **points is omitted** (line 59). Must add `points`.
- `UnitCard` receives `unit` prop + `composedView` + `tier` + optional `action` slot
- `UnitEditPanel` receives server fn types as props (not imported directly) — pattern must be followed for `updatePointsFn`
- Points column already exists in schema as `integer('points')` (nullable), populated at OWB import
- Graveyard units loaded separately via `getGraveyardUnits()` — **active unit totals already exclude graveyard** (confirmed: `unitCards` only contains active units)
- XP total computed client-side: `unitCards.reduce((sum, c) => sum + c.unit.xp, 0)` (line 473)
- `updateUnitXp` in `src/db/queries/units.ts` (line 251) is the pattern to follow for `updateUnitPoints`

### Files to Reference

| File | Purpose | Key Lines |
| ---- | ------- | --------- |
| `src/routes/armies/$armyId.tsx` | Army route: loader, server fns, layout | L59 (unit payload), L473 (totalXp), L520-538 (XP badge), L643-661 (edit panel props) |
| `src/components/unit-card.tsx` | UnitCard: stats, XP, tier display | L14-18 (props), L348-391 (render), L367-378 (XP + tier line) |
| `src/components/unit-edit-panel.tsx` | Edit panel: stat mods, gains, XP edit | L74-76 (UpdateXpFn type), L101-119 (props interface) |
| `src/db/queries/units.ts` | Unit DB queries | L251-258 (updateUnitXp pattern) |
| `src/db/schema.ts` | Drizzle schema | units.points: integer, nullable |

### Technical Decisions

- Points displayed in `--color-brand` (navy #334155) everywhere (UnitCard + header badge) for visual consistency: navy = points, gold = XP
- Points are nullable — units without points show nothing (no "0 pts")
- Both totals (XP and points) computed client-side from the active `unitCards` array
- Points badge in header uses brand navy color (`--color-brand` / #334155) to distinguish from gold XP badge
- `updateUnitPoints` DB function follows exact same pattern as `updateUnitXp`
- `updatePointsFn` server function follows exact same pattern as `updateXpFn` (armyOwnerMiddleware + zod validator)

## Implementation Plan

### Tasks

- [x] Task 1: Add `updateUnitPoints` DB query function
  - File: `src/db/queries/units.ts`
  - Action: Add `updateUnitPoints(unitId: string, points: number | null): Promise<boolean>` — follows exact same pattern as `updateUnitXp` (line 251-258). Uses `db.update(units).set({ points }).where(eq(units.id, unitId)).returning()`, returns `result.length > 0`.
  - Notes: Points is nullable (allows clearing points back to null). Accept `number | null`.

- [x] Task 2: Add `points` to loader unit payload
  - File: `src/routes/armies/$armyId.tsx`
  - Action: In `loadArmyFn` handler, change line 59 from `unit: { id: unit.id, name: unit.name, type: unit.type, xp: unit.xp }` to `unit: { id: unit.id, name: unit.name, type: unit.type, xp: unit.xp, points: unit.points }`.
  - Notes: `unit.points` is `number | null` from the DB. No schema change needed — column already exists.

- [x] Task 3: Add `updatePointsFn` server function
  - File: `src/routes/armies/$armyId.tsx`
  - Action: Create `updatePointsFn` following the exact pattern of `updateXpFn` (lines 253-285):
    - `createServerFn({ method: 'POST' })` with `.middleware([armyOwnerMiddleware])`
    - Input validator: `z.object({ armyId: z.string(), unitId: z.string(), points: z.number().int().min(0, { message: 'Le coût doit être >= 0' }).nullable() })`
    - Handler: import `getUnitById` + `updateUnitPoints`, verify unit belongs to army, call `updateUnitPoints(data.unitId, data.points)`, return `{ success: true as const }`
  - Notes: Place right after `updateXpFn` block. Error handling mirrors `updateXpFn`. Validator accepts `nullable()` to allow clearing points back to null from the UI.

- [x] Task 4: Display points on UnitCard
  - File: `src/components/unit-card.tsx`
  - Action:
    1. Add `points: number | null` to `UnitCardProps.unit` interface (line 15)
    2. In the header info line (lines 367-378), insert a points span **before** the existing XP span, only if `unit.points !== null`:
       ```tsx
       {unit.points !== null && (
         <span style={{
           fontSize: '0.75rem',
           fontWeight: 600,
           color: 'var(--color-brand)',
           fontFamily: 'var(--font-body)',
         }}>
           {unit.points} pts
         </span>
         <span style={{ color: 'var(--color-separator)', fontSize: '0.65rem' }}>·</span>
       )}
       ```
    3. The existing XP span follows unchanged on the same flex row. The dot separator `·` visually distinguishes points from XP.
  - Notes: Color `--color-brand` (navy #334155) for visual consistency — navy = points everywhere, gold = XP. Both on same flex line with `gap: 0.5rem` (already set).

- [x] Task 5: Add points total badge in army header
  - File: `src/routes/armies/$armyId.tsx`
  - Action:
    1. Add `flexWrap: 'wrap'` to the header flex row (line 483) to prevent overflow on mobile with 2 badges.
    2. After `totalXp` computation (line 473), add: `const totalPoints = unitCards.reduce((sum, c) => sum + (c.unit.points ?? 0), 0)` and `const allHavePoints = unitCards.length > 0 && unitCards.every((c) => c.unit.points !== null)`
    3. Insert a new badge span **before** the existing XP badge (lines 520-538), only if `allHavePoints`:
       ```tsx
       {allHavePoints && (
         <span
           data-testid="army-total-points"
           style={{
             fontFamily: 'var(--font-body)',
             fontWeight: 600,
             fontSize: '0.75rem',
             color: 'var(--color-brand)',
             background: 'var(--color-surface)',
             border: '1px solid var(--color-brand)',
             borderRadius: 999,
             padding: '0.125rem 0.5rem',
             whiteSpace: 'nowrap',
             flexShrink: 0,
           }}
         >
           {totalPoints} pts
         </span>
       )}
       ```
    4. The existing XP badge follows unchanged.
  - Notes: Badge uses `--color-brand` (navy #334155) vs gold for XP. `allHavePoints` guard ensures the total is only shown when it represents the real army total — avoids displaying a misleading partial sum when some units lack points data.

- [x] Task 6: Add points edit field to UnitEditPanel
  - File: `src/components/unit-edit-panel.tsx`
  - Action:
    1. Add `UpdatePointsFn` type (after `UpdateXpFn`, line 74-76): same shape but with `points: number | null` instead of `xp: number`, returns `{ success: boolean; error?: ... }` (no `data` field needed).
    2. Add to `UnitEditPanelProps` (line 101-119): `currentPoints: number | null` and `updatePointsFn: UpdatePointsFn`.
    3. Add state: `const [pointsValue, setPointsValue] = useState(String(currentPoints ?? ''))`, `const [updatingPoints, setUpdatingPoints] = useState(false)`, and a `pointsFeedback = useFeedback()`.
    4. Add handler `handleUpdatePoints` (mirrors `handleUpdateXp`):
       - If `pointsValue.trim() === ''`, send `points: null` (clear points).
       - Otherwise parse with `parseInt(pointsValue, 10)`. If `Number.isNaN(parsed) || parsed < 0`, show feedback error "Veuillez entrer un nombre valide" and return early.
       - Call `updatePointsFn`, show feedback, call `onMutationSuccess()`.
    5. Add a new section **before** the XP section (before line 768), titled "Coût en points":
       - Label: "Coût en points"
       - Input: number, min 0, step 1, value from `pointsValue`, **disabled** when `updatingPoints`
       - Button: "Mettre à jour" / "Mise à jour..." (disabled when `updatingPoints`)
       - FeedbackMsg
    6. Destructure new props in the function signature.
  - Notes: Section placed before XP section, with a visual separator (`borderTop`) between the two sections. Follows exact same form pattern as XP section (lines 768-823). Empty field submits `null` to clear points.

- [x] Task 7: Wire `updatePointsFn` and `currentPoints` to UnitEditPanel
  - File: `src/routes/armies/$armyId.tsx`
  - Action: In the `UnitEditPanel` JSX (lines 643-661), add two new props: `currentPoints={card.unit.points}` and `updatePointsFn={updatePointsFn}`.
  - Notes: No need to manually update `groupUnitsByType` type annotation — TypeScript infers it from the `unitCards` array which already includes `points` after Task 2.

### Acceptance Criteria

- [x] AC1: Given an army with units imported from OWB, when viewing the army page, then each UnitCard shows the unit's point cost (e.g. "150 pts") on the info line before the XP display, in navy color (`--color-brand`).
- [x] AC2: Given an army with units that have points, when viewing the army page header, then a badge showing the total points (e.g. "2000 pts") appears in navy color next to the gold XP badge.
- [x] AC3: Given a unit with `points: null` (imported before points support), when viewing the UnitCard, then no points text is shown (no "0 pts", no "null pts").
- [x] AC4: Given an army where some or all units have `points: null`, when viewing the army header, then no points badge is displayed (badge only shown when all active units have points data).
- [x] AC5: Given an army with some units in the graveyard, when viewing the army header totals, then graveyard units' points and XP are excluded from both totals. (Note: already working — `unitCards` only contains active units.)
- [x] AC6: Given the army owner clicks "Modifier" on a unit, when the edit panel opens, then a "Coût en points" section appears with the current points value pre-filled (or empty if null).
- [x] AC7: Given the army owner enters a new points value and clicks "Mettre à jour", when the server responds successfully, then the points value is persisted and the UnitCard and header badge update after mutation success. Submitting an empty field clears the points (sets to null).
- [x] AC8: Given a non-owner user viewing another player's army, when looking at UnitCards, then they can see points displayed but have no edit capability.

## Additional Context

### Dependencies

None — all required schema columns (`units.points`) and parsing logic already exist. No migration needed.

### Testing Strategy

**Unit tests (vitest):**
- `src/db/__tests__/`: Test `updateUnitPoints` — updates points, returns true; returns false for non-existent unit; accepts null to clear points.
- `src/components/__tests__/unit-card.test.tsx`: Test that points are rendered when non-null, hidden when null.

**Integration / E2E (Playwright):**
- Army view: verify points badge appears in header, points shown per unit card.
- Edit panel: open modifier, change points, verify update persists.
- Non-owner: verify points visible but no edit button.

**Manual testing:**
- Import an OWB army, verify points display.
- Edit points via modifier panel, verify header total updates.
- Send unit to graveyard, verify totals decrease.

## Review Notes

- Adversarial review completed (2026-03-24)
- Findings: 12 total, 5 fixed, 7 skipped (bruit/indécis)
- Resolution approach: auto-fix (findings réels uniquement)
- Fixes appliqués : F1 (sync useEffect points), F3 (max 99999 Zod), F4 (check unit.status active), F5 (check retour updateUnitPoints), F6 (label dupliqué)

### Notes

- Graveyard exclusion from totals is already in place (confirmed) — `unitCards` only contains active units. No fix needed.
- Points total badge only displayed when **all** active units have non-null points — avoids showing a misleading partial total.
- The `updatePointsFn` validator accepts `nullable()` — UI can send `null` to clear points (empty field). Non-null values must be `>= 0`.
- Visual consistency rule: navy (`--color-brand`) = points everywhere, gold (`--color-gold`) = XP everywhere.
