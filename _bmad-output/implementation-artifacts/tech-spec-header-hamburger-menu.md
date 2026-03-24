---
title: 'Header Hamburger Menu Cleanup'
slug: 'header-hamburger-menu'
created: '2026-03-23'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['TanStack Start', 'React', 'Tailwind v4', 'shadcn Dialog', 'lucide-react']
files_to_modify: ['src/routes/__root.tsx', 'src/routes/__tests__/root-header.test.ts']
code_patterns: ['useQuery for reactive header', 'createServerFn for logout', 'shadcn Dialog for modals', 'inline style objects', 'useState for local UI state', 'lucide-react icons']
test_patterns: ['src/routes/__tests__/root-header.test.ts — file-contract tests reading source as string']
---

# Tech-Spec: Header Hamburger Menu Cleanup

**Created:** 2026-03-23

## Overview

### Problem Statement

The current header in `__root.tsx` is cluttered with too many interactive elements (army detail link, logout button, admin link, display name). On mobile, this creates a cramped UX with poor touch targets.

### Solution

Replace secondary actions with a hamburger button that opens a simple dropdown menu. For guests, the hamburger is replaced by a simple "Se connecter" button.

**Logged-in user header:** Army name (Cinzel) + faction + record (W/D/L) + display name + hamburger button

**Hamburger dropdown items:**
1. "Voir mon armee" — navigates to `/armies/$armyId` (disabled/greyed if no army)
2. "Administration" — `/admin` (visible only if `isAdmin`)
3. "Options" — opens a minimal modal with only "Se deconnecter" + close button

**Guest header:** No hamburger. Simple "Se connecter" button instead — redirects to `/login`.

**Removed from header:** "Voir le detail" link, "Se deconnecter" button, "Admin" link (all moved into hamburger/modal).

### Scope

**In Scope:**
- Hamburger button (Lucide `Menu` icon) + dropdown with click-outside-to-close + Escape key
- Minimal "Options" modal (shadcn Dialog — close button + "Se deconnecter" in red)
- Conditional logic: guest sees "Se connecter", registered user sees hamburger
- Move logout logic into Options modal
- Move admin link into dropdown
- "Voir mon armee" disabled (greyed) when player has no army
- ARIA attributes for accessibility (aria-expanded, aria-haspopup, role="menu", role="menuitem")
- Update existing header tests

**Out of Scope:**
- TabBar changes
- FAB changes
- Adding new options to the modal
- Changing army info display in header
- Extracting components to separate files

## Context for Development

### Codebase Patterns

