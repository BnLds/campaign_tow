# Story 4.1: Post-Match Flow — XP Entry per Unit & Character

Status: review

## Story

As a player,
I want to launch the post-match flow and enter XP gained for each unit and character,
So that my army's progression is recorded after every game.

## Acceptance Criteria

**AC1 — Wizard launches from ActionChip (post-match pending):**
Given a match exists involving my army, the result has been entered, and I have not yet entered my evolutions (`evolutionsEnteredAt` is null),
When I tap the corresponding "Rapport de bataille" ActionChip on the Campaign view,
Then the app navigates to `/match/$matchId/post-match` and the PostMatchWizard displays my units in sequence (FR21).

**AC2 — Wizard launches from timeline entry:**
Given a match exists involving my army with evolutions not yet entered,
When I access the match from the timeline (Campaign view or army detail view),
Then the PostMatchWizard launches identically to AC1 (FR21).

**AC3 — XP entry for a regular unit:**
Given the wizard is on a unit step (type !== 'Personnage'),
When I enter the XP gained (integer >= 0) and confirm,
Then the XP is added to `units.xp` (cumulative: `newXp = oldXp + enteredXp`) and the wizard advances to the next unit (FR22).

**AC4 — XP entry for a character:**
Given the wizard is on a character step (type === 'Personnage'),
When I enter the XP gained (integer >= 0) and confirm,
Then the XP is added to the character's `units.xp` (cumulative) and the wizard advances (FR23).

**AC5 — Wizard completion marks evolutions as entered:**
Given I have entered XP for all units and characters,
When the wizard completes and all XP values are saved,
Then `match_participants.evolutionsEnteredAt` is set to the current timestamp for my army, and the corresponding ActionChip disappears from the Campaign view on next load.

**AC6 — PostMatchWizard UI displays unit info and XP input:**
Given the wizard is on any unit or character step,
When the step renders,
Then I see the unit name, type, current XP, a numeric input field for XP gained (default 0, min 0, max 99), a progress indicator ("Unité X / N"), and a "Suivant" button (min 44px tap target). The last step shows "Terminer" instead of "Suivant".

**AC7 — Post-match link hidden for non-participants:**
Given a match exists involving another player's army (I am not a participant, or I am a guest),
When the Campaign view or timeline renders,
Then no ActionChip or "Saisir évolutions" link for that match is present in the DOM (not just hidden — not rendered at all). The server function also rejects unauthorized access with FORBIDDEN.

**AC8 — Skipping XP entry (0 XP):**
Given the wizard is on a unit or character step,
When I enter 0 XP and confirm,
Then `units.xp` is unchanged and the wizard advances to the next unit normally.

## Context & Background

This is the first story of Epic 4 — the core value loop. It creates the sequential post-match wizard where a player enters XP for each unit one by one.

### What this story creates

**New route:**
- `/match/$matchId/post-match` — renders the `PostMatchWizard` component

**New components:**
- `PostMatchWizard` — sequential wizard that iterates over the player's units, presenting one unit at a time for XP entry. Shows unit name, type, current XP. Input field for XP gained. "Suivant" button to confirm and advance.
- `WizardUnitStep` — individual step showing one unit's info and XP input field

**New server functions:**
- `loadPostMatchDataFn` — GET: loads the match, verifies the player is a participant, loads the player's army units with current XP values. Returns the list of units to iterate over.
- `submitUnitXpFn` — POST: validates and saves XP for a single unit (`units.xp += enteredXp`). Returns updated XP value.
- `completeEvolutionsFn` — POST: sets `match_participants.evolutionsEnteredAt` to current timestamp.

**New query functions:**
- `getMatchParticipantForEvolution(matchId, armyId)` — returns participant row including `evolutionsEnteredAt` to check if already completed
- `incrementUnitXp(unitId, xpGained)` — atomically increments `units.xp` by the given amount (SQL `SET xp = xp + $amount`)
- `markEvolutionsEntered(matchParticipantId)` — sets `evolutionsEnteredAt = NOW()`

**New validation schemas:**
- `submitUnitXpSchema` — `z.object({ unitId: z.string().min(1), xpGained: z.number().int().min(0).max(99) })`
- `completeEvolutionsSchema` — `z.object({ matchId: z.string().min(1) })`

