// @vitest-environment jsdom
// src/components/__tests__/post-match-wizard-tierup.test.tsx
// Story 4.2: Tier-Up Detection & Improvement Choice
// Status: RED — written before implementation (TDD)
//
// Tests for the 2-phase flow in PostMatchWizard.
// These tests extend the existing PostMatchWizard test patterns.
//
// Phase 2 requires new props on PostMatchWizard:
//   - onSubmitTierUp: (unitId, matchParticipantId, improvements) => Promise<ServerResult>
//
// All tests will fail until the Phase 2 implementation is complete.
//
// Covers Tasks 12.1–12.6 (AC: 1, 6, 8, 9)

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PostMatchWizard } from '../post-match-wizard'

// ---------------------------------------------------------------------------
// Helpers — test fixtures
// ---------------------------------------------------------------------------

const MATCH_ID = 'match-4-2'
const PARTICIPANT_ID = 'participant-4-2'

// Units that WILL trigger tier crossings when XP=11 is submitted (old xp=0, new xp=11 → crosses 3, 9, 10)
const unitsWithCrossings = [
  { id: 'unit-1', name: 'Hallebardiers', type: 'Unités de base', xp: 0, previousXpGained: null, hasMount: false },
]

// Units that will NOT trigger tier crossings (old xp=5, new xp=5, delta=0)
const unitsNoCrossings = [
  { id: 'unit-1', name: 'Hallebardiers', type: 'Unités de base', xp: 5, previousXpGained: 5, hasMount: false },
]


// ---------------------------------------------------------------------------
// Task 12.1 — All XP entered + tier crossings → Phase 2 starts
// AC: 1
// ---------------------------------------------------------------------------

describe('[AC1][P0] PostMatchWizard — Phase 2 starts after XP with crossings (Task 12.1)', () => {
  it('[4.2-WIZ-001] after last XP step with crossings: Phase 2 TierUpStep is displayed', async () => {
    // newXp=11 crosses thresholds at 3, 9, 10
    const onSubmitUnitXp = vi.fn().mockResolvedValue({
      success: true,
      data: { unitId: 'unit-1', newXp: 11 },
    })
    const onCompleteEvolutions = vi.fn().mockResolvedValue({ success: true, data: { matchId: MATCH_ID } })
    const onSubmitTierUp = vi.fn().mockResolvedValue({
      success: true,
      data: { unitId: 'unit-1', gainsCreated: 1 },
    })

    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={unitsWithCrossings}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        onSubmitUnitXp={onSubmitUnitXp}
        onCompleteEvolutions={onCompleteEvolutions}
        onSubmitTierUp={onSubmitTierUp}
      />
    )

    // Phase 1: submit XP for only unit
    fireEvent.click(screen.getByTestId('wizard-next-button'))

    // Phase 2 should now be active: TierUpStep visible
    await waitFor(() => {
      expect(screen.getByTestId('tier-up-step')).not.toBeNull()
    })
  })

  it('[4.2-WIZ-002] Phase 2: progress indicator shows "Amélioration 1 / N"', async () => {
    const onSubmitUnitXp = vi.fn().mockResolvedValue({
      success: true,
      data: { unitId: 'unit-1', newXp: 11 },
    })
    const onCompleteEvolutions = vi.fn().mockResolvedValue({ success: true, data: { matchId: MATCH_ID } })
    const onSubmitTierUp = vi.fn().mockResolvedValue({
      success: true,
      data: { unitId: 'unit-1', gainsCreated: 1 },
    })

    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={unitsWithCrossings}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        onSubmitUnitXp={onSubmitUnitXp}
        onCompleteEvolutions={onCompleteEvolutions}
        onSubmitTierUp={onSubmitTierUp}
      />
    )

    fireEvent.click(screen.getByTestId('wizard-next-button'))

    await waitFor(() => {
      const progress = screen.getByTestId('wizard-progress')
      // Phase 2 progress: "Amélioration 1 / N" where N >= 1
      expect(progress.textContent).toMatch(/Am[eé]lioration\s+1/)
    })
  })

  it('[4.2-WIZ-003] Phase 1 last step button text is always "Suivant" (not "Terminer")', () => {
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={unitsWithCrossings}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        onSubmitUnitXp={vi.fn()}
        onCompleteEvolutions={vi.fn()}
        onSubmitTierUp={vi.fn()}
      />
    )
    // Single unit — but during Phase 1, button should say "Suivant" not "Terminer"
    const btn = screen.getByTestId('wizard-next-button')
    expect(btn.textContent).toMatch(/Suivant/)
    expect(btn.textContent).not.toMatch(/Terminer/)
  })
})

// ---------------------------------------------------------------------------
// Task 12.2 — All XP entered + no crossings → wizard completes directly
// AC: 6
// ---------------------------------------------------------------------------

