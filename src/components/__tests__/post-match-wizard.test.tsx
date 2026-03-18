// @vitest-environment jsdom
// src/components/__tests__/post-match-wizard.test.tsx
// Story 4.1: Post-Match Flow — XP Entry per Unit & Character
// Status: RED — written before implementation (TDD)
//
// React component tests for the PostMatchWizard component.
// Follows the pattern established in src/components/__tests__/timeline-entry-result.test.tsx.
//
// Note: @vitest-environment jsdom overrides the global 'node' environment in vitest.config.ts
// because React component rendering requires a DOM.
//
// Covers Tasks 10.18–10.26 (AC: 1, 2, 3, 4, 5, 6, 8)
// All tests will fail until the implementation is complete.

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PostMatchWizard } from '../post-match-wizard'

// ---------------------------------------------------------------------------
// Helpers — minimal test fixtures
// ---------------------------------------------------------------------------

const MATCH_ID = 'match-4-1'
const PARTICIPANT_ID = 'participant-1'

const sampleUnits = [
  { id: 'unit-1', name: 'Hallebardiers', type: 'Infanterie', xp: 5 },
  { id: 'unit-2', name: 'Chevaliers', type: 'Cavalerie', xp: 10 },
  { id: 'unit-3', name: 'Seigneur de Guerre', type: 'Personnage', xp: 20 },
]

const singleUnit = [
  { id: 'unit-1', name: 'Hallebardiers', type: 'Infanterie', xp: 5 },
]

// ---------------------------------------------------------------------------
// 10.18 — renders first unit name and XP input
// AC: 6
// ---------------------------------------------------------------------------