**Modified files:**
- `src/routes/index.tsx` — ActionChip `href` for post-match links wired to `/match/$matchId/post-match`
- `src/components/action-chip.tsx` — no changes needed (already supports `href`)
- `src/db/schema.ts` — no schema changes (all required columns already exist: `units.xp`, `match_participants.evolutionsEnteredAt`)

### Key existing infrastructure

| Artifact | Location | Status |
|---|---|---|
| `units.xp` column | `src/db/schema.ts` | Exists (story 2.1) — integer, default 0 |
| `matchParticipants.evolutionsEnteredAt` | `src/db/schema.ts` | Exists (story 3.1) — nullable timestamp |
| `getPlayerArmy()` | `src/db/queries.ts` | Exists — returns player's army |
| `getUnitsForArmy()` | `src/db/queries.ts` | Exists — returns all units for an army |
| `getMatchParticipantByMatchAndArmy()` | `src/db/queries.ts` | Exists (story 3.3) |
| `updateUnitXp()` | `src/db/queries.ts` | Exists (story 2.4) — but does absolute SET, not increment |
| `getPendingMatches()` | `src/db/queries.ts` | Exists (story 3.2) — identifies matches needing evolutions |
| `authMiddleware` | `src/lib/middleware.ts` | Exists (epic 1) |
| `ActionChip` | `src/components/action-chip.tsx` | Exists (story 3.2) — supports `href` prop |
| `TimelineEntry` | `src/components/timeline-entry.tsx` | Exists (story 3.3) — `hasEvolutions` prop |
| `calculateTier()` | `src/lib/tier.ts` | Exists — tier detection for display (used in wizard summary, NOT for tier-up logic which is story 4.2) |
| `data-app-hydrated` pattern | `src/lib/useHydrated.ts` | Exists — MUST be applied to new route |

### Scope boundaries

**IN scope:**
- New route `/match/$matchId/post-match` with PostMatchWizard component
- Server function to load post-match data (match + units)
- Server function to save XP per unit (one at a time)
- Server function to mark evolutions as entered
- Atomic XP increment query function
- Mark evolutions entered query function
- ActionChip wiring to navigate to post-match route
- XP input validation (integer >= 0)
- Authorization (participant check, non-guest check)
- Unit tests for query functions, server functions, wizard component

**OUT of scope:**
- Tier-up detection and improvement choice (story 4.2) — wizard advances immediately after XP entry, no tier check
- Character injuries and bonuses (story 4.3)
- XP calculation wizard (Phase 2 feature) — player enters a pre-calculated XP number
- E2E tests (optional)

## Tasks / Subtasks

- [x] Task 1 — Create new query functions in `src/db/queries.ts` (AC: 3, 4, 5, 7, 8)
  - [x]1.1 — `getMatchParticipantForEvolution(matchId: string, armyId: string)`: SELECT from `match_participants` WHERE `matchId` AND `armyId`, return `{ id, matchId, armyId, result, evolutionsEnteredAt } | null`. Used to verify participant AND check if evolutions already entered.
  - [x]1.2 — `incrementUnitXp(unitId: string, xpGained: number)`: UPDATE `units` SET `xp = xp + xpGained` WHERE `id = unitId`. Uses SQL expression for atomic increment (not read-then-write). Returns `{ id, xp }` (new total) or null if unit not found.
  - [x]1.3 — `markEvolutionsEntered(matchParticipantId: string)`: UPDATE `match_participants` SET `evolutionsEnteredAt = NOW()` WHERE `id = matchParticipantId`. Returns boolean (true if row updated).
  - [x]1.4 — Export all three functions from `src/db/queries.ts`

- [x] Task 2 — Create validation schemas in `src/lib/validators.ts` (AC: 3, 4, 5)
  - [x]2.1 — Add `submitUnitXpSchema`: `z.object({ unitId: z.string().min(1), xpGained: z.number().int().min(0).max(99) })` with type export `SubmitUnitXpInput`
  - [x]2.2 — Add `completeEvolutionsSchema`: `z.object({ matchId: z.string().min(1) })` with type export `CompleteEvolutionsInput`

