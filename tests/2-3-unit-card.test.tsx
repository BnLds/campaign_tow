// @vitest-environment jsdom
// tests/2-3-unit-card.test.tsx
// Story 2.3: Unit Card Display with Campaign Deltas
// Status: RED — written before implementation (TDD)
//
// Tests for the UnitCard React component.
// Source file does NOT exist yet: src/components/UnitCard.tsx
// All tests will fail with import errors until the implementation is complete.
//
// Note: @vitest-environment jsdom overrides the global 'node' environment in vitest.config.ts
// because React component rendering requires a DOM.

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UnitCard } from '../src/components/UnitCard'
import type { ComposedUnitView } from '../src/lib/delta-composer'

// ---------------------------------------------------------------------------
// Helpers — minimal test fixtures
// ---------------------------------------------------------------------------

const STAT_KEYS = ['m', 'cc', 'ct', 'f', 'e', 'pv', 'i', 'a', 'cd'] as const

function makeStatEntry(value: string, delta: number | null = null, modified = false) {
  return { value, delta, modified }
}

function makeSubProfile(
  label: string,
  overrides: Partial<Record<(typeof STAT_KEYS)[number], { value: string; delta: number | null; modified: boolean }>> = {}
) {
  const defaultStats = Object.fromEntries(
    STAT_KEYS.map((k) => [k, makeStatEntry('3')])
  ) as Record<string, { value: string; delta: number | null; modified: boolean }>

  return {
    label,
    stats: { ...defaultStats, ...overrides },
  }
}

function makeComposedView(
  subProfiles: ReturnType<typeof makeSubProfile>[],
  extras: Partial<ComposedUnitView> = {}
): ComposedUnitView {
  return {
    subProfiles,
    deltas: [],
    gains: [],
    ...extras,
  }
}

function makeUnit(name = 'Archers', type = 'Unités de base', xp = 0) {
  return { id: 'unit-1', name, type, xp }
}

// ---------------------------------------------------------------------------
// Test 1 — Renders unit name
// ---------------------------------------------------------------------------

