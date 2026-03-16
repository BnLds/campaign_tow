---
title: 'Campaign Header — Army Info Integration'
slug: 'campaign-header-army-info'
created: '2026-03-16'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['TanStack Start', 'TanStack Router', 'TanStack Query', 'React', 'Tailwind v4', 'Drizzle ORM']
files_to_modify: ['src/routes/__root.tsx', 'src/routes/index.tsx', 'src/styles/globals.css']
code_patterns: ['beforeLoad returns router context consumed by useRouteContext', 'createServerFn with dynamic imports for server-only code', 'file-content structural tests with readFileSync + vitest']
test_patterns: ['vitest + readFileSync file-contract assertions', 'describe/it with AC references in names']
---

# Tech-Spec: Campaign Header — Army Info Integration

**Created:** 2026-03-16

## Overview

### Problem Statement

The current `AppHeader` (in `__root.tsx`) only displays the account name and a logout button. The player's army information (army name, faction, win/loss record, link to army detail) is rendered separately inside the `CampaignView` body (`index.tsx`), creating a visual disconnect that does not match the UX mockup (v4.0). The mockup shows this army info integrated directly into the global header across all views.

### Solution

Merge the player's army information into the global `AppHeader` so it displays: army name as the main title (Cinzel font), faction + W/L record as subtitle, a "Voir le détail" link, alongside the existing account name and logout button. Remove the duplicate army header block from `CampaignView`. Load army data at the root level so the header can access it on every view.

### Scope

**In Scope:**
- Modify `AppHeader` to display army name, faction, V/D record, "Voir le détail" link
- Keep account name + logout button in the header
- Load player army data at root level (available to header on all views)
- Remove duplicate army header from `CampaignView` (`index.tsx`)
- Refactor `loadCampaignTimelineFn` to stop loading army record (now in root)
- Style header to match UX mockup v4.0 (Cinzel title, Inter subtitle, mockup layout)
- Add `--color-header-bg` token to `src/styles/globals.css`

**Out of Scope:**
- FAB button implementation
- Action chips strip
- Per-view contextual header titles (header is the same on all views)
- Back button (‹) for army detail view header

## Context for Development

### Codebase Patterns

