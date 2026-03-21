// tests/3-1-routes.test.ts
// Story 3.1: Army Timeline View
// Status: RED — written before implementation (TDD)
//
// Static file-contract tests for the route files updated/created in Story 3.1:
//   - src/routes/index.tsx (Campaign view — updated)
//   - src/routes/armies/$armyId.tsx (Army detail view — updated)
//   - src/routes/armies/index.tsx (Armies list — new route)
//
// Follows the pattern established in tests/2-4-unit-deltas-server.test.ts.
//
// NOTE: These are structural contract tests (file-content assertions).
// They verify code patterns exist but do not test runtime behavior.
//
// Covers Tasks 4, 5, 6 and story tasks 7.14–7.23.
// All tests will fail until the implementation is complete.

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '..')

function getCampaignRoute() {
  return readFileSync(resolve(root, 'src/routes/index.tsx'), 'utf-8')
}

function getArmyRoute() {
  return readFileSync(resolve(root, 'src/routes/armies/$armyId.tsx'), 'utf-8')
}

function getArmiesListRoute() {
  return readFileSync(resolve(root, 'src/routes/armies/index.tsx'), 'utf-8')
}

// ---------------------------------------------------------------------------
// AC1, AC2, AC5, AC8 — Campaign view server function (Task 4.1)
// Task 7.14: loader returns timeline data for player's army
// Task 7.15: empty state when player has no army
// Task 7.16: empty state when player has army but no matches
// Task 7.17: header includes Link to /armies/$armyId
// Task 7.18: guest sees "Connectez-vous" message, no army header
// ---------------------------------------------------------------------------

