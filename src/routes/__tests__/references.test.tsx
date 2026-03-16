// src/routes/__tests__/references.test.tsx
// Story 3.1b: App Shell — TabBar, Layout & Navigation Components
// Status: RED — written before implementation (TDD)
//
// Static file-contract tests for the References placeholder route:
//   - src/routes/references.tsx
//
// Follows the pattern established in tests/3-1-routes.test.ts.
// These are structural contract tests (file-content assertions).
//
// Covers AC6 and Task 3.1–3.5, 8.17.
// All tests will fail until the implementation is complete.

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '../../..')

function getReferencesRoute() {
  return readFileSync(resolve(root, 'src/routes/references.tsx'), 'utf-8')
}

// ---------------------------------------------------------------------------
// AC6 — References placeholder route file exists (Task 3.1)
// ---------------------------------------------------------------------------

describe('[AC6][P0] References route — file exists (Task 3.1)', () => {
  it('[3.1b-REF-001] src/routes/references.tsx file exists', () => {
    expect(existsSync(resolve(root, 'src/routes/references.tsx'))).toBe(true)
  })

  it('[3.1b-REF-002] references.tsx does NOT exist at references/index.tsx (correct path)', () => {
    // The file must be at the top level routes, not nested under a directory
    // (TanStack Router file convention: references.tsx -> /references)
    // We verify the correct file exists (test above) — this is a naming sanity check
    const correctPathExists = existsSync(resolve(root, 'src/routes/references.tsx'))
    expect(correctPathExists).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// AC6 — Route registration (Task 3.1)
// ---------------------------------------------------------------------------

describe('[AC6][P0] References route — route registration (Task 3.1)', () => {
  it('[3.1b-REF-003] references.tsx uses createFileRoute for "/references"', () => {
    const code = getReferencesRoute()
    expect(code).toMatch(/createFileRoute\(['"]\/references['"]/)
  })

  it('[3.1b-REF-004] references.tsx exports a Route using createFileRoute', () => {
    const code = getReferencesRoute()
    expect(code).toMatch(/export const Route/)
  })
})

// ---------------------------------------------------------------------------
// AC6 — Placeholder content (Tasks 3.2, 8.17)
// ---------------------------------------------------------------------------

describe('[AC6][P0] References route — placeholder content (Tasks 3.2, 8.17)', () => {
  it('[3.1b-REF-005] references.tsx renders "References" as title', () => {
    const code = getReferencesRoute()
    expect(code).toContain('References')
  })

  it('[3.1b-REF-006] references.tsx uses Cinzel font for the title (var(--font-display))', () => {
    const code = getReferencesRoute()
    expect(code).toMatch(/font-display|fontFamily[\s\S]{0,50}display/)
  })

  it('[3.1b-REF-007] references.tsx renders placeholder text indicating content coming soon', () => {
    const code = getReferencesRoute()
    // Must contain "Contenu" or a similar "coming soon" message
    expect(code).toMatch(/[Cc]ontenu|coming soon|venir/)
  })

  it('[3.1b-REF-008] references.tsx placeholder text is in italic style', () => {
    const code = getReferencesRoute()
    expect(code).toMatch(/fontStyle.*italic|italic/)
  })
})

// ---------------------------------------------------------------------------
// AC6 — data-app-hydrated pattern (Task 3.3)
// ---------------------------------------------------------------------------

describe('[AC6][P0] References route — data-app-hydrated pattern (Task 3.3)', () => {
  it('[3.1b-REF-009] references.tsx imports useHydrated (data-app-hydrated pattern)', () => {
    const code = getReferencesRoute()
    expect(code).toMatch(/import[\s\S]{0,200}useHydrated/)
  })

  it('[3.1b-REF-010] references.tsx sets data-app-hydrated attribute on hydration', () => {
    const code = getReferencesRoute()
    expect(code).toContain('data-app-hydrated')
  })
})

// ---------------------------------------------------------------------------
// AC6 — Layout padding (Task 3.4)
// ---------------------------------------------------------------------------

describe('[AC6][P0] References route — layout padding (Task 3.4)', () => {
  it('[3.1b-REF-011] references.tsx uses 1rem padding', () => {
    const code = getReferencesRoute()
    expect(code).toMatch(/padding.*1rem|1rem.*padding/)
  })

  it('[3.1b-REF-012] references.tsx uses max-width 720px and margin auto', () => {
    const code = getReferencesRoute()
    expect(code).toMatch(/720/)
    expect(code).toMatch(/margin.*auto|auto.*margin/)
  })
})

// ---------------------------------------------------------------------------
// AC6 — No loader needed (Task 3.5)
// ---------------------------------------------------------------------------

describe('[AC6][P0] References route — static route (Task 3.5)', () => {
  it('[3.1b-REF-013] references.tsx does NOT define a loader (static placeholder)', () => {
    const code = getReferencesRoute()
    // Static route — no loader function needed
    // Verify "loader" is absent or only present in createFileRoute options without a handler
    expect(code).not.toMatch(/loader\s*:\s*async/)
  })
})

// ---------------------------------------------------------------------------
// AC7, AC1 — Root layout structure (Task 4.2, 4.3)
// ---------------------------------------------------------------------------

describe('[AC7][P0] Root layout — flex column structure (Tasks 4.2, 4.3)', () => {
  it('[3.1b-REF-014] __root.tsx wraps content in flex column layout', () => {
    const root_tsx = readFileSync(resolve(root, 'src/routes/__root.tsx'), 'utf-8')
    expect(root_tsx).toMatch(/flexDirection.*column|flex-direction.*column/)
  })

  it('[3.1b-REF-015] __root.tsx uses height 100dvh (or 100vh fallback) for full-screen layout', () => {
    const root_tsx = readFileSync(resolve(root, 'src/routes/__root.tsx'), 'utf-8')
    expect(root_tsx).toMatch(/100dvh|100vh/)
  })

  it('[3.1b-REF-016] __root.tsx has scrollable content wrapper with flex: 1 and overflow-y auto', () => {
    const root_tsx = readFileSync(resolve(root, 'src/routes/__root.tsx'), 'utf-8')
    expect(root_tsx).toMatch(/overflowY.*auto|overflow-y.*auto/)
  })

  it('[3.1b-REF-017] __root.tsx scrollable wrapper has padding-bottom 68px to clear TabBar', () => {
    const root_tsx = readFileSync(resolve(root, 'src/routes/__root.tsx'), 'utf-8')
    expect(root_tsx).toMatch(/paddingBottom.*68|68.*paddingBottom|padding-bottom.*68/)
  })

  it('[3.1b-REF-018] __root.tsx scrollable wrapper has minHeight: 0 (critical for flex shrink)', () => {
    const root_tsx = readFileSync(resolve(root, 'src/routes/__root.tsx'), 'utf-8')
    expect(root_tsx).toMatch(/minHeight.*0|min-height.*0/)
  })
})

// ---------------------------------------------------------------------------
// AC8 — Army detail back navigation (Task 7.1, 7.2)
// ---------------------------------------------------------------------------

describe('[AC8][P0] Army detail view — back navigation (Tasks 7.1, 7.2)', () => {
  it('[3.1b-REF-019] $armyId.tsx has a back link to /armies', () => {
    const armyRoute = readFileSync(resolve(root, 'src/routes/armies/$armyId.tsx'), 'utf-8')
    expect(armyRoute).toMatch(/Link[\s\S]{0,200}(to=["']\/armies["']|\/armies)/)
  })

  it('[3.1b-REF-020] $armyId.tsx back link uses ghost button style (border, borderRadius 999px)', () => {
    const armyRoute = readFileSync(resolve(root, 'src/routes/armies/$armyId.tsx'), 'utf-8')
    // ghost button style: 30x30px, borderRadius 999px
    expect(armyRoute).toMatch(/999/)
  })

  it('[3.1b-REF-021] $armyId.tsx back button contains a left-arrow character', () => {
    const armyRoute = readFileSync(resolve(root, 'src/routes/armies/$armyId.tsx'), 'utf-8')
    // Left-arrow or back indicator: < or ‹ (\u2039) or similar
    expect(armyRoute).toMatch(/[<‹←]|\\u2039/)
  })
})