- Server functions use `createServerFn` with dynamic imports for server-only modules
- Auth middleware pattern: `authMiddleware` from `src/lib/middleware`
- Session data flows via TanStack Router context (`beforeLoad` → `useRouteContext`)
- CSS tokens defined in `src/styles/globals.css`, imported via `src/styles.css`
- Fonts: `--font-display` (Cinzel) for titles, `--font-body` (Inter) for body text
- `SessionData` type (`src/lib/auth.ts:14-20`): `{ playerId, isAdmin, displayName, hasSeenWelcome, isGuest }` — no army info
- Root `beforeLoad` (`__root.tsx:47-58`): currently loads session only, returns `{ session }` to router context
- `getPlayerArmy(playerId)` → `{ id, name, faction, playerId, playerDisplayName } | null`
- `getArmyRecord(armyId)` → `{ wins: number, draws: number, losses: number }`
- Test pattern: file-content structural assertions via `readFileSync` + vitest (no render tests)

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/routes/__root.tsx` | Root layout with `AppHeader` (L93-143) and `beforeLoad` (L47-58) |
| `src/routes/index.tsx` | Campaign view — army header block to remove, timeline loader reuses `getPlayerArmy` + `getArmyRecord` |
| `src/db/queries.ts` | `getPlayerArmy` (L595-616), `getArmyRecord` (L558-572) |
| `src/lib/auth.ts` | `SessionData` type (L14-20), `getSession()` |
| `src/styles/globals.css` | CSS tokens — `--font-display`, `--font-body`, `--color-*` |
| `_bmad-output/planning-artifacts/ux-mockup.html` | Source of truth for header design (Vue 1 — Campagne, L1072-1079) |
| `src/components/__tests__/tab-bar.test.tsx` | Reference for test pattern (structural file-contract tests) |

### Technical Decisions

- **Root-level army loading:** Extend `beforeLoad` in `__root.tsx` to also call `getPlayerArmy` + `getArmyRecord` (via a new server function) and return the data via router context. This adds 2 lightweight DB queries per navigation but follows the existing session-loading pattern. Since `beforeLoad` blocks navigation by design in TanStack Router, and these are fast single-row lookups (~1-2ms each), no skeleton or loading state is needed.
- **Fallback for guests / no army:** Guest users and users without an army see a minimal header (account info only, no army block).
- **Error handling:** If `getPlayerArmyInfoFn` fails, `beforeLoad` catches the error and falls back to `{ army: null, record: null }` — the header degrades gracefully to "account only" mode.
- **Partial dedup:** The only change to `loadCampaignTimelineFn` is removing the `getArmyRecord` call. `getPlayerArmy` remains because the campaign loader needs `army.id` for the timeline query and the no-army check. `CampaignView` reads `record` from root context instead of loader data.
- **No new components:** The `AppHeader` stays in `__root.tsx` — no need for a separate component file for this scope.
- The header is identical across all views (Campagne, Armees, References, army detail).
- **Zero-argument server function:** `getPlayerArmyInfoFn` takes no arguments. It internally calls `getSession()` to obtain `playerId` (same pattern as other server functions that use the session). The caller does not pass `playerId`.
- **Guest check order:** `beforeLoad` checks `session.isGuest` BEFORE calling `getPlayerArmyInfoFn`. The server function itself does NOT check guest status — it simply receives no call for guests. This avoids a wasted round-trip.

## Implementation Plan

### Tasks

- [x] Task 1: Create server function to load player army + record at root level
  - File: `src/routes/__root.tsx`
  - Action: Add a new `getPlayerArmyInfoFn` server function (using `createServerFn` + dynamic imports pattern). This is a zero-argument server function: it internally calls `getSession()` to obtain `playerId` (same pattern as other session-based server functions). It then calls `getPlayerArmy(playerId)` and, if an army exists, `getArmyRecord(armyId)`. Returns `{ army: { id, name, faction } | null, record: { wins, draws, losses } | null }`.
  - Notes: Follow existing `getSessionFn` pattern. Only called for non-guest authenticated users. Wrap the entire body in a try/catch — on error, log the error and return `{ army: null, record: null }` so the header degrades gracefully. These two queries are inherently sequential (`getArmyRecord` needs `armyId` from `getPlayerArmy`). A single combined query (JOIN armies + aggregate match_participants) could halve the round trips but would add a new query to `queries.ts` for marginal gain (~1-2ms). Keep sequential for simplicity; optimize later if needed.

- [x] Task 2: Extend root `beforeLoad` to return army data in router context
  - File: `src/routes/__root.tsx`
  - Action:
    1. **Do NOT modify `MyRouterContext`.** Return `army` and `record` from `beforeLoad` alongside `session` — TanStack Router merges `beforeLoad` return into context automatically (same pattern as `session`).
    2. In the `beforeLoad` function, after loading `session`, check `session.isGuest` first. If guest, return `{ session, army: null, record: null }`. If not guest, call `getPlayerArmyInfoFn()` wrapped in a try/catch (on failure, fall back to `{ army: null, record: null }`). Return `{ session, army, record }`.
    3. For the `/login` route, also return `{ session, army: null, record: null }`. Note: the root `beforeLoad` already returns `{ session: null }` for `/login`, which means the `{session && <AppHeader>}` guard in `RootLayout` prevents the header from rendering. Adding `army: null, record: null` to this return is for type consistency only — the header never displays on the login page regardless of auth state.
  - Notes: The army/record data will be available via `useRouteContext({ from: '__root__' })` in all child routes.

- [x] Task 3: Redesign `AppHeader` to display army info alongside account info, wire props from `RootLayout`
  - File: `src/routes/__root.tsx`
  - Action:
    1. **Update `RootLayout`:** Extract `army` and `record` from `useRouteContext({ from: '__root__' })` alongside `session`. Pass them as props to `AppHeader`.
    2. **Update `AppHeader` props type:** Accept `army: { id: string; name: string; faction: string } | null` and `record: { wins: number; draws: number; losses: number } | null` in addition to existing props.
    3. **Rewrite `AppHeader` layout** to match the mockup:
       - **Left block:** Army name as main title (Cinzel 700, 16px, `--color-text-primary`), subtitle line with faction + record + total matches (Inter 11px, `--color-text-secondary`). If no army, show display name only. Apply `min-width: 0` on the left block to allow text truncation in flex layout. Apply `text-overflow: ellipsis`, `overflow: hidden`, `white-space: nowrap` on the army name for long names.
       - **Right block:** Account name (small, `--color-text-secondary`) + logout/login button (existing logic preserved).
       - **Below title line:** "Voir le détail" link (`Link` to `/armies/$armyId`, `--color-brand`, 11px) — only render when `army` is non-null. Use conditional rendering: `{army && <Link to="/armies/$armyId" params={{ armyId: army.id }}>Voir le detail</Link>}`.
       - **Container:** `borderBottom: 1px solid var(--color-border)`, `backgroundColor: var(--color-header-bg)`, padding `8px 12px`.
       - **Record display format (French):** `{wins}V · {draws}N · {losses}D · {total} parties` using `·` (middle dot) as separator. Omit categories with 0 count, but always show total. Examples: `"3V · 1D · 4 parties"` (0 draws omitted), `"2V · 1N · 3 parties"` (0 losses omitted). When all values are zero, display `"Aucune partie"` (italic, `--color-text-muted`) to match the existing UI convention in `index.tsx`.
    4. Admin link stays in the right block.
  - Notes: Use CSS token variables from `globals.css`.

- [x] Task 4: Remove duplicate army header block from `CampaignView` and refactor campaign loader
  - File: `src/routes/index.tsx`
  - Action:
    1. Remove the army header block from `CampaignView` JSX: the `<div style={{ marginBottom: '1.5rem' }}>` block that contains the army name `<h1>`, faction/record `<p>`, and `<Link to="/armies/$armyId">` — everything between the no-army check and the `<section>` for Historique. The timeline section starts directly after the guest/no-army checks.
    2. Refactor `loadCampaignTimelineFn`: the only change is removing the `getArmyRecord` call. `getPlayerArmy` remains because the campaign loader needs `army.id` for the timeline query and the no-army check. `CampaignView` reads `record` from `useRouteContext({ from: '__root__' })` instead of loader data.
  - Notes: Keep `loadCampaignTimelineFn` for timeline data. The no-army check still works because `getPlayerArmy` remains in the campaign loader.

- [x] Task 5: Add `--color-header-bg` token to globals.css and write structural tests for the new header
  - Files: `src/styles/globals.css`, `src/routes/__tests__/root-header.test.ts`
  - Action:
    1. In `src/styles/globals.css`, add `--color-header-bg: #f7f1e8;` in the `:root` block under the Backgrounds section.
    2. Create file-content structural tests in `src/routes/__tests__/root-header.test.ts` following the `tab-bar.test.tsx` pattern:
       - `__root.tsx` contains `getPlayerArmyInfoFn` server function
       - `__root.tsx` `beforeLoad` returns army data (match `army` in return)
       - `AppHeader` renders army name with Cinzel font (`--font-display`)
       - `AppHeader` renders faction + record subtitle
       - `AppHeader` renders "Voir le detail" link with `Link` to `/armies/`
       - `AppHeader` still renders logout button (`data-testid="logout-button"`)
       - `AppHeader` still renders login button for guests (`data-testid="login-button"`)
       - `beforeLoad` returns `army` and `record` alongside `session`
  - Notes: Follow exact test pattern from `tab-bar.test.tsx`: `readFileSync` + `expect(code).toMatch(...)`. **Test brittleness acknowledgement:** Structural file-content tests are inherently coupled to implementation details. The following patterns are considered **contractual** and safe to assert: `data-testid` attributes (`logout-button`, `login-button`), presence of `getPlayerArmyInfoFn`, use of `--font-display` token, `Link` to `/armies/`. Implementation details like exact variable names or inline style values should NOT be asserted — prefer matching semantic structure and testid attributes.

