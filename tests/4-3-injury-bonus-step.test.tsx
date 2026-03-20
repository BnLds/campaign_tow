// @vitest-environment jsdom
// tests/4-3-injury-bonus-step.test.tsx
// Story 4.3: Character Injuries & Unit Destruction
// Status: RED — written before implementation (TDD)
//
// Tests for the InjuryBonusStep React component.
// Source file does NOT exist yet: src/components/injury-bonus-step.tsx
// All tests will fail with import errors until the implementation is complete.
//
// Covers Task 9 (AC: 3, 4, 5, 6, 7, 8, 26, 28)

import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InjuryBonusStep } from '../src/components/injury-bonus-step'
import type { InjuryResult } from '../src/components/injury-bonus-step'

// ---------------------------------------------------------------------------
// Task 9.1 — Renders all 6 injury options (AC: 3, 28)
// ---------------------------------------------------------------------------

describe('[AC3,AC28][P0] InjuryBonusStep — renders injury options (Task 9.1)', () => {
  it('[4.3-INJ-001] renders all 6 injury table rows with dice result prefixes', () => {
    const onConfirm = vi.fn()
    render(<InjuryBonusStep unitName="Capitaine Renard" onConfirm={onConfirm} />)

    expect(screen.getByText(/2 — Mort/)).toBeDefined()
    expect(screen.getByText(/3 — Blessure Permanente/)).toBeDefined()
    expect(screen.getByText(/4-7 — Blessure Grave/)).toBeDefined()
    expect(screen.getByText(/8-10 — Égratignures/)).toBeDefined()
    expect(screen.getByText(/11 — Haine/)).toBeDefined()
    expect(screen.getByText(/12 — Miraculé/)).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// Task 9.2 — Confirm button disabled when no selection (AC: 3)
// ---------------------------------------------------------------------------

describe('[AC3][P0] InjuryBonusStep — confirm button state (Task 9.2)', () => {
  it('[4.3-INJ-002] confirm button is disabled when no selection is made', () => {
    const onConfirm = vi.fn()
    render(<InjuryBonusStep unitName="Capitaine Renard" onConfirm={onConfirm} />)

    const confirmButton = screen.getByTestId('consequence-confirm')
    expect(confirmButton).toBeDisabled()
  })
})

// ---------------------------------------------------------------------------
// Task 9.3 — Confirm button enabled after selecting "Egratignures" (AC: 7)
// ---------------------------------------------------------------------------

describe('[AC7][P0] InjuryBonusStep — confirm enabled on simple selection (Task 9.3)', () => {
  it('[4.3-INJ-003] confirm button is enabled after selecting "Égratignures"', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<InjuryBonusStep unitName="Capitaine Renard" onConfirm={onConfirm} />)

    await user.click(screen.getByText(/8-10 — Égratignures/))

    const confirmButton = screen.getByTestId('consequence-confirm')
    expect(confirmButton).not.toBeDisabled()
  })
})

// ---------------------------------------------------------------------------
// Task 9.4 — Selecting "Blessure Permanente" shows sub-table (AC: 4)
// ---------------------------------------------------------------------------

describe('[AC4][P0] InjuryBonusStep — permanent injury sub-table (Task 9.4)', () => {
  it('[4.3-INJ-004] selecting "Blessure Permanente" reveals 1D6 sub-table with 6 stat options', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<InjuryBonusStep unitName="Capitaine Renard" onConfirm={onConfirm} />)

    await user.click(screen.getByText(/3 — Blessure Permanente/))

    expect(screen.getByText(/1 — -1 Endurance/)).toBeDefined()
    expect(screen.getByText(/2 — -1 Initiative/)).toBeDefined()
    expect(screen.getByText(/3 — -1 CT/)).toBeDefined()
    expect(screen.getByText(/4 — -1 CC/)).toBeDefined()
    expect(screen.getByText(/5 — -1 Force/)).toBeDefined()
    expect(screen.getByText(/6 — -1 Commandement/)).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// Task 9.5 — Confirm disabled when "Blessure Permanente" selected but no sub-selection (AC: 4)
// ---------------------------------------------------------------------------

describe('[AC4][P0] InjuryBonusStep — two-level selection enforcement (Task 9.5)', () => {
  it('[4.3-INJ-005] confirm button remains disabled when "Blessure Permanente" selected without sub-selection', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<InjuryBonusStep unitName="Capitaine Renard" onConfirm={onConfirm} />)

    await user.click(screen.getByText(/3 — Blessure Permanente/))

    const confirmButton = screen.getByTestId('consequence-confirm')
    expect(confirmButton).toBeDisabled()
  })
})

// ---------------------------------------------------------------------------
// Task 9.6 — Confirm enabled after "Blessure Permanente" + sub-selection (AC: 4)
// ---------------------------------------------------------------------------

describe('[AC4][P0] InjuryBonusStep — two-level selection complete (Task 9.6)', () => {
  it('[4.3-INJ-006] confirm button enabled after "Blessure Permanente" + sub-selection', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<InjuryBonusStep unitName="Capitaine Renard" onConfirm={onConfirm} />)

    await user.click(screen.getByText(/3 — Blessure Permanente/))
    await user.click(screen.getByText(/1 — -1 Endurance/))

    const confirmButton = screen.getByTestId('consequence-confirm')
    expect(confirmButton).not.toBeDisabled()
  })
})

