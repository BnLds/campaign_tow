---
title: 'Refactor AppHeader — extract, Tailwind, shadcn DropdownMenu'
slug: 'refactor-app-header'
created: '2026-03-25'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['react', 'tanstack-start', 'tailwind-v4', 'shadcn/ui', 'lucide-react', 'vitest']
files_to_modify: ['src/routes/__root.tsx', 'src/components/app-header.tsx', 'src/server-fns/logout.ts', 'src/server-fns/index.ts', 'src/routes/__tests__/root-header.test.ts', 'tests/integration/admin-list-delete.test.ts', 'tests/integration/logout.test.ts', 'tests/integration/guest-access.test.ts']
code_patterns: ['inline styles (no Tailwind yet)', 'structural file-contract tests (read file as text)', 'server-fns barrel re-export', 'kebab-case component files']
test_patterns: ['vitest + readFileSync structural assertions', 'playwright E2E with getByTestId', 'integration tests read source files as text and assert patterns']
---

# Tech-Spec: Refactor AppHeader — extract, Tailwind, shadcn DropdownMenu

**Created:** 2026-03-25

## Overview

### Problem Statement

`AppHeader` is a ~300-line component embedded directly in `src/routes/__root.tsx` (437 lines total). It mixes multiple concerns: a hand-rolled dropdown menu with manual focus/Escape handling, record formatting logic with complex JSX reduction, an Options dialog, and pervasive inline styles. This makes the root route file hard to maintain and the header logic hard to test or reuse.

### Solution

Extract `AppHeader` into its own file `src/components/app-header.tsx`, migrate all inline styles to Tailwind classes, replace the artisanal dropdown menu with shadcn's `DropdownMenu` component (Radix-based, handles focus/Escape/a11y out of the box), extract a small `RecordBadge` sub-component for record formatting, and move `logoutFn` to the existing `src/server-fns/` barrel.

### Scope

**In Scope:**
- Extract `AppHeader` component → `src/components/app-header.tsx`
- Extract `RecordBadge` as a sub-component (same file)
- Replace hand-rolled dropdown with shadcn `DropdownMenu`
- Migrate all inline styles to Tailwind CSS classes
- Move `logoutFn` → `src/server-fns/logout.ts` + add to barrel export
- Clean `__root.tsx` to only contain `Route`, `RootLayout`, `RootDocument`

**Out of Scope:**
- Refactoring `RootLayout` or `RootDocument`
- Changing business logic (beforeLoad, session handling, redirects)
- Adding new features to the menu
- Refactoring other components

## Context for Development

### Codebase Patterns