- [x] Task 3 — Create post-match route file `src/routes/match/$matchId/post-match.tsx` (AC: 1, 2, 6, 7)
  - [x]3.1 — Create route directory structure: `src/routes/match/$matchId/post-match.tsx`
  - [x]3.2 — Define `loadPostMatchDataFn` (GET server function with `authMiddleware`): (a) reject guests → redirect, (b) get player's army via `getPlayerArmy`, (c) verify army is participant via `getMatchParticipantForEvolution`, (d) if `evolutionsEnteredAt` is already set → return `{ alreadyCompleted: true }`, (e) load army's units via `getUnitsForArmy`, (f) return `{ matchId, matchParticipantId, units: [{ id, name, type, xp }], alreadyCompleted: false }`
  - [x]3.3 — Create route with `createFileRoute('/match/$matchId/post-match')`, loader calls `loadPostMatchDataFn({ data: { matchId } })`, component renders `PostMatchWizard`
  - [x]3.4 — Apply `data-app-hydrated` pattern (MANDATORY for new route component)

- [x] Task 4 — Create `submitUnitXpFn` server function (AC: 3, 4, 8)
  - [x]4.1 — In the post-match route file, define `submitUnitXpFn` as POST server function with `authMiddleware` + `inputValidator(submitUnitXpSchema)`
  - [x]4.2 — Authorization: reject guests (UNAUTHORIZED), get player army, verify unit belongs to player's army via `getUnitById(data.unitId)` → check `unit.armyId === army.id`. Return `ServerResult` errors, do NOT throw. Note: `getUnitById` already exists in `src/db/queries.ts` (story 2.4).
  - [x]4.3 — Always call `incrementUnitXp(data.unitId, data.xpGained)` — even when `xpGained === 0`. SQL `SET xp = xp + 0` is a no-op at DB level and returns current value. Avoids a separate code path and extra `getUnitById` fetch. Return `{ success: true, data: { unitId, newXp } }`.

- [x] Task 5 — Create `completeEvolutionsFn` server function (AC: 5)
  - [x]5.1 — In the post-match route file, define `completeEvolutionsFn` as POST server function with `authMiddleware` + `inputValidator(completeEvolutionsSchema)`
  - [x]5.2 — Authorization: reject guests, get player army, verify army is participant via `getMatchParticipantByMatchAndArmy`, verify `evolutionsEnteredAt` is null (idempotent: if already set, return success)
  - [x]5.3 — Call `markEvolutionsEntered(participantId)`, return `{ success: true, data: { matchId } }`

- [x] Task 6 — Build `PostMatchWizard` component (AC: 1, 2, 3, 4, 5, 6, 8)
  - [x]6.1 — Create `src/components/post-match-wizard.tsx`. Props: `matchId: string`, `matchParticipantId: string`, `units: Array<{ id, name, type, xp }>`, `onComplete: () => void`. Internal state: `currentStep: number` (index into units array).
  - [x]6.2 — Render a progress indicator: "Unite X / N" at the top showing current position in sequence
  - [x]6.3 — For each step, render `WizardUnitStep`: unit name (Cinzel font), unit type, current XP display, numeric input field for XP gained (default 0, min 0, max 99, `inputMode="numeric"` + `step="1"` to prevent decimal input on mobile), button label "Suivant" for steps 1..N-1, "Terminer" for the last step (min 44px tap target)
  - [x]6.4 — On "Suivant" click: call `submitUnitXpFn({ data: { unitId, xpGained } })`. If success, advance `currentStep`. If error, show inline French error message.
  - [x]6.5 — After the last unit's `submitUnitXpFn` succeeds (i.e., `currentStep` would advance past `units.length - 1`): call `completeEvolutionsFn({ data: { matchId } })`, then call `onComplete()` callback (which navigates back to Campaign view via `router.navigate({ to: '/' })`)
  - [x]6.6 — Show loading/disabled state during server call (prevent double-submit)
  - [x]6.7 — If `units.length === 0`, show "Aucune unite dans votre armee" message and a "Retour" button
  - [x]6.8 — Add `data-testid` attributes: `data-testid="wizard-progress"`, `data-testid="wizard-unit-name"`, `data-testid="wizard-xp-input"`, `data-testid="wizard-next-button"`, `data-testid="wizard-error"`, `data-testid="wizard-complete"`