describe('[AC1] UnitCard — renders unit name', () => {
  it('[2.3-COMP-001] unit name "Archers" is displayed in the card', () => {
    const composedView = makeComposedView([makeSubProfile('Archers')])
    render(<UnitCard unit={makeUnit('Archers')} composedView={composedView} tier={0} />)
    // With showLabel=true, 'Archers' appears in both the unit header and the sub-profile label
    expect(screen.getAllByText('Archers').length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// Test 2 — Renders 9 stat cells
// ---------------------------------------------------------------------------

describe('[AC1] UnitCard — 9-stat bar', () => {
  it('[2.3-COMP-002] stat bar has header cells for all 9 stat labels (m, cc, ct, f, e, pv, i, a, cd)', () => {
    const composedView = makeComposedView([makeSubProfile('Infanterie')])
    const { container } = render(
      <UnitCard unit={makeUnit()} composedView={composedView} tier={0} />
    )

    // Each stat label should appear as a header cell
    for (const stat of STAT_KEYS) {
      expect(container.textContent?.toLowerCase()).toContain(stat)
    }
  })
})

// ---------------------------------------------------------------------------
// Test 3 — Modified stat has green (.mod) class
// ---------------------------------------------------------------------------

describe('[AC2] UnitCard — modified stat styling (bonus)', () => {
  it('[2.3-COMP-003] stat with modified=true and positive delta has a "mod" CSS class (or bonus indicator)', () => {
    const subProfile = makeSubProfile('Élite', {
      m: makeStatEntry('5', 1, true),
    })
    const composedView = makeComposedView([subProfile])
    const { container } = render(
      <UnitCard unit={makeUnit()} composedView={composedView} tier={0} />
    )

    // The cell for "m" with a positive delta should have class "mod" (or similar bonus class)
    const modCells = container.querySelectorAll('.mod, [data-modified="bonus"], [data-stat-modified="true"][data-delta-positive="true"]')
    expect(modCells.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// Test 4 — Penalty stat has red (.pen) class
// ---------------------------------------------------------------------------

describe('[AC2] UnitCard — modified stat styling (penalty)', () => {
  it('[2.3-COMP-004] stat with modified=true and negative delta has a "pen" CSS class (or malus indicator)', () => {
    const subProfile = makeSubProfile('Blessés', {
      cc: makeStatEntry('2', -1, true),
    })
    const composedView = makeComposedView([subProfile])
    const { container } = render(
      <UnitCard unit={makeUnit()} composedView={composedView} tier={0} />
    )

    const penCells = container.querySelectorAll('.pen, [data-modified="malus"], [data-stat-modified="true"][data-delta-positive="false"]')
    expect(penCells.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// Test 5 — Unmodified stat has no modifier class
// ---------------------------------------------------------------------------

describe('[AC1] UnitCard — unmodified stat no extra class', () => {
  it('[2.3-COMP-005] stat with modified=false has neither .mod nor .pen class', () => {
    const composedView = makeComposedView([makeSubProfile('Basique')])
    const { container } = render(
      <UnitCard unit={makeUnit()} composedView={composedView} tier={0} />
    )

    expect(container.querySelectorAll('.mod').length).toBe(0)
    expect(container.querySelectorAll('.pen').length).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Test 6 — Tier pill — Vétéran (tier 3)
// ---------------------------------------------------------------------------

describe('[AC1] UnitCard — tier pill Vétéran', () => {
  it('[2.3-COMP-006] tier=3 renders "✦ Vétéran" pill', () => {
    const composedView = makeComposedView([makeSubProfile('Héros')])
    render(<UnitCard unit={makeUnit('Héros')} composedView={composedView} tier={3} />)

    // The tier pill text should be present (possibly split across elements)
    expect(screen.getByText(/Vétéran/)).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// Test 7 — Tier pill — Expérimenté (tier 2)
// ---------------------------------------------------------------------------

describe('[AC1] UnitCard — tier pill Expérimenté', () => {
  it('[2.3-COMP-007] tier=2 renders "◆ Expérimenté" pill', () => {
    const composedView = makeComposedView([makeSubProfile('Vétérans')])
    render(<UnitCard unit={makeUnit('Vétérans')} composedView={composedView} tier={2} />)

    expect(screen.getByText(/Expérimenté/)).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// Test 8 — Tier pill — Aguerri (tier 1)
// ---------------------------------------------------------------------------

describe('[AC1] UnitCard — tier pill Aguerri', () => {
  it('[2.3-COMP-008] tier=1 renders "◈ Aguerri" pill', () => {
    const composedView = makeComposedView([makeSubProfile('Soldats')])
    render(<UnitCard unit={makeUnit('Soldats')} composedView={composedView} tier={1} />)

    expect(screen.getByText(/Aguerri/)).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// Test 9 — No tier pill at tier 0
// ---------------------------------------------------------------------------

describe('[AC1] UnitCard — no tier pill at tier 0', () => {
  it('[2.3-COMP-009] tier=0 renders no tier pill (no data-testid="tier-pill" element)', () => {
    const composedView = makeComposedView([makeSubProfile('Recrues')])
    const { container } = render(<UnitCard unit={makeUnit('Recrues')} composedView={composedView} tier={0} />)

    expect(container.querySelector('[data-testid="tier-pill"]')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Test 10 — Multiple sub-profiles
// ---------------------------------------------------------------------------

describe('[AC3] UnitCard — multiple sub-profiles', () => {
  it('[2.3-COMP-010] two sub-profiles render two distinct labeled sections', () => {
    const sp1 = makeSubProfile('Night Goblin Warboss')
    const sp2 = makeSubProfile('Giant Cave Squig')
    const composedView = makeComposedView([sp1, sp2])
    render(<UnitCard unit={makeUnit('Boss Gobelin')} composedView={composedView} tier={0} />)

    expect(screen.getByText(/Night Goblin Warboss/i)).toBeTruthy()
    expect(screen.getByText(/Giant Cave Squig/i)).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// Test 11 — Sub-profile label uppercase (always shown, even with 1 sub-profile)
// ---------------------------------------------------------------------------

describe('[AC3] UnitCard — sub-profile label uppercase', () => {
  it('[2.3-COMP-011] sub-profile label has text-transform:uppercase inline style (always shown, even with 1 sub-profile)', () => {
    // Fix M5: showLabel is always true — test with a single sub-profile to verify
    const sp1 = makeSubProfile('infanterie')
    const composedView = makeComposedView([sp1])
    const { container } = render(
      <UnitCard unit={makeUnit()} composedView={composedView} tier={0} />
    )

    // showLabel=true even with 1 sub-profile; label div has inline textTransform: 'uppercase'
    const labelElements = container.querySelectorAll('.sub-profile-label')
    expect(labelElements.length).toBeGreaterThan(0)
    const firstLabel = labelElements[0] as HTMLElement
    expect(firstLabel.style.textTransform).toBe('uppercase')
  })
})

// ---------------------------------------------------------------------------
// Test 12 — delta=0 chip renders as neutral, not malus
// ---------------------------------------------------------------------------

describe('[AC2] UnitCard — delta=0 chip is neutral', () => {
  it('[2.3-COMP-012] renders zero delta chip as neutral (not red malus style)', () => {
    const subProfile = makeSubProfile('Guerriers')
    const composedView = makeComposedView([subProfile], {
      deltas: [{ stat: 'cc', delta: 0, source: 'Test', temporary: false }],
    })
    const { container } = render(
      <UnitCard unit={makeUnit()} composedView={composedView} tier={0} />
    )

    // The chip should be rendered with neutral data attribute
    const neutralChip = container.querySelector('[data-delta-neutral="true"]')
    expect(neutralChip).toBeTruthy()

    // The chip should NOT have malus background color
    const chipEl = neutralChip as HTMLElement
    expect(chipEl.style.background).not.toContain('malus')
    // Neutral chip has gray background — browser normalizes hex to rgb
    // #f3f4f6 = rgb(243, 244, 246)
    expect(chipEl.style.background).toMatch(/rgb\(243,\s*244,\s*246\)|#f3f4f6/)
  })
})