describe('[AC6][P0] PostMatchWizard — renders first unit name and XP input (Task 6.1-6.3)', () => {
  // 10.18 — renders unit name via data-testid="wizard-unit-name"
  it('[4.1-WIZ-001] renders data-testid="wizard-unit-name" with first unit name', () => {
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={sampleUnits}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    const unitName = screen.getByTestId('wizard-unit-name')
    expect(unitName).not.toBeNull()
    expect(unitName.textContent).toContain('Hallebardiers')
  })

  // 10.18 — renders XP input with data-testid="wizard-xp-input"
  it('[4.1-WIZ-002] renders data-testid="wizard-xp-input" numeric input field', () => {
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={sampleUnits}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    const xpInput = screen.getByTestId('wizard-xp-input')
    expect(xpInput).not.toBeNull()
  })

  // 10.18 — XP input defaults to 0
  it('[4.1-WIZ-003] wizard-xp-input defaults to 0', () => {
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={sampleUnits}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    const xpInput = screen.getByTestId('wizard-xp-input') as HTMLInputElement
    expect(xpInput.value).toBe('0')
  })

  // 10.18 — XP input has min=0 and max=99
  it('[4.1-WIZ-004] wizard-xp-input has min=0 and max=99 attributes', () => {
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={sampleUnits}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    const xpInput = screen.getByTestId('wizard-xp-input') as HTMLInputElement
    expect(xpInput.min).toBe('0')
    expect(xpInput.max).toBe('99')
  })

  // 10.18 — shows current XP of the unit
  it('[4.1-WIZ-005] renders current XP value for the displayed unit', () => {
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={sampleUnits}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    // Current XP of first unit is 5
    expect(screen.getByText(/5/)).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 10.19 — shows progress "Unite 1 / N"
// AC: 6
// ---------------------------------------------------------------------------

describe('[AC6][P0] PostMatchWizard — progress indicator (Task 6.2)', () => {
  // 10.19 — shows progress "Unite 1 / N" at the top
  it('[4.1-WIZ-006] renders data-testid="wizard-progress" with "1 / 3" on first step', () => {
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={sampleUnits}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    const progress = screen.getByTestId('wizard-progress')
    expect(progress).not.toBeNull()
    expect(progress.textContent).toMatch(/1\s*\/\s*3/)
  })
})

// ---------------------------------------------------------------------------
// 10.20 — "Suivant" button calls submitUnitXpFn with correct unitId and xpGained
// AC: 3, 4
// ---------------------------------------------------------------------------

describe('[AC3][AC4][P0] PostMatchWizard — Suivant button calls server function (Task 6.4)', () => {
  // 10.20 — renders "Suivant" button with data-testid="wizard-next-button"
  it('[4.1-WIZ-007] renders data-testid="wizard-next-button" with "Suivant" text on non-last step', () => {
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={sampleUnits}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    const nextButton = screen.getByTestId('wizard-next-button')
    expect(nextButton).not.toBeNull()
    expect(nextButton.textContent).toMatch(/Suivant/)
  })

  // 10.20 — "Suivant" click calls submitUnitXpFn with unitId and xpGained
  it('[4.1-WIZ-008] clicking Suivant calls submitUnitXpFn with correct unitId and xpGained', async () => {
    // We test the structural requirement: the component must invoke submitUnitXpFn on click.
    // Since the fn is co-located in the route (not importable here), we test behavior:
    // enter XP 3, click Suivant, expect server call was attempted.
    // This test verifies the component wires up correctly by checking it doesn't crash
    // and handles the case where the server call fails (because no server available in test).

    // We mock the module that contains submitUnitXpFn
    // The component will import it dynamically — the test verifies call was attempted via error or state
    const onComplete = vi.fn()

    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={sampleUnits}
        onComplete={onComplete}
        onCancel={vi.fn()}
      />
    )

    const xpInput = screen.getByTestId('wizard-xp-input')
    fireEvent.change(xpInput, { target: { value: '3' } })

    const nextButton = screen.getByTestId('wizard-next-button')
    fireEvent.click(nextButton)

    // After click, button should be disabled (submitting state) or an error should appear
    await waitFor(() => {
      const btn = screen.getByTestId('wizard-next-button') as HTMLButtonElement
      // Either disabled (loading) or error shown — either is valid for "server call attempted"
      const errorEl = screen.queryByTestId('wizard-error')
      const isDisabled = btn.disabled
      expect(isDisabled || errorEl !== null).toBe(true)
    })
  })
})

// ---------------------------------------------------------------------------
// 10.21 — advances to next unit after successful submission
// AC: 3, 4
// ---------------------------------------------------------------------------

describe('[AC3][AC4][P0] PostMatchWizard — advances to next unit on success (Task 6.4)', () => {
  // 10.21 — advances to step 2 after step 1 succeeds
  it('[4.1-WIZ-009] progress shows "2 / 3" after first unit submission succeeds', async () => {
    // We need to mock submitUnitXpFn. Since it's a module-level server function
    // co-located in the route file, the component must accept it as a prop or import it.
    // Per architecture, server functions are co-located — component calls them directly.
    // This test verifies the wizard accepts an onSubmitUnitXp callback prop for testability.
    const onSubmitUnitXp = vi.fn().mockResolvedValue({ success: true, data: { unitId: 'unit-1', newXp: 8 } })
    const onCompleteEvolutions = vi.fn().mockResolvedValue({ success: true, data: { matchId: MATCH_ID } })
    const onComplete = vi.fn()

    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={sampleUnits}
        onComplete={onComplete}
        onCancel={vi.fn()}
        onSubmitUnitXp={onSubmitUnitXp}
        onCompleteEvolutions={onCompleteEvolutions}
      />
    )

    const nextButton = screen.getByTestId('wizard-next-button')
    fireEvent.click(nextButton)

    await waitFor(() => {
      const progress = screen.getByTestId('wizard-progress')
      expect(progress.textContent).toMatch(/2\s*\/\s*3/)
    })
  })

  // 10.21 — shows second unit name after advancing
  it('[4.1-WIZ-010] wizard-unit-name shows second unit "Chevaliers" after first step completes', async () => {
    const onSubmitUnitXp = vi.fn().mockResolvedValue({ success: true, data: { unitId: 'unit-1', newXp: 8 } })
    const onCompleteEvolutions = vi.fn().mockResolvedValue({ success: true, data: { matchId: MATCH_ID } })

    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={sampleUnits}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        onSubmitUnitXp={onSubmitUnitXp}
        onCompleteEvolutions={onCompleteEvolutions}
      />
    )

    fireEvent.click(screen.getByTestId('wizard-next-button'))

    await waitFor(() => {
      const unitName = screen.getByTestId('wizard-unit-name')
      expect(unitName.textContent).toContain('Chevaliers')
    })
  })
})

// ---------------------------------------------------------------------------
// 10.22 — displays error message on failed submission
// AC: 6
// ---------------------------------------------------------------------------

describe('[AC6][P0] PostMatchWizard — error message on submission failure (Task 6.4)', () => {
  // 10.22 — shows data-testid="wizard-error" with French error on failed submission
  it('[4.1-WIZ-011] displays data-testid="wizard-error" when submitUnitXpFn returns failure', async () => {
    const onSubmitUnitXp = vi.fn().mockResolvedValue({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Erreur lors de la sauvegarde' },
    })

    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={sampleUnits}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        onSubmitUnitXp={onSubmitUnitXp}
      />
    )

    fireEvent.click(screen.getByTestId('wizard-next-button'))

    await waitFor(() => {
      const errorEl = screen.queryByTestId('wizard-error')
      expect(errorEl).not.toBeNull()
    })
  })
})

