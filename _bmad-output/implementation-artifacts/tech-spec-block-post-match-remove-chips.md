---
title: 'Blocage rapport post-match, suppression action chips, skip XP inline'
slug: 'block-post-match-remove-chips'
created: '2026-03-24'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: [react, tanstack-router, tanstack-start]
files_to_modify: [src/routes/index.tsx, src/components/timeline-entry.tsx]
code_patterns: [fab-toast-pattern, confirmation-modal-pattern]
test_patterns: []
---

# Tech-Spec: Blocage rapport post-match, suppression action chips, skip XP inline

**Created:** 2026-03-24

## Overview

### Problem Statement

A player can currently fill post-match reports out of order — even if a previous match hasn't been processed or if initial XP hasn't been entered. Additionally, the ActionChip strip in the campaign view duplicates functionality already present in the timeline entries.

### Solution

1. Intercept "Au rapport !" click with a navy toast (FAB visual style) when blocked: initial XP not done (priority 1) or previous match report not filled (priority 2).
2. Remove all ActionChip strips from the campaign view entirely.
3. Add a "Passer l'XP initiale" button below "Au rapport !" in the `initial_setup` TimelineEntry, with a mandatory confirmation modal before executing skip.

### Scope

**In Scope:**
- Block "Au rapport !" button + navy toast 3s (same visual style as CreateMatchFab no-army toast, but `position: fixed` — see Task 4 notes)
- Priority 1 message: "Remplissez d'abord l'XP initiale de votre armée"
- Priority 2 message: "Remplissez d'abord le rapport du match précédent"
- Remove all ActionChip strips (pending matches AND initial XP) from `routes/index.tsx`
- Remove result picker modal and `resultPickerMatchId` state (orphaned after chip removal)
- "Passer l'XP initiale" button in TimelineEntry (below "Au rapport !", only for `initial_setup` type)
- Mandatory confirmation modal before skip (consistent with existing delete-match modal style)

**Out of Scope:**
- Server-side guard on the post-match route (see Known Risks)
- Deletion of ActionChip component file (may become dead code)
- Modifications to the post-match flow itself

### Known Risks

- **No server-side guard:** The blocking is purely client-side. A user navigating directly to `/match/$matchId/post-match` bypasses it entirely. A server-side guard should be added in a follow-up to enforce ordering on the backend.

## Context for Development

### Codebase Patterns

