// src/components/__tests__/tab-bar.test.tsx
// Story 3.1b: App Shell — TabBar, Layout & Navigation Components
// Status: RED — written before implementation (TDD)
//
// Static file-contract tests for the TabBar component.
// Follows the pattern established in tests/2-4-unit-edit-panel-component.test.ts
// (structural file-content assertions + minimal render tests).
//
// Covers AC1, AC2, AC5, AC9 and Tasks 1.1–1.8, 8.1–8.4.
// All tests will fail until the implementation is complete.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '../../..')

function getTabBar() {
  return readFileSync(resolve(root, 'src/components/tab-bar.tsx'), 'utf-8')
}

// ---------------------------------------------------------------------------
// AC1, AC5 — TabBar renders 3 tabs with correct labels and icons (Task 1.1)
// AC2 — Each tab links to the correct route (Task 1.5)
// Tasks 8.1, 8.4
// ---------------------------------------------------------------------------

describe('[AC1][AC5][P0] TabBar — component file exists and exports TabBar', () => {
  it('[3.1b-TAB-001] src/components/tab-bar.tsx file exists', () => {
    expect(() => getTabBar()).not.toThrow()
  })

  it('[3.1b-TAB-002] tab-bar.tsx exports TabBar as named export', () => {
    const code = getTabBar()
    expect(code).toMatch(/export function TabBar/)
  })
})

describe('[AC1][AC5][P0] TabBar — 3 fixed tabs with correct labels (Tasks 1.1, 8.1)', () => {
  it('[3.1b-TAB-003] tab-bar.tsx contains "Campagne" tab label', () => {
    const code = getTabBar()
    expect(code).toContain('Campagne')
  })

  it('[3.1b-TAB-004] tab-bar.tsx contains "Armees" tab label', () => {
    const code = getTabBar()
    expect(code).toContain('Armees')
  })

  it('[3.1b-TAB-005] tab-bar.tsx contains "Territoires" tab label', () => {
    const code = getTabBar()
    expect(code).toContain('Territoires')
  })
})