- **Inline component**: `AppHeader` is defined inline in `__root.tsx`, not extracted. Keep it inline.
- **Styling**: Inline `style` objects with CSS custom properties (`--color-brand`, `--color-text-primary`, etc.). No Tailwind class usage in this component.
- **State management**: `useState` for local UI state (`loggingOut`). Add `menuOpen` and `optionsOpen` states.
- **Logout flow**: `logoutFn()` -> `queryClient.clear()` -> `router.invalidate()` -> `router.navigate({ to: '/login' })`. Located in the `handleLogout` async function inside `AppHeader`.
- **Modal pattern**: `welcome-modal.tsx` uses shadcn `Dialog` / `DialogContent` / `DialogHeader` / `DialogTitle` — same imports will be used for the Options modal.
- **Router navigation**: `router.navigate({ to: '/armies/$armyId', params: { armyId: army.id } })` for programmatic nav.
- **Guest detection**: `session.isGuest` boolean.
- **Admin detection**: `session.isAdmin` boolean.
- **Army availability**: `army` prop is `{ id, name, faction } | null`. `null` means no army -> "Voir mon armee" should be disabled.
- **Icons**: `lucide-react` is already installed (used by shadcn components like `dialog.tsx` for `XIcon`, `select.tsx` for `CheckIcon`). Use `Menu` icon from lucide-react for the hamburger.
- **z-index stacking context (actual values)**: FAB = `zIndex: 2-3`, TabBar = `zIndex: 3`, modals in `index.tsx` = `zIndex: 100`, add-units-sheet = `zIndex: 1000-1001`. The dropdown should use `zIndex: 10` (above content and header, below everything else).
- **AppHeader key prop**: `AppHeader` is rendered in `RootLayout` with `key={session.playerId}`. When logout triggers `queryClient.clear()` + `router.invalidate()`, session becomes null and `AppHeader` unmounts entirely. This means any open Dialog inside AppHeader will also unmount. This is acceptable — the redirect to `/login` happens immediately after.
- **Left block fallback**: When `army` is null and user is NOT guest, the left block currently shows `session.displayName`. With the new layout, the display name is also in the right block. To avoid duplication, the left block no-army fallback should show the app name "Campaign TOW" instead of the display name.
- **Guest "Se connecter" semantics**: The guest login button reuses `handleLogout` which calls `logoutFn` (clears the ghost session) then navigates to `/login`. This is intentional — guests have a server-side session that must be cleared before the real login page loads. The function name is misleading but the behavior is correct. Do NOT rename or refactor — just reuse as-is.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/routes/__root.tsx` | Root layout — `AppHeader` component to modify, `logoutFn` server function, `RootLayout` with `key={session.playerId}` |
| `src/routes/__tests__/root-header.test.ts` | File-contract tests — must update to match new structure |
| `src/components/welcome-modal.tsx` | Reference pattern for shadcn Dialog usage |
| `src/components/ui/dialog.tsx` | shadcn Dialog primitives — also shows `XIcon` import from `lucide-react` |

### Technical Decisions

- **Hamburger icon = Lucide `Menu`**: Use `import { Menu } from 'lucide-react'` instead of Unicode trigram (`\u2630`). Lucide is already bundled via shadcn. This ensures consistent rendering across all browsers and Android WebViews.
- **Dropdown = pure local state + absolute positioning**: `menuOpen` state toggles a `<div>` with `position: absolute`. Click-outside handled via a transparent full-screen backdrop `<div>` (`position: fixed`, `inset: 0`).
- **Escape key = single `useEffect` on `document`**: Register a `keydown` listener on `document` when `menuOpen` is true. Do NOT also add `onKeyDown` on the dropdown container — use only the `useEffect` approach to avoid duplicate handlers.
- **Modal = shadcn Dialog**: Reuse existing `Dialog` component for the Options modal. Provides focus trap, Escape-to-close, backdrop click-to-close for free.
- **z-index stacking**: Dropdown backdrop = `zIndex: 9`, dropdown menu = `zIndex: 10`. This is above header content but well below FAB (2-3), TabBar (3) — wait, FAB/TabBar are in a different stacking context (they are siblings of the header in RootLayout, not children). The dropdown is `position: absolute` within the header, so its z-index is relative to the header's stacking context. Set `zIndex: 10` on the dropdown and `zIndex: 9` on the backdrop (which is `position: fixed` and thus in the viewport stacking context). This ensures the dropdown appears above all page content but the fixed backdrop sits below the TabBar and FAB.
- **No component extraction**: Keep everything inline in `__root.tsx` — the dropdown is 2-3 items, not worth a separate file.
- **Display name stays in header**: Visible directly in the right block, not moved into dropdown.
- **Left block no-army fallback**: Show "Campaign TOW" (app name, Cinzel font) instead of `session.displayName` to avoid duplicating display name (which is now always in the right block).
- **"Voir mon armee" without army**: Rendered with `disabled` attribute and `opacity: 0.5` + `aria-disabled="true"`. Do NOT use `pointer-events: none` — `disabled` on a `<button>` already prevents clicks, and `pointer-events: none` harms screen reader discoverability.
- **Guest "Se connecter"**: Reuses existing `handleLogout` which clears the guest session and navigates to `/login`. This is intentional (see Codebase Patterns above).
- **Logout button color**: Red (`--color-malus`) in the Options modal to signal destructive action.
- **Preserve data-testid values**: `login-button`, `logout-button`, `admin-link` keep their existing testids.
- **Dropdown styling**: `boxShadow: '0 4px 12px rgba(0,0,0,0.12)'`, `borderRadius: '8px'`, `border: '1px solid var(--color-border)'`, `background: 'var(--color-surface)'`. Items have hover state with `background: var(--color-bg)`.
- **ARIA attributes**: Hamburger button gets `aria-expanded={menuOpen}`, `aria-haspopup="true"`, `aria-label="Menu"`. Dropdown gets `role="menu"`. Each dropdown item gets `role="menuitem"`.
- **Focus management**: When dropdown opens, focus the first menu item. When dropdown closes (Escape or click-outside), return focus to the hamburger button. Use a `useEffect` with a ref on the first item and the hamburger button.
- **Fragment wrapper**: `AppHeader` return wraps `<header>` and `<Dialog>` in a React fragment `<>...</>`. No consumer depends on a single root element (AppHeader is rendered directly in RootLayout JSX, not via ref forwarding).
- **Unmount during logout**: When `handleLogout` calls `queryClient.clear()`, the `session` becomes null, `RootLayout` stops rendering `AppHeader`, and the Dialog unmounts. This is fine — the user is being redirected to `/login` anyway. No special handling needed.

## Implementation Plan

### Tasks

- [x] Task 1: Add imports and state variables
  - File: `src/routes/__root.tsx`
  - Action:
    - Add `import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'` at the top imports.
    - Add `import { Menu } from 'lucide-react'` at the top imports.
    - Add `import { useEffect, useRef } from 'react'` (extend the existing `useState` import from `'react'`).
    - Inside `AppHeader`, add: `const [menuOpen, setMenuOpen] = useState(false)`, `const [optionsOpen, setOptionsOpen] = useState(false)`, `const menuRef = useRef<HTMLDivElement>(null)`, `const hamburgerRef = useRef<HTMLButtonElement>(null)`.
  - Notes: Keep existing `loggingOut` state unchanged.