- **FAB toast visual style** (`create-match-fab.tsx:182-191`): `handleFabClick` checks `!armyId`, sets a boolean state, shows a positioned navy `<div>` with 3s auto-dismiss via `setTimeout`. Uses a `useRef` for timeout cleanup. Note: FAB toast uses `position: absolute` relative to its container; the block toast uses `position: fixed` (see Task 4).
- **Confirmation modal pattern** (`routes/index.tsx:276-302`): delete-match modal — state holds match info or `null`, overlay with centered card, "Annuler" + action button, resets state on dismiss.
- **TimelineEntry** receives callbacks via props (`onEvolutionStart`, `onPostMatchReentry`, etc.). Blocking logic should live in the parent (`CampaignView`) and be communicated via props or by modifying the callback.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/components/timeline-entry.tsx` | "Au rapport !" button, new "Passer l'XP initiale" button |
| `src/routes/index.tsx` | CampaignView: ActionChip strips to remove, blocking logic, skip confirmation modal, toast state |
| `src/components/create-match-fab.tsx` | Reference for navy toast visual style (lines 182-191, 222-240) |
| `src/components/action-chip.tsx` | Currently imported — will become unused after removal |

### Technical Decisions

- Blocking logic lives in `CampaignView` (parent), not in `TimelineEntry` — the parent has access to `timeline`, `initialSetupMatch`, and `army.needsInitialXp`.
- The `handleEvolutionStart` callback is modified to check blocking conditions before navigating.
- Toast state: clear any existing toast (block or delete) before showing a new one to prevent stacking. Use a single `blockToast` state for the navy block toast; also clear the existing red `toast` when showing a block toast, and vice-versa.
- "Passer l'XP initiale" needs a new prop on TimelineEntry (`onSkipInitialXp`) and a new confirmation modal in CampaignView.

## Implementation Plan

### Tasks

- [x] Task 1: Remove all ActionChip strips and result picker from CampaignView
  - File: `src/routes/index.tsx`
  - Action: Delete the `import { ActionChip }` line and `import type { PendingMatchData }`. Delete the initial XP action strip block (lines ~398-413: the `div` containing "Remplir l'XP de mon armée" and "Passer l'XP initiale" chips). Delete the pending matches action strip block (lines ~415-460: the `div` mapping `pendingMatches` to `ActionChip` components). Delete the result picker modal (lines ~330-359: the `resultPickerMatchId` overlay with Victoire/Défaite/Nul buttons) and remove the `resultPickerMatchId` state declaration. Remove `getPendingMatches` from the loader's dynamic import. Remove `pendingMatches` from `loadCampaignTimelineFn` return value, from `Promise.all`, and from `Route.useLoaderData()` destructure. Remove the `PendingMatchData` type from the loader's guest return.
  - Notes: The `pendingMatches` data is NOT needed for blocking logic because the `timeline` already contains `hasEvolutions` for each match. The result picker modal is orphaned after chip removal — the timeline entries use their own inline result selection buttons.

- [x] Task 2: Add "Passer l'XP initiale" button to TimelineEntry
  - File: `src/components/timeline-entry.tsx`
  - Action: Add optional prop `onSkipInitialXp?: () => void` to `TimelineEntryProps`. Render a secondary button "Passer l'XP initiale" directly below the "Au rapport !" button, only when `isEditable` AND `matchType === 'initial_setup'` AND `!hasEvolutions` AND `onSkipInitialXp` is defined. Style: text-only button, color `var(--color-text-secondary)`, font-size `0.8125rem`, underline, centered, no background/border. `data-testid="skip-initial-xp"`.
  - Notes: This button calls `onSkipInitialXp()` directly — the confirmation modal lives in the parent. The `isEditable` guard ensures consistency with "Au rapport !" visibility (both hidden for guests).

- [x] Task 3: Add skip XP confirmation modal to CampaignView
  - File: `src/routes/index.tsx`
  - Action: Add state `const [skipXpConfirmOpen, setSkipXpConfirmOpen] = useState(false)`. Create `handleSkipInitialXp` that sets `skipXpConfirmOpen = true`. Create `confirmSkipInitialXp` that calls `skipInitialXpFn()`, then invalidates router. Add a confirmation modal (same style as `deleteConfirmMatch` modal): title "Passer l'XP initiale ?", body "Les unités ne recevront aucune XP de départ. Cette action ne peut pas être annulée depuis l'interface.", buttons "Annuler" + "Confirmer" (navy). Pass `onSkipInitialXp={handleSkipInitialXp}` to the `initial_setup` TimelineEntry.
  - Notes: Reuse exact same modal pattern as the delete-match confirmation.

- [x] Task 4: Add blocking logic to `handleEvolutionStart`
  - File: `src/routes/index.tsx`
  - Action: Add state `const [blockToast, setBlockToast] = useState<string | null>(null)` and a `blockToastTimeoutRef = useRef(...)` for cleanup. Modify `handleEvolutionStart(matchId)` to check:
    - **(1) Initial XP block** — if `army.needsInitialXp && matchId !== initialSetupMatch?.matchId` → if `initialSetupMatch === null` (auto-creation in progress) OR `initialSetupMatch.evolutionsEnteredAt === null` (not yet filled) → clear any existing `toast` (delete-match), show blockToast "Remplissez d'abord l'XP initiale de votre armée" and return.
    - **(2) Previous match block** — find the match in `timeline`, check if any **standard** match (`matchType !== 'initial_setup'`) AFTER it in the array (= older by date) has `!hasEvolutions && result !== null` → clear any existing `toast`, show blockToast "Remplissez d'abord le rapport du match précédent" and return.
    - Otherwise navigate normally.
  - Toast rendering: navy `#1e293b` div, `position: fixed`, `bottom: 70px`, centered via `left: 50%; transform: translateX(-50%)`, 3s auto-dismiss via setTimeout. When showing a new blockToast, clear any previous timeout via ref first.
  - **CRITICAL:** Condition (1) must **exclude** the `initial_setup` match itself (`matchId !== initialSetupMatch?.matchId`), otherwise clicking "Au rapport !" on the initial_setup entry would block itself in an infinite loop.
  - Notes: Timeline is sorted newest-first, so "after in the array" = older match. Only check standard matches with `result !== null` in condition (2) — initial_setup matches are excluded to avoid nonsensical blocking messages. Also add `useEffect` cleanup for the timeout ref on unmount. When showing a blockToast, also call `setToast(null)` to dismiss any active delete-match toast, preventing visual collision (both render at `bottom: 70px`).

- [x] Task 5: Clean up unused imports and dead code
  - File: `src/routes/index.tsx`
  - Action: Verify no remaining references to `ActionChip`, `PendingMatchData`, `getPendingMatches`, `pendingMatches`, or `resultPickerMatchId`. Remove any stragglers missed in Task 1.
  - Notes: This is a verification pass — most cleanup should already be done in Task 1.