- Tailwind v4 with CSS custom properties as design tokens (defined in `src/styles/globals.css`, imported via `src/styles.css`)
- shadcn/ui components in `src/components/ui/` — `Dialog` already used in current code
- Server functions extracted to `src/server-fns/` with barrel `index.ts` (recent refactor, see commit `5d7b7cf`)
- Component files use kebab-case naming (`app-header.tsx`, `tab-bar.tsx`)
- Design tokens use `--color-*` and `--font-*` CSS variables

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/routes/__root.tsx` | Source file — contains AppHeader to extract (437 lines) |
| `src/components/tab-bar.tsx` | Reference pattern for extracted layout component (inline styles) |
| `src/components/ui/dialog.tsx` | shadcn Dialog — already used by AppHeader |
| `src/server-fns/index.ts` | Barrel for server functions — add logoutFn export |
| `src/styles/globals.css` | Design tokens (CSS custom properties) — NOT mapped to `@theme` |
| `src/styles.css` | Tailwind entry point — `@theme inline` maps shadcn tokens only |
| `src/routes/__tests__/root-header.test.ts` | 23 assertions total — 19 read `__root.tsx` (17 check AppHeader → re-point to `app-header.tsx`; 2 check beforeLoad → stay on `__root.tsx`), 2 read other files |
| `tests/integration/admin-list-delete.test.ts` | 20 assertions total — 3 read `__root.tsx` (admin-link + isAdmin, all AppHeader → re-point to `app-header.tsx`), 17 read other files |
| `tests/integration/logout.test.ts` | 10 assertions total — 2 check logoutFn in `__root.tsx` → re-point to `server-fns/logout.ts`; 2 check logout-button/text in `__root.tsx` → re-point to `app-header.tsx`; 5 check RootLayout/Route/redirect → stay on `__root.tsx`; 1 reads `auth.ts` |
| `tests/integration/guest-access.test.ts` | 20 assertions total — 4 read `__root.tsx` (isGuest identity + login-button + Dialog coupling, all AppHeader → re-point to `app-header.tsx`), 16 read other files |

### Technical Decisions

- **Single file, not folder:** After cleanup (Tailwind + shadcn DropdownMenu), AppHeader will be ~150-180 lines (imports, types, RecordBadge sub-component, handleLogout + loggingOut state, guest branch, auth branch with DropdownMenu, Options Dialog with styled logout button). Still not large enough for a folder.
- **shadcn DropdownMenu over custom:** Eliminates ~40 lines of manual focus/Escape/overlay handling. Radix handles a11y correctly. This is also an a11y upgrade (arrow key navigation, Home/End support).
- **RecordBadge stays in same file:** Small enough to not warrant its own file. Can be extracted later if reused.
- **Props over useRouteContext:** AppHeader receives `session`, `army`, `record` as explicit props from RootLayout. Do NOT use `useRouteContext` inside AppHeader — explicit props are more testable and keep the data flow visible.
- **Dialog Options stays separate from DropdownMenu:** The "Options" menu item opens a `Dialog` (not a DropdownMenu sub-menu). This is intentional — Options may grow in scope later.
- **Guest variant is a distinct render branch:** The guest header (no menu, just a "Se connecter" button) must be handled as an explicit conditional branch in the extracted component, not as a degenerate case of the authenticated menu.

### Constraints

- **All existing data-testid attributes MUST be preserved exactly:** `hamburger-button`, `login-button`, `logout-button`, `my-army-link`, `admin-link`, `settings-link`. shadcn `DropdownMenuItem` does not pass `data-testid` by default — add them manually.
- **Tailwind token mapping — CONFIRMED NOT MAPPED:** Campaign TOW tokens (`--color-brand`, `--color-text-primary`, `--font-display`, etc.) are NOT in the `@theme inline` block of `styles.css`. Only shadcn tokens are mapped. Use arbitrary value syntax: `text-[var(--color-text-primary)]`, `bg-[var(--color-header-bg)]`, `font-[family-name:var(--font-display)]`. Adding tokens to `@theme` is out of scope for this refactor.
- **Visual regression check:** Compare before/after screenshots after migration. Inline styles use px values; Tailwind uses rem — verify no drift in spacing, font sizes, or alignment.

## Implementation Plan

### Tasks

- [x] Task 1: Install shadcn DropdownMenu
  - Action: Run `pnpm dlx shadcn@latest add --yes dropdown-menu`
  - Notes: This installs `src/components/ui/dropdown-menu.tsx` with Radix DropdownMenu primitives. Verify file exists after install.

- [x] Task 2: Create `src/server-fns/logout.ts` and move `logoutFn`
  - File: `src/server-fns/logout.ts` (new)
  - Action: Move the `logoutFn` server function from `__root.tsx` to this new file. Keep the dynamic import pattern (`await import('../lib/auth')`). Export as named export.
  - File: `src/server-fns/index.ts`
  - Action: Add `export { logoutFn } from './logout'` to the barrel.
  - Notes: Verify the relative path `../lib/auth` resolves correctly from `src/server-fns/`.

- [x] Task 3: Create `src/components/app-header.tsx` with extracted AppHeader
  - File: `src/components/app-header.tsx` (new)
  - Action: Create the component with the following structure:
    1. **Props interface** — `AppHeaderProps { session: SessionData; army: { id: string; name: string; faction: string } | null; record: { wins: number; draws: number; losses: number } | null }`
    2. **RecordBadge** — Small sub-component (same file). Receives `record` prop only (faction is NOT part of RecordBadge — it's rendered separately in the parent). Preserves exact current `formatRecord()` behavior: (a) if `total === 0`, renders `"Aucune partie"` in italic muted text; (b) otherwise renders only non-zero values among `{wins}V`, `{draws}N`, `{losses}D` separated by ` · `, followed by `{total} parties`; (c) prefixed by a ` · ` separator from the faction text. Values at zero are **skipped**, not shown as `0V`.
    3. **Guest branch** — When `session.isGuest`: render header with `"Invité"` text (Inter font, 0.875rem, secondary color) + `"Se connecter"` button (`data-testid="login-button"`). No menu, no hamburger. **Important:** the "Se connecter" button calls `handleLogout` — this is intentional. The guest session IS a real session; clicking "Se connecter" clears the guest session so the login page appears. Do NOT "fix" this by wiring it to a different handler.
    4. **Authenticated branch** — When `!session.isGuest`:
       - Left: army name (Cinzel font) + faction + RecordBadge. Fallback: "Campaign TOW" if no army.
       - Right: username + shadcn `DropdownMenu` replacing the hand-rolled menu.
    5. **DropdownMenu structure:**
       - `DropdownMenuTrigger asChild` wrapping button with `data-testid="hamburger-button"`, `<Menu>` icon
       - `DropdownMenuContent align="end"` with:
         - `DropdownMenuItem` "Voir mon armée" (`data-testid="my-army-link"`, disabled if no army, navigates to `/armies/$armyId`)
         - `DropdownMenuItem` "Administration" (`data-testid="admin-link"`, conditional on `session.isAdmin`, navigates to `/admin`)
         - `DropdownMenuItem` "Paramètres" (`data-testid="settings-link"`, navigates to `/settings`)
         - `DropdownMenuSeparator`
         - `DropdownMenuItem` "Options" (opens `optionsOpen` dialog state)
    6. **Options Dialog** — Keep the existing `Dialog` with logout button (`data-testid="logout-button"`, `--color-malus` background).
    7. **Imports:** `useState` from `react` (for `loggingOut` + `optionsOpen` states), `logoutFn` from `../server-fns` (barrel, not direct file), `useRouter` + `useQueryClient` from their respective packages, `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle` from `./ui/dialog`, `DropdownMenu`/`DropdownMenuTrigger`/`DropdownMenuContent`/`DropdownMenuItem`/`DropdownMenuSeparator` from `./ui/dropdown-menu`, `Menu` from `lucide-react`, `type SessionData` from `../lib/auth`. Note: paths are relative to `src/components/app-header.tsx`.
    8. **`handleLogout` handler** — Must preserve exact current logic: guard on `loggingOut` state → `setLoggingOut(true)` → `await logoutFn()` → `queryClient.clear()` → `await router.invalidate()` → `await router.navigate({ to: '/login' })`. On catch: `setLoggingOut(false)` + `alert('La déconnexion a échoué. Veuillez réessayer.')`. The `loggingOut` state controls: button `disabled`, `opacity: 0.7`, `cursor: not-allowed`, text changes (`"Déconnexion…"` / `"Connexion…"`).
  - Notes:
    - All styles as Tailwind classes using arbitrary value syntax for Campaign TOW tokens (e.g., `text-[var(--color-text-primary)]`, `bg-[var(--color-header-bg)]`, `font-[family-name:var(--font-display)]`). Use `text-[16px]` / `text-[11px]` / `p-[8px_12px]` to match current px values exactly — no rem conversion drift.
    - **DropdownMenuItem uses `onSelect`, NOT `onClick`.** Radix closes the menu automatically after `onSelect` fires — no need for manual state. For navigation items, call `router.navigate(...)` inside `onSelect`. Example: `onSelect={() => router.navigate({ to: '/admin' })}`. For "Voir mon armée", use `onSelect={() => router.navigate({ to: '/armies/$armyId', params: { armyId: army.id } })}`.
    - **"Options" item — Dialog open sequence:** Use `e.preventDefault()` inside `onSelect` to prevent Radix from closing the menu, then set `setOptionsOpen(true)`. The menu stays open momentarily — Radix will close it when the Dialog overlay captures focus. Alternatively, close the menu explicitly first via a controlled `open` state, then open the Dialog. Either pattern works; the key is that the Dialog must be visible after the interaction.
    - **DropdownMenuItem `disabled` prop** is natively supported by Radix. Default shadcn style applies `opacity-50 pointer-events-none` which matches the current custom styling. Radix also sets `aria-disabled` automatically — no manual `aria-disabled={!army}` needed.
    - **Dialog Options inline styles → Tailwind:** The Options Dialog (`DialogContent`, `DialogHeader`, `DialogTitle`, logout button) currently has ~20 inline style properties. Convert to Tailwind: `bg-[var(--color-surface)]` for background, `border-[var(--color-border)]` for border, `max-w-[340px]`, `font-[family-name:var(--font-display)]` for title, `bg-[var(--color-malus)]` + `text-white` + `rounded-md` + `text-sm` + `font-semibold` for the logout button. Preserve the `loggingOut` conditional styles via ternary or `cn()` utility.

- [x] Task 4: Update `src/routes/__root.tsx` — remove AppHeader, import new component
  - File: `src/routes/__root.tsx`
  - Action:
    1. Remove the entire `AppHeader` function (~300 lines, lines 121-422)
    2. Remove the `logoutFn` server function (lines 27-30)
    3. Remove now-unused imports: `useState`, `useEffect`, `useRef`, `useQueryClient`, `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle`, `Menu` from lucide-react. **Keep `useLocation`** — it's used by `RootLayout` (line 76), not by AppHeader.
    4. Add import: `import { AppHeader } from '../components/app-header'`
    5. Keep `RootLayout` and `RootDocument` unchanged. The `<AppHeader>` JSX in RootLayout already uses props — preserve the `key={session.playerId}` prop on `<AppHeader>` (forces re-mount on player change).
  - Notes: After this task, `__root.tsx` should be ~100-110 lines (Route config + RootLayout + RootDocument, minus ~300 lines of AppHeader + ~4 lines of logoutFn + cleaned imports).
  - **Atomicity note:** Tasks 3 and 4 should be done in quick succession. Between them, `AppHeader` exists in both files. The old one in `__root.tsx` is a local function (not exported), so no conflict — but run typecheck only after Task 4 is complete.

- [x] Task 5: Update structural tests — split file paths per assertion target
  - File: `src/routes/__tests__/root-header.test.ts`
  - Action:
    1. **Keep `getRootTsx()` helper** (reads `src/routes/__root.tsx`) — still needed by 2 beforeLoad assertions.
    2. **Add `getAppHeaderTsx()` helper** — reads `src/components/app-header.tsx`.
    3. **Change `getRootTsx()` → `getAppHeaderTsx()`** in all AppHeader-related assertions (17 of 19). The 2 beforeLoad assertions (lines 24-31: `return { session, army, record }` and `ensureQueryData(armyInfoQueryOptions)`) stay on `getRootTsx()`.
    4. **Assertions that MUST CHANGE content (not just path):**
       - `imports Dialog from shadcn ui` (line 80-82): regex must match `'./ui/dialog'` (not `'../components/ui/dialog'`)
       - `dropdown has role="menu"` (line 90-93): Radix adds `role="menu"` at runtime, not in JSX source. Replace with: assert file imports `DropdownMenu` from `'./ui/dropdown-menu'`
       - `renders "Voir mon armée" as a menuitem` (line 68-71): `role="menuitem"` no longer in source (Radix adds it at runtime via `DropdownMenuItem`). Replace with: assert `DropdownMenuItem` + `data-testid="my-army-link"` + `Voir mon armée` are present
       - `aria-expanded` + `aria-haspopup` (line 74-77): Radix `DropdownMenuTrigger` adds these at runtime — they are NOT in source JSX. Replace both assertions with: assert `DropdownMenuTrigger` is present (e.g., `expect(code).toContain('DropdownMenuTrigger')`)
    5. **Assertions that STAY (path change only, content unchanged):**
       - `--font-display` present — still in Tailwind arbitrary value `font-[family-name:var(--font-display)]` ✅
       - `army.faction` present ✅
       - record V/N/D format (`}V</span>`, `}N</span>`, `}D</span>`) ✅
       - `data-testid="hamburger-button"` ✅
       - `DialogTitle` + `Options` + `logout-button` + `color-malus` ✅
       - `--color-header-bg` — migrated to `bg-[var(--color-header-bg)]`, token still in source ✅
       - `import { Menu }` from lucide-react ✅
  - File: `tests/integration/admin-list-delete.test.ts`
  - Action: Change `readFileSync` path from `src/routes/__root.tsx` to `src/components/app-header.tsx` for the 3 assertions in the `[AC1]` describe block (lines 29, 35, 40). The 17 other assertions read other files and need no change.
  - File: `tests/integration/logout.test.ts`
  - Action: **Three different path changes required:**
    1. `[1.5-INT-001]` + `[1.5-INT-002]` (logoutFn assertions, lines 29, 35): change path to `src/server-fns/logout.ts`. Also update regex — the dynamic import path changes from `'../lib/auth'` to `'../lib/auth'` (same relative path from `server-fns/`). ✅
    2. `[1.5-INT-006]` + `[1.5-INT-007]` (logout-button testid + "Se déconnecter" text, lines 64, 69): change path to `src/components/app-header.tsx`.
    3. `[1.5-INT-003]` through `[1.5-INT-005]` + `[1.5-INT-008]` + `[1.5-INT-009]` (Route config, RootLayout, Outlet, session guard, redirect — lines 41, 53, 58, 74, 86): **stay on `src/routes/__root.tsx`** — these check RootLayout/Route, not AppHeader.
    4. `[1.5-INT-010]` (SessionData in auth.ts, line 98): no change.
    5. Update describe block titles to reflect new file locations.
  - File: `tests/integration/guest-access.test.ts`
  - Action: Change `readFileSync` path from `src/routes/__root.tsx` to `src/components/app-header.tsx` for the 4 assertions (lines 139, 147, 155, 157) in the `[AC5]` and `[AC6]` describe blocks. The 16 other assertions read other files and need no change.

- [x] Task 6: Run all tests and verify
  - Action: Run `pnpm test` to verify all vitest tests pass. Run `pnpm typecheck` to verify no TypeScript errors. Manually verify the app renders correctly (visual check).

### Acceptance Criteria

- [ ] AC1: Given the app is running, when an authenticated user with an army loads any page, then the header displays the army name in Cinzel font, faction, and record in French format (V/N/D) — identical to the current rendering.
- [ ] AC2: Given an authenticated user, when they click the hamburger menu icon, then a shadcn DropdownMenu opens with items: "Voir mon armée", "Administration" (if admin), "Paramètres", "Options" — all with correct data-testid attributes.
- [ ] AC3: Given an authenticated user with the dropdown open, when they press Escape or click outside, then the dropdown closes (handled natively by Radix).
- [ ] AC4: Given an authenticated user, when they click "Options" in the dropdown, then the Options Dialog opens with the "Se déconnecter" button styled with `--color-malus`.
- [ ] AC5: Given a guest user, when they load any page, then the header shows `"Invité"` text (Inter font, secondary color) and a `"Se connecter"` button (`data-testid="login-button"`) that calls `handleLogout` (clears guest session → redirects to login), with no hamburger menu.
- [ ] AC6: Given the refactor is complete, when `__root.tsx` is inspected, then it contains only `Route`, `RootLayout`, `RootDocument` — no `AppHeader` function, no `logoutFn`, no menu logic.
- [ ] AC7: Given the refactor is complete, when `pnpm test` is run, then all vitest tests pass (structural + integration).
- [ ] AC8: Given the refactor is complete, when `pnpm typecheck` is run, then no TypeScript errors are reported.
- [ ] AC9: Given the refactor is complete, when all existing E2E tests are run, then they pass without modification (data-testids preserved).
- [ ] AC10: Given `src/server-fns/logout.ts` exists, when it is imported via the barrel (`src/server-fns/index.ts`), then `logoutFn` is available and functional.
- [ ] AC11: Given an authenticated user WITHOUT an army (new player), when they load any page, then the header displays "Campaign TOW" as fallback text (no army name, no faction, no record).
- [ ] AC12: Given a non-admin authenticated user, when they open the hamburger menu, then the "Administration" item is NOT rendered in the dropdown.

## Additional Context

### Dependencies

- shadcn `DropdownMenu` must be installed (`pnpm dlx shadcn@latest add --yes dropdown-menu`)
- No other new dependencies required.

### Testing Strategy

- **Structural tests (vitest):** Update 4 test files to read `src/components/app-header.tsx` instead of `src/routes/__root.tsx`. Adapt assertions where shadcn DropdownMenu changes the source code patterns (e.g., `role="menu"` no longer in source — Radix adds it at runtime).
- **E2E tests (Playwright):** No changes needed — all data-testids preserved. Run full E2E suite as smoke test.
- **Manual visual check:** Compare header rendering before/after in browser. Verify: font sizes, spacing, colors, menu behavior, guest vs authenticated states.
- **TypeScript:** Run `pnpm typecheck` to catch any import/type issues from the extraction.

### Notes

- **Critical: structural file-contract tests** — 4 test files read source files as raw text and assert on patterns (data-testid, imports, variable names). After extraction, assertions targeting AppHeader code must read `src/components/app-header.tsx`, assertions targeting logoutFn must read `src/server-fns/logout.ts`, and assertions targeting Route/RootLayout must stay on `src/routes/__root.tsx`. This is NOT a simple find-replace — each assertion must be re-pointed to the correct file.
- **Impacted test files and assertion breakdown:**
  - `src/routes/__tests__/root-header.test.ts` — 23 assertions total: 17 → `app-header.tsx`, 2 stay on `__root.tsx` (beforeLoad), 2 read other files. 4 assertions need **content changes** (role="menu" → DropdownMenu import, role="menuitem" → DropdownMenuItem, aria-expanded/aria-haspopup → DropdownMenuTrigger, Dialog import path)
  - `tests/integration/admin-list-delete.test.ts` — 20 assertions total: 3 → `app-header.tsx` (admin-link), 17 unchanged
  - `tests/integration/logout.test.ts` — 10 assertions total: 2 → `server-fns/logout.ts` (logoutFn), 2 → `app-header.tsx` (logout-button + text), 5 stay on `__root.tsx` (RootLayout/Route), 1 reads `auth.ts`
  - `tests/integration/guest-access.test.ts` — 20 assertions total: 4 → `app-header.tsx` (isGuest identity + login-button + Dialog coupling), 16 unchanged
- **E2E tests (Playwright)** — use `getByTestId()` which is DOM-based, not file-based. These will NOT break as long as data-testids are preserved. Files: `e2e/admin-list-delete.spec.ts`, `e2e/logout.spec.ts`, `e2e/guest-access.spec.ts`.
- **logoutFn dynamic import path:** `await import('../lib/auth')` — `server-fns/` and `routes/` are both under `src/`, so the relative path stays the same. Verify after move.