- [x] Task 7 — Wire ActionChip navigation on Campaign view (AC: 1)
  - [x]7.1 — In `src/routes/index.tsx`, update the ActionChip rendering for post-match pending items: set `href={'/match/' + match.matchId + '/post-match'}` on chips where `match.myResult !== null && match.myEvolutionsEnteredAt === null`
  - [x]7.2 — Keep result-pending chips (`myResult === null`) as-is (no href — result must be entered first via story 3.3)

- [x] Task 8 — Wire timeline entry navigation (AC: 2, 6)
  - [x]8.1 — In `TimelineEntry` component, add optional `onEvolutionStart?: (matchId: string) => void` prop. When `hasEvolutions === false` and `result !== null` and `isEditable`, show a "Saisir evolutions" link/button that calls `onEvolutionStart(matchId)`
  - [x]8.2 — In Campaign view, pass `onEvolutionStart` callback that navigates to `/match/$matchId/post-match` via `router.navigate()`
  - [x]8.3 — In army detail view (`$armyId.tsx`), pass `onEvolutionStart` callback when `isOwner` is true

- [x] Task 9 — Handle "already completed" state (AC: 5)
  - [x]9.1 — In the PostMatchWizard route component, if `loadPostMatchDataFn` returns `alreadyCompleted: true`, display a message "Evolutions deja saisies pour cette partie" with a "Retour" link to Campaign view
  - [x]9.2 — Ensure ActionChip for completed evolutions no longer appears (existing `getPendingMatches` query already filters on `evolutionsEnteredAt IS NULL`)

- [x] Task 10 — Write unit tests (AC: 1-8)
  - [x]10.1 — Test `incrementUnitXp`: increments XP atomically (start at 5, add 3 → 8)
  - [x]10.2 — Test `incrementUnitXp`: adding 0 XP returns same value
  - [x]10.3 — Test `incrementUnitXp`: returns null for non-existent unitId
  - [x]10.4 — Test `markEvolutionsEntered`: sets timestamp and returns true
  - [x]10.5 — Test `markEvolutionsEntered`: returns false for non-existent participant
  - [x]10.6 — Test `getMatchParticipantForEvolution`: returns participant with `evolutionsEnteredAt` field
  - [x]10.7 — Test `getMatchParticipantForEvolution`: returns null for non-participant
  - [x]10.8 — Test `submitUnitXpSchema`: validates `{ unitId: 'abc', xpGained: 3 }`, rejects `{ unitId: '', xpGained: -1 }`, rejects `{ unitId: 'abc', xpGained: 100 }`
  - [x]10.9 — Test `completeEvolutionsSchema`: validates `{ matchId: 'abc' }`, rejects `{ matchId: '' }`
  - [x]10.10 — Test `submitUnitXpFn`: rejects guest users (UNAUTHORIZED)
  - [x]10.11 — Test `submitUnitXpFn`: rejects player whose army doesn't own the unit (FORBIDDEN)
  - [x]10.12 — Test `submitUnitXpFn`: successfully increments XP and returns new total
  - [x]10.13 — Test `submitUnitXpFn`: returns current XP unchanged when `xpGained === 0` (calls `incrementUnitXp` with 0 — no special case)
  - [x]10.14 — Test `completeEvolutionsFn`: rejects guest users
  - [x]10.15 — Test `completeEvolutionsFn`: rejects non-participant
  - [x]10.16 — Test `completeEvolutionsFn`: successfully marks evolutions entered
  - [x]10.17 — Test `completeEvolutionsFn`: idempotent when already completed
  - [x]10.18 — Test `PostMatchWizard` component: renders first unit name and XP input
  - [x]10.19 — Test `PostMatchWizard` component: shows progress "Unite 1 / N"
  - [x]10.20 — Test `PostMatchWizard` component: "Suivant" button calls `submitUnitXpFn` with correct unitId and xpGained
  - [x]10.21 — Test `PostMatchWizard` component: advances to next unit after successful submission
  - [x]10.22 — Test `PostMatchWizard` component: displays error message on failed submission
  - [x]10.23 — Test `PostMatchWizard` component: calls `completeEvolutionsFn` and `onComplete` after last unit
  - [x]10.24 — Test `PostMatchWizard` component: "Suivant" button disabled during submission
  - [x]10.25 — Test `PostMatchWizard` component: empty units array shows "Aucune unite" message
  - [x]10.26 — Test `PostMatchWizard` component: last step shows "Terminer" instead of "Suivant"
  - [x]10.27 — Test `loadPostMatchDataFn`: rejects guest users
  - [x]10.28 — Test `loadPostMatchDataFn`: rejects non-participant
  - [x]10.29 — Test `loadPostMatchDataFn`: returns `alreadyCompleted: true` when `evolutionsEnteredAt` is set
  - [x]10.30 — Test Campaign view: ActionChip href for post-match is `/match/$matchId/post-match` when result exists but evolutions not entered
  - [x]10.31 — Test TimelineEntry: shows "Saisir evolutions" when `hasEvolutions=false`, `result` set, `isEditable=true`