describe('[AC1][AC2][AC5][AC8][P0] Campaign view — loadCampaignTimelineFn — src/routes/index.tsx', () => {
  it('[3.1-CMP-001] index.tsx defines loadCampaignTimelineFn using createServerFn', () => {
    const route = getCampaignRoute()
    expect(route).toMatch(/loadCampaignTimelineFn\s*=\s*createServerFn/)
  })

  it('[3.1-CMP-002] loadCampaignTimelineFn uses authMiddleware', () => {
    const route = getCampaignRoute()
    expect(route).toMatch(/loadCampaignTimelineFn\s*=\s*createServerFn[\s\S]{0,400}\.middleware\(\[authMiddleware\]\)/)
  })

  it('[3.1-CMP-003] loadCampaignTimelineFn returns isGuest + empty timeline for guest session', () => {
    const route = getCampaignRoute()
    // Guest path: returns { isGuest: true, army: null, timeline: [] }
    expect(route).toMatch(/loadCampaignTimelineFn[\s\S]{0,1500}isGuest/)
  })

  it('[3.1-CMP-004] loadCampaignTimelineFn calls getPlayerArmy using dynamic import', () => {
    const route = getCampaignRoute()
    expect(route).toMatch(/getPlayerArmy[\s\S]{0,300}import\(['"][\s\S]{0,80}queries['"]/)
  })

  it('[3.1-CMP-005] loadCampaignTimelineFn calls getTimelineForArmy using dynamic import', () => {
    const route = getCampaignRoute()
    expect(route).toMatch(/getTimelineForArmy[\s\S]{0,300}import\(['"][\s\S]{0,80}queries['"]/)
  })

  it('[3.1-CMP-006] index.tsx defines a route loader that calls loadCampaignTimelineFn', () => {
    const route = getCampaignRoute()
    expect(route).toMatch(/loader[\s\S]{0,300}loadCampaignTimelineFn/)
  })
})

describe('[AC1][AC2][P0] Campaign view — header with army name and army detail link (moved to __root.tsx)', () => {
  it('[3.1-CMP-007] index.tsx imports Link from @tanstack/react-router (for guest navigation)', () => {
    const route = getCampaignRoute()
    expect(route).toMatch(/import[\s\S]{0,200}Link[\s\S]{0,100}@tanstack\/react-router/)
  })

  it('[3.1-CMP-008] __root.tsx AppHeader renders army name (Cinzel font via var(--font-display))', () => {
    const rootRoute = readFileSync(resolve(root, 'src/routes/__root.tsx'), 'utf-8')
    expect(rootRoute).toMatch(/(font-display|fontFamily[\s\S]{0,100}display)/)
  })

  it('[3.1-CMP-009] __root.tsx AppHeader has a Link to /armies/$armyId (army detail navigation — AC2)', () => {
    const rootRoute = readFileSync(resolve(root, 'src/routes/__root.tsx'), 'utf-8')
    expect(rootRoute).toMatch(/Link[\s\S]{0,200}(\/armies\/\$armyId|to=.*armies.*armyId)/)
  })
})

describe('[AC5][P0] Campaign view — empty states', () => {
  it('[3.1-CMP-010] index.tsx contains "Aucune partie jouee pour le moment" empty state text (AC5)', () => {
    const route = getCampaignRoute()
    expect(route).toContain('Aucune partie jouee pour le moment')
  })

  it('[3.1-CMP-011] index.tsx contains "Aucune armee assignee" message for player with no army (AC4 task 4.5)', () => {
    const route = getCampaignRoute()
    expect(route).toContain('Aucune armee assignee')
  })
})

describe('[AC8][P0] Campaign view — guest user experience', () => {
  it('[3.1-CMP-012] index.tsx contains "Connectez-vous" message for guest users (AC8)', () => {
    const route = getCampaignRoute()
    expect(route).toContain('Connectez-vous')
  })

  it('[3.1-CMP-013] index.tsx preserves WelcomeModal import (no regression from story 1.3)', () => {
    const route = getCampaignRoute()
    expect(route).toMatch(/import[\s\S]{0,200}WelcomeModal/)
  })

  it('[3.1-CMP-014] index.tsx preserves markWelcomeSeenFn (no regression from story 1.3)', () => {
    const route = getCampaignRoute()
    expect(route).toContain('markWelcomeSeenFn')
  })
})

describe('[AC1][P0] Campaign view — TimelineEntry component usage', () => {
  it('[3.1-CMP-015] index.tsx imports TimelineEntry component', () => {
    const route = getCampaignRoute()
    expect(route).toMatch(/import[\s\S]{0,200}TimelineEntry[\s\S]{0,100}timeline-entry/)
  })

  it('[3.1-CMP-016] index.tsx renders TimelineEntry components from timeline data', () => {
    const route = getCampaignRoute()
    expect(route).toMatch(/TimelineEntry[\s\S]{0,200}(matchId|map)/)
  })
})

// ---------------------------------------------------------------------------
// AC4, AC5, AC6, AC8 — Army detail view timeline section (Task 5)
// REMOVED: Historique section was removed from army detail view.
// Timeline is only shown on the campaign home page (index.tsx).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// AC4, AC7, AC8 — Armies list route (Task 6)
// Task 7.19: renders all armies with name, faction, player display name
// Task 7.20: current player's army has gold border style
// Task 7.21: guest sees all armies, none highlighted
// ---------------------------------------------------------------------------

describe('[AC4][AC7][AC8][P0] Armies list route — file exists — src/routes/armies/index.tsx', () => {
  it('[3.1-LST-001] src/routes/armies/index.tsx file exists (new route)', () => {
    expect(existsSync(resolve(root, 'src/routes/armies/index.tsx'))).toBe(true)
  })
})

describe('[AC4][AC7][AC8][P0] Armies list route — loadArmiesListFn — src/routes/armies/index.tsx', () => {
  it('[3.1-LST-002] armies/index.tsx defines loadArmiesListFn using createServerFn', () => {
    const route = getArmiesListRoute()
    expect(route).toMatch(/loadArmiesListFn\s*=\s*createServerFn/)
  })

  it('[3.1-LST-003] loadArmiesListFn uses authMiddleware', () => {
    const route = getArmiesListRoute()
    expect(route).toMatch(/loadArmiesListFn\s*=\s*createServerFn[\s\S]{0,400}\.middleware\(\[authMiddleware\]\)/)
  })

  it('[3.1-LST-004] loadArmiesListFn calls getAllArmies using dynamic import', () => {
    const route = getArmiesListRoute()
    expect(route).toMatch(/getAllArmies[\s\S]{0,300}import\(['"][\s\S]{0,80}queries['"]/)
  })

  it('[3.1-LST-005] loadArmiesListFn returns session.playerId for gold highlight logic', () => {
    const route = getArmiesListRoute()
    expect(route).toMatch(/loadArmiesListFn[\s\S]{0,1500}playerId/)
  })

  it('[3.1-LST-006] loadArmiesListFn passes isGuest to component (guest sees no highlight — AC8)', () => {
    const route = getArmiesListRoute()
    expect(route).toMatch(/loadArmiesListFn[\s\S]{0,1500}isGuest/)
  })

  it('[3.1-LST-007] armies/index.tsx defines a route loader that calls loadArmiesListFn', () => {
    const route = getArmiesListRoute()
    expect(route).toMatch(/loader[\s\S]{0,300}loadArmiesListFn/)
  })
})

describe('[AC4][AC7][P0] Armies list route — list rendering', () => {
  it('[3.1-LST-008] armies/index.tsx renders a page title "Armees" (Cinzel heading — Task 6.3)', () => {
    const route = getArmiesListRoute()
    expect(route).toContain('Armees')
  })

  it('[3.1-LST-009] armies/index.tsx renders army name, faction, and player display name per item (Task 6.5)', () => {
    const route = getArmiesListRoute()
    // All three fields must be referenced in the component rendering
    expect(route).toMatch(/(army\.name|\.name)/)
    expect(route).toMatch(/(army\.faction|\.faction)/)
    expect(route).toMatch(/(playerDisplayName|displayName)/)
  })

  it('[3.1-LST-010] armies/index.tsx links each army to /armies/$armyId (Task 6.3)', () => {
    const route = getArmiesListRoute()
    expect(route).toMatch(/Link[\s\S]{0,200}(\/armies\/\$armyId|armies.*armyId)/)
  })

  it('[3.1-LST-011] armies/index.tsx imports Link from @tanstack/react-router', () => {
    const route = getArmiesListRoute()
    expect(route).toMatch(/import[\s\S]{0,200}Link[\s\S]{0,100}@tanstack\/react-router/)
  })
})

describe('[AC7][P0] Armies list route — gold highlight for own army (Task 6.4)', () => {
  it('[3.1-LST-012] armies/index.tsx contains gold highlight color #ead69b for own army (AC7)', () => {
    const route = getArmiesListRoute()
    expect(route).toContain('#ead69b')
  })

  it('[3.1-LST-013] armies/index.tsx contains gold highlight background #fff9ec for own army (AC7)', () => {
    const route = getArmiesListRoute()
    expect(route).toContain('#fff9ec')
  })

  it('[3.1-LST-014] gold highlight is conditional on matching playerId (own army detection — AC7)', () => {
    const route = getArmiesListRoute()
    // The gold color must be inside a conditional based on playerId comparison
    expect(route).toMatch(/(playerId|isOwn|isCurrent)[\s\S]{0,600}(#ead69b|#fff9ec)|(#ead69b|#fff9ec)[\s\S]{0,600}(playerId|isOwn|isCurrent)/)
  })
})

describe('[AC8][P0] Armies list route — guest user sees no gold highlight (Task 6.7)', () => {
  it('[3.1-LST-015] armies/index.tsx checks isGuest before applying gold highlight', () => {
    const route = getArmiesListRoute()
    // Guest must not get the gold highlight — isGuest flag must gate it
    expect(route).toMatch(/isGuest[\s\S]{0,600}(#ead69b|highlight|current|gold)|( #ead69b|highlight|current|gold)[\s\S]{0,600}isGuest/)
  })
})

describe('[AC7][P0] Armies list route — empty state (Task 6.8)', () => {
  it('[3.1-LST-016] armies/index.tsx has empty state "Aucune armee dans la campagne" (Task 6.8)', () => {
    const route = getArmiesListRoute()
    expect(route).toContain('Aucune armee dans la campagne')
  })
})

describe('[AC4][AC8][P0] Armies list route — data-app-hydrated pattern (Task 6.6)', () => {
  it('[3.1-LST-017] armies/index.tsx imports useHydrated (data-app-hydrated pattern — Task 6.6)', () => {
    const route = getArmiesListRoute()
    expect(route).toMatch(/import[\s\S]{0,200}useHydrated/)
  })

  it('[3.1-LST-018] armies/index.tsx sets data-app-hydrated attribute on hydration (Task 6.6)', () => {
    const route = getArmiesListRoute()
    expect(route).toContain('data-app-hydrated')
  })

  it('[3.1-LST-019] armies/index.tsx imports authMiddleware (authentication guard)', () => {
    const route = getArmiesListRoute()
    expect(route).toMatch(/import[\s\S]{0,300}authMiddleware[\s\S]{0,200}middleware/)
  })
})