describe('[AC6][P0] PostMatchWizard — no crossings → wizard completes without Phase 2 (Task 12.2)', () => {
  it('[4.2-WIZ-004] with no tier crossings: onCompleteEvolutions called (no Phase 2)', async () => {
    // delta=0 for all units (previousXpGained===xpGained) → no crossings
    const onSubmitUnitXp = vi.fn().mockResolvedValue({
      success: true,
      data: { unitId: 'unit-1', newXp: 5 },
    })
    const onCompleteEvolutions = vi.fn().mockResolvedValue({ success: true, data: { matchId: MATCH_ID } })
    const onComplete = vi.fn()

    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={unitsNoCrossings}
        onComplete={onComplete}
        onCancel={vi.fn()}
        onSubmitUnitXp={onSubmitUnitXp}
        onCompleteEvolutions={onCompleteEvolutions}
        onSubmitTierUp={vi.fn()}
      />
    )

    fireEvent.click(screen.getByTestId('wizard-next-button'))

    await waitFor(() => {
      expect(onCompleteEvolutions).toHaveBeenCalled()
      expect(onComplete).toHaveBeenCalled()
    })
  })

  it('[4.2-WIZ-005] with no tier crossings: TierUpStep is NEVER displayed', async () => {
    const onSubmitUnitXp = vi.fn().mockResolvedValue({
      success: true,
      data: { unitId: 'unit-1', newXp: 5 },
    })
    const onCompleteEvolutions = vi.fn().mockResolvedValue({ success: true, data: { matchId: MATCH_ID } })

    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={unitsNoCrossings}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        onSubmitUnitXp={onSubmitUnitXp}
        onCompleteEvolutions={onCompleteEvolutions}
        onSubmitTierUp={vi.fn()}
      />
    )

    fireEvent.click(screen.getByTestId('wizard-next-button'))

    // TierUpStep should NEVER appear
    await waitFor(() => {
      expect(screen.queryByTestId('tier-up-step')).toBeNull()
    })
  })
})

// ---------------------------------------------------------------------------
// Task 12.3 — Phase 2 back button navigates between tier-up steps
// AC: 8
// ---------------------------------------------------------------------------

describe('[AC8][P0] PostMatchWizard — Phase 2 back button between steps (Task 12.3)', () => {
  it('[4.2-WIZ-006] Phase 2 back button navigates to previous tier-up step', async () => {
    // newXp=11 crosses thresholds at 3, 9, 10 → 3 tier-up steps
    const onSubmitUnitXp = vi.fn().mockResolvedValue({
      success: true,
      data: { unitId: 'unit-1', newXp: 11 },
    })
    const onCompleteEvolutions = vi.fn().mockResolvedValue({ success: true, data: { matchId: MATCH_ID } })
    const onSubmitTierUp = vi.fn().mockResolvedValue({
      success: true,
      data: { unitId: 'unit-1', gainsCreated: 1 },
    })

    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={unitsWithCrossings}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        onSubmitUnitXp={onSubmitUnitXp}
        onCompleteEvolutions={onCompleteEvolutions}
        onSubmitTierUp={onSubmitTierUp}
      />
    )

    // Complete Phase 1
    fireEvent.click(screen.getByTestId('wizard-next-button'))

    // Phase 2 starts — confirm step 1
    await waitFor(() => {
      expect(screen.getByTestId('tier-up-step')).not.toBeNull()
    })

    // Select an improvement and advance to step 2
    const firstOption = screen.getAllByRole('radio')[0] ?? screen.getAllByRole('checkbox')[0]
    fireEvent.click(firstOption)
    fireEvent.click(screen.getByTestId('tier-up-confirm-button'))

    // Should now be on step 2
    await waitFor(() => {
      const progress = screen.getByTestId('wizard-progress')
      expect(progress.textContent).toMatch(/Am[eé]lioration\s+2/)
    })

    // Click back — should return to step 1
    fireEvent.click(screen.getByTestId('wizard-back-button'))

    await waitFor(() => {
      const progress = screen.getByTestId('wizard-progress')
      expect(progress.textContent).toMatch(/Am[eé]lioration\s+1/)
    })
  })
})

// ---------------------------------------------------------------------------
// Task 12.4 — Phase 2 back from first step returns to last XP step
// AC: 8
// ---------------------------------------------------------------------------

