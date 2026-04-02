// @vitest-environment jsdom
// src/components/__tests__/tier-up-step.test.tsx
// Story 4.2: Tier-Up Detection & Improvement Choice
// Status: RED — written before implementation (TDD)
//
// React component tests for the TierUpStep component.
// Source file does NOT exist yet: src/components/tier-up-step.tsx
// All tests will fail with import errors until the implementation is complete.
//
// Note: @vitest-environment jsdom overrides the global 'node' environment in vitest.config.ts
// because React component rendering requires a DOM.
//
// Covers Tasks 11.1–11.11 (AC: 2, 4)

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TierUpStep } from '../tier-up-step'
import type { Improvement } from '../../lib/constants'

// ---------------------------------------------------------------------------
// Helpers — minimal improvement fixtures
// ---------------------------------------------------------------------------

const MINOR_IMPROVEMENTS: Improvement[] = [
  { id: 'u-min-init', label: '+1 Initiative', category: 'minor' },
  { id: 'u-min-cc', label: '+1 CC', category: 'minor' },
  { id: 'u-min-mouv', label: '+1 Mouvement (unique)', category: 'minor' },
  { id: 'u-min-cd', label: '+1 Commandement', category: 'minor' },
  { id: 'u-min-skill', label: "1 compétence de la fiche d'unité", category: 'minor' },
]

const MAJOR_IMPROVEMENTS: Improvement[] = [
  { id: 'u-maj-ct', label: '+1 CT', category: 'major' },
  { id: 'u-maj-f', label: '+1 Force', category: 'major' },
  { id: 'u-maj-e', label: '+1 Endurance (max +1)', category: 'major' },
  { id: 'u-maj-a', label: '+1 Attaque (max +1)', category: 'major' },
  { id: 'u-maj-skill', label: 'Compétence au choix', category: 'major' },
]

const CHAR_MAJOR_IMPROVEMENTS: Improvement[] = [
  { id: 'c-maj-f', label: '+1 Force', category: 'major' },
  { id: 'c-maj-e', label: '+1 Endurance', category: 'major' },
  { id: 'c-maj-pv', label: '+1 PV (max 2x)', category: 'major' },
  { id: 'c-maj-a', label: '+1 Attaque', category: 'major' },
  { id: 'c-maj-mag', label: '+1 Niveau de magie (sorcier, max 4)', category: 'major' },
  { id: 'c-maj-2min', label: '2 améliorations mineures', category: 'major' },
]

const CHAR_MINOR_IMPROVEMENTS: Improvement[] = [
  { id: 'c-min-init', label: '+1 Initiative', category: 'minor' },
  { id: 'c-min-cc', label: '+1 CC', category: 'minor' },
  { id: 'c-min-ct', label: '+1 CT', category: 'minor' },
  { id: 'c-min-mouv', label: '+1 Mouvement (unique)', category: 'minor' },
  { id: 'c-min-cd', label: '+1 Commandement', category: 'minor' },
]

// ---------------------------------------------------------------------------
// Task 11.1 — Renders tier label and unit name
// ---------------------------------------------------------------------------