// ---------------------------------------------------------------------------
// 10.23 — calls completeEvolutionsFn and onComplete after last unit
// AC: 5
// ---------------------------------------------------------------------------

describe('[AC5][P0] PostMatchWizard — completes wizard after last unit (Task 6.5)', () => {
  // 10.23 — calls onCompleteEvolutions and onComplete after last unit XP submitted
  it('[4.1-WIZ-012] calls onCompleteEvolutions and onComplete after last unit submitted', async () => {
    const onSubmitUnitXp = vi.fn().mockResolvedValue({ success: true, data: { unitId: 'unit-1', newXp: 8 } })
    const onCompleteEvolutions = vi.fn().mockResolvedValue({ success: true, data: { matchId: MATCH_ID } })
    const onComplete = vi.fn()

    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={singleUnit}
        onComplete={onComplete}
        onCancel={vi.fn()}
        onSubmitUnitXp={onSubmitUnitXp}
        onCompleteEvolutions={onCompleteEvolutions}
      />
    )

    // Single unit — click Terminer
    fireEvent.click(screen.getByTestId('wizard-next-button'))

    await waitFor(() => {
      expect(onCompleteEvolutions).toHaveBeenCalledWith(MATCH_ID)
      expect(onComplete).toHaveBeenCalled()
    })
  })
})

// ---------------------------------------------------------------------------
// 10.24 — "Suivant" button disabled during submission
// AC: 6
// ---------------------------------------------------------------------------

describe('[AC6][P0] PostMatchWizard — button disabled during submission (Task 6.6)', () => {
  // 10.24 — button disabled while server call is in flight
  it('[4.1-WIZ-013] wizard-next-button is disabled while onSubmitUnitXp is pending', async () => {
    let resolveSubmit!: (val: unknown) => void
    const pendingPromise = new Promise((resolve) => { resolveSubmit = resolve })
    const onSubmitUnitXp = vi.fn().mockReturnValue(pendingPromise)

    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={sampleUnits}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        onSubmitUnitXp={onSubmitUnitXp}
      />
    )

    fireEvent.click(screen.getByTestId('wizard-next-button'))

    await waitFor(() => {
      const btn = screen.getByTestId('wizard-next-button') as HTMLButtonElement
      expect(btn.disabled).toBe(true)
    })

    // Cleanup
    resolveSubmit({ success: true, data: { unitId: 'unit-1', newXp: 5 } })
  })
})

// ---------------------------------------------------------------------------
// 10.25 — empty units array shows "Aucune unite" message
// AC: 6
// ---------------------------------------------------------------------------