describe('[AC8][P0] PostMatchWizard — Phase 2 back from first step → last XP step (Task 12.4)', () => {
  it('[4.2-WIZ-007] Phase 2 first TierUpStep: back button returns to Phase 1 last XP step', async () => {
    const onSubmitUnitXp = vi.fn().mockResolvedValue({
      success: true,
      data: { unitId: 'unit-1', newXp: 11 },
    })
    const onCompleteEvolutions = vi.fn().mockResolvedValue({ success: true, data: { matchId: MATCH_ID } })
    const onSubmitTierUp = vi.fn().mockResolvedValue({
      success: true,
      data: { unitId: 'unit-1', gainsCreated: 1 },
    })

    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={unitsWithCrossings}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        onSubmitUnitXp={onSubmitUnitXp}
        onCompleteEvolutions={onCompleteEvolutions}
        onSubmitTierUp={onSubmitTierUp}
      />
    )

    // Complete Phase 1
    fireEvent.click(screen.getByTestId('wizard-next-button'))

    // Phase 2 step 1 is now active
    await waitFor(() => {
      expect(screen.getByTestId('tier-up-step')).not.toBeNull()
    })

    // Click back from Phase 2 step 1 → should return to Phase 1 (XP input visible)
    fireEvent.click(screen.getByTestId('wizard-back-button'))

    await waitFor(() => {
      // XP input should be visible again (Phase 1)
      expect(screen.getByTestId('wizard-xp-input')).not.toBeNull()
      // TierUpStep should be gone
      expect(screen.queryByTestId('tier-up-step')).toBeNull()
    })
  })

  it('[4.2-WIZ-008] after returning to Phase 1 from Phase 2, unit name is shown again', async () => {
    const onSubmitUnitXp = vi.fn().mockResolvedValue({
      success: true,
      data: { unitId: 'unit-1', newXp: 11 },
    })
    const onCompleteEvolutions = vi.fn().mockResolvedValue({ success: true, data: { matchId: MATCH_ID } })

    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={unitsWithCrossings}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        onSubmitUnitXp={onSubmitUnitXp}
        onCompleteEvolutions={onCompleteEvolutions}
        onSubmitTierUp={vi.fn()}
      />
    )

    // Complete Phase 1
    fireEvent.click(screen.getByTestId('wizard-next-button'))
    await waitFor(() => {
      expect(screen.getByTestId('tier-up-step')).not.toBeNull()
    })

    // Back to Phase 1
    fireEvent.click(screen.getByTestId('wizard-back-button'))

    await waitFor(() => {
      const unitName = screen.getByTestId('wizard-unit-name')
      expect(unitName.textContent).toContain('Hallebardiers')
    })
  })
})

// ---------------------------------------------------------------------------
// Task 12.5 — Phase 2 cancel calls onCancel
// AC: 9
// ---------------------------------------------------------------------------

