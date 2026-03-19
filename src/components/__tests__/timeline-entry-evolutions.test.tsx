// @vitest-environment jsdom
// src/components/__tests__/timeline-entry-evolutions.test.tsx
// Story 4.1: Post-Match Flow — XP Entry per Unit & Character
// Status: RED — written before implementation (TDD)
//
// React component tests for the TimelineEntry evolution-entry features:
//   - onEvolutionStart prop
//   - "Au rapport !" link/button visible when hasEvolutions=false, result set, isEditable=true
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
// 10.31 — TimelineEntry shows "Au rapport !" when hasEvolutions=false, result set, isEditable=true
// AC: 2
// ---------------------------------------------------------------------------

describe('[AC2][P0] TimelineEntry — "Au rapport !" link (Task 8.1)', () => {
  // 10.31 — renders "Au rapport !" link/button when hasEvolutions=false, result set, isEditable=true
  it('[4.1-TLE-001] renders "Au rapport !" when hasEvolutions=false, result="victory", isEditable=true', () => {
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
    expect(screen.getByText(/Au rapport/i)).not.toBeNull()
  })

  // 10.31 — "Au rapport !" calls onEvolutionStart(matchId) when clicked
  it('[4.1-TLE-002] clicking "Au rapport !" calls onEvolutionStart with matchId', async () => {
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

    const link = screen.getByText(/Au rapport/i)
    fireEvent.click(link)

    await waitFor(() => {
      expect(onEvolutionStart).toHaveBeenCalledWith(BASE_MATCH_ID)
    })
  })

  // 10.31 — "Au rapport !" NOT shown when hasEvolutions=true (already completed)
  it('[4.1-TLE-003] does not render "Au rapport !" when hasEvolutions=true', () => {
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
    expect(screen.queryByText(/Au rapport/i)).toBeNull()
  })

  // 10.31 — "Au rapport !" NOT shown when result=null (no result yet)
  it('[4.1-TLE-004] does not render "Au rapport !" when result is null (no result entered yet)', () => {
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
    expect(screen.queryByText(/Au rapport/i)).toBeNull()
  })

  // 10.31 — "Au rapport !" NOT shown when isEditable=false (non-owner)
  it('[4.1-TLE-005] does not render "Au rapport !" when isEditable=false', () => {
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
    expect(screen.queryByText(/Au rapport/i)).toBeNull()
  })

  // 10.31 — "Au rapport !" NOT shown when onEvolutionStart is not provided
  it('[4.1-TLE-006] does not render "Au rapport !" when onEvolutionStart prop is not provided', () => {
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
    expect(screen.queryByText(/Au rapport/i)).toBeNull()
  })

  // 10.31 — works with result="defeat" (not just victory)
  it('[4.1-TLE-007] renders "Au rapport !" when result="defeat", hasEvolutions=false, isEditable=true', () => {
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
    expect(screen.getByText(/Au rapport/i)).not.toBeNull()
  })

  // 10.31 — works with result="draw"
  it('[4.1-TLE-008] renders "Au rapport !" when result="draw", hasEvolutions=false, isEditable=true', () => {
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
    expect(screen.getByText(/Au rapport/i)).not.toBeNull()
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

// ---------------------------------------------------------------------------
// Story 4-1b — Compact XP line display on TimelineEntry
// AC: 4
// Status: RED — written before implementation (TDD)
// ---------------------------------------------------------------------------

describe('[AC4][P1] TimelineEntry — compact XP line display (Story 4-1b)', () => {
  const sampleXpEntries = [
    { unitName: 'Nomarch', unitType: 'personnage', xpGained: 3, gains: [] },
    { unitName: 'Gardes', unitType: 'base', xpGained: 5, gains: [] },
    { unitName: 'Sorcier', unitType: 'rare', xpGained: 2, gains: [] },
  ]

  it('[4.1b-TLE-001] renders XP per unit when hasEvolutions=true and unitXpEntries provided', () => {
    render(
      <TimelineEntry
        matchId={BASE_MATCH_ID}
        opponent={baseOpponent}
        result="victory"
        date={BASE_DATE}
        hasEvolutions={true}
        isEditable={false}
        unitXpEntries={sampleXpEntries}
      />
    )
    // Each unit is on its own line — name and XP in separate spans
    expect(screen.getByText('Nomarch')).toBeTruthy()
    expect(screen.getByText('+3 XP')).toBeTruthy()
    expect(screen.getByText('Gardes')).toBeTruthy()
    expect(screen.getByText('+5 XP')).toBeTruthy()
  })

  it('[4.1b-TLE-002] renders one line per unit (each unit in its own container)', () => {
    render(
      <TimelineEntry
        matchId={BASE_MATCH_ID}
        opponent={baseOpponent}
        result="victory"
        date={BASE_DATE}
        hasEvolutions={true}
        isEditable={false}
        unitXpEntries={sampleXpEntries}
      />
    )
    // Each unit name is in its own parent container (not joined in a single text node)
    const nomarch = screen.getByText('Nomarch')
    const sorcier = screen.getByText('Sorcier')
    // They should NOT share the same parent element (separate rows)
    expect(nomarch.parentElement).not.toBe(sorcier.parentElement)
  })

  it('[4.1b-TLE-003] does NOT render XP line when unitXpEntries is undefined', () => {
    render(
      <TimelineEntry
        matchId={BASE_MATCH_ID}
        opponent={baseOpponent}
        result="victory"
        date={BASE_DATE}
        hasEvolutions={true}
        isEditable={false}
        // unitXpEntries intentionally omitted
      />
    )
    expect(screen.queryByText(/\+3 XP/)).toBeNull()
    expect(screen.queryByText(/\+5 XP/)).toBeNull()
  })

  it('[4.1b-TLE-004] does NOT render XP line when unitXpEntries is empty array', () => {
    render(
      <TimelineEntry
        matchId={BASE_MATCH_ID}
        opponent={baseOpponent}
        result="victory"
        date={BASE_DATE}
        hasEvolutions={true}
        isEditable={false}
        unitXpEntries={[]}
      />
    )
    expect(screen.queryByText(/\+3 XP/)).toBeNull()
    expect(screen.queryByText(/\+5 XP/)).toBeNull()
  })

  it('[4.1b-TLE-005] does NOT render XP line when hasEvolutions is false even with entries', () => {
    render(
      <TimelineEntry
        matchId={BASE_MATCH_ID}
        opponent={baseOpponent}
        result="victory"
        date={BASE_DATE}
        hasEvolutions={false}
        isEditable={false}
        unitXpEntries={sampleXpEntries}
      />
    )
    expect(screen.queryByText(/Nomarch \+3 XP/)).toBeNull()
    expect(screen.queryByText(/Gardes \+5 XP/)).toBeNull()
  })

  it('[4.1b-TLE-006] filters out entries with xpGained === 0 and no gains from display', () => {
    const entriesWithZero = [
      { unitName: 'A', unitType: 'base', xpGained: 3, gains: [] },
      { unitName: 'B', unitType: 'special', xpGained: 0, gains: [] },
    ]

    render(
      <TimelineEntry
        matchId={BASE_MATCH_ID}
        opponent={baseOpponent}
        result="victory"
        date={BASE_DATE}
        hasEvolutions={true}
        isEditable={false}
        unitXpEntries={entriesWithZero}
      />
    )
    expect(screen.getByText('A')).toBeTruthy()
    expect(screen.getByText('+3 XP')).toBeTruthy()
    expect(screen.queryByText('B')).toBeNull()
  })

  it('[4.1b-TLE-007] XP line uses small font (0.75rem) and secondary text color', () => {
    const { readFileSync } = require('node:fs')
    const { resolve: resolvePath } = require('node:path')
    const filePath = resolvePath(__dirname, '..', 'timeline-entry.tsx')
    const code = readFileSync(filePath, 'utf-8')
    // The XP line element should use 0.75rem and the secondary text color token
    expect(code).toMatch(/0\.75rem/)
    expect(code).toMatch(/text-secondary|#6b5f52|color-secondary/)
  })
})

// ---------------------------------------------------------------------------
// Story 4-1b — Source file structural contract for unitXpEntries prop
// AC: 4
// ---------------------------------------------------------------------------

describe('[AC4][P1] TimelineEntry — source contract for unitXpEntries (Story 4-1b)', () => {
  it('[4.1b-TLE-008] timeline-entry.tsx declares unitXpEntries in TimelineEntryProps', () => {
    const { readFileSync } = require('node:fs')
    const { resolve: resolvePath } = require('node:path')
    const filePath = resolvePath(__dirname, '..', 'timeline-entry.tsx')
    const code = readFileSync(filePath, 'utf-8')
    expect(code).toMatch(/unitXpEntries/)
  })

  it('[4.1b-TLE-009] timeline-entry.tsx unitXpEntries is optional (? modifier)', () => {
    const { readFileSync } = require('node:fs')
    const { resolve: resolvePath } = require('node:path')
    const filePath = resolvePath(__dirname, '..', 'timeline-entry.tsx')
    const code = readFileSync(filePath, 'utf-8')
    expect(code).toMatch(/unitXpEntries\?/)
  })

  it('[4.1b-TLE-010] timeline-entry.tsx renders one line per unit (flex-direction column)', () => {
    const { readFileSync } = require('node:fs')
    const { resolve: resolvePath } = require('node:path')
    const filePath = resolvePath(__dirname, '..', 'timeline-entry.tsx')
    const code = readFileSync(filePath, 'utf-8')
    // Uses flex column layout for per-unit display
    expect(code).toMatch(/flexDirection.*column/)
  })
})