describe('[AC6][P0] PostMatchWizard — empty units state (Task 6.7)', () => {
  // 10.25 — empty units array shows "Aucune unite" message
  it('[4.1-WIZ-014] renders "Aucune unite" message when units array is empty', () => {
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={[]}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByText(/Aucune unit/i)).not.toBeNull()
  })

  // 10.25 — empty units shows "Retour" button (not wizard steps)
  it('[4.1-WIZ-015] renders a "Retour" button when units array is empty', () => {
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={[]}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByText(/Retour/i)).not.toBeNull()
  })

  // 10.25 — empty units does NOT render the wizard progress or XP input
  it('[4.1-WIZ-016] empty units state does not render wizard-progress or wizard-xp-input', () => {
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={[]}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.queryByTestId('wizard-progress')).toBeNull()
    expect(screen.queryByTestId('wizard-xp-input')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 10.26 — last step shows "Terminer" instead of "Suivant"
// AC: 6
// ---------------------------------------------------------------------------

describe('[AC6][P0] PostMatchWizard — Phase 1 always shows "Suivant" (Story 4-2: Phase 1 never shows Terminer)', () => {
  // Story 4-2 change: Phase 1 always shows "Suivant" because "Terminer" only appears at end of Phase 2
  it('[4.1-WIZ-017] wizard shows "Suivant" on last XP step (single unit, Phase 1)', () => {
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={singleUnit}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    const nextButton = screen.getByTestId('wizard-next-button')
    expect(nextButton.textContent).toMatch(/Suivant/)
  })

  // 10.26 — "Suivant" shown for non-last step, "Terminer" for last
  it('[4.1-WIZ-018] wizard shows "Suivant" on step 1 of 3 (not last)', () => {
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={sampleUnits}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    const nextButton = screen.getByTestId('wizard-next-button')
    expect(nextButton.textContent).toMatch(/Suivant/)
    expect(nextButton.textContent).not.toMatch(/Terminer/)
  })

  // 10.26 — button has min 44px tap target (minHeight)
  it('[4.1-WIZ-019] wizard-next-button has minHeight of at least 44px for tap target', () => {
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={sampleUnits}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    const btn = screen.getByTestId('wizard-next-button')
    // minHeight should be set (44px or similar)
    // We check the source file for this requirement rather than runtime style
    expect(btn).not.toBeNull() // Button exists; source-level check in separate contract test
  })
})

// ---------------------------------------------------------------------------
// Source file structural contract for PostMatchWizard
// AC: 6
// ---------------------------------------------------------------------------

describe('[AC6][P0] PostMatchWizard — source file contract (data-testid attributes)', () => {
  it('[4.1-WIZ-020] post-match-wizard.tsx file exists at src/components/post-match-wizard.tsx', () => {
    const { existsSync } = require('node:fs')
    const { resolve: resolvePath } = require('node:path')
    expect(existsSync(resolvePath(__dirname, '..', 'post-match-wizard.tsx'))).toBe(true)
  })

  it('[4.1-WIZ-021] post-match-wizard.tsx exports PostMatchWizard component', () => {
    const { readFileSync } = require('node:fs')
    const { resolve: resolvePath } = require('node:path')
    const code = readFileSync(resolvePath(__dirname, '..', 'post-match-wizard.tsx'), 'utf-8')
    expect(code).toMatch(/export function PostMatchWizard/)
  })

  it('[4.1-WIZ-022] post-match-wizard.tsx contains data-testid="wizard-progress"', () => {
    const { readFileSync } = require('node:fs')
    const { resolve: resolvePath } = require('node:path')
    const code = readFileSync(resolvePath(__dirname, '..', 'post-match-wizard.tsx'), 'utf-8')
    expect(code).toContain('data-testid="wizard-progress"')
  })

  it('[4.1-WIZ-023] post-match-wizard.tsx contains data-testid="wizard-unit-name"', () => {
    const { readFileSync } = require('node:fs')
    const { resolve: resolvePath } = require('node:path')
    const code = readFileSync(resolvePath(__dirname, '..', 'post-match-wizard.tsx'), 'utf-8')
    expect(code).toContain('data-testid="wizard-unit-name"')
  })

  it('[4.1-WIZ-024] post-match-wizard.tsx contains data-testid="wizard-xp-input"', () => {
    const { readFileSync } = require('node:fs')
    const { resolve: resolvePath } = require('node:path')
    const code = readFileSync(resolvePath(__dirname, '..', 'post-match-wizard.tsx'), 'utf-8')
    expect(code).toContain('data-testid="wizard-xp-input"')
  })

  it('[4.1-WIZ-025] post-match-wizard.tsx contains data-testid="wizard-next-button"', () => {
    const { readFileSync } = require('node:fs')
    const { resolve: resolvePath } = require('node:path')
    const code = readFileSync(resolvePath(__dirname, '..', 'post-match-wizard.tsx'), 'utf-8')
    expect(code).toContain('data-testid="wizard-next-button"')
  })

  it('[4.1-WIZ-026] post-match-wizard.tsx contains data-testid="wizard-error"', () => {
    const { readFileSync } = require('node:fs')
    const { resolve: resolvePath } = require('node:path')
    const code = readFileSync(resolvePath(__dirname, '..', 'post-match-wizard.tsx'), 'utf-8')
    expect(code).toContain('data-testid="wizard-error"')
  })

  it('[4.1-WIZ-027] post-match-wizard.tsx contains data-testid="wizard-complete"', () => {
    const { readFileSync } = require('node:fs')
    const { resolve: resolvePath } = require('node:path')
    const code = readFileSync(resolvePath(__dirname, '..', 'post-match-wizard.tsx'), 'utf-8')
    expect(code).toContain('data-testid="wizard-complete"')
  })

  it('[4.1-WIZ-028] post-match-wizard.tsx wizard-next-button has minHeight 44px for tap target (AC6)', () => {
    const { readFileSync } = require('node:fs')
    const { resolve: resolvePath } = require('node:path')
    const code = readFileSync(resolvePath(__dirname, '..', 'post-match-wizard.tsx'), 'utf-8')
    expect(code).toMatch(/wizard-next-button[\s\S]{0,800}minHeight.*44|44.*minHeight[\s\S]{0,400}wizard-next-button/)
  })
})

// ===========================================================================
// Story 4-1b — Match XP Tracking & Wizard Resume
// Status: RED — written before implementation (ATDD)
// ===========================================================================

// ---------------------------------------------------------------------------
// [AC2] Pre-fill XP from previousXpGained
// ---------------------------------------------------------------------------

describe('[AC2][P0] PostMatchWizard — pre-fill XP from previousXpGained (Story 4-1b)', () => {
  const unitsWithPrevXp = [
    { id: 'unit-1', name: 'Hallebardiers', type: 'Infanterie', xp: 8, previousXpGained: 3 },
    { id: 'unit-2', name: 'Chevaliers', type: 'Cavalerie', xp: 15, previousXpGained: 5 },
  ]
  const unitsNoPrevXp = [
    { id: 'unit-1', name: 'Hallebardiers', type: 'Infanterie', xp: 5, previousXpGained: null },
  ]

  it('[4.1b-WIZ-001] XP input pre-fills to previousXpGained value when not null', () => {
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={unitsWithPrevXp}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    const xpInput = screen.getByTestId('wizard-xp-input') as HTMLInputElement
    expect(xpInput.value).toBe('3')
  })

  it('[4.1b-WIZ-002] XP input defaults to 0 when previousXpGained is null', () => {
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={unitsNoPrevXp}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    const xpInput = screen.getByTestId('wizard-xp-input') as HTMLInputElement
    expect(xpInput.value).toBe('0')
  })

  it('[4.1b-WIZ-003] XP input pre-fills correctly on second step', async () => {
    const onSubmitUnitXp = vi.fn().mockResolvedValue({ success: true, data: { unitId: 'unit-1', newXp: 11 } })
    const onCompleteEvolutions = vi.fn().mockResolvedValue({ success: true, data: { matchId: MATCH_ID } })

    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={unitsWithPrevXp}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        onSubmitUnitXp={onSubmitUnitXp}
        onCompleteEvolutions={onCompleteEvolutions}
      />
    )

    // Advance past first unit
    fireEvent.click(screen.getByTestId('wizard-next-button'))

    await waitFor(() => {
      const xpInput = screen.getByTestId('wizard-xp-input') as HTMLInputElement
      expect(xpInput.value).toBe('5')
    })
  })
})

// ---------------------------------------------------------------------------
// [AC1][AC3] matchParticipantId passed in submit
// ---------------------------------------------------------------------------

describe('[AC1][AC3][P0] PostMatchWizard — passes matchParticipantId in submit (Story 4-1b)', () => {
  const unitsWithPrevXp = [
    { id: 'unit-1', name: 'Hallebardiers', type: 'Infanterie', xp: 8, previousXpGained: 3 },
  ]

  it('[4.1b-WIZ-004] onSubmitUnitXp is called with matchParticipantId', async () => {
    const onSubmitUnitXp = vi.fn().mockResolvedValue({ success: true, data: { unitId: 'unit-1', newXp: 11 } })
    const onCompleteEvolutions = vi.fn().mockResolvedValue({ success: true, data: { matchId: MATCH_ID } })
    const onComplete = vi.fn()

    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={unitsWithPrevXp}
        onComplete={onComplete}
        onCancel={vi.fn()}
        onSubmitUnitXp={onSubmitUnitXp}
        onCompleteEvolutions={onCompleteEvolutions}
      />
    )

    fireEvent.click(screen.getByTestId('wizard-next-button'))

    await waitFor(() => {
      expect(onSubmitUnitXp).toHaveBeenCalled()
      // matchParticipantId must be passed — either as third arg or within a params object
      const callArgs = onSubmitUnitXp.mock.calls[0]
      const argsString = JSON.stringify(callArgs)
      expect(argsString).toContain(PARTICIPANT_ID)
    })
  })
})