// ---------------------------------------------------------------------------
// Task 9.7 — onConfirm called with correct InjuryResult for each type (AC: 4, 5, 6, 7, 8)
// ---------------------------------------------------------------------------

describe('[AC4,AC5,AC6,AC7,AC8][P0] InjuryBonusStep — onConfirm results (Task 9.7)', () => {
  it('[4.3-INJ-007] "Mort" → onConfirm({ type: "death" })', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<InjuryBonusStep unitName="Capitaine Renard" onConfirm={onConfirm} />)

    await user.click(screen.getByText(/2 — Mort/))
    await user.click(screen.getByTestId('consequence-confirm'))

    expect(onConfirm).toHaveBeenCalledWith({ type: 'death' })
  })

  it('[4.3-INJ-008] "Blessure Permanente" + "-1 Endurance" → onConfirm({ type: "permanent_injury", stat: "e", delta: -1 })', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<InjuryBonusStep unitName="Capitaine Renard" onConfirm={onConfirm} />)

    await user.click(screen.getByText(/3 — Blessure Permanente/))
    await user.click(screen.getByText(/1 — -1 Endurance/))
    await user.click(screen.getByTestId('consequence-confirm'))

    expect(onConfirm).toHaveBeenCalledWith({ type: 'permanent_injury', stat: 'e', delta: -1 })
  })

  it('[4.3-INJ-009] "Blessure Permanente" + "-1 Initiative" → stat: "i"', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<InjuryBonusStep unitName="Capitaine Renard" onConfirm={onConfirm} />)

    await user.click(screen.getByText(/3 — Blessure Permanente/))
    await user.click(screen.getByText(/2 — -1 Initiative/))
    await user.click(screen.getByTestId('consequence-confirm'))

    expect(onConfirm).toHaveBeenCalledWith({ type: 'permanent_injury', stat: 'i', delta: -1 })
  })

  it('[4.3-INJ-010] "Blessure Permanente" + "-1 CT" → stat: "ct"', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<InjuryBonusStep unitName="Capitaine Renard" onConfirm={onConfirm} />)

    await user.click(screen.getByText(/3 — Blessure Permanente/))
    await user.click(screen.getByText(/3 — -1 CT/))
    await user.click(screen.getByTestId('consequence-confirm'))

    expect(onConfirm).toHaveBeenCalledWith({ type: 'permanent_injury', stat: 'ct', delta: -1 })
  })

  it('[4.3-INJ-011] "Blessure Permanente" + "-1 CC" → stat: "cc"', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<InjuryBonusStep unitName="Capitaine Renard" onConfirm={onConfirm} />)

    await user.click(screen.getByText(/3 — Blessure Permanente/))
    await user.click(screen.getByText(/4 — -1 CC/))
    await user.click(screen.getByTestId('consequence-confirm'))

    expect(onConfirm).toHaveBeenCalledWith({ type: 'permanent_injury', stat: 'cc', delta: -1 })
  })

  it('[4.3-INJ-012] "Blessure Permanente" + "-1 Force" → stat: "f"', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<InjuryBonusStep unitName="Capitaine Renard" onConfirm={onConfirm} />)

    await user.click(screen.getByText(/3 — Blessure Permanente/))
    await user.click(screen.getByText(/5 — -1 Force/))
    await user.click(screen.getByTestId('consequence-confirm'))

    expect(onConfirm).toHaveBeenCalledWith({ type: 'permanent_injury', stat: 'f', delta: -1 })
  })

  it('[4.3-INJ-013] "Blessure Permanente" + "-1 Commandement" → stat: "cd"', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<InjuryBonusStep unitName="Capitaine Renard" onConfirm={onConfirm} />)

    await user.click(screen.getByText(/3 — Blessure Permanente/))
    await user.click(screen.getByText(/6 — -1 Commandement/))
    await user.click(screen.getByTestId('consequence-confirm'))

    expect(onConfirm).toHaveBeenCalledWith({ type: 'permanent_injury', stat: 'cd', delta: -1 })
  })

  it('[4.3-INJ-014] "Blessure Grave" → onConfirm({ type: "grave_injury", stat: "pv", delta: -1 })', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<InjuryBonusStep unitName="Capitaine Renard" onConfirm={onConfirm} />)

    await user.click(screen.getByText(/4-7 — Blessure Grave/))
    await user.click(screen.getByTestId('consequence-confirm'))

    expect(onConfirm).toHaveBeenCalledWith({ type: 'grave_injury', stat: 'pv', delta: -1 })
  })

  it('[4.3-INJ-015] "Égratignures" → onConfirm({ type: "no_effect" })', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<InjuryBonusStep unitName="Capitaine Renard" onConfirm={onConfirm} />)

    await user.click(screen.getByText(/8-10 — Égratignures/))
    await user.click(screen.getByTestId('consequence-confirm'))

    expect(onConfirm).toHaveBeenCalledWith({ type: 'no_effect' })
  })

  it('[4.3-INJ-016] "Haine" → onConfirm({ type: "haine" })', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<InjuryBonusStep unitName="Capitaine Renard" onConfirm={onConfirm} />)

    await user.click(screen.getByText(/11 — Haine/))
    await user.click(screen.getByTestId('consequence-confirm'))

    expect(onConfirm).toHaveBeenCalledWith({ type: 'haine' })
  })

  it('[4.3-INJ-017] "Miraculé" → onConfirm({ type: "miracule" })', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<InjuryBonusStep unitName="Capitaine Renard" onConfirm={onConfirm} />)

    await user.click(screen.getByText(/12 — Miraculé/))
    await user.click(screen.getByTestId('consequence-confirm'))

    expect(onConfirm).toHaveBeenCalledWith({ type: 'miracule' })
  })
})