### Acceptance Criteria

- [x] AC1: Given a logged-in player with an army, when any view loads (Campagne, Armees, References), then the header displays the army name (Cinzel font), faction, W/D/L record in French format (`{wins}V · {draws}N · {losses}D · {total} parties`, omitting zero categories except total; when all zero: `"Aucune partie"` italic in `--color-text-muted`), and "Voir le detail" link.
- [x] AC2: Given a logged-in player with an army, when viewing the header, then the account name and logout button are also visible alongside the army info.
- [x] AC3: Given a guest user, when any view loads, then the header shows "Invite" and a "Se connecter" button only (no army info).
- [x] AC4: Given a logged-in player without an assigned army, when any view loads, then the header shows the display name and logout button only (no army info, no "Voir le detail" link).
- [x] AC5: Given a logged-in admin with an army, when viewing the header, then the admin link "Administration" is still accessible alongside army info.
- [x] AC6: Given a logged-in player with an army on the Campaign view, when the page loads, then the army name, faction, and record are NOT duplicated in the page body (only in the header).
- [x] AC7: Given the header, when inspecting its styles, then the army name uses `--font-display` (Cinzel), the subtitle uses `--font-body` (Inter), colors match the mockup tokens (`--color-text-primary`, `--color-text-secondary`, `--color-brand`), and the background uses `--color-header-bg`.
- [x] AC8: Given that `getPlayerArmyInfoFn` fails (e.g., DB error), when any view loads, then `beforeLoad` catches the error and falls back to `{ army: null, record: null }` — the header degrades gracefully to "account only" mode (display name + logout button, no army info).