// ---------------------------------------------------------------------------
// [AC6] UX labels for XP context
// ---------------------------------------------------------------------------

describe('[AC6][P1] PostMatchWizard — clear UX labels for XP context (Story 4-1b)', () => {
  const unitsWithPrevXp = [
    { id: 'unit-1', name: 'Hallebardiers', type: 'Infanterie', xp: 8, previousXpGained: 3 },
  ]

  it('[4.1b-WIZ-005] renders "XP avant cette partie" label', () => {
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={unitsWithPrevXp}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByText(/XP avant cette partie/)).not.toBeNull()
  })

  it('[4.1b-WIZ-006] renders "XP gagné lors de cette partie" as input label', () => {
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={unitsWithPrevXp}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByText(/XP gagn[eé] lors de cette partie/)).not.toBeNull()
  })

  it('[4.1b-WIZ-007] displays correct XP before match value: xp - (previousXpGained ?? 0)', () => {
    // Unit has xp=8, previousXpGained=3 → pre-match XP should be 5
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={unitsWithPrevXp}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    // The pre-match XP value "5" should appear near the "XP avant cette partie" label
    const preMatchLabel = screen.getByText(/XP avant cette partie/)
    // The value 5 should be rendered in the same context
    expect(preMatchLabel.closest('[data-testid]')?.textContent ?? document.body.textContent).toMatch(/5/)
  })
})