describe('[AC1][P0] TabBar — emoji icons present (Task 1.1)', () => {
  it('[3.1b-TAB-006] tab-bar.tsx contains a scroll emoji for Campagne tab', () => {
    const code = getTabBar()
    // Scroll emoji: 📜
    expect(code).toMatch(/📜|scroll|&#x1F4DC/)
  })

  it('[3.1b-TAB-007] tab-bar.tsx contains a shield emoji for Armees tab', () => {
    const code = getTabBar()
    // Shield emoji: 🛡
    expect(code).toMatch(/🛡|shield|&#x1F6E1/)
  })

  it('[3.1b-TAB-008] tab-bar.tsx contains a book emoji for Territoires tab', () => {
    const code = getTabBar()
    // Open book emoji: 📖
    expect(code).toMatch(/📖|book|&#x1F4D6/)
  })
})

describe('[AC2][P0] TabBar — each tab links to correct route (Task 1.5, 8.4)', () => {
  it('[3.1b-TAB-009] tab-bar.tsx imports Link from @tanstack/react-router for navigation', () => {
    const code = getTabBar()
    expect(code).toMatch(/import[\s\S]{0,200}Link[\s\S]{0,100}@tanstack\/react-router/)
  })

  it('[3.1b-TAB-010] Campagne tab links to "/" route', () => {
    const code = getTabBar()
    // Link to="/" for Campagne
    expect(code).toMatch(/to=["']\/?["']/)
  })

  it('[3.1b-TAB-011] Armees tab links to "/armies" route', () => {
    const code = getTabBar()
    expect(code).toMatch(/to=["']\/armies["']/)
  })

  it('[3.1b-TAB-012] Territoires tab links to "/territories" route', () => {
    const code = getTabBar()
    expect(code).toMatch(/to=["']\/territories["']/)
  })
})

describe('[AC1][AC9][P0] TabBar — active state styling (Tasks 1.2, 1.3, 8.2, 8.3)', () => {
  it('[3.1b-TAB-013] TabBar accepts currentPath prop (string)', () => {
    const code = getTabBar()
    expect(code).toMatch(/currentPath/)
  })

  it('[3.1b-TAB-014] TabBar computes isCampagne active state from currentPath', () => {
    const code = getTabBar()
    // isCampagne or equivalent active flag for Campagne tab
    expect(code).toMatch(/isCampagne|campagneActive|isActive[\s\S]{0,100}campagne/i)
  })

  it('[3.1b-TAB-015] TabBar computes isArmees active state — matches /armies and /armies/* paths', () => {
    const code = getTabBar()
    // Must handle both "/armies" and "/armies/*"
    expect(code).toMatch(/isArmees|armeesActive/)
    expect(code).toMatch(/(startsWith\(['"]\/armies|\barmees\b[\s\S]{0,300}startsWith)/i)
  })

  it('[3.1b-TAB-016] TabBar computes isTerritoires active state from /territories path', () => {
    const code = getTabBar()
    expect(code).toMatch(/isTerritoires|territoiresActive/)
  })

  it('[3.1b-TAB-017] TabBar applies active background color #dfe8f4 to active tab', () => {
    const code = getTabBar()
    expect(code).toContain('#dfe8f4')
  })

  it('[3.1b-TAB-018] TabBar applies navy color #334155 to active tab text', () => {
    const code = getTabBar()
    expect(code).toContain('#334155')
  })

  it('[3.1b-TAB-019] TabBar applies muted color #9a8d7f to inactive tab text', () => {
    const code = getTabBar()
    expect(code).toContain('#9a8d7f')
  })

  it('[3.1b-TAB-020] No active tab for /admin path — /admin excluded from Campagne matching', () => {
    const code = getTabBar()
    // admin must be explicitly excluded from isCampagne condition
    expect(code).toMatch(/(admin[\s\S]{0,200}isCampagne|isCampagne[\s\S]{0,300}admin)/)
  })

  it('[3.1b-TAB-021] No active tab for /login path — /login excluded from isCampagne matching', () => {
    const code = getTabBar()
    expect(code).toMatch(/(login[\s\S]{0,200}isCampagne|isCampagne[\s\S]{0,300}login)/)
  })
})

describe('[AC1][P0] TabBar — indicator bar rendered on active tab (Task 1.8)', () => {
  it('[3.1b-TAB-022] TabBar renders a conditional indicator span element (not pseudo-element)', () => {
    const code = getTabBar()
    // The indicator bar is a real DOM element (span) rendered conditionally
    expect(code).toMatch(/<span[\s\S]{0,300}(position.*absolute|borderRadius.*999|height.*3)/)
  })

  it('[3.1b-TAB-023] Indicator bar has width 24px and height 3px', () => {
    const code = getTabBar()
    expect(code).toMatch(/width.*24|24.*width/)
    expect(code).toMatch(/height.*3[^0-9]|3[^0-9].*height/)
  })
})

describe('[AC1][P0] TabBar — container styling (Task 1.4)', () => {
  it('[3.1b-TAB-024] TabBar container has data-testid="tab-bar"', () => {
    const code = getTabBar()
    expect(code).toContain('data-testid="tab-bar"')
  })

  it('[3.1b-TAB-025] TabBar container height 58px', () => {
    const code = getTabBar()
    expect(code).toMatch(/58/)
  })

  it('[3.1b-TAB-026] TabBar container uses backdrop-filter blur', () => {
    const code = getTabBar()
    expect(code).toMatch(/backdropFilter|backdrop-filter/)
  })
})

describe('[AC1][P0] TabBar — tab data-testid attributes present (Task 1.7)', () => {
  it('[3.1b-TAB-027] Campagne tab has data-testid="tab-campagne"', () => {
    const code = getTabBar()
    expect(code).toContain('data-testid="tab-campagne"')
  })

  it('[3.1b-TAB-028] Armees tab has data-testid="tab-armees"', () => {
    const code = getTabBar()
    expect(code).toContain('data-testid="tab-armees"')
  })

  it('[3.1b-TAB-029] Territoires tab has data-testid="tab-territoires"', () => {
    const code = getTabBar()
    expect(code).toContain('data-testid="tab-territoires"')
  })
})

describe('[AC7][P0] TabBar — integration in root layout (Task 4.4)', () => {
  it('[3.1b-TAB-030] __root.tsx imports TabBar component', () => {
    const root_tsx = readFileSync(resolve(root, 'src/routes/__root.tsx'), 'utf-8')
    expect(root_tsx).toMatch(/import[\s\S]{0,200}TabBar[\s\S]{0,100}tab-bar/)
  })

  it('[3.1b-TAB-031] __root.tsx uses useLocation to get current pathname for TabBar', () => {
    const root_tsx = readFileSync(resolve(root, 'src/routes/__root.tsx'), 'utf-8')
    expect(root_tsx).toMatch(/useLocation/)
  })

  it('[3.1b-TAB-032] __root.tsx renders TabBar component conditionally (not on /login)', () => {
    const root_tsx = readFileSync(resolve(root, 'src/routes/__root.tsx'), 'utf-8')
    expect(root_tsx).toMatch(/<TabBar/)
  })
})
