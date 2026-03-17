// @vitest-environment jsdom
// src/components/__tests__/timeline-entry-evolutions.test.tsx
// Story 4.1: Post-Match Flow — XP Entry per Unit & Character
// Status: RED — written before implementation (TDD)
//
// React component tests for the TimelineEntry evolution-entry features:
//   - onEvolutionStart prop
//   - "Saisir evolutions" link/button visible when hasEvolutions=false, result set, isEditable=true
//
// Follows the pattern established in src/components/__tests__/timeline-entry-result.test.tsx.
//
// Covers Task 10.31 (AC: 2)
// All tests will fail until the implementation is complete.

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TimelineEntry } from '../timeline-entry'

// ---------------------------------------------------------------------------
// Helpers — minimal test fixtures
// ---------------------------------------------------------------------------

const baseOpponent = { name: 'Légion de Fer', faction: 'Nains', playerName: 'Bob' }
const BASE_MATCH_ID = 'match-4-1'
const BASE_DATE = '2026-03-17T10:00:00.000Z'

// ---------------------------------------------------------------------------
// 10.31 — TimelineEntry shows "Saisir evolutions" when hasEvolutions=false, result set, isEditable=true
// AC: 2
// ---------------------------------------------------------------------------

describe('[AC2][P0] TimelineEntry — "Saisir evolutions" link (Task 8.1)', () => {
  // 10.31 — renders "Saisir evolutions" link/button when hasEvolutions=false, result set, isEditable=true
  it('[4.1-TLE-001] renders "Saisir evolutions" when hasEvolutions=false, result="victory", isEditable=true', () => {
    render(
      <TimelineEntry
        matchId={BASE_MATCH_ID}
        opponent={baseOpponent}
        result="victory"
        date={BASE_DATE}
        hasEvolutions={false}
        isEditable={true}
        onResultSubmit={vi.fn()}
        onEvolutionStart={vi.fn()}
      />
    )
    expect(screen.getByText(/Saisir.*(évolutions|evolutions)/i)).not.toBeNull()
  })

  // 10.31 — "Saisir evolutions" calls onEvolutionStart(matchId) when clicked
  it('[4.1-TLE-002] clicking "Saisir evolutions" calls onEvolutionStart with matchId', async () => {
    const onEvolutionStart = vi.fn()

    render(
      <TimelineEntry
        matchId={BASE_MATCH_ID}
        opponent={baseOpponent}
        result="victory"
        date={BASE_DATE}
        hasEvolutions={false}
        isEditable={true}
        onResultSubmit={vi.fn()}
        onEvolutionStart={onEvolutionStart}
      />
    )

    const link = screen.getByText(/Saisir.*(évolutions|evolutions)/i)
    fireEvent.click(link)

    await waitFor(() => {
      expect(onEvolutionStart).toHaveBeenCalledWith(BASE_MATCH_ID)
    })
  })

  // 10.31 — "Saisir evolutions" NOT shown when hasEvolutions=true (already completed)
  it('[4.1-TLE-003] does not render "Saisir evolutions" when hasEvolutions=true', () => {
    render(
      <TimelineEntry
        matchId={BASE_MATCH_ID}
        opponent={baseOpponent}
        result="victory"
        date={BASE_DATE}
        hasEvolutions={true}
        isEditable={true}
        onResultSubmit={vi.fn()}
        onEvolutionStart={vi.fn()}
      />
    )
    expect(screen.queryByText(/Saisir.*(évolutions|evolutions)/i)).toBeNull()
  })

  // 10.31 — "Saisir evolutions" NOT shown when result=null (no result yet)
  it('[4.1-TLE-004] does not render "Saisir evolutions" when result is null (no result entered yet)', () => {
    render(
      <TimelineEntry
        matchId={BASE_MATCH_ID}
        opponent={baseOpponent}
        result={null}
        date={BASE_DATE}
        hasEvolutions={false}
        isEditable={true}
        onResultSubmit={vi.fn()}
        onEvolutionStart={vi.fn()}
      />
    )
    expect(screen.queryByText(/Saisir.*(évolutions|evolutions)/i)).toBeNull()
  })

  // 10.31 — "Saisir evolutions" NOT shown when isEditable=false (non-owner)
  it('[4.1-TLE-005] does not render "Saisir evolutions" when isEditable=false', () => {
    render(
      <TimelineEntry
        matchId={BASE_MATCH_ID}
        opponent={baseOpponent}
        result="victory"
        date={BASE_DATE}
        hasEvolutions={false}
        isEditable={false}
        onEvolutionStart={vi.fn()}
      />
    )
    expect(screen.queryByText(/Saisir.*(évolutions|evolutions)/i)).toBeNull()
  })

  // 10.31 — "Saisir evolutions" NOT shown when onEvolutionStart is not provided
  it('[4.1-TLE-006] does not render "Saisir evolutions" when onEvolutionStart prop is not provided', () => {
    render(
      <TimelineEntry
        matchId={BASE_MATCH_ID}
        opponent={baseOpponent}
        result="defeat"
        date={BASE_DATE}
        hasEvolutions={false}
        isEditable={true}
        onResultSubmit={vi.fn()}
        // onEvolutionStart intentionally omitted
      />
    )
    expect(screen.queryByText(/Saisir.*(évolutions|evolutions)/i)).toBeNull()
  })

  // 10.31 — works with result="defeat" (not just victory)
  it('[4.1-TLE-007] renders "Saisir evolutions" when result="defeat", hasEvolutions=false, isEditable=true', () => {
    render(
      <TimelineEntry
        matchId={BASE_MATCH_ID}
        opponent={baseOpponent}
        result="defeat"
        date={BASE_DATE}
        hasEvolutions={false}
        isEditable={true}
        onResultSubmit={vi.fn()}
        onEvolutionStart={vi.fn()}
      />
    )
    expect(screen.getByText(/Saisir.*(évolutions|evolutions)/i)).not.toBeNull()
  })

  // 10.31 — works with result="draw"
  it('[4.1-TLE-008] renders "Saisir evolutions" when result="draw", hasEvolutions=false, isEditable=true', () => {
    render(
      <TimelineEntry
        matchId={BASE_MATCH_ID}
        opponent={baseOpponent}
        result="draw"
        date={BASE_DATE}
        hasEvolutions={false}
        isEditable={true}
        onResultSubmit={vi.fn()}
        onEvolutionStart={vi.fn()}
      />
    )
    expect(screen.getByText(/Saisir.*(évolutions|evolutions)/i)).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Source file structural contract — onEvolutionStart prop added to TimelineEntry
// AC: 2
// ---------------------------------------------------------------------------

describe('[AC2][P0] TimelineEntry — source file contract for onEvolutionStart prop (Task 8.1)', () => {
  it('[4.1-TLE-009] timeline-entry.tsx declares onEvolutionStart in TimelineEntryProps', () => {
    const { readFileSync } = require('node:fs')
    const { resolve: resolvePath } = require('node:path')
    const filePath = resolvePath(__dirname, '..', 'timeline-entry.tsx')
    const code = readFileSync(filePath, 'utf-8')
    expect(code).toMatch(/onEvolutionStart/)
  })

  it('[4.1-TLE-010] timeline-entry.tsx onEvolutionStart prop is optional (? modifier)', () => {
    const { readFileSync } = require('node:fs')
    const { resolve: resolvePath } = require('node:path')
    const filePath = resolvePath(__dirname, '..', 'timeline-entry.tsx')
    const code = readFileSync(filePath, 'utf-8')
    expect(code).toMatch(/onEvolutionStart\?/)
  })

  it('[4.1-TLE-011] timeline-entry.tsx onEvolutionStart accepts matchId as string argument', () => {
    const { readFileSync } = require('node:fs')
    const { resolve: resolvePath } = require('node:path')
    const filePath = resolvePath(__dirname, '..', 'timeline-entry.tsx')
    const code = readFileSync(filePath, 'utf-8')
    // The prop type must accept (matchId: string) => void
    expect(code).toMatch(/onEvolutionStart\?[\s\S]{0,200}(matchId|string)[\s\S]{0,100}void/)
  })
})