- [x] Task 11 — Quality gates
  - [x]11.1 — `pnpm typecheck` — zero errors
  - [x]11.2 — `pnpm lint` — zero errors
  - [x]11.3 — `pnpm build` — succeeds
  - [x]11.4 — All existing tests still pass (no regressions)

## Dev Notes

### CRITICAL — Post-Match Wizard Sequential Flow

The wizard presents units ONE BY ONE in a linear sequence. This is NOT a form with all units visible — it's a step-by-step wizard. The player sees:

1. Unit name + type + current XP → enters XP gained → taps "Suivant"
2. Next unit appears → repeat
3. After last unit → "Terminer" (wizard calls `completeEvolutionsFn`)
4. Redirects to Campaign view

**Why sequential?** The PRD explicitly states "l'app passe ses unites en revue une par une" (Journey 1). This creates the satisfying post-match ritual — each unit gets its moment.

### CRITICAL — Atomic XP Increment Pattern

The `incrementUnitXp` function MUST use SQL-level increment, not read-then-write:

```typescript
export async function incrementUnitXp(
  unitId: string,
  xpGained: number,
): Promise<{ id: string; xp: number } | null> {
  const rows = await db
    .update(units)
    .set({ xp: sql`${units.xp} + ${xpGained}` })
    .where(eq(units.id, unitId))
    .returning({ id: units.id, xp: units.xp })
  return rows.length > 0 ? rows[0] : null
}
```

This prevents race conditions if two tabs submit simultaneously. The existing `updateUnitXp` (story 2.4) does an absolute SET — it's used for direct editing. `incrementUnitXp` is for the post-match flow where we ADD to the current total.

### CRITICAL — Route File Structure

Per the architecture doc, the post-match route lives at:
```
src/routes/match/$matchId/post-match.tsx
```

This creates the URL pattern `/match/:matchId/post-match`. The route directory `match/$matchId/` may need to be created. Server functions are co-located in this route file.

### CRITICAL — Authorization Chain

```
loadPostMatchDataFn:
  1. authMiddleware → session
  2. session.isGuest → throw redirect to '/'
  3. getPlayerArmy(session.playerId) → army or throw FORBIDDEN
  4. getMatchParticipantForEvolution(matchId, army.id) → participant or throw FORBIDDEN
  5. participant.evolutionsEnteredAt !== null → return { alreadyCompleted: true }
  6. getUnitsForArmy(army.id) → units

submitUnitXpFn:
  1. authMiddleware → session
  2. session.isGuest → return { success: false, UNAUTHORIZED }
  3. getPlayerArmy → army or FORBIDDEN
  4. getUnitById(data.unitId) → unit exists and unit.armyId === army.id, or FORBIDDEN
  5. incrementUnitXp(data.unitId, data.xpGained) → return new XP

completeEvolutionsFn:
  1. authMiddleware → session
  2. session.isGuest → return { success: false, UNAUTHORIZED }
  3. getPlayerArmy → army or FORBIDDEN
  4. getMatchParticipantByMatchAndArmy → participant or FORBIDDEN
  5. markEvolutionsEntered(participant.id)
```

### CRITICAL — Existing `updateUnitXp` vs New `incrementUnitXp`

