// tests/integration/logout.test.ts
// Story 1.5: Player Logout
// Tests:
//   [1.5-INT-001] logoutFn = createServerFn({ method: 'POST' }) in server-fns/logout.ts
//   [1.5-INT-002] logoutFn uses dynamic import-protection for deleteSession from auth.ts
//   [1.5-INT-003] Route assigns component: RootLayout
//   [1.5-INT-004] RootLayout function component defined in __root.tsx
//   [1.5-INT-005] Outlet imported from @tanstack/react-router
//   [1.5-INT-006] data-testid="logout-button" in app-header.tsx
//   [1.5-INT-007] "Se déconnecter" text in app-header.tsx
//   [1.5-INT-008] Session guard (session &&) renders header conditionally
//   [1.5-INT-010] SessionData.isGuest?: boolean (forward-compat, deferred to 1.7)
//
// Test that PASSES (regression guard from story 1.2):
//   [1.5-INT-009] beforeLoad redirects to /login when no session

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '../..')

// ---------------------------------------------------------------------------
// AC2 — logoutFn server function in __root.tsx
// ---------------------------------------------------------------------------

describe('[AC2][P0] logoutFn server function — src/server-fns/logout.ts', () => {
  it('[1.5-INT-001] logout.ts defines logoutFn as a POST createServerFn', () => {
    const logoutTs = readFileSync(resolve(root, 'src/server-fns/logout.ts'), 'utf-8')
    // logoutFn must be assigned to createServerFn with POST method — not two independent tokens
    expect(logoutTs).toMatch(/logoutFn\s*=\s*createServerFn\(\s*\{[^}]*method:\s*['"]POST['"]/)
  })

  it('[1.5-INT-002] logoutFn uses dynamic import-protection for deleteSession from auth.ts', () => {
    const logoutTs = readFileSync(resolve(root, 'src/server-fns/logout.ts'), 'utf-8')
    // deleteSession must be destructured from a dynamic import of auth — not a top-level import
    expect(logoutTs).toMatch(/\{\s*deleteSession\s*\}\s*=\s*await import\(['"]\.\.\/lib\/auth['"]\)/)
  })

  it('[1.5-INT-003] Route object assigns component: RootLayout', () => {
    const rootTsx = readFileSync(resolve(root, 'src/routes/__root.tsx'), 'utf-8')
    // TanStack Router: component is the persistent layout rendered on every child route
    expect(rootTsx).toMatch(/component:\s*RootLayout/)
  })
})

// ---------------------------------------------------------------------------
// AC1 — RootLayout component with AppHeader and Outlet
// ---------------------------------------------------------------------------

describe('[AC1][P0] RootLayout component — src/routes/__root.tsx', () => {
  it('[1.5-INT-004] __root.tsx defines RootLayout function component', () => {
    const rootTsx = readFileSync(resolve(root, 'src/routes/__root.tsx'), 'utf-8')
    expect(rootTsx).toMatch(/function RootLayout/)
  })

  it('[1.5-INT-005] __root.tsx imports Outlet from @tanstack/react-router', () => {
    const rootTsx = readFileSync(resolve(root, 'src/routes/__root.tsx'), 'utf-8')
    // Outlet must come from @tanstack/react-router — required for child routes to render
    expect(rootTsx).toMatch(/import\s*\{[^}]*Outlet[^}]*\}\s*from\s*['"]@tanstack\/react-router['"]/)
  })

  it('[1.5-INT-006] app-header has logout button with data-testid="logout-button"', () => {
    const appHeader = readFileSync(resolve(root, 'src/components/app-header.tsx'), 'utf-8')
    expect(appHeader).toContain('data-testid="logout-button"')
  })

  it('[1.5-INT-007] logout button text is "Se déconnecter"', () => {
    const appHeader = readFileSync(resolve(root, 'src/components/app-header.tsx'), 'utf-8')
    expect(appHeader).toContain('Se déconnecter')
  })

  it('[1.5-INT-008] RootLayout renders header conditionally — only when session exists', () => {
    const rootTsx = readFileSync(resolve(root, 'src/routes/__root.tsx'), 'utf-8')
    // Session guard ensures AppHeader (with logout button) is hidden on /login page
    expect(rootTsx).toMatch(/session\s*&&/)
  })
})

// ---------------------------------------------------------------------------
// AC3 — Route protection regression (beforeLoad rejects unauthenticated)
// ---------------------------------------------------------------------------

describe('[AC3][P0] Route protection regression — src/routes/__root.tsx', () => {
  it('[1.5-INT-009] beforeLoad still redirects to /login when no session (regression guard after 1.5 changes)', () => {
    const rootTsx = readFileSync(resolve(root, 'src/routes/__root.tsx'), 'utf-8')
    // redirect({ to: '/login' }) must remain intact after story 1.5 changes
    expect(rootTsx).toMatch(/redirect\(\s*\{[^}]*to:\s*['"]\/login['"]/)
  })
})

// ---------------------------------------------------------------------------
// AC4 (deferred to story 1.7) — SessionData forward-compat: isGuest?: boolean
// ---------------------------------------------------------------------------

describe('[AC4-deferred][P1] SessionData type — src/lib/auth.ts', () => {
  it('[1.5-INT-010] SessionData type includes isGuest?: boolean (forward-compat for story 1.7)', () => {
    const auth = readFileSync(resolve(root, 'src/lib/auth.ts'), 'utf-8')
    // isGuest must appear in the SessionData type — no DB column, just the TypeScript type field
    expect(auth).toContain('isGuest')
  })
})
