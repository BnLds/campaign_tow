# Story 1.5: Player Logout

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want to log out of the app,
so that I can end my session and return to the login page.

## Acceptance Criteria

**AC1 — Authenticated player sees logout action:**
Given I am authenticated (non-guest),
When any view renders,
Then I see a "Se déconnecter" action in the profile/header area.

**AC2 — Logout clears session and redirects:**
Given I am authenticated,
When I tap "Se déconnecter",
Then my session cookie is cleared, the `sessions` table row is deleted, and I am redirected to /login.

**AC3 — Back button after logout redirects to login:**
Given I am on /login after logout,
When I navigate back (browser back button),
Then I am redirected back to /login (session is gone, protected routes reject).

**AC4 — [DEFERRED TO 1.7] Guest sees "Se connecter" instead:**
Given I am a guest (isGuest session),
When any view renders,
Then I see "Se connecter" in the same location as "Se déconnecter".
*`isGuest` does not exist in schema/SessionData until Story 1.7. Do NOT implement guest logic in this story — only prepare the UI conditional with `isGuest?: boolean` defaulting to false.*

**AC5 — [DEFERRED TO 1.7] Guest session clear on "Se connecter":**
Given I am a guest,
When I tap "Se connecter",
Then my guest session is cleared and I am redirected to /login.
*Same deferral — the "Se connecter" path will activate when Story 1.7 adds `isGuest` to the schema.*

*No new tables. Extends: `sessions` table (story 1.2).*

## Tasks / Subtasks

- [ ] Task 1 — Add logout/login button to root layout (AC1, AC4)
  - [ ] 1.1 — In `src/routes/__root.tsx`, add session-aware action button in the top-right header area
  - [ ] 1.2 — [DEFERRED TO 1.7] Guest "Se connecter" button — only add `isGuest?: boolean` to `SessionData` type (default `false`). Do NOT implement guest UI logic. All authenticated users see "Se déconnecter" for now.
  - [ ] 1.3 — If authenticated (non-guest): show "Se déconnecter" (AC1)
  - [ ] 1.4 — Wire both buttons to call `logoutFn` (already exists in `login.tsx` line 33)