describe('[AC9][P0] PostMatchWizard — Phase 2 cancel calls onCancel (Task 12.5)', () => {
  it('[4.2-WIZ-009] cancel button in Phase 2 calls onCancel', async () => {
    const onSubmitUnitXp = vi.fn().mockResolvedValue({
      success: true,
      data: { unitId: 'unit-1', newXp: 11 },
    })
    const onCompleteEvolutions = vi.fn().mockResolvedValue({ success: true, data: { matchId: MATCH_ID } })
    const onCancel = vi.fn()

    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={unitsWithCrossings}
        onComplete={vi.fn()}
        onCancel={onCancel}
        onSubmitUnitXp={onSubmitUnitXp}
        onCompleteEvolutions={onCompleteEvolutions}
        onSubmitTierUp={vi.fn()}
      />
    )

    // Complete Phase 1
    fireEvent.click(screen.getByTestId('wizard-next-button'))
    await waitFor(() => {
      expect(screen.getByTestId('tier-up-step')).not.toBeNull()
    })

    // Cancel in Phase 2
    fireEvent.click(screen.getByTestId('wizard-cancel-button'))

    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// Task 12.6 — Phase 2 "Terminer" on last step calls completeEvolutionsFn
// AC: 1
// ---------------------------------------------------------------------------

describe('[AC1][P0] PostMatchWizard — Phase 2 last step "Terminer" calls completeEvolutionsFn (Task 12.6)', () => {
  it('[4.2-WIZ-010] Phase 2: after last TierUpStep confirmed, completeEvolutionsFn is called', async () => {
    // Unit crosses XP threshold at 10 only (oldXp=9, newXp=12)
    const onSubmitUnitXp = vi.fn().mockResolvedValue({
      success: true,
      data: { unitId: 'unit-1', newXp: 12 },
    })
    const onCompleteEvolutions = vi.fn().mockResolvedValue({ success: true, data: { matchId: MATCH_ID } })
    const onComplete = vi.fn()
    const onSubmitTierUp = vi.fn().mockResolvedValue({
      success: true,
      data: { unitId: 'unit-1', gainsCreated: 1 },
    })

    // Unit with previousXpGained=9 and xp=9 → when xp becomes 12, oldXp=9, delta=3 → crosses 10
    const unitsOneThreshold = [
      { id: 'unit-1', name: 'Hallebardiers', type: 'Unités de base', xp: 9, previousXpGained: 9, hasMount: false },
    ]

    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={unitsOneThreshold}
        onComplete={onComplete}
        onCancel={vi.fn()}
        onSubmitUnitXp={onSubmitUnitXp}
        onCompleteEvolutions={onCompleteEvolutions}
        onSubmitTierUp={onSubmitTierUp}
      />
    )

    // Phase 1: submit some XP
    const xpInput = screen.getByTestId('wizard-xp-input')
    fireEvent.change(xpInput, { target: { value: '3' } })
    fireEvent.click(screen.getByTestId('wizard-next-button'))

    // Phase 2: select improvement and confirm
    await waitFor(() => {
      expect(screen.getByTestId('tier-up-step')).not.toBeNull()
    })

    // Select an improvement to enable the confirm button
    const firstOption = screen.getAllByRole('radio')[0] ?? screen.getAllByRole('checkbox')[0]
    fireEvent.click(firstOption)

    fireEvent.click(screen.getByTestId('tier-up-confirm-button'))

    // completeEvolutionsFn should be called after last tier-up confirmed
    await waitFor(() => {
      expect(onCompleteEvolutions).toHaveBeenCalled()
    })
  })

  it('[4.2-WIZ-011] Phase 2 last step button text is "Terminer"', async () => {
    // Unit crosses only one threshold
    const onSubmitUnitXp = vi.fn().mockResolvedValue({
      success: true,
      data: { unitId: 'unit-1', newXp: 12 },
    })
    const onCompleteEvolutions = vi.fn().mockResolvedValue({ success: true, data: { matchId: MATCH_ID } })

    const unitsOneThreshold = [
      { id: 'unit-1', name: 'Hallebardiers', type: 'Unités de base', xp: 9, previousXpGained: 9, hasMount: false },
    ]

    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={unitsOneThreshold}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        onSubmitUnitXp={onSubmitUnitXp}
        onCompleteEvolutions={onCompleteEvolutions}
        onSubmitTierUp={vi.fn()}
      />
    )

    const xpInput = screen.getByTestId('wizard-xp-input')
    fireEvent.change(xpInput, { target: { value: '3' } })
    fireEvent.click(screen.getByTestId('wizard-next-button'))

    await waitFor(() => {
      expect(screen.getByTestId('tier-up-step')).not.toBeNull()
    })

    // On the only (last) tier-up step, button text should be "Terminer"
    const confirmBtn = screen.getByTestId('tier-up-confirm-button')
    expect(confirmBtn.textContent).toMatch(/Terminer/)
  })
})

// ---------------------------------------------------------------------------
// Source file contract — PostMatchWizard Phase 2 props
// ---------------------------------------------------------------------------

describe('[AC1][P0] PostMatchWizard — source contract for Phase 2 (story 4.2)', () => {
  it('[4.2-WIZ-012] post-match-wizard.tsx accepts onSubmitTierUp prop', () => {
    const { readFileSync } = require('node:fs')
    const { resolve: resolvePath } = require('node:path')
    const code = readFileSync(resolvePath(__dirname, '..', 'post-match-wizard.tsx'), 'utf-8')
    expect(code).toMatch(/onSubmitTierUp/)
  })

  it('[4.2-WIZ-013] post-match-wizard.tsx contains phase state (xp/tierup)', () => {
    const { readFileSync } = require('node:fs')
    const { resolve: resolvePath } = require('node:path')
    const code = readFileSync(resolvePath(__dirname, '..', 'post-match-wizard.tsx'), 'utf-8')
    expect(code).toMatch(/['"]xp['"][\s\S]{0,200}['"]tierup['"]|['"]tierup['"][\s\S]{0,200}['"]xp['"]/)
  })

  it('[4.2-WIZ-014] post-match-wizard.tsx imports TierUpStep component', () => {
    const { readFileSync } = require('node:fs')
    const { resolve: resolvePath } = require('node:path')
    const code = readFileSync(resolvePath(__dirname, '..', 'post-match-wizard.tsx'), 'utf-8')
    expect(code).toMatch(/import[\s\S]{0,200}TierUpStep[\s\S]{0,100}tier-up-step/)
  })

  it('[4.2-WIZ-015] post-match-wizard.tsx calls detectTierCrossings', () => {
    const { readFileSync } = require('node:fs')
    const { resolve: resolvePath } = require('node:path')
    const code = readFileSync(resolvePath(__dirname, '..', 'post-match-wizard.tsx'), 'utf-8')
    expect(code).toMatch(/detectTierCrossings/)
  })

  it('[4.2-WIZ-016] post-match-wizard.tsx unit type includes hasMount field', () => {
    const { readFileSync } = require('node:fs')
    const { resolve: resolvePath } = require('node:path')
    const code = readFileSync(resolvePath(__dirname, '..', 'post-match-wizard.tsx'), 'utf-8')
    expect(code).toMatch(/hasMount\s*[:\?]/)
  })
})
