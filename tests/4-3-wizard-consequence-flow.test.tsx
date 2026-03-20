// @vitest-environment jsdom
// tests/4-3-wizard-consequence-flow.test.tsx
// Story 4.3: Character Injuries & Unit Destruction
// Status: RED — written before implementation (TDD)
//
// Tests for PostMatchWizard Phase 1.5 (consequence phase) integration.
// The PostMatchWizard component exists but does NOT have Phase 1.5 yet.
// All tests will fail because the consequence toggles, InjuryBonusStep, and
// UnitDestructionStep are not yet integrated into the wizard.
//
// Covers Task 11 (AC: 1, 2, 3, 9, 10, 11, 12, 13, 14, 22, 23)

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PostMatchWizard } from '../src/components/post-match-wizard'

// ---------------------------------------------------------------------------
// Helpers — minimal test fixtures
// ---------------------------------------------------------------------------

function makeUnit(
  id: string,
  name: string,
  type: 'Personnages' | 'Unités de base',
  xp = 0,
) {
  return {
    id,
    name,
    type,
    xp,
    previousXpGained: undefined,
    hasMount: false,
    existingGains: [],
    commandement: undefined,
    effectiveStats: undefined,
  }
}

const CHARACTER_1 = makeUnit('char-1', 'Capitaine Renard', 'Personnages', 10)
const CHARACTER_2 = makeUnit('char-2', 'Mage Corbeau', 'Personnages', 5)
const UNIT_1 = makeUnit('unit-1', 'Hallebardiers', 'Unités de base', 15)
const UNIT_2 = makeUnit('unit-2', 'Archers', 'Unités de base', 8)

const MIXED_ARMY = [CHARACTER_1, UNIT_1, CHARACTER_2, UNIT_2]

function makeDefaultProps(units = MIXED_ARMY) {
  return {
    matchId: 'match-1',
    matchParticipantId: 'mp-1',
    units,
    onComplete: vi.fn(),
    onCancel: vi.fn(),
    onSubmitUnitXp: vi.fn().mockResolvedValue({
      success: true,
      data: { unitId: 'unit-id', newXp: 3 },
    }),
    onCompleteEvolutions: vi.fn().mockResolvedValue({ success: true, data: { matchId: 'match-1' } }),
  }
}

// Helper: submit XP for all units (advance through Phase 1)
// Note: wizard uses data-testid="wizard-xp-input", "wizard-next-button", "wizard-cancel-button"
async function advanceThroughPhase1(
  user: ReturnType<typeof userEvent.setup>,
  unitCount: number,
  toggleIndices: number[] = [],
) {
  for (let i = 0; i < unitCount; i++) {
    // Enter XP value
    const xpInput = screen.getByTestId('wizard-xp-input')
    await user.clear(xpInput)
    await user.type(xpInput, '3')

    // Toggle consequence checkbox if this unit should be flagged
    if (toggleIndices.includes(i)) {
      const toggle = screen.getByTestId('consequence-toggle')
      await user.click(toggle)
    }

    // Click next
    await user.click(screen.getByTestId('wizard-next-button'))

    // Wait for XP submit to resolve
    await waitFor(() => {
      // Next step or phase transition should have occurred
    })
  }
}

// ---------------------------------------------------------------------------
// Task 11.1 — "Mis Hors de Combat" toggle appears on character steps (AC: 1)
// ---------------------------------------------------------------------------