### Acceptance Criteria

- [x] AC1: Given a player with `needsInitialXp=true` and an incomplete initial_setup match, when they click "Au rapport !" on any **standard** match, then a navy toast "Remplissez d'abord l'XP initiale de votre armée" appears for 3s and no navigation occurs.

- [x] AC2: Given a player with two standard matches where the older one has no evolutions (result set, `hasEvolutions=false`), when they click "Au rapport !" on the newer match, then a navy toast "Remplissez d'abord le rapport du match précédent" appears for 3s and no navigation occurs.

- [x] AC3: Given a player with two standard matches where the older one has evolutions completed, when they click "Au rapport !" on the newer match, then navigation to `/match/$matchId/post-match` occurs normally.

- [x] AC4: Given a player with an `initial_setup` TimelineEntry without evolutions, when they view it, then both "Au rapport !" and "Passer l'XP initiale" buttons are visible.

- [x] AC5: Given the "Passer l'XP initiale" button is visible, when the player clicks it, then a confirmation modal appears with title "Passer l'XP initiale ?", message about irreversibility, and "Annuler"/"Confirmer" buttons.

- [x] AC6: Given the skip confirmation modal is open, when the player clicks "Annuler", then the modal closes and nothing happens.

- [x] AC7: Given the skip confirmation modal is open, when the player clicks "Confirmer", then `skipInitialXpFn` is called, the page refreshes, and the initial_setup entry is removed.

- [x] AC8: Given the campaign view loads, then no ActionChip strip is rendered (neither pending matches nor initial XP chips) and no result picker modal exists.

- [x] AC9: Given the blocking toast is visible and the player clicks "Au rapport !" again, then the previous toast is cleared and a new one appears (no toast stacking). Similarly, a block toast dismisses any active delete-match toast.

- [x] AC10: Given a player where the only match without evolutions is the oldest one, when they click "Au rapport !" on it, then navigation proceeds normally (no blocking — there's no older unfilled match).

- [x] AC11: Given a player with `needsInitialXp=true`, when they click "Au rapport !" on the `initial_setup` match itself, then navigation proceeds normally (the initial_setup match is NOT blocked by its own condition).

- [x] AC12: Given a player with `needsInitialXp=true` but `initialSetupMatch` is null (auto-creation in progress), when they click "Au rapport !" on any standard match, then the blocking toast appears (condition 1 still fires because `initialSetupMatch === null` is handled).

## Additional Context

### Dependencies

None — purely frontend changes using existing server functions (`skipInitialXpFn`).

### Testing Strategy

- **Unit tests (component):** Test TimelineEntry renders "Passer l'XP initiale" button only for `initial_setup` type when `isEditable` is true and `onSkipInitialXp` is provided. Verify it does NOT render when `isEditable` is false.
- **Unit tests (integration):** Test that CampaignView's `handleEvolutionStart` blocks navigation and shows toast when conditions are met. This requires mocking `timeline` data with various `hasEvolutions` states. Specifically test: standard match blocked by initial XP, initial_setup match NOT blocked by itself, standard match blocked by older unfilled standard match.
- **Manual testing:** Verify toast positioning, 3s dismiss, no toast collision, modal flow, and navigation blocking with real data.

## Review Notes
- Adversarial review completed (2026-03-24) — Claude Opus
- Findings: 13 total, 7 fixed, 6 skipped (bruit/hors-scope/indécis)
- Résolution: auto-fix [F]
- Fixes appliqués: F1 (error handling confirmSkipInitialXp), F3 (double-submit guard), F5 (token CSS brand-dark), F6 (commentaire tri timeline), F7 (commentaire intention result!==null), F11 (async error handling), F12 (maxWidth toast + suppression nowrap)

### Notes

- `skipInitialXpFn` already exists in `routes/index.tsx` (lines 97-126) — no backend changes needed.
- After removing ActionChips, the `ActionChip` component file and its test file become dead code but are left in place (out of scope).
- The blocking toast uses `position: fixed` (not `absolute` like the FAB toast) because it's rendered in the page context, not inside a positioned container. The visual style (navy background, white text, rounded corners, shadow) is the same.
- Timeline ordering: sorted by date DESC, then by `createdAt` DESC as tie-breaker for same-day matches. The blocking logic relies on this deterministic ordering.
- Edge case: if a player has `needsInitialXp` but the initial_setup match doesn't exist yet (auto-creation in progress via `useEffect`), `initialSetupMatch` will be null. Condition (1) handles this: `army.needsInitialXp && matchId !== null?.matchId` (comparison with undefined is always true) AND `initialSetupMatch === null` → toast fires.