- [x] Task 2: Add Escape key handler and focus management effects
  - File: `src/routes/__root.tsx`
  - Action: Inside `AppHeader`, after the state declarations, add:
    - A `useEffect` that registers a `keydown` listener on `document` when `menuOpen` is true. On `Escape`, call `setMenuOpen(false)`. Cleanup removes the listener. Dependency array: `[menuOpen]`.
    - A `useEffect` that focuses `menuRef.current?.querySelector('[role="menuitem"]')` when `menuOpen` becomes true, and focuses `hamburgerRef.current` when `menuOpen` becomes false (but only if it was previously true — use a ref to track previous value, or guard with a condition). Dependency array: `[menuOpen]`.
  - Notes: Single approach for Escape — only the `useEffect` on `document`, no duplicate `onKeyDown` on the dropdown container.

- [x] Task 3: Rewrite the left block fallback (no army)
  - File: `src/routes/__root.tsx`
  - Action: In the left block of the header, find the `!army` fallback branch (the `<span>` that shows `session.isGuest ? 'Invite' : session.displayName`). Change the non-guest case to show "Campaign TOW" in Cinzel font instead of `session.displayName`:
    ```jsx
    ) : (
      <span style={{
        fontFamily: session.isGuest ? 'var(--font-body)' : 'var(--font-display)',
        fontSize: session.isGuest ? '0.875rem' : 16,
        fontWeight: session.isGuest ? 400 : 700,
        color: session.isGuest ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
      }}>
        {session.isGuest ? 'Invite' : 'Campaign TOW'}
      </span>
    )
    ```
  - Notes: This avoids duplicating the display name (which now always appears in the right block for logged-in users). Guests still see "Invite" since they don't have the hamburger or display name.