describe('[AC2][P0] TierUpStep — renders tier label and unit name (Task 11.1)', () => {
  it('[4.2-TUS-001] renders the tier label text', () => {
    render(
      <TierUpStep
        tierLabel="Aguerri"
        majorImprovements={[]}
        minorImprovements={MINOR_IMPROVEMENTS}
        majorCount={0}
        minorCount={1}
        unitName="Hallebardiers"
        onConfirm={vi.fn()}
      />
    )
    expect(screen.getByText(/Aguerri/)).not.toBeNull()
  })

  it('[4.2-TUS-002] renders the unit name', () => {
    render(
      <TierUpStep
        tierLabel="Aguerri"
        majorImprovements={[]}
        minorImprovements={MINOR_IMPROVEMENTS}
        majorCount={0}
        minorCount={1}
        unitName="Hallebardiers"
        onConfirm={vi.fn()}
      />
    )
    expect(screen.getByText(/Hallebardiers/)).not.toBeNull()
  })

  it('[4.2-TUS-003] renders data-testid="tier-up-step"', () => {
    render(
      <TierUpStep
        tierLabel="Aguerri"
        majorImprovements={[]}
        minorImprovements={MINOR_IMPROVEMENTS}
        majorCount={0}
        minorCount={1}
        unitName="Hallebardiers"
        onConfirm={vi.fn()}
      />
    )
    expect(screen.getByTestId('tier-up-step')).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Task 11.2 — Button disabled when no selection
// ---------------------------------------------------------------------------

describe('[AC4][P0] TierUpStep — button disabled when no selection (Task 11.2)', () => {
  it('[4.2-TUS-004] confirm button is disabled before any improvement is selected', () => {
    render(
      <TierUpStep
        tierLabel="Aguerri"
        majorImprovements={[]}
        minorImprovements={MINOR_IMPROVEMENTS}
        majorCount={0}
        minorCount={1}
        unitName="Hallebardiers"
        onConfirm={vi.fn()}
      />
    )
    const btn = screen.getByTestId('tier-up-confirm-button') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })

  it('[4.2-TUS-005] confirm button is disabled in mixed mode before both sections are filled', () => {
    // Légendaire: 2 major + 1 minor
    render(
      <TierUpStep
        tierLabel="Légendaire"
        majorImprovements={MAJOR_IMPROVEMENTS}
        minorImprovements={MINOR_IMPROVEMENTS}
        majorCount={2}
        minorCount={1}
        unitName="Hallebardiers"
        onConfirm={vi.fn()}
      />
    )
    const btn = screen.getByTestId('tier-up-confirm-button') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Task 11.3 — Button enabled after selecting required count (single section)
// ---------------------------------------------------------------------------

describe('[AC4][P0] TierUpStep — button enabled after required selection (Task 11.3)', () => {
  it('[4.2-TUS-006] confirm button enabled after selecting 1 minor improvement (Aguerri, minorCount=1)', () => {
    render(
      <TierUpStep
        tierLabel="Aguerri"
        majorImprovements={[]}
        minorImprovements={MINOR_IMPROVEMENTS}
        majorCount={0}
        minorCount={1}
        unitName="Hallebardiers"
        onConfirm={vi.fn()}
      />
    )
    // Select the first minor improvement (radio mode)
    const firstOption = screen.getByLabelText(/\+1 Initiative/)
    fireEvent.click(firstOption)

    const btn = screen.getByTestId('tier-up-confirm-button') as HTMLButtonElement
    expect(btn.disabled).toBe(false)
  })

  it('[4.2-TUS-007] confirm button enabled after selecting 1 major improvement (Expérimenté, majorCount=1)', () => {
    render(
      <TierUpStep
        tierLabel="Expérimenté"
        majorImprovements={MAJOR_IMPROVEMENTS}
        minorImprovements={[]}
        majorCount={1}
        minorCount={0}
        unitName="Hallebardiers"
        onConfirm={vi.fn()}
      />
    )
    const firstOption = screen.getByLabelText(/\+1 CT/)
    fireEvent.click(firstOption)

    const btn = screen.getByTestId('tier-up-confirm-button') as HTMLButtonElement
    expect(btn.disabled).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Task 11.4 — Calls onConfirm with selected descriptions
// ---------------------------------------------------------------------------

describe('[AC4][P0] TierUpStep — onConfirm called with descriptions (Task 11.4)', () => {
  it('[4.2-TUS-008] onConfirm called with { descriptions: [label] } after selecting 1 minor improvement', () => {
    const onConfirm = vi.fn()
    render(
      <TierUpStep
        tierLabel="Aguerri"
        majorImprovements={[]}
        minorImprovements={MINOR_IMPROVEMENTS}
        majorCount={0}
        minorCount={1}
        unitName="Hallebardiers"
        onConfirm={onConfirm}
      />
    )
    const firstOption = screen.getByLabelText(/\+1 Initiative/)
    fireEvent.click(firstOption)

    const btn = screen.getByTestId('tier-up-confirm-button')
    fireEvent.click(btn)

    expect(onConfirm).toHaveBeenCalledWith({ descriptions: ['+1 Initiative'] })
  })

  it('[4.2-TUS-009] onConfirm not called when button is disabled', () => {
    const onConfirm = vi.fn()
    render(
      <TierUpStep
        tierLabel="Aguerri"
        majorImprovements={[]}
        minorImprovements={MINOR_IMPROVEMENTS}
        majorCount={0}
        minorCount={1}
        unitName="Hallebardiers"
        onConfirm={onConfirm}
      />
    )
    const btn = screen.getByTestId('tier-up-confirm-button')
    fireEvent.click(btn) // button is disabled, should not trigger

    expect(onConfirm).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Task 11.5 — Radio mode (selectCount=1, e.g. Aguerri minorCount=1)
// ---------------------------------------------------------------------------

describe('[AC2][P0] TierUpStep — radio mode for single selection (Task 11.5)', () => {
  it('[4.2-TUS-010] single-section with minorCount=1 renders radio inputs (only one can be selected)', () => {
    render(
      <TierUpStep
        tierLabel="Aguerri"
        majorImprovements={[]}
        minorImprovements={MINOR_IMPROVEMENTS}
        majorCount={0}
        minorCount={1}
        unitName="Hallebardiers"
        onConfirm={vi.fn()}
      />
    )
    // Select first, then second — only second should be selected
    const first = screen.getByLabelText(/\+1 Initiative/)
    const second = screen.getByLabelText(/\+1 CC/)
    fireEvent.click(first)
    fireEvent.click(second)

    // After clicking second, first should no longer be selected (radio behavior)
    // Check: button is still enabled (one selection)
    const btn = screen.getByTestId('tier-up-confirm-button') as HTMLButtonElement
    expect(btn.disabled).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Task 11.6 — Checkbox mode (selectCount=2, e.g. Vétéran unit with 2 minor)
// ---------------------------------------------------------------------------

describe('[AC2][P0] TierUpStep — checkbox mode for multi-selection (Task 11.6)', () => {
  it('[4.2-TUS-011] single-section with minorCount=2 requires 2 selections before enabling button', () => {
    render(
      <TierUpStep
        tierLabel="Vétéran"
        majorImprovements={[]}
        minorImprovements={MINOR_IMPROVEMENTS}
        majorCount={0}
        minorCount={2}
        unitName="Hallebardiers"
        onConfirm={vi.fn()}
      />
    )
    const btn = screen.getByTestId('tier-up-confirm-button') as HTMLButtonElement
    // Select only 1 — button still disabled
    fireEvent.click(screen.getByLabelText(/\+1 Initiative/))
    expect(btn.disabled).toBe(true)

    // Select 2nd — button now enabled
    fireEvent.click(screen.getByLabelText(/\+1 CC/))
    expect(btn.disabled).toBe(false)
  })

  it('[4.2-TUS-012] onConfirm called with both selected descriptions (Vétéran, 2 minors)', () => {
    const onConfirm = vi.fn()
    render(
      <TierUpStep
        tierLabel="Vétéran"
        majorImprovements={[]}
        minorImprovements={MINOR_IMPROVEMENTS}
        majorCount={0}
        minorCount={2}
        unitName="Hallebardiers"
        onConfirm={onConfirm}
      />
    )
    fireEvent.click(screen.getByLabelText(/\+1 Initiative/))
    fireEvent.click(screen.getByLabelText(/\+1 CC/))
    fireEvent.click(screen.getByTestId('tier-up-confirm-button'))

    expect(onConfirm).toHaveBeenCalledWith({
      descriptions: expect.arrayContaining(['+1 Initiative', '+1 CC']),
    })
    expect(onConfirm.mock.calls[0][0].descriptions).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// Task 11.7 — Mixed mode (Légendaire: majorCount=2, minorCount=1, two sections)
// ---------------------------------------------------------------------------

describe('[AC2][P0] TierUpStep — mixed mode (two sections: Task 11.7)', () => {
  it('[4.2-TUS-013] mixed mode renders two labeled sections', () => {
    render(
      <TierUpStep
        tierLabel="Légendaire"
        majorImprovements={MAJOR_IMPROVEMENTS}
        minorImprovements={MINOR_IMPROVEMENTS}
        majorCount={2}
        minorCount={1}
        unitName="Hallebardiers"
        onConfirm={vi.fn()}
      />
    )
    // Both sections should have headings
    expect(screen.getByTestId('tier-up-major-section')).not.toBeNull()
    expect(screen.getByTestId('tier-up-minor-section')).not.toBeNull()
  })

  it('[4.2-TUS-014] mixed mode: button disabled when only major section filled but not minor', () => {
    render(
      <TierUpStep
        tierLabel="Légendaire"
        majorImprovements={MAJOR_IMPROVEMENTS}
        minorImprovements={MINOR_IMPROVEMENTS}
        majorCount={2}
        minorCount={1}
        unitName="Hallebardiers"
        onConfirm={vi.fn()}
      />
    )
    // Select 2 major improvements
    fireEvent.click(screen.getByLabelText(/\+1 CT/))
    fireEvent.click(screen.getByLabelText(/\+1 Force/))

    // Button still disabled (minor not selected)
    const btn = screen.getByTestId('tier-up-confirm-button') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })

  it('[4.2-TUS-015] mixed mode: button enabled after filling both major (2) and minor (1) sections', () => {
    render(
      <TierUpStep
        tierLabel="Légendaire"
        majorImprovements={MAJOR_IMPROVEMENTS}
        minorImprovements={MINOR_IMPROVEMENTS}
        majorCount={2}
        minorCount={1}
        unitName="Hallebardiers"
        onConfirm={vi.fn()}
      />
    )
    fireEvent.click(screen.getByLabelText(/\+1 CT/))
    fireEvent.click(screen.getByLabelText(/\+1 Force/))
    // Select 1 minor
    fireEvent.click(screen.getByLabelText(/\+1 Initiative/))

    const btn = screen.getByTestId('tier-up-confirm-button') as HTMLButtonElement
    expect(btn.disabled).toBe(false)
  })

  it('[4.2-TUS-016] onConfirm called with majors first then minors in descriptions', () => {
    const onConfirm = vi.fn()
    render(
      <TierUpStep
        tierLabel="Légendaire"
        majorImprovements={MAJOR_IMPROVEMENTS}
        minorImprovements={MINOR_IMPROVEMENTS}
        majorCount={2}
        minorCount={1}
        unitName="Hallebardiers"
        onConfirm={onConfirm}
      />
    )
    fireEvent.click(screen.getByLabelText(/\+1 CT/))
    fireEvent.click(screen.getByLabelText(/\+1 Force/))
    fireEvent.click(screen.getByLabelText(/\+1 Initiative/))
    fireEvent.click(screen.getByTestId('tier-up-confirm-button'))

    const { descriptions } = onConfirm.mock.calls[0][0]
    expect(descriptions).toHaveLength(3)
    // Majors come first
    expect(descriptions[0]).toMatch(/\+1 CT|\+1 Force/)
    expect(descriptions[1]).toMatch(/\+1 CT|\+1 Force/)
    // Minor last
    expect(descriptions[2]).toBe('+1 Initiative')
  })
})

// ---------------------------------------------------------------------------
// Task 11.8 — Endurance is a normal selection (no slotCost) in majorCount=2 tier
// ---------------------------------------------------------------------------

describe('[AC2][P0] TierUpStep — Endurance as normal selection in majorCount=2 tier (Task 11.8)', () => {
  it('[4.2-TUS-017] selecting Endurance in majorCount=2 tier counts as 1 slot, allowing another major', () => {
    const majorWithEndurance: Improvement[] = [
      { id: 'c-maj-f', label: '+1 Force', category: 'major' },
      { id: 'c-maj-e', label: '+1 Endurance', category: 'major' },
      { id: 'c-maj-pv', label: '+1 PV (max 2x)', category: 'major' },
    ]
    render(
      <TierUpStep
        tierLabel="Héroïque"
        majorImprovements={majorWithEndurance}
        minorImprovements={CHAR_MINOR_IMPROVEMENTS}
        majorCount={2}
        minorCount={2}
        unitName="Seigneur de Guerre"
        onConfirm={vi.fn()}
      />
    )
    // Select Endurance — counts as 1 slot, button still disabled (need 2 major + 2 minor)
    fireEvent.click(screen.getByLabelText(/\+1 Endurance/))

    const btn = screen.getByTestId('tier-up-confirm-button') as HTMLButtonElement
    expect(btn.disabled).toBe(true)

    // Select second major — now 2 major slots filled
    fireEvent.click(screen.getByLabelText(/\+1 Force/))
    // Still disabled (need 2 minors)
    expect(btn.disabled).toBe(true)

    // Select 2 minors
    fireEvent.click(screen.getByLabelText(/\+1 Initiative/))
    fireEvent.click(screen.getByLabelText(/\+1 CT/))

    expect(btn.disabled).toBe(false)
  })

  it('[4.2-TUS-018] after selecting Endurance, one more major slot remains in majorCount=2', () => {
    const majorWithEndurance: Improvement[] = [
      { id: 'c-maj-f', label: '+1 Force', category: 'major' },
      { id: 'c-maj-e', label: '+1 Endurance', category: 'major' },
      { id: 'c-maj-pv', label: '+1 PV (max 2x)', category: 'major' },
    ]
    render(
      <TierUpStep
        tierLabel="Héroïque"
        majorImprovements={majorWithEndurance}
        minorImprovements={CHAR_MINOR_IMPROVEMENTS}
        majorCount={2}
        minorCount={2}
        unitName="Seigneur de Guerre"
        onConfirm={vi.fn()}
      />
    )
    // Select Endurance
    fireEvent.click(screen.getByLabelText(/\+1 Endurance/))

    // Other major options should still be selectable (not disabled)
    const forceCb = screen.getByLabelText(/\+1 Force/) as HTMLInputElement
    const pvCb = screen.getByLabelText(/\+1 PV/) as HTMLInputElement
    expect(forceCb.disabled).toBe(false)
    expect(pvCb.disabled).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Task 11.9 — Character Endurance excluded from 20 XP tier data (not filtered by component)
// ---------------------------------------------------------------------------

describe('[AC2][P0] TierUpStep — character Endurance excluded from 20 XP tier (Task 11.9)', () => {
  it('[4.2-TUS-019] character Expérimenté (majorCount=1): Endurance not rendered (not in data)', () => {
    // At 20 XP, Endurance is excluded from the improvement list by the constants,
    // so the component receives improvements without Endurance
    const charMajorWithoutEndurance: Improvement[] = [
      { id: 'c-maj-f', label: '+1 Force', category: 'major' },
      { id: 'c-maj-pv', label: '+1 PV (max 2x)', category: 'major' },
      { id: 'c-maj-a', label: '+1 Attaque', category: 'major' },
      { id: 'c-maj-mag', label: '+1 Niveau de magie (sorcier, max 4)', category: 'major' },
      { id: 'c-maj-2min', label: '2 améliorations mineures', category: 'major' },
    ]
    render(
      <TierUpStep
        tierLabel="Expérimenté"
        majorImprovements={charMajorWithoutEndurance}
        minorImprovements={[]}
        majorCount={1}
        minorCount={0}
        unitName="Seigneur de Guerre"
        onConfirm={vi.fn()}
      />
    )
    // Endurance is not in the data, so it should not appear
    expect(screen.queryByLabelText(/\+1 Endurance/)).toBeNull()
  })

  it('[4.2-TUS-020] character Héroïque (majorCount=2): Endurance IS rendered', () => {
    render(
      <TierUpStep
        tierLabel="Héroïque"
        majorImprovements={CHAR_MAJOR_IMPROVEMENTS}
        minorImprovements={CHAR_MINOR_IMPROVEMENTS}
        majorCount={2}
        minorCount={2}
        unitName="Seigneur de Guerre"
        onConfirm={vi.fn()}
      />
    )
    // Endurance should be visible in higher tiers
    expect(screen.getByLabelText(/\+1 Endurance/)).not.toBeNull()
  })

  it('[4.2-TUS-021] unit Expérimenté (majorCount=1): unit Endurance IS rendered (no slotCost filter for units)', () => {
    // Unit Endurance has no slotCost override (or slotCost=1) — always shown
    render(
      <TierUpStep
        tierLabel="Expérimenté"
        majorImprovements={MAJOR_IMPROVEMENTS}
        minorImprovements={[]}
        majorCount={1}
        minorCount={0}
        unitName="Hallebardiers"
        onConfirm={vi.fn()}
      />
    )
    // Unit Endurance (u-maj-e, no slotCost=2) should be visible
    expect(screen.getByLabelText(/\+1 Endurance \(max \+1\)/)).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Task 11.10 — Mounted callout shown when isMounted=true
// ---------------------------------------------------------------------------

describe('[AC2][P0] TierUpStep — mounted callout (Tasks 11.10–11.11)', () => {
  it('[4.2-TUS-022] isMounted=true shows mounted callout text', () => {
    render(
      <TierUpStep
        tierLabel="Aguerri"
        majorImprovements={[]}
        minorImprovements={MINOR_IMPROVEMENTS}
        majorCount={0}
        minorCount={1}
        unitName="Chevaliers"
        onConfirm={vi.fn()}
        isMounted={true}
      />
    )
    expect(screen.getByTestId('tier-up-mounted-callout')).not.toBeNull()
  })

  it('[4.2-TUS-023] mounted callout contains rider-only text', () => {
    render(
      <TierUpStep
        tierLabel="Aguerri"
        majorImprovements={[]}
        minorImprovements={MINOR_IMPROVEMENTS}
        majorCount={0}
        minorCount={1}
        unitName="Chevaliers"
        onConfirm={vi.fn()}
        isMounted={true}
      />
    )
    const callout = screen.getByTestId('tier-up-mounted-callout')
    expect(callout.textContent).toMatch(/cavalier|servant/i)
  })

  // Task 11.11 — Mounted callout hidden when isMounted=false or undefined
  it('[4.2-TUS-024] isMounted=false: mounted callout NOT rendered', () => {
    render(
      <TierUpStep
        tierLabel="Aguerri"
        majorImprovements={[]}
        minorImprovements={MINOR_IMPROVEMENTS}
        majorCount={0}
        minorCount={1}
        unitName="Hallebardiers"
        onConfirm={vi.fn()}
        isMounted={false}
      />
    )
    expect(screen.queryByTestId('tier-up-mounted-callout')).toBeNull()
  })

  it('[4.2-TUS-025] isMounted=undefined: mounted callout NOT rendered', () => {
    render(
      <TierUpStep
        tierLabel="Aguerri"
        majorImprovements={[]}
        minorImprovements={MINOR_IMPROVEMENTS}
        majorCount={0}
        minorCount={1}
        unitName="Hallebardiers"
        onConfirm={vi.fn()}
      />
    )
    expect(screen.queryByTestId('tier-up-mounted-callout')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Source file contract — TierUpStep
// ---------------------------------------------------------------------------

describe('[AC2][P0] TierUpStep — source file contract', () => {
  it('[4.2-TUS-026] tier-up-step.tsx exists at src/components/tier-up-step.tsx', () => {
    const { existsSync } = require('node:fs')
    const { resolve: resolvePath } = require('node:path')
    expect(existsSync(resolvePath(__dirname, '..', 'tier-up-step.tsx'))).toBe(true)
  })

  it('[4.2-TUS-027] tier-up-step.tsx exports TierUpStep component', () => {
    const { readFileSync } = require('node:fs')
    const { resolve: resolvePath } = require('node:path')
    const code = readFileSync(resolvePath(__dirname, '..', 'tier-up-step.tsx'), 'utf-8')
    expect(code).toMatch(/export function TierUpStep|export const TierUpStep/)
  })

  it('[4.2-TUS-028] tier-up-step.tsx contains data-testid="tier-up-step"', () => {
    const { readFileSync } = require('node:fs')
    const { resolve: resolvePath } = require('node:path')
    const code = readFileSync(resolvePath(__dirname, '..', 'tier-up-step.tsx'), 'utf-8')
    expect(code).toContain('data-testid="tier-up-step"')
  })

  it('[4.2-TUS-029] tier-up-step.tsx contains data-testid="tier-up-confirm-button"', () => {
    const { readFileSync } = require('node:fs')
    const { resolve: resolvePath } = require('node:path')
    const code = readFileSync(resolvePath(__dirname, '..', 'tier-up-step.tsx'), 'utf-8')
    expect(code).toContain('data-testid="tier-up-confirm-button"')
  })

  it('[4.2-TUS-030] tier-up-step.tsx contains data-testid="tier-up-mounted-callout"', () => {
    const { readFileSync } = require('node:fs')
    const { resolve: resolvePath } = require('node:path')
    const code = readFileSync(resolvePath(__dirname, '..', 'tier-up-step.tsx'), 'utf-8')
    expect(code).toContain('data-testid="tier-up-mounted-callout"')
  })
})

// ---------------------------------------------------------------------------
// CC — Radio toggle fix: clicking different major in majorCount=1 replaces selection
// ---------------------------------------------------------------------------

describe('[CC-AC1] TierUpStep — radio toggle fix', () => {
  it('[CC-TUS-001] clicking a different major when majorCount=1 replaces selection', () => {
    const onConfirm = vi.fn()
    render(
      <TierUpStep
        tierLabel="Expérimenté"
        majorImprovements={MAJOR_IMPROVEMENTS}
        minorImprovements={[]}
        majorCount={1}
        minorCount={0}
        unitName="Hallebardiers"
        onConfirm={onConfirm}
      />,
    )

    // Select first option
    fireEvent.click(screen.getByLabelText('+1 CT'))
    const ctRadio = screen.getByLabelText('+1 CT') as HTMLInputElement
    expect(ctRadio.checked).toBe(true)

    // Click a different option — should replace
    fireEvent.click(screen.getByLabelText('+1 Force'))
    const forceRadio = screen.getByLabelText('+1 Force') as HTMLInputElement
    expect(forceRadio.checked).toBe(true)
    expect(ctRadio.checked).toBe(false)

    // Confirm button should be enabled (not disabled)
    const btn = screen.getByTestId('tier-up-confirm-button') as HTMLButtonElement
    expect(btn.disabled).toBe(false)
  })

  it('[CC-TUS-002] confirm sends the replaced selection, not the original', () => {
    const onConfirm = vi.fn()
    render(
      <TierUpStep
        tierLabel="Expérimenté"
        majorImprovements={MAJOR_IMPROVEMENTS}
        minorImprovements={[]}
        majorCount={1}
        minorCount={0}
        unitName="Hallebardiers"
        onConfirm={onConfirm}
      />,
    )

    // Select CT first, then switch to Force
    fireEvent.click(screen.getByLabelText('+1 CT'))
    fireEvent.click(screen.getByLabelText('+1 Force'))

    // Confirm
    fireEvent.click(screen.getByTestId('tier-up-confirm-button'))
    expect(onConfirm).toHaveBeenCalledWith({ descriptions: ['+1 Force'] })
  })
})

// ---------------------------------------------------------------------------
// CC — disabledImprovementIds: greyed-out items are not selectable
// ---------------------------------------------------------------------------

describe('[CC-AC2/AC3/AC7] TierUpStep — disabledImprovementIds', () => {
  it('[CC-TUS-003] disabled minor improvements are not selectable', () => {
    const onConfirm = vi.fn()
    render(
      <TierUpStep
        tierLabel="Aguerri"
        majorImprovements={[]}
        minorImprovements={MINOR_IMPROVEMENTS}
        majorCount={0}
        minorCount={1}
        unitName="Hallebardiers"
        onConfirm={onConfirm}
        disabledImprovementIds={['u-min-mouv']}
      />,
    )

    // Mouvement should be disabled
    const mouvInput = screen.getByLabelText('+1 Mouvement (unique)') as HTMLInputElement
    expect(mouvInput.disabled).toBe(true)

    // Clicking it should not select it
    fireEvent.click(mouvInput)
    expect(mouvInput.checked).toBe(false)

    // Other items should still be selectable
    fireEvent.click(screen.getByLabelText('+1 Initiative'))
    expect((screen.getByLabelText('+1 Initiative') as HTMLInputElement).checked).toBe(true)
  })

  it('[CC-TUS-004] disabled major improvements are not selectable', () => {
    const onConfirm = vi.fn()
    render(
      <TierUpStep
        tierLabel="Expérimenté"
        majorImprovements={MAJOR_IMPROVEMENTS}
        minorImprovements={[]}
        majorCount={1}
        minorCount={0}
        unitName="Hallebardiers"
        onConfirm={onConfirm}
        disabledImprovementIds={['u-maj-e', 'u-maj-a']}
      />,
    )

    // Endurance and Attaque should be disabled
    expect((screen.getByLabelText('+1 Endurance (max +1)') as HTMLInputElement).disabled).toBe(true)
    expect((screen.getByLabelText('+1 Attaque (max +1)') as HTMLInputElement).disabled).toBe(true)

    // CT and Force should be selectable
    fireEvent.click(screen.getByLabelText('+1 CT'))
    expect((screen.getByLabelText('+1 CT') as HTMLInputElement).checked).toBe(true)
  })

  it('[CC-TUS-005] disabled improvements in mixed mode are not selectable in either section', () => {
    const onConfirm = vi.fn()
    render(
      <TierUpStep
        tierLabel="Légendaire"
        majorImprovements={MAJOR_IMPROVEMENTS}
        minorImprovements={MINOR_IMPROVEMENTS}
        majorCount={2}
        minorCount={1}
        unitName="Hallebardiers"
        onConfirm={onConfirm}
        disabledImprovementIds={['u-maj-e', 'u-min-mouv']}
      />,
    )

    // Major Endurance disabled
    expect((screen.getByLabelText('+1 Endurance (max +1)') as HTMLInputElement).disabled).toBe(true)
    // Minor Mouvement disabled
    expect((screen.getByLabelText('+1 Mouvement (unique)') as HTMLInputElement).disabled).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// CAP — capBlockedImprovementIds: red text "valeur 10 atteinte"
// ---------------------------------------------------------------------------

describe('[CAP] TierUpStep — capBlockedImprovementIds UI', () => {
  it('[CAP-TUS-001] cap-blocked improvement shows red "valeur 10 atteinte" text and is disabled', () => {
    render(
      <TierUpStep
        tierLabel="Aguerri"
        majorImprovements={[]}
        minorImprovements={MINOR_IMPROVEMENTS}
        majorCount={0}
        minorCount={1}
        unitName="Hallebardiers"
        onConfirm={vi.fn()}
        disabledImprovementIds={['u-min-cd']}
        capBlockedImprovementIds={['u-min-cd']}
      />,
    )

    // Commandement should be disabled
    const cdInput = screen.getByLabelText('+1 Commandement') as HTMLInputElement
    expect(cdInput.disabled).toBe(true)

    // Should show "valeur 10 atteinte" text
    expect(screen.getByText(/valeur 10 atteinte/)).not.toBeNull()
  })

  it('[CAP-TUS-002] improvement in disabledIds but NOT in capBlockedIds → no red text', () => {
    render(
      <TierUpStep
        tierLabel="Aguerri"
        majorImprovements={[]}
        minorImprovements={MINOR_IMPROVEMENTS}
        majorCount={0}
        minorCount={1}
        unitName="Hallebardiers"
        onConfirm={vi.fn()}
        disabledImprovementIds={['u-min-mouv']}
        capBlockedImprovementIds={[]}
      />,
    )

    // Mouvement disabled but no cap text
    expect((screen.getByLabelText('+1 Mouvement (unique)') as HTMLInputElement).disabled).toBe(true)
    expect(screen.queryByText(/valeur 10 atteinte/)).toBeNull()
  })

  it('[CAP-TUS-003] cap-blocked major improvement shows red text', () => {
    render(
      <TierUpStep
        tierLabel="Expérimenté"
        majorImprovements={MAJOR_IMPROVEMENTS}
        minorImprovements={[]}
        majorCount={1}
        minorCount={0}
        unitName="Hallebardiers"
        onConfirm={vi.fn()}
        disabledImprovementIds={['u-maj-f']}
        capBlockedImprovementIds={['u-maj-f']}
      />,
    )

    expect((screen.getByLabelText('+1 Force') as HTMLInputElement).disabled).toBe(true)
    expect(screen.getByText(/valeur 10 atteinte/)).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Skill selection — minor skill (text input)
// ---------------------------------------------------------------------------

describe('[SKILL] TierUpStep — minor skill text input', () => {
  it("[SKILL-TUS-001] text input appears when skill minor is selected", () => {
    render(
      <TierUpStep
        tierLabel="Aguerri"
        majorImprovements={[]}
        minorImprovements={MINOR_IMPROVEMENTS}
        majorCount={0}
        minorCount={1}
        unitName="Hallebardiers"
        onConfirm={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByLabelText("1 compétence de la fiche d'unité"))
    expect(screen.getByTestId('skill-text-input')).not.toBeNull()
  })

  it('[SKILL-TUS-002] text input disappears when switching to another minor', () => {
    render(
      <TierUpStep
        tierLabel="Aguerri"
        majorImprovements={[]}
        minorImprovements={MINOR_IMPROVEMENTS}
        majorCount={0}
        minorCount={1}
        unitName="Hallebardiers"
        onConfirm={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByLabelText("1 compétence de la fiche d'unité"))
    expect(screen.getByTestId('skill-text-input')).not.toBeNull()

    // Switch to another option (radio mode)
    fireEvent.click(screen.getByLabelText('+1 Initiative'))
    expect(screen.queryByTestId('skill-text-input')).toBeNull()
  })

  it('[SKILL-TUS-003] confirm disabled when skill selected but text empty', () => {
    render(
      <TierUpStep
        tierLabel="Aguerri"
        majorImprovements={[]}
        minorImprovements={MINOR_IMPROVEMENTS}
        majorCount={0}
        minorCount={1}
        unitName="Hallebardiers"
        onConfirm={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByLabelText("1 compétence de la fiche d'unité"))
    const btn = screen.getByTestId('tier-up-confirm-button') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })

  it('[SKILL-TUS-004] confirm enabled when skill selected and text filled', () => {
    render(
      <TierUpStep
        tierLabel="Aguerri"
        majorImprovements={[]}
        minorImprovements={MINOR_IMPROVEMENTS}
        majorCount={0}
        minorCount={1}
        unitName="Hallebardiers"
        onConfirm={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByLabelText("1 compétence de la fiche d'unité"))
    fireEvent.change(screen.getByTestId('skill-text-input'), { target: { value: 'vétéran' } })
    const btn = screen.getByTestId('tier-up-confirm-button') as HTMLButtonElement
    expect(btn.disabled).toBe(false)
  })

  it('[SKILL-TUS-005] onConfirm receives raw text, not the label, for minor skill', () => {
    const onConfirm = vi.fn()
    render(
      <TierUpStep
        tierLabel="Aguerri"
        majorImprovements={[]}
        minorImprovements={MINOR_IMPROVEMENTS}
        majorCount={0}
        minorCount={1}
        unitName="Hallebardiers"
        onConfirm={onConfirm}
      />,
    )

    fireEvent.click(screen.getByLabelText("1 compétence de la fiche d'unité"))
    fireEvent.change(screen.getByTestId('skill-text-input'), { target: { value: 'vétéran' } })
    fireEvent.click(screen.getByTestId('tier-up-confirm-button'))

    expect(onConfirm).toHaveBeenCalledWith({ descriptions: ['vétéran'] })
  })
})

// ---------------------------------------------------------------------------
// Skill selection — major skill (radio group)
// ---------------------------------------------------------------------------

describe('[SKILL] TierUpStep — major skill radio group', () => {
  it('[SKILL-TUS-006] radio group with 4 options appears when major skill selected', () => {
    render(
      <TierUpStep
        tierLabel="Expérimenté"
        majorImprovements={MAJOR_IMPROVEMENTS}
        minorImprovements={[]}
        majorCount={1}
        minorCount={0}
        unitName="Hallebardiers"
        onConfirm={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByLabelText('Compétence au choix'))
    const group = screen.getByTestId('skill-choice-group')
    expect(group).not.toBeNull()
    expect(group.querySelectorAll('input[type="radio"]')).toHaveLength(4)
  })

  it('[SKILL-TUS-007] radio group disappears when switching to another major', () => {
    render(
      <TierUpStep
        tierLabel="Expérimenté"
        majorImprovements={MAJOR_IMPROVEMENTS}
        minorImprovements={[]}
        majorCount={1}
        minorCount={0}
        unitName="Hallebardiers"
        onConfirm={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByLabelText('Compétence au choix'))
    expect(screen.getByTestId('skill-choice-group')).not.toBeNull()

    fireEvent.click(screen.getByLabelText('+1 CT'))
    expect(screen.queryByTestId('skill-choice-group')).toBeNull()
  })

  it('[SKILL-TUS-008] confirm disabled when major skill selected but no sub-option chosen', () => {
    render(
      <TierUpStep
        tierLabel="Expérimenté"
        majorImprovements={MAJOR_IMPROVEMENTS}
        minorImprovements={[]}
        majorCount={1}
        minorCount={0}
        unitName="Hallebardiers"
        onConfirm={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByLabelText('Compétence au choix'))
    const btn = screen.getByTestId('tier-up-confirm-button') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })

  it('[SKILL-TUS-009] confirm enabled when major skill selected and sub-option chosen', () => {
    render(
      <TierUpStep
        tierLabel="Expérimenté"
        majorImprovements={MAJOR_IMPROVEMENTS}
        minorImprovements={[]}
        majorCount={1}
        minorCount={0}
        unitName="Hallebardiers"
        onConfirm={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByLabelText('Compétence au choix'))
    fireEvent.click(screen.getByLabelText('Bien entraîné'))
    const btn = screen.getByTestId('tier-up-confirm-button') as HTMLButtonElement
    expect(btn.disabled).toBe(false)
  })

  it('[SKILL-TUS-010] onConfirm receives sub-option name, not the long label, for major skill', () => {
    const onConfirm = vi.fn()
    render(
      <TierUpStep
        tierLabel="Expérimenté"
        majorImprovements={MAJOR_IMPROVEMENTS}
        minorImprovements={[]}
        majorCount={1}
        minorCount={0}
        unitName="Hallebardiers"
        onConfirm={onConfirm}
      />,
    )

    fireEvent.click(screen.getByLabelText('Compétence au choix'))
    fireEvent.click(screen.getByLabelText('Bien entraîné'))
    fireEvent.click(screen.getByTestId('tier-up-confirm-button'))

    expect(onConfirm).toHaveBeenCalledWith({ descriptions: ['Bien entraîné'] })
  })
})

// ---------------------------------------------------------------------------
// Skill selection — mixed mode (Légendaire)
// ---------------------------------------------------------------------------

describe('[SKILL] TierUpStep — mixed mode with minor skill', () => {
  it('[SKILL-TUS-011] mixed mode: minor skill + normal majors → correct descriptions', () => {
    const onConfirm = vi.fn()
    render(
      <TierUpStep
        tierLabel="Légendaire"
        majorImprovements={MAJOR_IMPROVEMENTS}
        minorImprovements={MINOR_IMPROVEMENTS}
        majorCount={2}
        minorCount={1}
        unitName="Hallebardiers"
        onConfirm={onConfirm}
      />,
    )

    // Select 2 normal majors
    fireEvent.click(screen.getByLabelText('+1 CT'))
    fireEvent.click(screen.getByLabelText('+1 Force'))

    // Select minor skill + fill text
    fireEvent.click(screen.getByLabelText("1 compétence de la fiche d'unité"))
    fireEvent.change(screen.getByTestId('skill-text-input'), { target: { value: 'tenace' } })

    fireEvent.click(screen.getByTestId('tier-up-confirm-button'))

    const { descriptions } = onConfirm.mock.calls[0][0]
    expect(descriptions).toHaveLength(3)
    // Majors first (labels), then minor skill (raw text)
    expect(descriptions[0]).toMatch(/\+1 CT|\+1 Force/)
    expect(descriptions[1]).toMatch(/\+1 CT|\+1 Force/)
    expect(descriptions[2]).toBe('tenace')
  })
})

// ---------------------------------------------------------------------------
// SUBTITLE — optional contextual subtitle prop
// ---------------------------------------------------------------------------

describe('[SUBTITLE] TierUpStep — subtitle prop', () => {
  it('[SUBTITLE-TUS-001] renders subtitle when provided', () => {
    render(
      <TierUpStep
        tierLabel="Honneur de bataille"
        majorImprovements={[]}
        minorImprovements={[{ id: 'h-na', label: 'Non applicable', category: 'honour' }]}
        majorCount={0}
        minorCount={1}
        unitName="Hallebardiers"
        subtitle="Palier 9 XP atteint"
        onConfirm={vi.fn()}
      />,
    )
    expect(screen.getByTestId('tier-up-subtitle')).not.toBeNull()
    expect(screen.getByText('Palier 9 XP atteint')).not.toBeNull()
  })

  it("[SUBTITLE-TUS-002] renders recovery subtitle for Récupération d'honneur", () => {
    render(
      <TierUpStep
        tierLabel="Récupération d'honneur"
        majorImprovements={[]}
        minorImprovements={[
          { id: 'h-ban', label: 'Bannière gratuite', category: 'honour' },
          { id: 'h-na', label: 'Non applicable', category: 'honour' },
        ]}
        majorCount={0}
        minorCount={1}
        unitName="Hallebardiers"
        subtitle="Honneur détruit — récupération possible"
        onConfirm={vi.fn()}
      />,
    )
    expect(screen.getByTestId('tier-up-subtitle')).not.toBeNull()
    expect(screen.getByText('Honneur détruit — récupération possible')).not.toBeNull()
  })

  it('[SUBTITLE-TUS-003] does not render subtitle element when not provided', () => {
    render(
      <TierUpStep
        tierLabel="Aguerri"
        majorImprovements={[]}
        minorImprovements={MINOR_IMPROVEMENTS}
        majorCount={0}
        minorCount={1}
        unitName="Hallebardiers"
        onConfirm={vi.fn()}
      />,
    )
    expect(screen.queryByTestId('tier-up-subtitle')).toBeNull()
  })
})