- [ ] Task 2 — Refactor `logoutFn` to be importable from any route (AC2, AC5)
  - [ ] 2.1 — `logoutFn` is currently defined in `src/routes/login.tsx` — it uses `deleteSession()` from `auth.ts` and `throw redirect({ to: '/login' })`
  - [ ] 2.2 — Move `logoutFn` to a new server function in `src/routes/__root.tsx` OR keep importing from `login.tsx` (it's already exported). Evaluate which approach avoids circular imports.
  - [ ] 2.3 — **Preferred approach:** Create a dedicated `logoutFn` as a server function in `__root.tsx` using the same dynamic import pattern. This avoids importing from a sibling route file which can cause bundler issues.
  - [ ] 2.4 — Pattern:
    ```typescript
    const logoutFn = createServerFn({ method: 'POST' }).handler(async () => {
      const { deleteSession } = await import('../lib/auth')
      await deleteSession()
    })
    ```
    Note: Do NOT `throw redirect()` from the server function — let the client handle navigation after the call returns, using `router.navigate({ to: '/login' })`. This is cleaner and avoids SSR redirect issues.

- [ ] Task 3 — Add `Outlet` component for child route rendering (AC1)
  - [ ] 3.1 — `__root.tsx` currently uses `shellComponent: RootDocument` which wraps `{children}` — verify that the logout button renders on ALL pages (Campaign, Admin, Armies, References) by placing it inside `RootDocument` before `{children}`
  - [ ] 3.2 — The button must NOT appear on `/login` page — conditionally render based on session presence

- [ ] Task 4 — Verify back-button protection (AC3)
  - [ ] 4.1 — `__root.tsx` `beforeLoad` already checks session and redirects to `/login` if null — this should already handle AC3
  - [ ] 4.2 — Write an integration test confirming that `beforeLoad` rejects when no session exists
  - [ ] 4.3 — E2E test: login → logout → browser back → verify on /login

- [ ] Task 5 — Write tests (AC1–AC5)
  - [ ] 5.1 — `tests/integration/logout.test.ts`: integration tests covering:
    - `logoutFn` server function exists in `__root.tsx` (or wherever placed)
    - `logoutFn` calls `deleteSession` (verify import chain)
    - Root layout renders "Se déconnecter" button (verify in route component)
    - `beforeLoad` rejects unauthenticated access (AC3)
  - [ ] 5.2 — `pnpm test` passes: 126 baseline + new tests — zero regressions

- [ ] Task 6 — Verify quality gates
  - [ ] 6.1 — `pnpm typecheck` — zero errors
  - [ ] 6.2 — `pnpm lint` — zero errors on story 1.5 files
  - [ ] 6.3 — `pnpm build` — succeeds

## Dev Notes

### CRITICAL — `logoutFn` Already Exists

**`deleteSession()`** in `src/lib/auth.ts` (L69-75) handles all server-side cleanup (delete DB row + clear cookie). Already implemented and tested.

**`logoutFn`** in `src/routes/login.tsx` (L33-36) wraps `deleteSession()` + `throw redirect()`. It works but uses server-side redirect which is suboptimal for client button clicks.

**Action:** Create a NEW `logoutFn` in `__root.tsx` with dynamic import pattern (import-protection). Do NOT `throw redirect()` — let the client navigate after the call. **Keep the existing `logoutFn` in `login.tsx` untouched** — it has no dependents but removing it risks breaking the route module's exports.

### Where to Place the Logout Button — Root Layout

`RootDocument` (the `shellComponent`) does NOT have access to `context.session` from `beforeLoad`. **Solution:** Add `component: RootLayout` to the root route — this is the standard TanStack Router pattern for persistent UI across child routes.

```typescript
export const Route = createRootRouteWithContext<MyRouterContext>()({
  // ... head, beforeLoad, shellComponent unchanged ...
  component: RootLayout,  // ADD THIS
})

function RootLayout() {
  const context = useRouteContext({ from: '__root__' })
  const session: SessionData | null = 'session' in context ? context.session : null

  return (
    <>
      {session && <AppHeader session={session} />}
      <Outlet />
    </>
  )
}
```

**Critical:** Import `Outlet` from `@tanstack/react-router`. Without it, child routes won't render. The `{session && ...}` guard ensures the header is hidden on `/login` (where `beforeLoad` returns no session).

### AppHeader Component — Minimal for Story 1.5

For this story, the header is minimal:
- Identity indicator (display name or "Admin") — top-left
- "Se déconnecter" button — top-right
- No TabBar yet (future stories), no FAB

```typescript
function AppHeader({ session }: { session: SessionData }) {
  const router = useRouter()

  const handleLogout = async () => {
    await logoutFn()
    await router.navigate({ to: '/login' })
  }

  return (
    <header style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0.5rem 1rem',
      borderBottom: '1px solid var(--color-border)',
      backgroundColor: 'var(--color-surface)',
    }}>
      <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
        {session.isAdmin ? 'Admin' : session.displayName}
      </span>
      <button
        data-testid="logout-button"
        onClick={handleLogout}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--color-brand)',
          cursor: 'pointer',
          fontSize: '0.875rem',
          padding: '0.5rem',
        }}
      >
        Se déconnecter
      </button>
    </header>
  )
}
```

### Session Data — `isGuest` Forward-Compatibility

Add `isGuest?: boolean` to `SessionData` type (defaults to `false`). Do NOT add the DB column — Story 1.7 handles schema + query changes. This lets the UI conditional (`session.isGuest ? "Se connecter" : "Se déconnecter"`) be pre-wired but always show "Se déconnecter" until 1.7 activates it.

### Scope Boundaries

- **`/login` page:** No logout button — `{session && <AppHeader>}` guard handles this since `beforeLoad` returns no session on `/login`.
- **Admin link in `index.tsx`:** Leave it where it is. Story 1.6 will move it to the profile/session menu. Do NOT touch it in this story.
- **`logoutFn` in `login.tsx`:** Keep it untouched (see above).

### Architecture Boundaries — Compliance Checklist

- [ ] `logoutFn` uses dynamic import of `deleteSession` from `auth.ts` (import-protection)
- [ ] No direct DB access in route files — `deleteSession()` in `auth.ts` handles it
- [ ] Logout button rendered from root layout, visible on ALL authenticated pages
- [ ] Button NOT visible on `/login` page
- [ ] Session cleared server-side (cookie + DB row) via existing `deleteSession()`
- [ ] Client navigates to `/login` after logout — `beforeLoad` protects all routes

### Previous Story Learnings (from Story 1.4)

- **`useRouteContext({ from: '__root__' })`** is how child routes access `session` — use the same pattern in root layout
- **`'session' in context ? context.session : null`** — required because `beforeLoad` skips session load on `/login`
- **Import-protection pattern:** Dynamic imports inside `.handler()` or `.server()` — critical for any server-only code
- **Test baseline:** 126/126 passing — do NOT break any
- **`pnpm lint` quirk:** `eslint` needs to be called via `npx --no-install eslint` or the `eslint` direct dep added in story 1.4
- **TanStack Form + Zod v4:** Standard Schema support (no adapter) — not relevant for this story (no form)

### Git Intelligence — Recent Commits

```
e282d23 change epic 1 - include guest view - include admin accounts management - add disconnect option
d9aeb53 add ref to tanstack skills in architecture document
aec6793 epic 1 retrospective
a14e5b3 Code review passed Add waitForHydration method for e2e test
285460b dev story 1.4
```

Commit `e282d23` is the sprint change proposal that added stories 1.5–1.7 to epic 1. No code changes to the app itself.

### Route Structure After Story 1.5

```
src/routes/
├── __root.tsx             ← MODIFIED: add RootLayout component with AppHeader + Outlet, logoutFn
├── index.tsx              ← unchanged
├── login.tsx              ← possibly remove logoutFn if duplicated, or keep for backward compat
├── admin/
│   └── index.tsx          ← unchanged
```

### Project Structure Notes

- `src/routes/__root.tsx` is the ONLY file that needs significant changes
- `src/lib/auth.ts` — NO changes (deleteSession already exists)
- `src/lib/middleware.ts` — NO changes
- `src/db/schema.ts` — NO changes (no new tables, no schema migration)
- `src/db/queries.ts` — NO changes

### Design Tokens (for header styling)

- Background: `var(--color-surface)` (#fffbf5)
- Border: `var(--color-border)` (#e0d5c8)
- Text secondary: `var(--color-text-secondary)` (#6b5f52)
- Brand (button text): `var(--color-brand)` (#334155)
- Font body: `var(--font-body)` (Inter)
- Font display: `var(--font-display)` (Cinzel) — for titles only, not header buttons

### References

- Story 1.5 ACs: [Source: epics/epic-1-project-foundation-player-authentication.md#Story 1.5]
- Sprint change proposal: [Source: sprint-change-proposal-2026-03-13.md#Section 4.1]
- `deleteSession()`: [Source: src/lib/auth.ts#L69-75]
- Existing `logoutFn`: [Source: src/routes/login.tsx#L33-36]
- `SessionData` type: [Source: src/lib/auth.ts#L14-19]
- Route protection (`beforeLoad`): [Source: src/routes/__root.tsx#L32-41]
- Architecture import-protection pattern: [Source: architecture/implementation-patterns-consistency-rules.md#Process Patterns]
- Route protection patterns (3 session states): [Source: architecture/implementation-patterns-consistency-rules.md#Process Patterns]
- Design tokens: [Source: src/styles/globals.css + MEMORY.md#Palette]
- Test baseline: 126/126 (from story 1.4)

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