- [x] Task 4: Rewrite the right block of the header
  - File: `src/routes/__root.tsx`
  - Action: Replace the entire current right block `<div>` (containing display name, logout/login button, admin link) with:
    - **If `session.isGuest`**: A single "Se connecter" button with `data-testid="login-button"`, `onClick={handleLogout}`, styled with `color: var(--color-brand)`, same `btnStyle` as current.
    - **If NOT guest**: A `<div>` with `position: relative` containing:
      1. Display name: `<span>` with `fontSize: 11`, `color: var(--color-text-secondary)` (only when `army` exists — when no army, display name still shows since left block now shows "Campaign TOW").
      2. Actually, display name should ALWAYS show for non-guest users (it's their identifier). Show it regardless of army.
      3. Hamburger button: `<button ref={hamburgerRef} data-testid="hamburger-button" aria-expanded={menuOpen} aria-haspopup="true" aria-label="Menu" onClick={() => setMenuOpen(prev => !prev)}>` containing `<Menu size={20} color="var(--color-brand)" />`. Styled: `background: 'none'`, `border: 'none'`, `cursor: 'pointer'`, `padding: '4px'`.
    - Remove the "Voir le detail" `<Link>` from the left block (the one navigating to `/armies/$armyId`).
    - Remove the old logout/login buttons and admin link from the right block (they move to dropdown/modal).
  - Notes: The `position: relative` on the right block is needed so the dropdown (Task 5) anchors correctly with `position: absolute`.

- [x] Task 5: Add the dropdown menu
  - File: `src/routes/__root.tsx`
  - Action: Inside the right block `<div>` (after the hamburger button), render when `menuOpen` is true:
    - A transparent backdrop: `<div style={{ position: 'fixed', inset: 0, zIndex: 9 }} onClick={() => setMenuOpen(false)} />`.
    - The dropdown: `<div ref={menuRef} role="menu" style={{ position: 'absolute', right: 0, top: '100%', zIndex: 10, marginTop: 4, minWidth: 180, boxShadow: '0 4px 12px rgba(0,0,0,0.12)', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', overflow: 'hidden' }}>`.
    - **Item 1 — "Voir mon armee"**: `<button role="menuitem" data-testid="my-army-link" disabled={!army} aria-disabled={!army} onClick={() => { if (!army) return; setMenuOpen(false); router.navigate({ to: '/armies/$armyId', params: { armyId: army.id } }) }} style={{ width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', borderBottom: '1px solid var(--color-border)', cursor: army ? 'pointer' : 'default', fontSize: '0.875rem', color: army ? 'var(--color-text-primary)' : 'var(--color-text-muted)', fontFamily: 'var(--font-body)', opacity: army ? 1 : 0.5 }}>Voir mon armee</button>`.
    - **Item 2 — "Administration"** (conditional): Only render if `session.isAdmin`. `<button role="menuitem" data-testid="admin-link" onClick={() => { setMenuOpen(false); router.navigate({ to: '/admin' }) }} style={{ ...same item style..., borderBottom: '1px solid var(--color-border)' }}>Administration</button>`.
    - **Item 3 — "Options"**: `<button role="menuitem" onClick={() => { setMenuOpen(false); setOptionsOpen(true) }} style={{ ...same item style..., borderBottom: 'none' }}>Options</button>`.
    - Note: If admin item is not rendered, "Voir mon armee" borderBottom remains (it separates from "Options"). The last item never has borderBottom.
  - Notes: The backdrop is `position: fixed` (viewport stacking context) at `zIndex: 9`. The dropdown is `position: absolute` (relative to parent div) at `zIndex: 10`. This ensures the dropdown floats above the backdrop.

- [x] Task 6: Add the Options modal (shadcn Dialog)
  - File: `src/routes/__root.tsx`
  - Action: Wrap the `AppHeader` return in a React fragment `<>...</>`. After the `</header>` tag, render:
    ```jsx
    <Dialog open={optionsOpen} onOpenChange={(isOpen) => { if (!isOpen) setOptionsOpen(false) }}>
      <DialogContent style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', maxWidth: 340 }}>
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
            Options
          </DialogTitle>
        </DialogHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: '0.5rem' }}>
          <button
            data-testid="logout-button"
            onClick={handleLogout}
            disabled={loggingOut}
            style={{
              background: 'var(--color-malus)',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              padding: '0.625rem 1rem',
              fontSize: '0.875rem',
              fontFamily: 'var(--font-body)',
              fontWeight: 600,
              cursor: loggingOut ? 'not-allowed' : 'pointer',
              opacity: loggingOut ? 0.7 : 1,
              width: '100%',
            }}
          >
            {loggingOut ? 'Deconnexion...' : 'Se deconnecter'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
    ```
  - Notes: The Dialog close button (X) is provided automatically by shadcn `DialogContent` (it imports `XIcon` from lucide-react). `handleLogout` is the same existing function. When logout triggers, `queryClient.clear()` causes session to become null, AppHeader unmounts (including this Dialog), and the user is redirected to `/login`. This is the expected flow — no special cleanup needed.

- [x] Task 7: Update file-contract tests
  - File: `src/routes/__tests__/root-header.test.ts`
  - Action:
    - **Remove** the entire describe block `'[AC1] AppHeader — "Voir le detail" link to army'` (both tests inside: the Link test and the "Voir le detail" text test).
    - **Replace** with a new describe block following the `[AC]` tag convention:
      ```ts
      describe('[AC-HM] AppHeader — hamburger menu', () => {
        it('renders hamburger button with data-testid', () => {
          const code = getRootTsx()
          expect(code).toContain('data-testid="hamburger-button"')
        })

        it('imports Menu icon from lucide-react', () => {
          const code = getRootTsx()
          expect(code).toMatch(/import\s*\{[^}]*Menu[^}]*\}\s*from\s*['"]lucide-react['"]/)
        })

        it('renders "Voir mon armee" menu item with role="menuitem"', () => {
          const code = getRootTsx()
          expect(code).toMatch(/role="menuitem"[\s\S]{0,200}Voir mon armee/)
        })

        it('hamburger button has aria-expanded and aria-haspopup', () => {
          const code = getRootTsx()
          expect(code).toMatch(/data-testid="hamburger-button"[\s\S]{0,100}aria-expanded/)
          expect(code).toContain('aria-haspopup="true"')
        })

        it('imports Dialog from shadcn ui for Options modal', () => {
          const code = getRootTsx()
          expect(code).toMatch(/import\s*\{[^}]*Dialog[^}]*\}\s*from\s*['"]\.\.\/components\/ui\/dialog['"]/)
        })

        it('Options modal contains logout button with --color-malus', () => {
          const code = getRootTsx()
          expect(code).toMatch(/DialogTitle[\s\S]{0,300}Options[\s\S]{0,500}data-testid="logout-button"[\s\S]{0,300}color-malus/)
        })

        it('dropdown has role="menu"', () => {
          const code = getRootTsx()
          expect(code).toContain('role="menu"')
        })
      })
      ```
    - **Keep** existing tests for: `data-testid="logout-button"`, `data-testid="login-button"`, `data-testid="admin-link"`, `--font-display`, `--color-header-bg`, `army.faction`, record format (V/N/D).
    - **Keep** the `'[AC6] CampaignView — no duplicate army header in body'` describe block but **remove** the test `'index.tsx does NOT contain "Voir le detail" link'` (no longer relevant since "Voir le detail" is gone from the entire app). Keep the `army.name` heading test.
  - Notes: All new test assertions use coupled patterns (regex spanning from one element to another) to avoid false positives per the project's coupled assertions rule. The `[AC-HM]` prefix distinguishes these from the original AC numbering.

### Acceptance Criteria

- [x] AC1: Given a logged-in non-guest user with an army, when the header renders, then the army name (Cinzel), faction, record (V/N/D), display name, and a hamburger button (Lucide Menu icon) are visible. No "Voir le detail" link, no logout button, no admin link are directly visible in the header.
- [x] AC2: Given a guest user, when the header renders, then a "Se connecter" button is visible instead of the hamburger. No hamburger button is rendered.
- [x] AC3: Given a logged-in user clicks the hamburger button, when the dropdown opens, then it shows "Voir mon armee", "Options", and (if admin) "Administration" as menu items with `role="menuitem"`.
- [x] AC4: Given the dropdown is open, when the user clicks outside it or presses Escape, then the dropdown closes and focus returns to the hamburger button.
- [x] AC5: Given a logged-in user with an army clicks "Voir mon armee" in the dropdown, when navigating, then the app navigates to `/armies/$armyId` with the correct army ID and the dropdown closes.
- [x] AC6: Given a logged-in user WITHOUT an army, when the dropdown shows "Voir mon armee", then the item is greyed out (`disabled` attribute, `opacity: 0.5`, `aria-disabled`) and not clickable.
- [x] AC7: Given a logged-in user clicks "Options" in the dropdown, when the modal opens, then a shadcn Dialog with title "Options" and a red (`--color-malus`) "Se deconnecter" button is displayed, with a close (X) button.
- [x] AC8: Given a user clicks "Se deconnecter" in the Options modal, when logout completes, then the session is cleared, cache is invalidated, and the user is redirected to `/login`. The Dialog unmounts cleanly as part of AppHeader unmount.
- [x] AC9: Given an admin user, when the dropdown renders, then "Administration" is visible. Given a non-admin user, "Administration" is not rendered.
- [x] AC10: Given all changes are complete, when file-contract tests run, then all tests pass with updated assertions matching the new header structure.
- [x] AC11: Given the hamburger button, it has `aria-expanded`, `aria-haspopup="true"`, and `aria-label="Menu"`. The dropdown has `role="menu"` and each item has `role="menuitem"`.
- [x] AC12: Given a logged-in non-guest user WITHOUT an army, when the header renders, then the left block shows "Campaign TOW" (Cinzel font) instead of the display name (which is in the right block).

## Additional Context

### Dependencies

- No new packages required.
- shadcn `Dialog` already installed and used in `welcome-modal.tsx`.
- `lucide-react` already installed and used by shadcn components (`dialog.tsx`, `select.tsx`).

### Testing Strategy

**File-contract tests (update existing):**
- `src/routes/__tests__/root-header.test.ts` — See Task 7 for full test rewrite. Tests use coupled regex assertions per project convention.

**Manual testing:**
- Test as logged-in user with army: verify header layout, hamburger click, dropdown items, "Voir mon armee" navigation, Options modal, logout flow.
- Test as logged-in user WITHOUT army: verify "Voir mon armee" is disabled, left block shows "Campaign TOW", display name in right block.
- Test as admin: verify "Administration" item in dropdown.
- Test as guest: verify "Se connecter" button, no hamburger, left block shows "Invite".
- Test on mobile: verify touch targets, dropdown positioning, modal usability.
- Test Escape key closes dropdown and returns focus to hamburger button.
- Test click-outside closes dropdown.
- Test keyboard navigation: Tab into dropdown items after opening.
- Test logout from Options modal: verify clean redirect, no console errors from unmounted component.

### Notes

- The header is currently an inline `AppHeader` component within `__root.tsx` (not extracted).
- Logout uses `logoutFn` server function that clears session, invalidates QueryClient, and navigates to `/login`.
- Header reactivity relies on `useQuery` with `armyInfoQueryOptions()` — this is preserved (no changes to query logic).
- `AppHeader` is rendered with `key={session.playerId}` in `RootLayout`. During logout, `queryClient.clear()` sets session to null, which unmounts AppHeader (and any open Dialog inside it). This is expected behavior — the redirect to `/login` happens immediately after.
- The dropdown is intentionally simple (no animation) — if animation is desired later, CSS `transform` + `opacity` transition can be added.
- Future consideration: if more options are added to the modal, consider extracting to a separate component.
- No line number references are used in tasks — tasks identify code by structural landmarks (component names, JSX elements, variable names) to avoid stale references after earlier tasks modify the file.

## Review Notes
- Adversarial review completed
- Findings: 5 total, 1 fixed, 4 skipped (noise)
- Resolution approach: auto-fix
- F1 (Medium, real): Focus steal on mount — fixed with prevMenuOpen ref guard
- F2-F5 (Low, noise): Cosmetic indentation, non-applicable Escape conflict, missing CSS hover (inline style limitation), unused btnStyle rename — all acknowledged, no action needed
