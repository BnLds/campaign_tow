// @vitest-environment jsdom
// tests/4-3-unit-destruction-step.test.tsx
// Story 4.3: Character Injuries & Unit Destruction
// Status: RED — written before implementation (TDD)
//
// Tests for the UnitDestructionStep React component.
// Source file does NOT exist yet: src/components/unit-destruction-step.tsx
// All tests will fail with import errors until the implementation is complete.
//
// Covers Task 10 (AC: 14, 15, 16, 17, 18, 19, 20, 21, 26, 28)

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UnitDestructionStep } from '../src/components/unit-destruction-step'
import type { DestructionResult } from '../src/components/unit-destruction-step'

// ---------------------------------------------------------------------------
// Task 10.1 — Renders all 6 destruction options (AC: 14, 28)
// ---------------------------------------------------------------------------

describe('[AC14,AC28][P0] UnitDestructionStep — renders destruction options (Task 10.1)', () => {
  it('[4.3-DES-001] renders all 6 destruction table rows with dice result prefixes', () => {
    const onConfirm = vi.fn()
    render(<UnitDestructionStep unitName="Hallebardiers" onConfirm={onConfirm} />)

    expect(screen.getByText(/2-3 — Déroute Sanglante/)).toBeDefined()
    expect(screen.getByText(/4-6 — Pertes Catastrophiques/)).toBeDefined()
    expect(screen.getByText(/7-8 — Moral Brisé/)).toBeDefined()
    expect(screen.getByText(/9-10 — Survivants Endurcis/)).toBeDefined()
    expect(screen.getByText(/11 — Rancune/)).toBeDefined()
    expect(screen.getByText(/12 — Fureur Vengeresse/)).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// Task 10.2 — Confirm button disabled when no selection (AC: 14)
// ---------------------------------------------------------------------------

describe('[AC14][P0] UnitDestructionStep — confirm button state (Task 10.2)', () => {
  it('[4.3-DES-002] confirm button is disabled when no selection is made', () => {
    const onConfirm = vi.fn()
    render(<UnitDestructionStep unitName="Hallebardiers" onConfirm={onConfirm} />)

    const confirmButton = screen.getByTestId('consequence-confirm')
    expect(confirmButton).toBeDisabled()
  })
})

// ---------------------------------------------------------------------------
// Task 10.3 — Confirm button enabled after selecting "Survivants Endurcis" (AC: 18)
// ---------------------------------------------------------------------------

describe('[AC18][P0] UnitDestructionStep — confirm enabled on selection (Task 10.3)', () => {
  it('[4.3-DES-003] confirm button is enabled after selecting "Survivants Endurcis"', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<UnitDestructionStep unitName="Hallebardiers" onConfirm={onConfirm} />)

    await user.click(screen.getByText(/9-10 — Survivants Endurcis/))

    const confirmButton = screen.getByTestId('consequence-confirm')
    expect(confirmButton).not.toBeDisabled()
  })
})

// ---------------------------------------------------------------------------
// Task 10.4 — Banner checkbox appears and defaults to unchecked (AC: 21)
// ---------------------------------------------------------------------------

describe('[AC21][P0] UnitDestructionStep — banner checkbox (Task 10.4)', () => {
  it('[4.3-DES-004] banner checkbox appears and defaults to unchecked', () => {
    const onConfirm = vi.fn()
    render(<UnitDestructionStep unitName="Hallebardiers" onConfirm={onConfirm} />)

    const bannerCheckbox = screen.getByTestId('banner-lost-checkbox')
    expect(bannerCheckbox).toBeDefined()
    expect((bannerCheckbox as HTMLInputElement).checked).toBe(false)
  })

  it('[4.3-DES-005] banner checkbox label reads "L\'unité possédait une bannière"', () => {
    const onConfirm = vi.fn()
    render(<UnitDestructionStep unitName="Hallebardiers" onConfirm={onConfirm} />)

    expect(screen.getByText(/L'unité possédait une bannière/)).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// Task 10.5 — onConfirm called with correct DestructionResult for each type (AC: 15-20)
// ---------------------------------------------------------------------------

describe('[AC15-AC20][P0] UnitDestructionStep — onConfirm results (Task 10.5)', () => {
  it('[4.3-DES-006] "Déroute Sanglante" → onConfirm({ type: "deroute_sanglante" })', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<UnitDestructionStep unitName="Hallebardiers" onConfirm={onConfirm} />)

    await user.click(screen.getByText(/2-3 — Déroute Sanglante/))
    await user.click(screen.getByTestId('consequence-confirm'))

    expect(onConfirm).toHaveBeenCalledWith({ type: 'deroute_sanglante', bannerLost: false })
  })

  it('[4.3-DES-007] "Pertes Catastrophiques" → onConfirm({ type: "pertes_catastrophiques" })', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<UnitDestructionStep unitName="Hallebardiers" onConfirm={onConfirm} />)

    await user.click(screen.getByText(/4-6 — Pertes Catastrophiques/))
    await user.click(screen.getByTestId('consequence-confirm'))

    expect(onConfirm).toHaveBeenCalledWith({ type: 'pertes_catastrophiques', bannerLost: false })
  })

  it('[4.3-DES-008] "Moral Brisé" → onConfirm({ type: "moral_brise" })', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<UnitDestructionStep unitName="Hallebardiers" onConfirm={onConfirm} />)

    await user.click(screen.getByText(/7-8 — Moral Brisé/))
    await user.click(screen.getByTestId('consequence-confirm'))

    expect(onConfirm).toHaveBeenCalledWith({ type: 'moral_brise', bannerLost: false })
  })

  it('[4.3-DES-009] "Survivants Endurcis" → onConfirm({ type: "survivants_endurcis" })', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<UnitDestructionStep unitName="Hallebardiers" onConfirm={onConfirm} />)

    await user.click(screen.getByText(/9-10 — Survivants Endurcis/))
    await user.click(screen.getByTestId('consequence-confirm'))

    expect(onConfirm).toHaveBeenCalledWith({ type: 'survivants_endurcis', bannerLost: false })
  })

  it('[4.3-DES-010] "Rancune" → onConfirm({ type: "rancune" })', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<UnitDestructionStep unitName="Hallebardiers" onConfirm={onConfirm} />)

    await user.click(screen.getByText(/11 — Rancune/))
    await user.click(screen.getByTestId('consequence-confirm'))

    expect(onConfirm).toHaveBeenCalledWith({ type: 'rancune', bannerLost: false })
  })

  it('[4.3-DES-011] "Fureur Vengeresse" → onConfirm({ type: "fureur_vengeresse" })', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<UnitDestructionStep unitName="Hallebardiers" onConfirm={onConfirm} />)

    await user.click(screen.getByText(/12 — Fureur Vengeresse/))
    await user.click(screen.getByTestId('consequence-confirm'))

    expect(onConfirm).toHaveBeenCalledWith({ type: 'fureur_vengeresse', bannerLost: false })
  })
})