// ---------------------------------------------------------------------------
// Task 9.8 — Unit name displayed in header (AC: 3)
// ---------------------------------------------------------------------------

describe('[AC3][P1] InjuryBonusStep — unit name display (Task 9.8)', () => {
  it('[4.3-INJ-018] displays unit name in step header', () => {
    const onConfirm = vi.fn()
    render(<InjuryBonusStep unitName="Capitaine Renard" onConfirm={onConfirm} />)

    expect(screen.getByText('Capitaine Renard')).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// [AC26][P1] Red theme styling (Task 1.7)
// ---------------------------------------------------------------------------

describe('[AC26][P1] InjuryBonusStep — red theme (Task 1.7)', () => {
  it('[4.3-INJ-019] step container uses malus background styling', () => {
    const onConfirm = vi.fn()
    render(<InjuryBonusStep unitName="Capitaine Renard" onConfirm={onConfirm} />)

    const container = screen.getByTestId('injury-bonus-step')
    // The container should have the malus-bg class or inline style
    // This verifies the red-tinted theme is applied (AC26)
    expect(container.className).toMatch(/malus/)
  })
})

// ---------------------------------------------------------------------------
// [AC3] Back button callback (Task 1)
// ---------------------------------------------------------------------------

describe('[AC9][P1] InjuryBonusStep — back button (Task 1)', () => {
  it('[4.3-INJ-020] calls onBack when back button is clicked', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onBack = vi.fn()
    render(<InjuryBonusStep unitName="Capitaine Renard" onConfirm={onConfirm} onBack={onBack} />)

    await user.click(screen.getByTestId('consequence-back'))

    expect(onBack).toHaveBeenCalledOnce()
  })
})
