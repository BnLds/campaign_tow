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
  { id: 'unit-3', name: 'Seigneur de Guerre', type: 'Personnages', xp: 20 },
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

  // 10.18 — renders XP checkboxes container
  it('[4.1-WIZ-002] renders data-testid="wizard-xp-checkboxes" container', () => {
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={sampleUnits}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    const xpCheckboxes = screen.getByTestId('wizard-xp-checkboxes')
    expect(xpCheckboxes).not.toBeNull()
  })

  // 10.18 — XP total defaults to 0
  it('[4.1-WIZ-003] wizard-xp-total defaults to 0', () => {
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={sampleUnits}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    const xpTotal = screen.getByTestId('wizard-xp-total')
    expect(xpTotal.textContent).toContain('0')
  })

  // 10.18 — XP checkboxes contain conditions for first unit (Infanterie = unit conditions)
  it('[4.1-WIZ-004] wizard-xp-checkboxes shows unit conditions for Infanterie', () => {
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={sampleUnits}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    // First unit is Infanterie — should show unit conditions
    expect(screen.getByTestId('xp-condition-deployed')).not.toBeNull()
    expect(screen.getByTestId('xp-condition-survived')).not.toBeNull()
    // Should NOT show character-only conditions
    expect(screen.queryByTestId('xp-condition-general_win')).toBeNull()
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

  // 10.20 — "Suivant" click calls submitUnitXpFn with correct unitId and computed xpGained
  it('[4.1-WIZ-008] clicking checkboxes + Suivant calls onSubmitUnitXp with computed XP total', async () => {
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

    // First unit is Infanterie — check deployed (+1), survived (+1), feat_destroy_unit (+1) = 3 XP
    fireEvent.click(screen.getByTestId('xp-condition-deployed'))
    fireEvent.click(screen.getByTestId('xp-condition-survived'))
    fireEvent.click(screen.getByTestId('xp-condition-feat_destroy_unit'))

    // Verify total display
    expect(screen.getByTestId('wizard-xp-total').textContent).toContain('3')

    fireEvent.click(screen.getByTestId('wizard-next-button'))

    await waitFor(() => {
      expect(onSubmitUnitXp).toHaveBeenCalledWith('unit-1', 3, PARTICIPANT_ID)
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
      expect(onCompleteEvolutions).toHaveBeenCalledWith(MATCH_ID, PARTICIPANT_ID, [], [], [])
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

  // 10.25 — empty units does NOT render the wizard progress or XP checkboxes
  it('[4.1-WIZ-016] empty units state does not render wizard-progress or wizard-xp-checkboxes', () => {
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
    expect(screen.queryByTestId('wizard-xp-checkboxes')).toBeNull()
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

  it('[4.1-WIZ-024] post-match-wizard.tsx contains data-testid="wizard-xp-checkboxes"', () => {
    const { readFileSync } = require('node:fs')
    const { resolve: resolvePath } = require('node:path')
    const code = readFileSync(resolvePath(__dirname, '..', 'post-match-wizard.tsx'), 'utf-8')
    expect(code).toContain('data-testid="wizard-xp-checkboxes"')
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

  it('[4.1b-WIZ-001] shows "Précédemment" hint when previousXpGained is set', () => {
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={unitsWithPrevXp}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    const hint = screen.getByTestId('wizard-previous-xp')
    expect(hint.textContent).toContain('3 XP')
  })

  it('[4.1b-WIZ-002] no hint when previousXpGained is null, total defaults to 0', () => {
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={unitsNoPrevXp}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.queryByTestId('wizard-previous-xp')).toBeNull()
    expect(screen.getByTestId('wizard-xp-total').textContent).toContain('0')
  })

  it('[4.1b-WIZ-003] shows "Précédemment" hint on second step', async () => {
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
      const hint = screen.getByTestId('wizard-previous-xp')
      expect(hint.textContent).toContain('5 XP')
    })
  })

  it('[4.1b-WIZ-016] hint appears when units prop changes from null to non-null previousXpGained', async () => {
    // Regression test: when TanStack Router serves stale cached data first (previousXpGained=null),
    // then updates with fresh loader data (previousXpGained=3), the hint must appear.
    const staleUnits = [
      { id: 'unit-1', name: 'Hallebardiers', type: 'Infanterie', xp: 8, previousXpGained: null },
    ]
    const freshUnits = [
      { id: 'unit-1', name: 'Hallebardiers', type: 'Infanterie', xp: 8, previousXpGained: 3 },
    ]

    const { rerender } = render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={staleUnits}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    // With stale data, no hint
    expect(screen.queryByTestId('wizard-previous-xp')).toBeNull()

    // Simulate loader completing with fresh data (units prop changes)
    rerender(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={freshUnits}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    // Hint should now appear
    await waitFor(() => {
      expect(screen.getByTestId('wizard-previous-xp').textContent).toContain('3 XP')
    })
  })

  it('[4.1b-WIZ-017] useEffect dep array includes `units` (source contract)', () => {
    // Structural guard: ensures the useEffect that pre-fills XP depends on `units`.
    // If someone removes `units` from the dep array, this test catches it.
    const { readFileSync } = require('node:fs')
    const { resolve: resolvePath } = require('node:path')
    const filePath = resolvePath(__dirname, '..', 'post-match-wizard.tsx')
    const code = readFileSync(filePath, 'utf-8')
    // The useEffect that sets xpGained from previousXpGained must have `units` in its dep array
    expect(code).toMatch(/\}, \[currentStep, units\]\)/)
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

  it('[4.1b-WIZ-005] does not render removed XP labels', () => {
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={unitsWithPrevXp}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.queryByText(/XP avant cette partie/)).toBeNull()
    expect(screen.queryByText(/XP gagn[eé] lors de cette partie/)).toBeNull()
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

  it('[4.1b-WIZ-009] post-match-wizard.tsx does NOT contain removed XP labels', () => {
    const { readFileSync } = require('node:fs')
    const { resolve: resolvePath } = require('node:path')
    const code = readFileSync(resolvePath(__dirname, '..', 'post-match-wizard.tsx'), 'utf-8')
    expect(code).not.toContain('XP avant cette partie')
    expect(code).not.toMatch(/XP gagn[eé] lors de cette partie/)
  })
})

// ---------------------------------------------------------------------------
// Back button — navigate to previous unit
// ---------------------------------------------------------------------------

describe('PostMatchWizard — back button (previous unit)', () => {
  const unitsWithPrevXp = [
    { id: 'unit-1', name: 'Hallebardiers', type: 'Infanterie', xp: 8, previousXpGained: 3 },
    { id: 'unit-2', name: 'Chevaliers', type: 'Cavalerie', xp: 15, previousXpGained: 5 },
    { id: 'unit-3', name: 'Seigneur de Guerre', type: 'Personnages', xp: 20, previousXpGained: 2 },
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

  it('[4.1b-WIZ-013] clicking back button returns to previous unit with saved checkbox state', async () => {
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

    // Step 1: check deployed checkbox then advance
    fireEvent.click(screen.getByTestId('xp-condition-deployed'))
    fireEvent.click(screen.getByTestId('wizard-next-button'))

    await waitFor(() => {
      expect(screen.getByTestId('wizard-progress').textContent).toMatch(/2\s*\/\s*3/)
    })

    // Click back
    fireEvent.click(screen.getByTestId('wizard-back-button'))

    // Should show step 1 with deployed checkbox still checked
    await waitFor(() => {
      expect(screen.getByTestId('wizard-progress').textContent).toMatch(/1\s*\/\s*3/)
      expect(screen.getByTestId('wizard-unit-name').textContent).toContain('Hallebardiers')
      expect((screen.getByTestId('xp-condition-deployed') as HTMLInputElement).checked).toBe(true)
    })
  })

  it('[4.1b-WIZ-013b] back button restores checked conditions, not previousXpGained hint', async () => {
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

    // Step 1: check deployed + survived, then advance
    fireEvent.click(screen.getByTestId('xp-condition-deployed'))
    fireEvent.click(screen.getByTestId('xp-condition-survived'))
    fireEvent.click(screen.getByTestId('wizard-next-button'))

    await waitFor(() => {
      expect(screen.getByTestId('wizard-progress').textContent).toMatch(/2\s*\/\s*3/)
    })

    // Click back — checkboxes should be restored, hint should NOT show
    fireEvent.click(screen.getByTestId('wizard-back-button'))

    await waitFor(() => {
      expect((screen.getByTestId('xp-condition-deployed') as HTMLInputElement).checked).toBe(true)
      expect((screen.getByTestId('xp-condition-survived') as HTMLInputElement).checked).toBe(true)
      expect(screen.queryByTestId('wizard-previous-xp')).toBeNull()
    })
  })

  it('[4.1b-WIZ-013c] back + change checkboxes + advance re-submits to DB, second back shows updated state', async () => {
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

    // Step 1: check deployed + survived (2 XP), advance
    fireEvent.click(screen.getByTestId('xp-condition-deployed'))
    fireEvent.click(screen.getByTestId('xp-condition-survived'))
    fireEvent.click(screen.getByTestId('wizard-next-button'))

    await waitFor(() => {
      expect(screen.getByTestId('wizard-progress').textContent).toMatch(/2\s*\/\s*3/)
    })
    expect(onSubmitUnitXp).toHaveBeenCalledTimes(1)

    // Back to step 1
    fireEvent.click(screen.getByTestId('wizard-back-button'))
    await waitFor(() => {
      expect((screen.getByTestId('xp-condition-deployed') as HTMLInputElement).checked).toBe(true)
    })

    // Uncheck both, advance again (0 XP)
    fireEvent.click(screen.getByTestId('xp-condition-deployed'))
    fireEvent.click(screen.getByTestId('xp-condition-survived'))
    fireEvent.click(screen.getByTestId('wizard-next-button'))

    await waitFor(() => {
      expect(screen.getByTestId('wizard-progress').textContent).toMatch(/2\s*\/\s*3/)
    })

    // onSubmitUnitXp called a second time (re-submit with updated value)
    expect(onSubmitUnitXp).toHaveBeenCalledTimes(2)
    expect(onSubmitUnitXp).toHaveBeenLastCalledWith('unit-1', 0, PARTICIPANT_ID)

    // Back again — should show no checkboxes checked
    fireEvent.click(screen.getByTestId('wizard-back-button'))
    await waitFor(() => {
      expect((screen.getByTestId('xp-condition-deployed') as HTMLInputElement).checked).toBe(false)
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

// ===========================================================================
// XP Checkboxes — New tests for checkbox-based XP entry
// ===========================================================================

describe('PostMatchWizard — XP checkboxes behavior', () => {
  const characterUnits = [
    { id: 'char-1', name: 'Seigneur de Guerre', type: 'Personnages', xp: 20 },
  ]
  const infantryUnits = [
    { id: 'unit-1', name: 'Hallebardiers', type: 'Infanterie', xp: 5 },
  ]

  it('[XP-CB-001] character unit shows character-specific conditions (general_win, exploits)', () => {
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={characterUnits}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByTestId('xp-condition-deployed')).not.toBeNull()
    expect(screen.getByTestId('xp-condition-alive')).not.toBeNull()
    expect(screen.getByTestId('xp-condition-general_win')).not.toBeNull()
    expect(screen.getByTestId('xp-condition-general_draw')).not.toBeNull()
    expect(screen.getByTestId('xp-condition-exploit_duel')).not.toBeNull()
    // Should NOT show unit-specific conditions
    expect(screen.queryByTestId('xp-condition-survived')).toBeNull()
    expect(screen.queryByTestId('xp-condition-feat_destroy_unit')).toBeNull()
  })

  it('[XP-CB-002] non-character unit shows unit-specific conditions (survived, feats)', () => {
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={infantryUnits}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByTestId('xp-condition-deployed')).not.toBeNull()
    expect(screen.getByTestId('xp-condition-survived')).not.toBeNull()
    expect(screen.getByTestId('xp-condition-feat_destroy_unit')).not.toBeNull()
    // Should NOT show character-specific conditions
    expect(screen.queryByTestId('xp-condition-general_win')).toBeNull()
    expect(screen.queryByTestId('xp-condition-exploit_duel')).toBeNull()
  })

  it('[XP-CB-003] checking a condition updates the displayed total', () => {
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={infantryUnits}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByTestId('wizard-xp-total').textContent).toContain('0')
    fireEvent.click(screen.getByTestId('xp-condition-deployed'))
    expect(screen.getByTestId('wizard-xp-total').textContent).toContain('1')
    fireEvent.click(screen.getByTestId('xp-condition-survived'))
    expect(screen.getByTestId('wizard-xp-total').textContent).toContain('2')
  })

  it('[XP-CB-004] back button restores previously checked conditions + correct XP submitted', async () => {
    const twoUnits = [
      { id: 'unit-1', name: 'Hallebardiers', type: 'Infanterie', xp: 5 },
      { id: 'unit-2', name: 'Chevaliers', type: 'Cavalerie', xp: 10 },
    ]
    const onSubmitUnitXp = vi.fn().mockResolvedValue({ success: true, data: { unitId: 'unit-1', newXp: 7 } })
    const onCompleteEvolutions = vi.fn().mockResolvedValue({ success: true, data: { matchId: MATCH_ID } })

    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={twoUnits}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        onSubmitUnitXp={onSubmitUnitXp}
        onCompleteEvolutions={onCompleteEvolutions}
      />
    )

    fireEvent.click(screen.getByTestId('xp-condition-deployed'))
    fireEvent.click(screen.getByTestId('xp-condition-survived'))
    fireEvent.click(screen.getByTestId('wizard-next-button'))

    // F8: assert submitted XP value is correct (deployed + survived = 2)
    await waitFor(() => {
      expect(onSubmitUnitXp).toHaveBeenCalledWith('unit-1', 2, PARTICIPANT_ID)
    })

    await waitFor(() => {
      expect(screen.getByTestId('wizard-progress').textContent).toMatch(/2\s*\/\s*2/)
    })

    fireEvent.click(screen.getByTestId('wizard-back-button'))

    await waitFor(() => {
      expect((screen.getByTestId('xp-condition-deployed') as HTMLInputElement).checked).toBe(true)
      expect((screen.getByTestId('xp-condition-survived') as HTMLInputElement).checked).toBe(true)
      expect(screen.getByTestId('wizard-xp-total').textContent).toContain('2')
    })
  })

  it('[XP-CB-005] re-entry shows "Précédemment" hint when previousXpGained is set', () => {
    const unitsReEntry = [
      { id: 'unit-1', name: 'Hallebardiers', type: 'Infanterie', xp: 8, previousXpGained: 3 },
    ]
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={unitsReEntry}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByTestId('wizard-previous-xp').textContent).toContain('3 XP')
  })

  it('[XP-CB-006] re-entry warning appears when previousXpGained > 0 and total is 0', () => {
    const unitsReEntry = [
      { id: 'unit-1', name: 'Hallebardiers', type: 'Infanterie', xp: 8, previousXpGained: 3 },
    ]
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={unitsReEntry}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    const warning = screen.getByTestId('wizard-xp-warning')
    expect(warning.textContent).toContain('3 XP')
    expect(warning.textContent).toContain('0 XP')
  })

  it('[XP-CB-007] total XP is correctly summed — general_win gives +2', () => {
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={characterUnits}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    fireEvent.click(screen.getByTestId('xp-condition-deployed'))
    fireEvent.click(screen.getByTestId('xp-condition-general_win'))
    // deployed(1) + general_win(2) = 3
    expect(screen.getByTestId('wizard-xp-total').textContent).toContain('3')
  })

  it('[XP-CB-008] general_win and general_draw are mutually exclusive (checkboxes)', () => {
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={characterUnits}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    fireEvent.click(screen.getByTestId('xp-condition-general_win'))
    expect(screen.getByTestId('wizard-xp-total').textContent).toContain('2')

    fireEvent.click(screen.getByTestId('xp-condition-general_draw'))
    expect(screen.getByTestId('wizard-xp-total').textContent).toContain('1')
    expect((screen.getByTestId('xp-condition-general_win') as HTMLInputElement).checked).toBe(false)
    expect((screen.getByTestId('xp-condition-general_draw') as HTMLInputElement).checked).toBe(true)
  })

  it('[XP-CB-008b] general_win can be unchecked by clicking again', () => {
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={characterUnits}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    const generalWin = screen.getByTestId('xp-condition-general_win') as HTMLInputElement
    // Check
    fireEvent.click(generalWin)
    expect(generalWin.checked).toBe(true)
    expect(screen.getByTestId('wizard-xp-total').textContent).toContain('2')
    // Uncheck by clicking again
    fireEvent.click(generalWin)
    expect(generalWin.checked).toBe(false)
    expect(screen.getByTestId('wizard-xp-total').textContent).toContain('0')
  })

  it('[XP-CB-008c] back-nav preserves general_win selection for character', async () => {
    const mixedUnits = [
      { id: 'unit-1', name: 'Seigneur', type: 'Personnages', xp: 10 },
      { id: 'unit-2', name: 'Hallebardiers', type: 'Infanterie', xp: 5 },
    ]
    const onSubmitUnitXp = vi.fn().mockResolvedValue({ success: true, data: { unitId: 'unit-1', newXp: 12 } })
    const onCompleteEvolutions = vi.fn().mockResolvedValue({ success: true, data: { matchId: MATCH_ID } })

    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={mixedUnits}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        onSubmitUnitXp={onSubmitUnitXp}
        onCompleteEvolutions={onCompleteEvolutions}
      />
    )

    // Check general_win on character step
    fireEvent.click(screen.getByTestId('xp-condition-general_win'))
    expect((screen.getByTestId('xp-condition-general_win') as HTMLInputElement).checked).toBe(true)

    // Advance to next unit
    fireEvent.click(screen.getByTestId('wizard-next-button'))
    await waitFor(() => {
      expect(screen.getByTestId('wizard-progress').textContent).toMatch(/2\s*\/\s*2/)
    })

    // Go back
    fireEvent.click(screen.getByTestId('wizard-back-button'))
    await waitFor(() => {
      expect(screen.getByTestId('wizard-progress').textContent).toMatch(/1\s*\/\s*2/)
    })

    // general_win should still be checked
    expect((screen.getByTestId('xp-condition-general_win') as HTMLInputElement).checked).toBe(true)
    expect(screen.getByTestId('wizard-xp-total').textContent).toContain('2')
  })

  it('[XP-CB-009] re-entry + advance + back: hint disappears, checkboxes restored', async () => {
    const units = [
      { id: 'unit-1', name: 'Hallebardiers', type: 'Infanterie', xp: 8, previousXpGained: 3 },
      { id: 'unit-2', name: 'Chevaliers', type: 'Cavalerie', xp: 15, previousXpGained: 5 },
    ]
    const onSubmitUnitXp = vi.fn().mockResolvedValue({ success: true, data: { unitId: 'unit-1', newXp: 9 } })
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

    // Hint should show on entry
    expect(screen.getByTestId('wizard-previous-xp')).not.toBeNull()

    // Check deployed then advance
    fireEvent.click(screen.getByTestId('xp-condition-deployed'))
    fireEvent.click(screen.getByTestId('wizard-next-button'))

    await waitFor(() => {
      expect(screen.getByTestId('wizard-progress').textContent).toMatch(/2\s*\/\s*2/)
    })

    // Go back — saved state takes priority, hint should NOT show
    fireEvent.click(screen.getByTestId('wizard-back-button'))

    await waitFor(() => {
      expect((screen.getByTestId('xp-condition-deployed') as HTMLInputElement).checked).toBe(true)
      expect(screen.queryByTestId('wizard-previous-xp')).toBeNull()
    })
  })

  it('[XP-CB-010] accessibility: role="group" with aria-label is present', () => {
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={infantryUnits}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    const group = screen.getByRole('group', { name: /conditions d'xp/i })
    expect(group).not.toBeNull()
  })

  it('[XP-CB-011] general conditions render as checkboxes in accessible group (not radios)', () => {
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={characterUnits}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    const generalWin = screen.getByTestId('xp-condition-general_win') as HTMLInputElement
    expect(generalWin.type).toBe('checkbox')
    const generalDraw = screen.getByTestId('xp-condition-general_draw') as HTMLInputElement
    expect(generalDraw.type).toBe('checkbox')
    // No "Aucun (pas le général)" option
    expect(screen.queryByTestId('xp-condition-general_none')).toBeNull()
    // Accessible group wrapping general conditions
    const group = screen.getByRole('group', { name: /général/i })
    expect(group).not.toBeNull()
  })

  it('[XP-CB-012] re-entry warning disappears when a checkbox is checked', () => {
    const unitsReEntry = [
      { id: 'unit-1', name: 'Hallebardiers', type: 'Infanterie', xp: 8, previousXpGained: 3 },
    ]
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={unitsReEntry}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    // Warning should be visible initially
    expect(screen.getByTestId('wizard-xp-warning')).not.toBeNull()

    // Check a condition — total > 0, warning should disappear
    fireEvent.click(screen.getByTestId('xp-condition-deployed'))
    expect(screen.queryByTestId('wizard-xp-warning')).toBeNull()
  })

  it('[XP-CB-013] mixed army: character shows character conditions, then unit shows unit conditions', async () => {
    const mixedUnits = [
      { id: 'char-1', name: 'Seigneur de Guerre', type: 'Personnages', xp: 20 },
      { id: 'unit-1', name: 'Hallebardiers', type: 'Infanterie', xp: 5 },
    ]
    const onSubmitUnitXp = vi.fn().mockResolvedValue({ success: true, data: { unitId: 'char-1', newXp: 22 } })
    const onCompleteEvolutions = vi.fn().mockResolvedValue({ success: true, data: { matchId: MATCH_ID } })

    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={mixedUnits}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        onSubmitUnitXp={onSubmitUnitXp}
        onCompleteEvolutions={onCompleteEvolutions}
      />
    )

    // Step 1: character — should show character conditions
    expect(screen.getByTestId('xp-condition-general_win')).not.toBeNull()
    expect(screen.getByTestId('xp-condition-alive')).not.toBeNull()
    expect(screen.queryByTestId('xp-condition-survived')).toBeNull()

    // Advance to step 2
    fireEvent.click(screen.getByTestId('xp-condition-deployed'))
    fireEvent.click(screen.getByTestId('wizard-next-button'))

    await waitFor(() => {
      expect(screen.getByTestId('wizard-unit-name').textContent).toContain('Hallebardiers')
    })

    // Step 2: unit — should show unit conditions, not character conditions
    expect(screen.getByTestId('xp-condition-survived')).not.toBeNull()
    expect(screen.getByTestId('xp-condition-feat_destroy_unit')).not.toBeNull()
    expect(screen.queryByTestId('xp-condition-general_win')).toBeNull()
    expect(screen.queryByTestId('xp-condition-alive')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Task 13 — initial-xp mode tests
// ---------------------------------------------------------------------------

describe('[AC3,AC4] PostMatchWizard — initial-xp mode', () => {
  it('[INIT-XP-001] renders numeric input instead of checkboxes when mode="initial-xp"', () => {
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        mode="initial-xp"
        units={sampleUnits}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByTestId('wizard-xp-numeric')).not.toBeNull()
    expect(screen.getByTestId('wizard-xp-numeric-input')).not.toBeNull()
    expect(screen.queryByTestId('wizard-xp-checkboxes')).toBeNull()
  })

  it('[INIT-XP-002] shows "XP initiale" mode header', () => {
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        mode="initial-xp"
        units={sampleUnits}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByTestId('wizard-mode-header').textContent).toContain('XP initiale')
  })

  it('[INIT-XP-003] numeric input defaults to 0 on first entry', () => {
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        mode="initial-xp"
        units={sampleUnits}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    const input = screen.getByTestId('wizard-xp-numeric-input') as HTMLInputElement
    expect(input.value).toBe('0')
  })

  it('[INIT-XP-004] pre-fills numeric input with previousXpGained on re-entry', () => {
    const unitsWithPrevXp = [
      { id: 'unit-1', name: 'Hallebardiers', type: 'Infanterie', xp: 15, previousXpGained: 15 },
    ]
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        mode="initial-xp"
        units={unitsWithPrevXp}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    const input = screen.getByTestId('wizard-xp-numeric-input') as HTMLInputElement
    expect(input.value).toBe('15')
  })

  it('[INIT-XP-005] submits entered numeric value via onSubmitUnitXp', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ success: true, data: { unitId: 'unit-1', newXp: 45 } })
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        mode="initial-xp"
        units={singleUnit}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        onSubmitUnitXp={onSubmit}
        onCompleteEvolutions={vi.fn().mockResolvedValue({ success: true, data: { matchId: MATCH_ID } })}
      />
    )
    const input = screen.getByTestId('wizard-xp-numeric-input') as HTMLInputElement
    fireEvent.change(input, { target: { value: '45' } })
    fireEvent.click(screen.getByTestId('wizard-next-button'))
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('unit-1', 45, PARTICIPANT_ID)
    })
  })

  it('[INIT-XP-006] does not show XP checkboxes in initial-xp mode', () => {
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        mode="initial-xp"
        units={sampleUnits}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.queryByTestId('xp-condition-deployed')).toBeNull()
    expect(screen.queryByTestId('xp-condition-survived')).toBeNull()
  })

  it('[INIT-XP-007] post-match mode (default) still shows checkboxes', () => {
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={sampleUnits}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByTestId('wizard-xp-checkboxes')).not.toBeNull()
    expect(screen.queryByTestId('wizard-xp-numeric')).toBeNull()
  })
})