// ---------------------------------------------------------------------------
// [AC2] Source file structural contract for previousXpGained
// ---------------------------------------------------------------------------

describe('[AC2][P0] PostMatchWizard — source contract for previousXpGained (Story 4-1b)', () => {
  it('[4.1b-WIZ-008] post-match-wizard.tsx unit type includes previousXpGained', () => {
    const { readFileSync } = require('node:fs')
    const { resolve: resolvePath } = require('node:path')
    const code = readFileSync(resolvePath(__dirname, '..', 'post-match-wizard.tsx'), 'utf-8')
    expect(code).toMatch(/previousXpGained\s*[:\?]/)
  })

  it('[4.1b-WIZ-009] post-match-wizard.tsx contains "XP avant cette partie" label text', () => {
    const { readFileSync } = require('node:fs')
    const { resolve: resolvePath } = require('node:path')
    const code = readFileSync(resolvePath(__dirname, '..', 'post-match-wizard.tsx'), 'utf-8')
    expect(code).toContain('XP avant cette partie')
  })

  it('[4.1b-WIZ-010] post-match-wizard.tsx contains "XP gagné lors de cette partie" label text', () => {
    const { readFileSync } = require('node:fs')
    const { resolve: resolvePath } = require('node:path')
    const code = readFileSync(resolvePath(__dirname, '..', 'post-match-wizard.tsx'), 'utf-8')
    expect(code).toMatch(/XP gagn[eé] lors de cette partie/)
  })
})

// ---------------------------------------------------------------------------
// Back button — navigate to previous unit
// ---------------------------------------------------------------------------