## Additional Context

### Dependencies

No new dependencies required. All DB queries (`getPlayerArmy`, `getArmyRecord`) already exist in `src/db/queries.ts`.

### Testing Strategy

- **Structural file-contract tests** (`src/routes/__tests__/root-header.test.ts`): Verify the presence of key elements in `__root.tsx` source code (server function, beforeLoad extension, army name rendering, font usage, link presence, testid attributes). Assertions should focus on contractual patterns (`data-testid` attributes, token usage, server function name) rather than exact variable names or implementation details.
- **Manual testing:** Verify visual appearance against mockup for 3 scenarios: player with army, player without army, guest. Check all 4 views (Campagne, Armees, References, army detail).
- **Regression:** Run existing test suite — especially `tab-bar.test.tsx` (ensures root layout integration unchanged) and any E2E tests.

### Notes

- The mockup does not show account name / logout in the header, but the user explicitly requested keeping them. This is an intentional addition beyond the mockup.
- The header style should follow the mockup's `.app-header` / `.header-topline` / `.screen-title` / `.screen-sub` patterns.
- The 2 extra DB queries per navigation (`getPlayerArmy` + `getArmyRecord`) are lightweight single-row lookups (~1-2ms each). Since `beforeLoad` blocks navigation by design in TanStack Router, no skeleton or loading state is needed — the queries complete before the page renders. If performance becomes a concern later, they can be cached via TanStack Query at the root level.
- `CampaignView` keeps its own loader for timeline data — only the army header block is removed from its JSX and `getArmyRecord` is removed from `loadCampaignTimelineFn`.
- **Mobile consideration:** The army name uses `text-overflow: ellipsis` + `overflow: hidden` + `white-space: nowrap` for long names. The left block has `min-width: 0` to allow text truncation within the flex layout. The two-line layout (title + subtitle) is compact enough for mobile viewports.

## Review Notes
- Adversarial review completed
- Findings: 6 total, 4 fixed, 2 skipped (F5 noise, F6 pre-existing)
- Resolution approach: auto-fix
- F1 (High): Eliminated double session read — `getPlayerArmyInfoFn` now accepts `playerId` as input
- F2 (Medium): Fixed separator before "Aucune partie" when record is all zeros
- F3 (Medium): Fixed missing accent — "Voir le détail" (was "Voir le detail")
- F4 (Low): Replaced hardcoded hex colors with `var(--color-bonus)` / `var(--color-malus)` tokens
