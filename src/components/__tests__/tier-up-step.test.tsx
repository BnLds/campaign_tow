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
  { id: 'u-min-cd', label: '+1 Commandement (max 10)', category: 'minor' },
  { id: 'u-min-skill', label: 'Compétence (voir fiche)', category: 'minor' },
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
  { id: 'c-maj-e', label: '+1 Endurance (2 emplacements)', category: 'major', slotCost: 2 },
  { id: 'c-maj-pv', label: '+1 PV (max 2x)', category: 'major' },
  { id: 'c-maj-a', label: '+1 Attaque', category: 'major' },
  { id: 'c-maj-mag', label: '+1 Niveau de magie (sorcier, max 4)', category: 'major' },
  { id: 'c-maj-2min', label: '2 améliorations mineures', category: 'major' },
]

const CHAR_MINOR_IMPROVEMENTS: Improvement[] = [
  { id: 'c-min-init', label: '+1 Initiative', category: 'minor' },
  { id: 'c-min-ccct', label: '+1 CC ou +1 CT', category: 'minor' },
  { id: 'c-min-mouv', label: '+1 Mouvement (unique)', category: 'minor' },
  { id: 'c-min-cd', label: '+1 Commandement (max 10)', category: 'minor' },
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
// Task 11.8 — Endurance slotCost=2 consumes both major slots
// ---------------------------------------------------------------------------

describe('[AC2][P0] TierUpStep — Endurance slotCost=2 in majorCount=2 tier (Task 11.8)', () => {
  it('[4.2-TUS-017] selecting Endurance (slotCost=2) in majorCount=2 tier counts as 2 slots', () => {
    const majorWithEndurance: Improvement[] = [
      { id: 'c-maj-f', label: '+1 Force', category: 'major' },
      { id: 'c-maj-e', label: '+1 Endurance (2 emplacements)', category: 'major', slotCost: 2 },
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
    // Select Endurance — should consume both major slots
    fireEvent.click(screen.getByLabelText(/\+1 Endurance \(2 emplacements\)/))

    // Now selecting minors
    fireEvent.click(screen.getByLabelText(/\+1 Initiative/))
    fireEvent.click(screen.getByLabelText(/\+1 CC ou \+1 CT/))

    const btn = screen.getByTestId('tier-up-confirm-button') as HTMLButtonElement
    expect(btn.disabled).toBe(false)
  })

  it('[4.2-TUS-018] after selecting Endurance (slotCost=2), other major options become unselectable', () => {
    const majorWithEndurance: Improvement[] = [
      { id: 'c-maj-f', label: '+1 Force', category: 'major' },
      { id: 'c-maj-e', label: '+1 Endurance (2 emplacements)', category: 'major', slotCost: 2 },
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
    fireEvent.click(screen.getByLabelText(/\+1 Endurance \(2 emplacements\)/))

    // Other major options should be disabled
    const forceCb = screen.getByLabelText(/\+1 Force/) as HTMLInputElement
    const pvCb = screen.getByLabelText(/\+1 PV/) as HTMLInputElement
    expect(forceCb.disabled).toBe(true)
    expect(pvCb.disabled).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Task 11.9 — Character Endurance (slotCost=2) filtered when majorCount < 2
// ---------------------------------------------------------------------------

describe('[AC2][P0] TierUpStep — character Endurance filtered when majorCount < 2 (Task 11.9)', () => {
  it('[4.2-TUS-019] character Expérimenté (majorCount=1): Endurance slotCost=2 NOT rendered', () => {
    render(
      <TierUpStep
        tierLabel="Expérimenté"
        majorImprovements={CHAR_MAJOR_IMPROVEMENTS}
        minorImprovements={[]}
        majorCount={1}
        minorCount={0}
        unitName="Seigneur de Guerre"
        onConfirm={vi.fn()}
      />
    )
    // Endurance with slotCost=2 should be filtered out when majorCount < 2
    expect(screen.queryByLabelText(/\+1 Endurance \(2 emplacements\)/)).toBeNull()
  })

  it('[4.2-TUS-020] character Héroïque (majorCount=2): Endurance slotCost=2 IS rendered', () => {
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
    // Endurance should be visible when majorCount >= 2
    expect(screen.getByLabelText(/\+1 Endurance \(2 emplacements\)/)).not.toBeNull()
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