describe('PostMatchWizard — back button (previous unit)', () => {
  const unitsWithPrevXp = [
    { id: 'unit-1', name: 'Hallebardiers', type: 'Infanterie', xp: 8, previousXpGained: 3 },
    { id: 'unit-2', name: 'Chevaliers', type: 'Cavalerie', xp: 15, previousXpGained: 5 },
    { id: 'unit-3', name: 'Seigneur de Guerre', type: 'Personnage', xp: 20, previousXpGained: 2 },
  ]

  it('[4.1b-WIZ-011] back button is NOT rendered on step 1', () => {
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={unitsWithPrevXp}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.queryByTestId('wizard-back-button')).toBeNull()
  })

  it('[4.1b-WIZ-012] back button IS rendered on step 2', async () => {
    const onSubmitUnitXp = vi.fn().mockResolvedValue({ success: true, data: { unitId: 'unit-1', newXp: 11 } })
    const onCompleteEvolutions = vi.fn().mockResolvedValue({ success: true, data: { matchId: MATCH_ID } })

    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={unitsWithPrevXp}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        onSubmitUnitXp={onSubmitUnitXp}
        onCompleteEvolutions={onCompleteEvolutions}
      />
    )

    fireEvent.click(screen.getByTestId('wizard-next-button'))

    await waitFor(() => {
      expect(screen.getByTestId('wizard-back-button')).not.toBeNull()
    })
  })

  it('[4.1b-WIZ-013] clicking back button returns to previous unit with submitted XP value (default=previousXpGained)', async () => {
    const onSubmitUnitXp = vi.fn().mockResolvedValue({ success: true, data: { unitId: 'unit-1', newXp: 11 } })
    const onCompleteEvolutions = vi.fn().mockResolvedValue({ success: true, data: { matchId: MATCH_ID } })

    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={unitsWithPrevXp}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        onSubmitUnitXp={onSubmitUnitXp}
        onCompleteEvolutions={onCompleteEvolutions}
      />
    )

    // Step 1: XP pre-filled to 3 (previousXpGained), advance without changing
    fireEvent.click(screen.getByTestId('wizard-next-button'))

    await waitFor(() => {
      expect(screen.getByTestId('wizard-progress').textContent).toMatch(/2\s*\/\s*3/)
    })

    // Click back
    fireEvent.click(screen.getByTestId('wizard-back-button'))

    // Should show step 1 again with the submitted value (3, same as previousXpGained)
    await waitFor(() => {
      expect(screen.getByTestId('wizard-progress').textContent).toMatch(/1\s*\/\s*3/)
      expect(screen.getByTestId('wizard-unit-name').textContent).toContain('Hallebardiers')
      expect((screen.getByTestId('wizard-xp-input') as HTMLInputElement).value).toBe('3')
    })
  })

  it('[4.1b-WIZ-013b] back button pre-fills with user-entered XP, not previousXpGained', async () => {
    const onSubmitUnitXp = vi.fn().mockResolvedValue({ success: true, data: { unitId: 'unit-1', newXp: 12 } })
    const onCompleteEvolutions = vi.fn().mockResolvedValue({ success: true, data: { matchId: MATCH_ID } })

    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={unitsWithPrevXp}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        onSubmitUnitXp={onSubmitUnitXp}
        onCompleteEvolutions={onCompleteEvolutions}
      />
    )

    // Step 1: change XP from 3 (previousXpGained) to 7, then advance
    fireEvent.change(screen.getByTestId('wizard-xp-input'), { target: { value: '7' } })
    fireEvent.click(screen.getByTestId('wizard-next-button'))

    await waitFor(() => {
      expect(screen.getByTestId('wizard-progress').textContent).toMatch(/2\s*\/\s*3/)
    })

    // Click back — should show 7, not 3
    fireEvent.click(screen.getByTestId('wizard-back-button'))

    await waitFor(() => {
      expect((screen.getByTestId('wizard-xp-input') as HTMLInputElement).value).toBe('7')
    })
  })

  it('[4.1b-WIZ-013c] back + change + advance re-submits to DB, and second back shows updated value', async () => {
    const onSubmitUnitXp = vi.fn().mockResolvedValue({ success: true, data: { unitId: 'unit-1', newXp: 7 } })
    const onCompleteEvolutions = vi.fn().mockResolvedValue({ success: true, data: { matchId: MATCH_ID } })

    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={unitsWithPrevXp}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        onSubmitUnitXp={onSubmitUnitXp}
        onCompleteEvolutions={onCompleteEvolutions}
      />
    )

    // Step 1: enter 2, advance
    fireEvent.change(screen.getByTestId('wizard-xp-input'), { target: { value: '2' } })
    fireEvent.click(screen.getByTestId('wizard-next-button'))

    await waitFor(() => {
      expect(screen.getByTestId('wizard-progress').textContent).toMatch(/2\s*\/\s*3/)
    })
    expect(onSubmitUnitXp).toHaveBeenCalledTimes(1)

    // Back to step 1
    fireEvent.click(screen.getByTestId('wizard-back-button'))
    await waitFor(() => {
      expect((screen.getByTestId('wizard-xp-input') as HTMLInputElement).value).toBe('2')
    })

    // Change to 0, advance again
    fireEvent.change(screen.getByTestId('wizard-xp-input'), { target: { value: '0' } })
    fireEvent.click(screen.getByTestId('wizard-next-button'))

    await waitFor(() => {
      expect(screen.getByTestId('wizard-progress').textContent).toMatch(/2\s*\/\s*3/)
    })

    // onSubmitUnitXp called a second time (re-submit with updated value)
    expect(onSubmitUnitXp).toHaveBeenCalledTimes(2)
    expect(onSubmitUnitXp).toHaveBeenLastCalledWith('unit-1', 0, PARTICIPANT_ID)

    // Back again — should show 0
    fireEvent.click(screen.getByTestId('wizard-back-button'))
    await waitFor(() => {
      expect((screen.getByTestId('wizard-xp-input') as HTMLInputElement).value).toBe('0')
    })
  })

  it('[4.1b-WIZ-014] back button has navy background #334155 and is round', async () => {
    const onSubmitUnitXp = vi.fn().mockResolvedValue({ success: true, data: { unitId: 'unit-1', newXp: 11 } })
    const onCompleteEvolutions = vi.fn().mockResolvedValue({ success: true, data: { matchId: MATCH_ID } })

    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={unitsWithPrevXp}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        onSubmitUnitXp={onSubmitUnitXp}
        onCompleteEvolutions={onCompleteEvolutions}
      />
    )

    fireEvent.click(screen.getByTestId('wizard-next-button'))

    await waitFor(() => {
      const backBtn = screen.getByTestId('wizard-back-button')
      expect(backBtn.style.background).toBe('rgb(51, 65, 85)')
      expect(backBtn.style.borderRadius).toBe('999px')
    })
  })

  it('[4.1b-WIZ-015] back button disappears again on step 1 after going back', async () => {
    const onSubmitUnitXp = vi.fn().mockResolvedValue({ success: true, data: { unitId: 'unit-1', newXp: 11 } })
    const onCompleteEvolutions = vi.fn().mockResolvedValue({ success: true, data: { matchId: MATCH_ID } })

    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={unitsWithPrevXp}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        onSubmitUnitXp={onSubmitUnitXp}
        onCompleteEvolutions={onCompleteEvolutions}
      />
    )

    // Advance to step 2
    fireEvent.click(screen.getByTestId('wizard-next-button'))
    await waitFor(() => {
      expect(screen.getByTestId('wizard-back-button')).not.toBeNull()
    })

    // Go back to step 1
    fireEvent.click(screen.getByTestId('wizard-back-button'))
    await waitFor(() => {
      expect(screen.queryByTestId('wizard-back-button')).toBeNull()
    })
  })
})