Story 2.4 created `updateUnitXp(unitId, xp)` which does an absolute SET. This is correct for direct editing (admin sets XP to a specific value). The post-match flow needs INCREMENT semantics (add gained XP to current total). Both functions coexist — they serve different use cases.

### Navigation After Completion

After the wizard completes (`completeEvolutionsFn` succeeds), the route component should navigate back to the Campaign view using `router.navigate({ to: '/' })`. The Campaign view's loader will re-fetch data, and the completed match will no longer appear in the pending action chips.

### Result Entry Must Precede Evolution Entry

A match must have a result entered (`match_participants.result IS NOT NULL`) before evolutions can be entered. The `getPendingMatches` query already distinguishes: chips with `myResult === null` are "Resultat a entrer" (handled by story 3.3), chips with `myResult !== null && myEvolutionsEnteredAt === null` are "Rapport de bataille" (post-match flow). Only the latter should navigate to `/match/$matchId/post-match`.

### RISK — Pre-mortem Findings

**Failure scenario 1 — XP input accepts non-integer values:**
HTML number input can accept decimals on some browsers. Mitigation: Zod schema enforces `.int()`. Server rejects non-integers. Client-side input should use `inputMode="numeric"` and `step="1"`.

**Failure scenario 2 — Player refreshes mid-wizard:**
If the player refreshes the page at step 3/5, the route reloads fresh. Previously submitted XP values are already saved (each "Suivant" tap is a server call). However, the wizard restarts at step 1 — the player would re-enter XP for units they already submitted (double-counting). Mitigation for MVP: accept this limitation. The player can go back to direct edit (story 2.4) to correct. Full fix post-MVP: track per-unit submission in a `match_unit_evolutions` table.

**Failure scenario 3 — Wizard shows units in inconsistent order:**
If `getUnitsForArmy` returns units in different order on reload, the progress display becomes confusing. Mitigation: `getUnitsForArmy` already orders by `createdAt` — deterministic.

**Failure scenario 4 — Network failure after XP saved but before `completeEvolutionsFn`:**
XP increments are saved individually. If the network drops after the last unit but before `completeEvolutionsFn`, the XP is correct but `evolutionsEnteredAt` stays null. The ActionChip remains visible and the player can re-enter the wizard. On re-entry, they see the wizard again (with units at updated XP). They would need to enter 0 XP for all units and complete. Acceptable for MVP.

**Failure scenario 5 — Direct API call to `submitUnitXpFn` outside wizard context:**
A savvy user could call `submitUnitXpFn` directly via HTTP POST without going through the wizard, bypassing the sequential flow. Mitigation: the server function validates unit ownership (unit.armyId === army.id) but does NOT validate match context — XP is added to the unit regardless. This is acceptable for MVP: a player can only modify their own units, and the same XP edit is available via direct edit (story 2.4). No additional server-side guard needed.

**Failure scenario 6 — `completeEvolutionsFn` called without all units having received XP:**
The server function stamps `evolutionsEnteredAt` without verifying that every unit received an XP entry. A player could skip units by calling `completeEvolutionsFn` directly. Mitigation: acceptable for MVP — the server trusts the client flow. The wizard UI ensures all units are visited. Post-MVP: add a `match_unit_evolutions` join table to track per-unit submission status.

### IMPORTANT — XP Input Client-Side Hardening

The HTML `<input type="number">` accepts decimals on some browsers (especially desktop). Three layers of defense:
1. **Client:** `inputMode="numeric"` + `step="1"` + `pattern="[0-9]*"` on the input element. Also `Math.floor()` the value before sending.
2. **Schema:** Zod `.int()` rejects non-integer values at `inputValidator` level (server-side).
3. **SQL:** `xp` column is `integer` — Postgres rejects fractional values at DB level.

All three layers are mandatory. Do NOT rely on client-side alone.

### IMPORTANT — Existing Query Dependencies

`submitUnitXpFn` uses `getUnitById` (from story 2.4) for ownership verification. This function is already exported from `src/db/queries.ts` and returns `{ id, armyId, name, type, xp } | null`. No new query needed for this step — only dynamic import it inside the handler.

### Architecture Compliance