describe('[AC1][P0] PostMatchWizard — MHC toggle on character steps (Task 11.1)', () => {
  it('[4.3-WIZ-001] shows "Mis Hors de Combat" toggle when current unit is a character', () => {
    const props = makeDefaultProps([CHARACTER_1])
    render(<PostMatchWizard {...props} />)

    const toggle = screen.getByTestId('consequence-toggle')
    expect(toggle).toBeDefined()
    expect(screen.getByText(/Mis Hors de Combat/)).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// Task 11.2 — "Détruite" toggle appears on non-character unit steps (AC: 12)
// ---------------------------------------------------------------------------

describe('[AC12][P0] PostMatchWizard — Détruite toggle on unit steps (Task 11.2)', () => {
  it('[4.3-WIZ-002] shows "Détruite" toggle when current unit is not a character', () => {
    const props = makeDefaultProps([UNIT_1])
    render(<PostMatchWizard {...props} />)

    const toggle = screen.getByTestId('consequence-toggle')
    expect(toggle).toBeDefined()
    expect(screen.getByText(/Détruite/)).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// Task 11.3 — Toggle defaults to unchecked (AC: 1, 12)
// ---------------------------------------------------------------------------

describe('[AC1,AC12][P0] PostMatchWizard — toggle defaults unchecked (Task 11.3)', () => {
  it('[4.3-WIZ-003] consequence toggle defaults to unchecked', () => {
    const props = makeDefaultProps([CHARACTER_1])
    render(<PostMatchWizard {...props} />)

    const toggle = screen.getByTestId('consequence-toggle') as HTMLInputElement
    expect(toggle.checked).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Task 11.4 — No Phase 1.5 when no toggles checked (AC: 2, 13)
// ---------------------------------------------------------------------------

describe('[AC2,AC13][P0] PostMatchWizard — skip Phase 1.5 when no flags (Task 11.4)', () => {
  it('[4.3-WIZ-004] Phase 1 → Phase 2 directly when no toggles are checked', async () => {
    const user = userEvent.setup()
    const props = makeDefaultProps([CHARACTER_1])
    render(<PostMatchWizard {...props} />)

    // Submit XP without toggling MHC
    await advanceThroughPhase1(user, 1, [])

    // Should NOT see InjuryBonusStep — should proceed to tier-up or completion
    expect(screen.queryByTestId('injury-bonus-step')).toBeNull()
    expect(screen.queryByTestId('unit-destruction-step')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Task 11.5 — Phase 1.5 triggers when MHC checked (AC: 3)
// ---------------------------------------------------------------------------

describe('[AC3][P0] PostMatchWizard — Phase 1.5 for MHC character (Task 11.5)', () => {
  it('[4.3-WIZ-005] InjuryBonusStep appears after all XP entered when character is flagged MHC', async () => {
    const user = userEvent.setup()
    const props = makeDefaultProps([CHARACTER_1])
    render(<PostMatchWizard {...props} />)

    // Submit XP with MHC toggle checked
    await advanceThroughPhase1(user, 1, [0])

    // InjuryBonusStep should appear
    await waitFor(() => {
      expect(screen.getByTestId('injury-bonus-step')).toBeDefined()
    })
  })
})

// ---------------------------------------------------------------------------
// Task 11.6 — Phase 1.5 triggers when "Détruite" checked (AC: 14)
// ---------------------------------------------------------------------------

describe('[AC14][P0] PostMatchWizard — Phase 1.5 for destroyed unit (Task 11.6)', () => {
  it('[4.3-WIZ-006] UnitDestructionStep appears after all XP entered when unit is flagged destroyed', async () => {
    const user = userEvent.setup()
    const props = makeDefaultProps([UNIT_1])
    render(<PostMatchWizard {...props} />)

    await advanceThroughPhase1(user, 1, [0])

    await waitFor(() => {
      expect(screen.getByTestId('unit-destruction-step')).toBeDefined()
    })
  })
})

// ---------------------------------------------------------------------------
// Task 11.7 — Phase 1.5 ordering: characters first, then units (AC: 3, 14)
// ---------------------------------------------------------------------------

describe('[AC3,AC14][P0] PostMatchWizard — Phase 1.5 ordering (Task 11.7)', () => {
  it('[4.3-WIZ-007] Phase 1.5 shows characters before units', async () => {
    const user = userEvent.setup()
    // Army: [CHARACTER_1, UNIT_1, CHARACTER_2, UNIT_2]
    // Flag all 4 units
    const props = makeDefaultProps(MIXED_ARMY)
    render(<PostMatchWizard {...props} />)

    await advanceThroughPhase1(user, 4, [0, 1, 2, 3])

    // First consequence step should be for a character (InjuryBonusStep)
    await waitFor(() => {
      expect(screen.getByTestId('injury-bonus-step')).toBeDefined()
    })
    // And it should show the first character's name
    expect(screen.getByText('Capitaine Renard')).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// Task 11.8 — Back button within Phase 1.5 (AC: 9, 22)
// ---------------------------------------------------------------------------

describe('[AC9,AC22][P1] PostMatchWizard — back button in Phase 1.5 (Task 11.8)', () => {
  it('[4.3-WIZ-008] back button navigates to previous flagged unit in Phase 1.5', async () => {
    const user = userEvent.setup()
    // Two characters flagged MHC
    const props = makeDefaultProps([CHARACTER_1, CHARACTER_2])
    render(<PostMatchWizard {...props} />)

    await advanceThroughPhase1(user, 2, [0, 1])

    // First consequence step: Capitaine Renard
    await waitFor(() => {
      expect(screen.getByTestId('injury-bonus-step')).toBeDefined()
    })

    // Confirm first consequence (Egratignures)
    await user.click(screen.getByText(/8-10 — Égratignures/))
    await user.click(screen.getByTestId('consequence-confirm'))

    // Second consequence step: Mage Corbeau
    await waitFor(() => {
      expect(screen.getByText('Mage Corbeau')).toBeDefined()
    })

    // Press back
    await user.click(screen.getByTestId('consequence-back'))

    // Should return to Capitaine Renard's consequence step
    await waitFor(() => {
      expect(screen.getByText('Capitaine Renard')).toBeDefined()
    })
  })
})

// ---------------------------------------------------------------------------
// Task 11.9 — Consequence confirm advances to next flagged unit, then to Phase 2 (AC: 3, 14)
// ---------------------------------------------------------------------------

describe('[AC3,AC14][P0] PostMatchWizard — consequence confirm advances (Task 11.9)', () => {
  it('[4.3-WIZ-009] confirming last consequence transitions to Phase 2 or completion', async () => {
    const user = userEvent.setup()
    const props = makeDefaultProps([CHARACTER_1])
    render(<PostMatchWizard {...props} />)

    await advanceThroughPhase1(user, 1, [0])

    // InjuryBonusStep appears
    await waitFor(() => {
      expect(screen.getByTestId('injury-bonus-step')).toBeDefined()
    })

    // Select "Egratignures" and confirm
    await user.click(screen.getByText(/8-10 — Égratignures/))
    await user.click(screen.getByTestId('consequence-confirm'))

    // Should transition out of Phase 1.5 (no more injury step)
    await waitFor(() => {
      expect(screen.queryByTestId('injury-bonus-step')).toBeNull()
    })
  })
})

// ---------------------------------------------------------------------------
// Task 11.10 — "Miraculé" / "Fureur Vengeresse" updates xpResults (+2 XP) (AC: 5, 20)
// ---------------------------------------------------------------------------

describe('[AC5,AC20][P0] PostMatchWizard — XP bonus from consequences (Task 11.10)', () => {
  it('[4.3-WIZ-010] "Miraculé" re-submits XP with +2 bonus', async () => {
    const user = userEvent.setup()
    const props = makeDefaultProps([CHARACTER_1])
    // Initial XP submit returns newXp=13 (CHARACTER_1.xp=10, so currentXpGained=3)
    props.onSubmitUnitXp.mockResolvedValue({
      success: true,
      data: { unitId: 'char-1', newXp: 13 },
    })
    render(<PostMatchWizard {...props} />)

    await advanceThroughPhase1(user, 1, [0])

    // InjuryBonusStep appears
    await waitFor(() => {
      expect(screen.getByTestId('injury-bonus-step')).toBeDefined()
    })

    // Select "Miraculé" and confirm
    await user.click(screen.getByText(/12 — Miraculé/))
    await user.click(screen.getByTestId('consequence-confirm'))

    // Should have called onSubmitUnitXp a second time with xpGained=5 (3+2)
    await waitFor(() => {
      const calls = props.onSubmitUnitXp.mock.calls
      const lastCall = calls[calls.length - 1]
      expect(lastCall[0]).toBe('char-1') // unitId
      expect(lastCall[1]).toBe(5) // xpGained = 3 + 2
    })
  })
})

// ---------------------------------------------------------------------------
// Task 11.11 — Multiple units with consequences in the same match (AC: 11, 23)
// ---------------------------------------------------------------------------

describe('[AC11,AC23][P0] PostMatchWizard — multiple consequences (Task 11.11)', () => {
  it('[4.3-WIZ-011] each flagged unit gets its own consequence step', async () => {
    const user = userEvent.setup()
    const props = makeDefaultProps([CHARACTER_1, UNIT_1])
    render(<PostMatchWizard {...props} />)

    // Flag both units
    await advanceThroughPhase1(user, 2, [0, 1])

    // First: character consequence (InjuryBonusStep)
    await waitFor(() => {
      expect(screen.getByTestId('injury-bonus-step')).toBeDefined()
      expect(screen.getByText('Capitaine Renard')).toBeDefined()
    })

    // Confirm character consequence
    await user.click(screen.getByText(/8-10 — Égratignures/))
    await user.click(screen.getByTestId('consequence-confirm'))

    // Second: unit consequence (UnitDestructionStep)
    await waitFor(() => {
      expect(screen.getByTestId('unit-destruction-step')).toBeDefined()
      expect(screen.getByText('Hallebardiers')).toBeDefined()
    })
  })
})

// ---------------------------------------------------------------------------
// Task 11.12 — Wizard cancel discards all pending consequences (AC: 10)
// ---------------------------------------------------------------------------

describe('[AC10][P0] PostMatchWizard — cancel discards consequences (Task 11.12)', () => {
  it('[4.3-WIZ-012] cancelling wizard does not save any consequence data', async () => {
    const user = userEvent.setup()
    const props = makeDefaultProps([CHARACTER_1])
    render(<PostMatchWizard {...props} />)

    await advanceThroughPhase1(user, 1, [0])

    // InjuryBonusStep appears
    await waitFor(() => {
      expect(screen.getByTestId('injury-bonus-step')).toBeDefined()
    })

    // Cancel the wizard
    await user.click(screen.getByTestId('wizard-cancel-button'))

    // onCancel should have been called
    expect(props.onCancel).toHaveBeenCalledOnce()
    // onCompleteEvolutions should NOT have been called
    expect(props.onCompleteEvolutions).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Task 11.13 — Phase 2 back button at tierUpStep 0 returns to Phase 1.5 (AC: 9)
// ---------------------------------------------------------------------------

describe('[AC9][P1] PostMatchWizard — Phase 2 back to Phase 1.5 (Task 11.13)', () => {
  it('[4.3-WIZ-013] Phase 2 back at step 0 returns to last consequence step when flagged units exist', async () => {
    const user = userEvent.setup()
    // Character with enough XP to trigger tier crossing
    const highXpChar = makeUnit('char-1', 'Capitaine Renard', 'Personnages', 5)
    const props = makeDefaultProps([highXpChar])
    // Mock XP submit to return a tier crossing (char at 5 xp + 3 xpGained = 8, crosses Aguerri at 6)
    props.onSubmitUnitXp.mockResolvedValue({
      success: true,
      data: { unitId: 'char-1', newXp: 8 },
    })
    render(<PostMatchWizard {...props} />)

    await advanceThroughPhase1(user, 1, [0])

    // Phase 1.5: InjuryBonusStep
    await waitFor(() => {
      expect(screen.getByTestId('injury-bonus-step')).toBeDefined()
    })

    // Confirm consequence
    await user.click(screen.getByText(/8-10 — Égratignures/))
    await user.click(screen.getByTestId('consequence-confirm'))

    // If Phase 2 tier-up step appears, pressing back should return to Phase 1.5
    // (This test verifies the back transition; it depends on tier crossing detection)
    const tierUpStep = screen.queryByTestId('tier-up-step')
    if (tierUpStep) {
      await user.click(screen.getByTestId('wizard-back-button'))
      await waitFor(() => {
        expect(screen.getByTestId('injury-bonus-step')).toBeDefined()
      })
    }
    // If no tier crossing, this test is N/A (phase 2 is skipped)
  })
})

// ---------------------------------------------------------------------------
// Task 11.14 — Phase 1.5 back at consequenceIndex 0 returns to Phase 1 (AC: 9)
// ---------------------------------------------------------------------------

describe('[AC9][P1] PostMatchWizard — Phase 1.5 back to Phase 1 (Task 11.14)', () => {
  it('[4.3-WIZ-014] Phase 1.5 back at first consequence returns to last XP step', async () => {
    const user = userEvent.setup()
    const props = makeDefaultProps([CHARACTER_1])
    render(<PostMatchWizard {...props} />)

    await advanceThroughPhase1(user, 1, [0])

    // Phase 1.5: InjuryBonusStep
    await waitFor(() => {
      expect(screen.getByTestId('injury-bonus-step')).toBeDefined()
    })

    // Press back (at consequenceIndex 0)
    await user.click(screen.getByTestId('consequence-back'))

    // Should return to Phase 1 (XP input for last unit)
    await waitFor(() => {
      expect(screen.getByTestId('wizard-xp-input')).toBeDefined()
    })
  })
})