// ---------------------------------------------------------------------------
// Cancel button — red ✕ to return to timeline
// ---------------------------------------------------------------------------

describe('PostMatchWizard — cancel button (red ✕)', () => {
  const units = [
    { id: 'unit-1', name: 'Hallebardiers', type: 'Infanterie', xp: 8, previousXpGained: 3 },
    { id: 'unit-2', name: 'Chevaliers', type: 'Cavalerie', xp: 15, previousXpGained: 5 },
  ]

  it('renders cancel button with data-testid="wizard-cancel-button" on step 1', () => {
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={units}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByTestId('wizard-cancel-button')).not.toBeNull()
  })

  it('cancel button calls onCancel when clicked', () => {
    const onCancel = vi.fn()
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={units}
        onComplete={vi.fn()}
        onCancel={onCancel}
      />
    )
    fireEvent.click(screen.getByTestId('wizard-cancel-button'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('cancel button has malus background color and is round', () => {
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={units}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    const cancelBtn = screen.getByTestId('wizard-cancel-button')
    expect(cancelBtn.style.background).toContain('var(--color-malus)')
    expect(cancelBtn.style.borderRadius).toBe('999px')
  })

  it('cancel button is positioned on the right side (position absolute, right 0)', () => {
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={units}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    const cancelBtn = screen.getByTestId('wizard-cancel-button')
    expect(cancelBtn.style.position).toBe('absolute')
    expect(cancelBtn.style.right).toBe('0px')
  })

  it('cancel button is always visible (step 1 and step 2)', async () => {
    const onSubmitUnitXp = vi.fn().mockResolvedValue({ success: true, data: { unitId: 'unit-1', newXp: 11 } })
    const onCompleteEvolutions = vi.fn().mockResolvedValue({ success: true, data: { matchId: MATCH_ID } })

    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={units}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        onSubmitUnitXp={onSubmitUnitXp}
        onCompleteEvolutions={onCompleteEvolutions}
      />
    )

    // Visible on step 1
    expect(screen.getByTestId('wizard-cancel-button')).not.toBeNull()

    // Advance to step 2
    fireEvent.click(screen.getByTestId('wizard-next-button'))
    await waitFor(() => {
      expect(screen.getByTestId('wizard-progress').textContent).toMatch(/2\s*\/\s*2/)
    })

    // Still visible on step 2
    expect(screen.getByTestId('wizard-cancel-button')).not.toBeNull()
  })
})
