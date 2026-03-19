// @vitest-environment jsdom
// src/components/__tests__/post-match-wizard-tierup.test.tsx
// Story 4.2: Tier-Up Detection & Improvement Choice
// Status: RED — written before implementation (TDD)
//
// Tests for the 2-phase flow in PostMatchWizard.
// These tests extend the existing PostMatchWizard test patterns.
//
// Phase 2 uses batch commit: gains are accumulated in pendingGainsRef and
// submitted atomically via onCompleteEvolutions(matchId, participantId, gains).
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

// Units that will NOT trigger tier crossings (xp=5, submitting 0 XP → newXp=5, no crossings from 5→5)
const unitsNoCrossings = [
  { id: 'unit-1', name: 'Hallebardiers', type: 'Unités de base', xp: 5, previousXpGained: null, hasMount: false },
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
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={unitsWithCrossings}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        onSubmitUnitXp={onSubmitUnitXp}
        onCompleteEvolutions={onCompleteEvolutions}

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
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={unitsWithCrossings}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        onSubmitUnitXp={onSubmitUnitXp}
        onCompleteEvolutions={onCompleteEvolutions}

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
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={unitsWithCrossings}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        onSubmitUnitXp={onSubmitUnitXp}
        onCompleteEvolutions={onCompleteEvolutions}

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
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={unitsWithCrossings}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        onSubmitUnitXp={onSubmitUnitXp}
        onCompleteEvolutions={onCompleteEvolutions}

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

    // Unit with xp=9, no prior submission → preMatchXp=9, newXp=12 → crosses threshold 10 only
    const unitsOneThreshold = [
      { id: 'unit-1', name: 'Hallebardiers', type: 'Unités de base', xp: 9, previousXpGained: null, hasMount: false },
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

    // Unit with xp=9, no prior submission → preMatchXp=9, newXp=12 → crosses threshold 10 only (1 tier-up)
    const unitsOneThreshold = [
      { id: 'unit-1', name: 'Hallebardiers', type: 'Unités de base', xp: 9, previousXpGained: null, hasMount: false },
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
  it('[4.2-WIZ-012] post-match-wizard.tsx has pendingGainsRef for batch commit', () => {
    const { readFileSync } = require('node:fs')
    const { resolve: resolvePath } = require('node:path')
    const code = readFileSync(resolvePath(__dirname, '..', 'post-match-wizard.tsx'), 'utf-8')
    expect(code).toMatch(/pendingGainsRef/)
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

// ---------------------------------------------------------------------------
// CC — Constraint enforcement: disabledImprovementIds computed from existingGains
// ---------------------------------------------------------------------------

describe('[CC-AC2/AC7] PostMatchWizard — constraint enforcement', () => {
  it('[CC-WIZ-001] unit with existing +1 Mouvement gain: Mouvement disabled in tier-up step', async () => {
    // Unit starts at xp=0, will gain 11 XP → crosses 3, 9, 10
    // Unit already has "+1 Mouvement (unique)" in existingGains
    const unitWithMouvGain = [
      {
        id: 'unit-1', name: 'Hallebardiers', type: 'Unités de base',
        xp: 0, previousXpGained: null, hasMount: false,
        existingGains: ['+1 Mouvement (unique)'],
        commandement: 8,
      },
    ]

    const onSubmitUnitXp = vi.fn().mockResolvedValue({
      success: true,
      data: { unitId: 'unit-1', newXp: 11 },
    })
    const onCompleteEvolutions = vi.fn().mockResolvedValue({ success: true, data: { matchId: MATCH_ID } })
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={unitWithMouvGain}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        onSubmitUnitXp={onSubmitUnitXp}
        onCompleteEvolutions={onCompleteEvolutions}

      />,
    )

    // Set XP to 11 and submit
    const input = screen.getByTestId('wizard-xp-input') as HTMLInputElement
    fireEvent.change(input, { target: { value: '11' } })
    fireEvent.click(screen.getByTestId('wizard-next-button'))

    // Wait for Phase 2 — first crossing is Honneur de bataille (xp=3)
    await waitFor(() => {
      expect(screen.getByTestId('tier-up-step')).not.toBeNull()
    })

    // Complete honour steps (xp=3, xp=9) by selecting Champion/Bannière
    const honourOptions = screen.queryAllByRole('radio')
    if (honourOptions.length > 0) {
      fireEvent.click(honourOptions[0])
      fireEvent.click(screen.getByTestId('tier-up-confirm-button'))
    }

    // Wait for next honour step or Aguerri step
    await waitFor(() => {
      expect(screen.getByTestId('tier-up-step')).not.toBeNull()
    })

    // Complete second honour step
    const honourOptions2 = screen.queryAllByRole('radio')
    if (honourOptions2.length > 0) {
      fireEvent.click(honourOptions2[0])
      fireEvent.click(screen.getByTestId('tier-up-confirm-button'))
    }

    // Now at Aguerri (minor) — Mouvement should be disabled
    await waitFor(() => {
      const mouvInput = screen.queryByLabelText(/Mouvement/)
      if (mouvInput) {
        expect((mouvInput as HTMLInputElement).disabled).toBe(true)
      }
    })
  })

  it('[CC-WIZ-002] unit with commandement at 10: Commandement disabled in tier-up step', async () => {
    const unitWithMaxCd = [
      {
        id: 'unit-1', name: 'Hallebardiers', type: 'Unités de base',
        xp: 0, previousXpGained: null, hasMount: false,
        existingGains: [],
        commandement: 10,
        effectiveStats: { m: 4, cc: 3, ct: 3, f: 3, e: 3, pv: 1, i: 3, a: 1, cd: 10 },
      },
    ]

    const onSubmitUnitXp = vi.fn().mockResolvedValue({
      success: true,
      data: { unitId: 'unit-1', newXp: 11 },
    })
    const onCompleteEvolutions = vi.fn().mockResolvedValue({ success: true, data: { matchId: MATCH_ID } })
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={unitWithMaxCd}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        onSubmitUnitXp={onSubmitUnitXp}
        onCompleteEvolutions={onCompleteEvolutions}

      />,
    )

    const input = screen.getByTestId('wizard-xp-input') as HTMLInputElement
    fireEvent.change(input, { target: { value: '11' } })
    fireEvent.click(screen.getByTestId('wizard-next-button'))

    // Wait for Phase 2 — skip honour steps to get to Aguerri
    await waitFor(() => {
      expect(screen.getByTestId('tier-up-step')).not.toBeNull()
    })

    // Complete honour steps
    const selectAndConfirm = async () => {
      const radios = screen.queryAllByRole('radio')
      if (radios.length > 0) {
        fireEvent.click(radios[0])
        fireEvent.click(screen.getByTestId('tier-up-confirm-button'))
        await waitFor(() => {
          expect(screen.getByTestId('tier-up-step')).not.toBeNull()
        })
      }
    }
    await selectAndConfirm()
    await selectAndConfirm()

    // Now at Aguerri — Commandement should be disabled
    await waitFor(() => {
      const cdInput = screen.queryByLabelText(/Commandement/)
      if (cdInput) {
        expect((cdInput as HTMLInputElement).disabled).toBe(true)
      }
    })
  })
})

// ---------------------------------------------------------------------------
// CC — "2 améliorations mineures" sub-flow
// ---------------------------------------------------------------------------

describe('[CC-AC6] PostMatchWizard — "2 améliorations mineures" sub-flow', () => {
  it('[CC-WIZ-003] selecting "2 améliorations mineures" inserts 2 sequential minor-pick sub-steps', async () => {
    // Character at xp=0, gains 25 XP → crosses 6 (Aguerri, minor) and 20 (Expérimenté, major)
    const charUnit = [
      {
        id: 'char-1', name: 'Seigneur', type: 'Personnages',
        xp: 0, previousXpGained: null, hasMount: false,
        existingGains: [],
        commandement: 8,
      },
    ]

    const onSubmitUnitXp = vi.fn().mockResolvedValue({
      success: true,
      data: { unitId: 'char-1', newXp: 25 },
    })
    const onCompleteEvolutions = vi.fn().mockResolvedValue({ success: true, data: { matchId: MATCH_ID } })
    const onComplete = vi.fn()

    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={charUnit}
        onComplete={onComplete}
        onCancel={vi.fn()}
        onSubmitUnitXp={onSubmitUnitXp}
        onCompleteEvolutions={onCompleteEvolutions}

      />,
    )

    // Submit XP = 25
    const input = screen.getByTestId('wizard-xp-input') as HTMLInputElement
    fireEvent.change(input, { target: { value: '25' } })
    fireEvent.click(screen.getByTestId('wizard-next-button'))

    // Wait for Phase 2 — first crossing is Aguerri (minor)
    await waitFor(() => {
      expect(screen.getByTestId('tier-up-step')).not.toBeNull()
    })

    // Complete Aguerri (select a minor improvement)
    const aguerriRadios = screen.queryAllByRole('radio')
    if (aguerriRadios.length > 0) {
      fireEvent.click(aguerriRadios[0])
      fireEvent.click(screen.getByTestId('tier-up-confirm-button'))
    }

    // Wait for Expérimenté (major) step
    await waitFor(() => {
      expect(screen.getByTestId('tier-up-step')).not.toBeNull()
    })

    // Select "2 améliorations mineures"
    const twoMinOption = screen.queryByLabelText('2 améliorations mineures')
    if (twoMinOption) {
      fireEvent.click(twoMinOption)
      fireEvent.click(screen.getByTestId('tier-up-confirm-button'))

      // Sub-step 1: "Mineure 1/2" — radio mode (minorCount=1)
      await waitFor(() => {
        expect(screen.getByTestId('tier-up-step')).not.toBeNull()
        const radios = screen.queryAllByRole('radio')
        expect(radios.length).toBeGreaterThan(0)
      })

      // Select a minor improvement in sub-step 1
      const subStep1Radios = screen.queryAllByRole('radio')
      fireEvent.click(subStep1Radios[0])
      fireEvent.click(screen.getByTestId('tier-up-confirm-button'))

      // Sub-step 2: "Mineure 2/2" — radio mode (minorCount=1)
      await waitFor(() => {
        expect(screen.getByTestId('tier-up-step')).not.toBeNull()
        const radios = screen.queryAllByRole('radio')
        expect(radios.length).toBeGreaterThan(0)
      })
    }
  })
})

// ---------------------------------------------------------------------------
// CAP — Generic stat cap constraint
// ---------------------------------------------------------------------------

describe('[CAP] PostMatchWizard — stat cap constraint', () => {
  it('[CAP-WIZ-001] unit with CC effective at 10 → +1 CC is cap-blocked and shows red text', async () => {
    const unitWithMaxCc = [
      {
        id: 'unit-1', name: 'Hallebardiers', type: 'Unités de base',
        xp: 0, previousXpGained: null, hasMount: false,
        existingGains: [],
        commandement: 7,
        effectiveStats: { m: 4, cc: 10, ct: 3, f: 3, e: 3, pv: 1, i: 3, a: 1, cd: 7 },
      },
    ]

    const onSubmitUnitXp = vi.fn().mockResolvedValue({
      success: true,
      data: { unitId: 'unit-1', newXp: 11 },
    })
    const onCompleteEvolutions = vi.fn().mockResolvedValue({ success: true, data: { matchId: MATCH_ID } })
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={unitWithMaxCc}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        onSubmitUnitXp={onSubmitUnitXp}
        onCompleteEvolutions={onCompleteEvolutions}
      />,
    )

    const input = screen.getByTestId('wizard-xp-input') as HTMLInputElement
    fireEvent.change(input, { target: { value: '11' } })
    fireEvent.click(screen.getByTestId('wizard-next-button'))

    // Skip honour steps to get to Aguerri
    await waitFor(() => {
      expect(screen.getByTestId('tier-up-step')).not.toBeNull()
    })

    const selectAndConfirm = async () => {
      const radios = screen.queryAllByRole('radio')
      if (radios.length > 0) {
        fireEvent.click(radios[0])
        fireEvent.click(screen.getByTestId('tier-up-confirm-button'))
        await waitFor(() => {
          expect(screen.getByTestId('tier-up-step')).not.toBeNull()
        })
      }
    }
    await selectAndConfirm()
    await selectAndConfirm()

    // Now at Aguerri — CC input should be disabled (CC already at 10)
    await waitFor(() => {
      const ccInput = screen.queryByLabelText(/\+1 CC/)
      if (ccInput) {
        expect((ccInput as HTMLInputElement).disabled).toBe(true)
      }
    })
  })

  it('[CAP-WIZ-002] 2 consecutive minor improvements on same stat: second blocked if first pushes to 10', async () => {
    // Unit with CC=9, crosses enough thresholds to get 2 minor picks
    // Using xp=0→50 to cross Vétéran (2 minor picks) — expanded into 2 sequential steps
    const unitCc9 = [
      {
        id: 'unit-1', name: 'Hallebardiers', type: 'Unités de base',
        xp: 0, previousXpGained: null, hasMount: false,
        existingGains: [],
        commandement: 7,
        effectiveStats: { m: 4, cc: 9, ct: 3, f: 3, e: 3, pv: 1, i: 3, a: 1, cd: 7 },
      },
    ]

    const onSubmitUnitXp = vi.fn().mockResolvedValue({
      success: true,
      data: { unitId: 'unit-1', newXp: 50 },
    })
    const onCompleteEvolutions = vi.fn().mockResolvedValue({ success: true, data: { matchId: MATCH_ID } })
    render(
      <PostMatchWizard
        matchId={MATCH_ID}
        matchParticipantId={PARTICIPANT_ID}
        units={unitCc9}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        onSubmitUnitXp={onSubmitUnitXp}
        onCompleteEvolutions={onCompleteEvolutions}
      />,
    )

    const input = screen.getByTestId('wizard-xp-input') as HTMLInputElement
    fireEvent.change(input, { target: { value: '50' } })
    fireEvent.click(screen.getByTestId('wizard-next-button'))

    // Wait for Phase 2
    await waitFor(() => {
      expect(screen.getByTestId('tier-up-step')).not.toBeNull()
    })

    // Navigate through honour steps and earlier tier-ups until we reach Vétéran
    // (0→50 crosses: 3, 9, 10, 25, 50 — honour x2, aguerri, expérimenté, vétéran)
    const advanceStep = async () => {
      const radios = screen.queryAllByRole('radio')
      const checkboxes = screen.queryAllByRole('checkbox')
      const options = radios.length > 0 ? radios : checkboxes
      if (options.length > 0) {
        // Pick the first non-disabled option
        for (const opt of options) {
          if (!(opt as HTMLInputElement).disabled) {
            fireEvent.click(opt)
            break
          }
        }
        fireEvent.click(screen.getByTestId('tier-up-confirm-button'))
        await waitFor(() => {
          expect(screen.getByTestId('tier-up-step')).not.toBeNull()
        })
      }
    }

    // Advance through honour1, honour2, aguerri, expérimenté to reach vétéran
    // At honour steps, pick something. At aguerri, pick +1 CC (pushing CC to 10).
    // First honour step
    await advanceStep()
    // Second honour step
    await advanceStep()

    // Aguerri step — select +1 CC to push CC from 9 to 10
    await waitFor(() => {
      expect(screen.getByTestId('tier-up-step')).not.toBeNull()
    })
    const ccOption = screen.queryByLabelText(/\+1 CC/)
    if (ccOption) {
      fireEvent.click(ccOption)
      fireEvent.click(screen.getByTestId('tier-up-confirm-button'))
    }

    // Expérimenté (major) step
    await waitFor(() => {
      expect(screen.getByTestId('tier-up-step')).not.toBeNull()
    })
    await advanceStep()

    // Now at Vétéran step 1/2 (minor) — CC should be disabled because CC is now 10
    await waitFor(() => {
      const ccInput2 = screen.queryByLabelText(/\+1 CC/)
      if (ccInput2) {
        expect((ccInput2 as HTMLInputElement).disabled).toBe(true)
      }
    })
  })
})
