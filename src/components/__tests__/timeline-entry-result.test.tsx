// @vitest-environment jsdom
// src/components/__tests__/timeline-entry-result.test.tsx
// Story 3.3: Match Result Entry
// Status: RED — written before implementation (TDD)
//
// React component tests for the interactive result entry features added to TimelineEntry.
// Tests new props: isEditable, onResultSubmit — and UI state: isSelecting, isSubmitting.
//
// Follows the pattern established in tests/3-1-timeline-entry.test.tsx.
//
// Note: @vitest-environment jsdom overrides the global 'node' environment in vitest.config.ts
// because React component rendering requires a DOM.
//
// Covers Tasks 4.1–4.7 and story tasks 7.13–7.17.
// All tests will fail until the implementation is complete.

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TimelineEntry } from '../timeline-entry'

// ---------------------------------------------------------------------------
// Helpers — minimal test fixtures
// ---------------------------------------------------------------------------

const baseOpponent = { name: 'Légion de Fer', faction: 'Nains', playerName: 'Bob' }
const BASE_MATCH_ID = 'match-3-3'
const BASE_DATE = '2026-03-16T10:00:00.000Z'

// ---------------------------------------------------------------------------
// AC1, AC6 — Task 7.13: isEditable=true + result=null → 3 result buttons
// ---------------------------------------------------------------------------