// ---------------------------------------------------------------------------
// Task 10.6 — onConfirm includes bannerLost=true when checked (AC: 21)
// ---------------------------------------------------------------------------

describe('[AC21][P0] UnitDestructionStep — banner lost flag (Task 10.6)', () => {
  it('[4.3-DES-012] checking banner checkbox includes bannerLost=true in result', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<UnitDestructionStep unitName="Hallebardiers" onConfirm={onConfirm} />)

    await user.click(screen.getByText(/9-10 — Survivants Endurcis/))
    await user.click(screen.getByTestId('banner-lost-checkbox'))
    await user.click(screen.getByTestId('consequence-confirm'))

    expect(onConfirm).toHaveBeenCalledWith({ type: 'survivants_endurcis', bannerLost: true })
  })
})

// ---------------------------------------------------------------------------
// Task 10.7 — Unit name displayed in header (AC: 14)
// ---------------------------------------------------------------------------

describe('[AC14][P1] UnitDestructionStep — unit name display (Task 10.7)', () => {
  it('[4.3-DES-013] displays unit name in step header', () => {
    const onConfirm = vi.fn()
    render(<UnitDestructionStep unitName="Hallebardiers" onConfirm={onConfirm} />)

    expect(screen.getByText('Hallebardiers')).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// [AC26] Red theme styling
// ---------------------------------------------------------------------------

describe('[AC26][P1] UnitDestructionStep — red theme', () => {
  it('[4.3-DES-014] step container uses malus background styling', () => {
    const onConfirm = vi.fn()
    render(<UnitDestructionStep unitName="Hallebardiers" onConfirm={onConfirm} />)

    const container = screen.getByTestId('unit-destruction-step')
    expect(container.className).toMatch(/malus/)
  })
})

// ---------------------------------------------------------------------------
// [AC22] Back button callback
// ---------------------------------------------------------------------------

describe('[AC22][P1] UnitDestructionStep — back button', () => {
  it('[4.3-DES-015] calls onBack when back button is clicked', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onBack = vi.fn()
    render(<UnitDestructionStep unitName="Hallebardiers" onConfirm={onConfirm} onBack={onBack} />)

    await user.click(screen.getByTestId('consequence-back'))

    expect(onBack).toHaveBeenCalledOnce()
  })
})