- **DB access via `src/db/queries.ts` named functions** — never import `db` or `drizzle-orm` in route files
- **Dynamic imports inside `.handler()`** for all DB/auth/lib calls
- **Error messages in French** — all user-facing strings in French
- **Follow naming conventions:** `kebab-case` files, `camelCase` code, `PascalCase` types/components
- **Server functions co-located in route file** — `loadPostMatchDataFn`, `submitUnitXpFn`, `completeEvolutionsFn` in post-match route
- **Mutations use `ServerResult<T>` return type**
- **`data-app-hydrated` pattern** — MUST be applied to new route component
- **Domain logic in `src/lib/`** — no XP/tier logic in route files

### References

- Epic 4: [Source: epics/epic-4-post-match-flow-xp-progression.md]
- PRD FR21: "Un joueur peut lancer un flow post-match sequentiel pour une partie jouee"
- PRD FR22: "Dans le flow post-match, un joueur peut saisir l'XP gagne pour chaque unite de son armee"
- PRD FR23: "Dans le flow post-match, un joueur peut saisir l'XP gagne pour chaque personnage de son armee"
- PRD FR29: "Un joueur peut saisir les evolutions d'une partie de maniere retroactive"
- Architecture patterns: [Source: architecture/implementation-patterns-consistency-rules.md]
- Route structure: [Source: architecture/implementation-patterns-consistency-rules.md — `match/$matchId/post-match.tsx`]
- Existing schema: [Source: src/db/schema.ts] — `units.xp`, `matchParticipants.evolutionsEnteredAt`
- Existing queries: [Source: src/db/queries.ts] — `getPlayerArmy`, `getUnitsForArmy`, `getMatchParticipantByMatchAndArmy`, `updateUnitXp`
- Campaign view: [Source: src/routes/index.tsx] — ActionChip rendering, pending matches
- Tier utility: [Source: src/lib/tier.ts] — `calculateTier` (display only in this story)
- Palette: [Source: MEMORY.md — Palette section]

## File List

### New
- `src/routes/match/$matchId/post-match.tsx` — Post-match wizard route (server functions + component)
- `src/components/post-match-wizard.tsx` — PostMatchWizard component
- `src/db/__tests__/queries-post-match.test.ts` — DB query contract tests (pre-written TDD)
- `src/lib/__tests__/validators-post-match.test.ts` — Validator contract tests (pre-written TDD)
- `src/routes/match/$matchId/__tests__/post-match.test.ts` — Route server function contract tests (pre-written TDD)
- `src/components/__tests__/post-match-wizard.test.tsx` — Component tests (pre-written TDD, minor fix: removed unused `style` var)
- `src/components/__tests__/timeline-entry-evolutions.test.tsx` — TimelineEntry evolution tests (pre-written TDD)
- `src/routes/__tests__/campaign-post-match.test.ts` — Campaign view ActionChip tests (pre-written TDD, minor fix: useless escape)

### Modified
- `src/db/queries.ts` — Added `getMatchParticipantForEvolution`, `incrementUnitXp`, `markEvolutionsEntered`
- `src/lib/validators.ts` — Added `submitUnitXpSchema`, `completeEvolutionsSchema` with type exports
- `src/routes/index.tsx` — ActionChip `href` wired for post-match navigation; `handleEvolutionStart` callback; `onEvolutionStart` passed to TimelineEntry
- `src/components/timeline-entry.tsx` — Added optional `onEvolutionStart` prop and "Saisir évolutions" button
- `src/routeTree.gen.ts` — Manually added `/match/$matchId/post-match` route registration

### Notes on Task 8.3
- `src/routes/armies/$armyId.tsx` was NOT modified — the army detail view has no timeline component to wire `onEvolutionStart` to. The TimelineEntry is only used in the Campaign view (index.tsx). Task 8.3 is satisfied by the TimelineEntry prop addition (Task 8.1); the army detail wiring is N/A without a timeline section in that view.

## Change Log

- 2026-03-17 — Implementation complete: all Tasks 1-11 done, 1038/1039 tests passing (1 pre-existing failure unrelated to story), typecheck clean, build succeeds (Claude Sonnet 4.6)
- 2026-03-17 — Advanced elicitation applied: Failure Mode Analysis, Self-Consistency Validation, Challenge from Critical Perspective (Claude Opus 4.6)
- 2026-03-17 — Story spec created (Claude Opus 4.6)