describe('[AC1][AC6][P0] TimelineEntry — isEditable=true, result=null renders 3 selection buttons', () => {
  // AC: 1 — Task 7.13
  it('[3.3-COMP-001] renders data-testid="result-select-victory" button when isEditable=true and result=null', () => {
    render(
      <TimelineEntry
        matchId={BASE_MATCH_ID}
        opponent={baseOpponent}
        result={null}
        date={BASE_DATE}
        hasEvolutions={false}
        isEditable={true}
        onResultSubmit={vi.fn()}
      />
    )
    expect(screen.getByTestId('result-select-victory')).not.toBeNull()
  })

  // AC: 1 — Task 7.13
  it('[3.3-COMP-002] renders data-testid="result-select-defeat" button when isEditable=true and result=null', () => {
    render(
      <TimelineEntry
        matchId={BASE_MATCH_ID}
        opponent={baseOpponent}
        result={null}
        date={BASE_DATE}
        hasEvolutions={false}
        isEditable={true}
        onResultSubmit={vi.fn()}
      />
    )
    expect(screen.getByTestId('result-select-defeat')).not.toBeNull()
  })

  // AC: 1 — Task 7.13
  it('[3.3-COMP-003] renders data-testid="result-select-draw" button when isEditable=true and result=null', () => {
    render(
      <TimelineEntry
        matchId={BASE_MATCH_ID}
        opponent={baseOpponent}
        result={null}
        date={BASE_DATE}
        hasEvolutions={false}
        isEditable={true}
        onResultSubmit={vi.fn()}
      />
    )
    expect(screen.getByTestId('result-select-draw')).not.toBeNull()
  })

  // AC: 1 — Task 7.13: buttons have French labels
  it('[3.3-COMP-004] result selection buttons display French labels: Victoire, Defaite, Egalite', () => {
    render(
      <TimelineEntry
        matchId={BASE_MATCH_ID}
        opponent={baseOpponent}
        result={null}
        date={BASE_DATE}
        hasEvolutions={false}
        isEditable={true}
        onResultSubmit={vi.fn()}
      />
    )
    expect(screen.getByText(/Victoire/i)).not.toBeNull()
    expect(screen.getByText(/Défaite|Defaite/i)).not.toBeNull()
    expect(screen.getByText(/Égalité|Egalite/i)).not.toBeNull()
  })

  // AC: 1 — Task 7.13: no result badge shown when result=null (pending)
  it('[3.3-COMP-005] result=null with isEditable=true does not render result-badge (badge is selection state only)', () => {
    render(
      <TimelineEntry
        matchId={BASE_MATCH_ID}
        opponent={baseOpponent}
        result={null}
        date={BASE_DATE}
        hasEvolutions={false}
        isEditable={true}
        onResultSubmit={vi.fn()}
      />
    )
    expect(screen.queryByTestId('result-badge')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// AC2, AC5 — Task 7.14: isEditable=true + result set → badge + "Modifier" button
// ---------------------------------------------------------------------------

describe('[AC2][AC5][P0] TimelineEntry — isEditable=true, result=victory renders badge + Modifier button', () => {
  // AC: 2, 5 — Task 7.14
  it('[3.3-COMP-006] renders result badge when isEditable=true and result="victory"', () => {
    render(
      <TimelineEntry
        matchId={BASE_MATCH_ID}
        opponent={baseOpponent}
        result="victory"
        date={BASE_DATE}
        hasEvolutions={false}
        isEditable={true}
        onResultSubmit={vi.fn()}
      />
    )
    expect(screen.getByTestId('result-badge')).not.toBeNull()
  })

  // AC: 2, 5 — Task 7.14: "Modifier" link present with correct testid
  it('[3.3-COMP-007] renders data-testid="modify-result" button when isEditable=true and result is set', () => {
    render(
      <TimelineEntry
        matchId={BASE_MATCH_ID}
        opponent={baseOpponent}
        result="victory"
        date={BASE_DATE}
        hasEvolutions={false}
        isEditable={true}
        onResultSubmit={vi.fn()}
      />
    )
    expect(screen.getByTestId('modify-result')).not.toBeNull()
  })

  // AC: 2, 5 — Task 7.14: "Modifier" text visible
  it('[3.3-COMP-008] modify-result button contains "Modifier" text', () => {
    render(
      <TimelineEntry
        matchId={BASE_MATCH_ID}
        opponent={baseOpponent}
        result="victory"
        date={BASE_DATE}
        hasEvolutions={false}
        isEditable={true}
        onResultSubmit={vi.fn()}
      />
    )
    const modifyBtn = screen.getByTestId('modify-result')
    expect(modifyBtn.textContent).toMatch(/Modifier/i)
  })

  // AC: 5 — Task 7.14: tapping Modifier shows 3 selection buttons
  it('[3.3-COMP-009] clicking modify-result button shows the 3 selection buttons', () => {
    render(
      <TimelineEntry
        matchId={BASE_MATCH_ID}
        opponent={baseOpponent}
        result="victory"
        date={BASE_DATE}
        hasEvolutions={false}
        isEditable={true}
        onResultSubmit={vi.fn()}
      />
    )
    // Selection buttons NOT shown initially (result already set)
    expect(screen.queryByTestId('result-select-victory')).toBeNull()

    // Click Modifier
    fireEvent.click(screen.getByTestId('modify-result'))

    // Now all 3 selection buttons appear
    expect(screen.getByTestId('result-select-victory')).not.toBeNull()
    expect(screen.getByTestId('result-select-defeat')).not.toBeNull()
    expect(screen.getByTestId('result-select-draw')).not.toBeNull()
  })

  // AC: 5 — Task 7.14: defeat result also shows Modifier
  it('[3.3-COMP-010] renders modify-result button when isEditable=true and result="defeat"', () => {
    render(
      <TimelineEntry
        matchId={BASE_MATCH_ID}
        opponent={baseOpponent}
        result="defeat"
        date={BASE_DATE}
        hasEvolutions={false}
        isEditable={true}
        onResultSubmit={vi.fn()}
      />
    )
    expect(screen.getByTestId('modify-result')).not.toBeNull()
  })

  // AC: 5 — draw result also shows Modifier
  it('[3.3-COMP-011] renders modify-result button when isEditable=true and result="draw"', () => {
    render(
      <TimelineEntry
        matchId={BASE_MATCH_ID}
        opponent={baseOpponent}
        result="draw"
        date={BASE_DATE}
        hasEvolutions={false}
        isEditable={true}
        onResultSubmit={vi.fn()}
      />
    )
    expect(screen.getByTestId('modify-result')).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// AC6 — Task 7.15: isEditable=false → no selection buttons, no modify link
// ---------------------------------------------------------------------------

describe('[AC6][P0] TimelineEntry — isEditable=false (default) — backward compatibility', () => {
  // AC: 6 — Task 7.15: no selection buttons when isEditable=false
  it('[3.3-COMP-012] isEditable=false does not render result-select-victory button', () => {
    render(
      <TimelineEntry
        matchId={BASE_MATCH_ID}
        opponent={baseOpponent}
        result={null}
        date={BASE_DATE}
        hasEvolutions={false}
        isEditable={false}
      />
    )
    expect(screen.queryByTestId('result-select-victory')).toBeNull()
  })

  // AC: 6 — Task 7.15
  it('[3.3-COMP-013] isEditable=false does not render result-select-defeat button', () => {
    render(
      <TimelineEntry
        matchId={BASE_MATCH_ID}
        opponent={baseOpponent}
        result={null}
        date={BASE_DATE}
        hasEvolutions={false}
        isEditable={false}
      />
    )
    expect(screen.queryByTestId('result-select-defeat')).toBeNull()
  })

  // AC: 6 — Task 7.15
  it('[3.3-COMP-014] isEditable=false does not render result-select-draw button', () => {
    render(
      <TimelineEntry
        matchId={BASE_MATCH_ID}
        opponent={baseOpponent}
        result={null}
        date={BASE_DATE}
        hasEvolutions={false}
        isEditable={false}
      />
    )
    expect(screen.queryByTestId('result-select-draw')).toBeNull()
  })

  // AC: 6 — Task 7.15: no modify link with result set and isEditable=false
  it('[3.3-COMP-015] isEditable=false with result="victory" does not render modify-result button', () => {
    render(
      <TimelineEntry
        matchId={BASE_MATCH_ID}
        opponent={baseOpponent}
        result="victory"
        date={BASE_DATE}
        hasEvolutions={false}
        isEditable={false}
      />
    )
    expect(screen.queryByTestId('modify-result')).toBeNull()
  })

  // AC: 6 — Task 7.15: default behavior (no isEditable prop) is identical to isEditable=false
  it('[3.3-COMP-016] no isEditable prop (default) does not render selection buttons', () => {
    render(
      <TimelineEntry
        matchId={BASE_MATCH_ID}
        opponent={baseOpponent}
        result={null}
        date={BASE_DATE}
        hasEvolutions={false}
      />
    )
    expect(screen.queryByTestId('result-select-victory')).toBeNull()
    expect(screen.queryByTestId('result-select-defeat')).toBeNull()
    expect(screen.queryByTestId('result-select-draw')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// AC1, AC3 — Task 7.16: clicking a result button calls onResultSubmit
// ---------------------------------------------------------------------------

describe('[AC1][AC3][P0] TimelineEntry — result selection button calls onResultSubmit callback', () => {
  // AC: 1, 3 — Task 7.16: clicking victory button calls onResultSubmit with (matchId, 'victory')
  it('[3.3-COMP-017] clicking result-select-victory calls onResultSubmit with (matchId, "victory")', async () => {
    const onResultSubmit = vi.fn().mockResolvedValue(undefined)
    render(
      <TimelineEntry
        matchId={BASE_MATCH_ID}
        opponent={baseOpponent}
        result={null}
        date={BASE_DATE}
        hasEvolutions={false}
        isEditable={true}
        onResultSubmit={onResultSubmit}
      />
    )
    fireEvent.click(screen.getByTestId('result-select-victory'))
    await waitFor(() => {
      expect(onResultSubmit).toHaveBeenCalledWith(BASE_MATCH_ID, 'victory')
    })
  })

  // AC: 1, 3 — Task 7.16: clicking defeat button calls onResultSubmit with (matchId, 'defeat')
  it('[3.3-COMP-018] clicking result-select-defeat calls onResultSubmit with (matchId, "defeat")', async () => {
    const onResultSubmit = vi.fn().mockResolvedValue(undefined)
    render(
      <TimelineEntry
        matchId={BASE_MATCH_ID}
        opponent={baseOpponent}
        result={null}
        date={BASE_DATE}
        hasEvolutions={false}
        isEditable={true}
        onResultSubmit={onResultSubmit}
      />
    )
    fireEvent.click(screen.getByTestId('result-select-defeat'))
    await waitFor(() => {
      expect(onResultSubmit).toHaveBeenCalledWith(BASE_MATCH_ID, 'defeat')
    })
  })

  // AC: 1, 3 — Task 7.16: clicking draw button calls onResultSubmit with (matchId, 'draw')
  it('[3.3-COMP-019] clicking result-select-draw calls onResultSubmit with (matchId, "draw")', async () => {
    const onResultSubmit = vi.fn().mockResolvedValue(undefined)
    render(
      <TimelineEntry
        matchId={BASE_MATCH_ID}
        opponent={baseOpponent}
        result={null}
        date={BASE_DATE}
        hasEvolutions={false}
        isEditable={true}
        onResultSubmit={onResultSubmit}
      />
    )
    fireEvent.click(screen.getByTestId('result-select-draw'))
    await waitFor(() => {
      expect(onResultSubmit).toHaveBeenCalledWith(BASE_MATCH_ID, 'draw')
    })
  })
})

// ---------------------------------------------------------------------------
// AC6 — Task 7.17: buttons disabled during isSubmitting state
// ---------------------------------------------------------------------------

describe('[AC6][P0] TimelineEntry — buttons disabled during submission (isSubmitting state)', () => {
  // AC: 6 — Task 7.17: buttons are disabled when submission is in flight
  it('[3.3-COMP-020] all 3 result buttons are disabled while onResultSubmit is pending', async () => {
    // Create a promise that never resolves, simulating in-flight mutation
    let resolveSubmit!: () => void
    const pendingPromise = new Promise<void>((resolve) => { resolveSubmit = resolve })
    const onResultSubmit = vi.fn().mockReturnValue(pendingPromise)

    render(
      <TimelineEntry
        matchId={BASE_MATCH_ID}
        opponent={baseOpponent}
        result={null}
        date={BASE_DATE}
        hasEvolutions={false}
        isEditable={true}
        onResultSubmit={onResultSubmit}
      />
    )

    // Click the victory button to start submission
    fireEvent.click(screen.getByTestId('result-select-victory'))

    // Immediately after click, all buttons should be disabled
    await waitFor(() => {
      const victoryBtn = screen.getByTestId('result-select-victory') as HTMLButtonElement
      const defeatBtn = screen.getByTestId('result-select-defeat') as HTMLButtonElement
      const drawBtn = screen.getByTestId('result-select-draw') as HTMLButtonElement
      expect(victoryBtn.disabled).toBe(true)
      expect(defeatBtn.disabled).toBe(true)
      expect(drawBtn.disabled).toBe(true)
    })

    // Cleanup: resolve promise
    resolveSubmit()
  })

  // AC: 6 — Task 7.17: inline error message displayed on failure
  it('[3.3-COMP-021] displays data-testid="result-error" with French error message on submission failure', async () => {
    const errorMessage = 'Erreur serveur, veuillez réessayer'
    const onResultSubmit = vi.fn().mockRejectedValue(new Error(errorMessage))

    render(
      <TimelineEntry
        matchId={BASE_MATCH_ID}
        opponent={baseOpponent}
        result={null}
        date={BASE_DATE}
        hasEvolutions={false}
        isEditable={true}
        onResultSubmit={onResultSubmit}
      />
    )

    fireEvent.click(screen.getByTestId('result-select-defeat'))

    await waitFor(() => {
      const errorEl = screen.queryByTestId('result-error')
      expect(errorEl).not.toBeNull()
    })
  })

  // AC: 6 — Task 7.17: buttons re-enabled after error (isSubmitting → false on error)
  it('[3.3-COMP-022] buttons are re-enabled after submission failure', async () => {
    const onResultSubmit = vi.fn().mockRejectedValue(new Error('Echec'))

    render(
      <TimelineEntry
        matchId={BASE_MATCH_ID}
        opponent={baseOpponent}
        result={null}
        date={BASE_DATE}
        hasEvolutions={false}
        isEditable={true}
        onResultSubmit={onResultSubmit}
      />
    )

    fireEvent.click(screen.getByTestId('result-select-draw'))

    await waitFor(() => {
      const drawBtn = screen.getByTestId('result-select-draw') as HTMLButtonElement
      expect(drawBtn.disabled).toBe(false)
    })
  })
})

// ---------------------------------------------------------------------------
// AC6 — TimelineEntry component structural contract (new props + testids)
// ---------------------------------------------------------------------------

describe('[AC6][P0] TimelineEntry — source file structural contract for new props', () => {
  // AC: 6 — isEditable prop declared in TimelineEntryProps
  it('[3.3-COMP-023] timeline-entry.tsx declares isEditable in TimelineEntryProps', () => {
    const { readFileSync } = require('node:fs')
    const { resolve } = require('node:path')
    const filePath = resolve(__dirname, '..', 'timeline-entry.tsx')
    const code = readFileSync(filePath, 'utf-8')
    expect(code).toMatch(/isEditable/)
  })

  // AC: 1 — onResultSubmit prop declared in TimelineEntryProps
  it('[3.3-COMP-024] timeline-entry.tsx declares onResultSubmit in TimelineEntryProps', () => {
    const { readFileSync } = require('node:fs')
    const { resolve } = require('node:path')
    const filePath = resolve(__dirname, '..', 'timeline-entry.tsx')
    const code = readFileSync(filePath, 'utf-8')
    expect(code).toMatch(/onResultSubmit/)
  })

  // AC: 6 — data-testid attributes for selection buttons
  it('[3.3-COMP-025] timeline-entry.tsx contains data-testid="result-select-victory"', () => {
    const { readFileSync } = require('node:fs')
    const { resolve } = require('node:path')
    const filePath = resolve(__dirname, '..', 'timeline-entry.tsx')
    const code = readFileSync(filePath, 'utf-8')
    expect(code).toContain('result-select-${key}')
  })

  // AC: 6 — data-testid for modify button
  it('[3.3-COMP-026] timeline-entry.tsx contains data-testid="modify-result"', () => {
    const { readFileSync } = require('node:fs')
    const { resolve } = require('node:path')
    const filePath = resolve(__dirname, '..', 'timeline-entry.tsx')
    const code = readFileSync(filePath, 'utf-8')
    expect(code).toContain('data-testid="modify-result"')
  })

  // AC: 6 — data-testid for inline error
  it('[3.3-COMP-027] timeline-entry.tsx contains data-testid="result-error"', () => {
    const { readFileSync } = require('node:fs')
    const { resolve } = require('node:path')
    const filePath = resolve(__dirname, '..', 'timeline-entry.tsx')
    const code = readFileSync(filePath, 'utf-8')
    expect(code).toContain('data-testid="result-error"')
  })
})
