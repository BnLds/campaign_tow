// @vitest-environment jsdom
// tests/3-1-timeline-entry.test.tsx
// Story 3.1: Army Timeline View
// Status: RED — written before implementation (TDD)
//
// React component tests for the TimelineEntry component.
// Source file does NOT exist yet: src/components/timeline-entry.tsx
// All tests will fail with import errors until the implementation is complete.
//
// Note: @vitest-environment jsdom overrides the global 'node' environment in vitest.config.ts
// because React component rendering requires a DOM.
//
// Covers Task 3 (TimelineEntry component) and story tasks 7.9–7.13.

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TimelineEntry } from '../src/components/timeline-entry'

// ---------------------------------------------------------------------------
// Helpers — minimal test fixtures
// ---------------------------------------------------------------------------

const baseOpponent = { name: 'Armée Elfique', faction: 'Hauts Elfes', playerName: 'Alice' }

// ---------------------------------------------------------------------------
// AC3 — Task 7.9: renders opponent name, faction, and French formatted date
// ---------------------------------------------------------------------------

describe('[AC3][P0] TimelineEntry — renders opponent name, faction, and formatted date', () => {
  it('[3.1-COMP-001] renders opponent army name', () => {
    render(
      <TimelineEntry
        matchId="match-1"
        opponent={baseOpponent}
        result="victory"
        date="2026-03-12T14:00:00.000Z"
        hasEvolutions={false}
      />
    )
    expect(screen.getByText('Armée Elfique')).toBeTruthy()
    expect(screen.getByText('Hauts Elfes · Alice')).toBeTruthy()
  })

  it('[3.1-COMP-002] renders opponent faction', () => {
    render(
      <TimelineEntry
        matchId="match-2"
        opponent={baseOpponent}
        result="victory"
        date="2026-03-12T14:00:00.000Z"
        hasEvolutions={false}
      />
    )
    expect(screen.getByText(/Hauts Elfes/)).toBeTruthy()
  })

  it('[3.1-COMP-003] renders date formatted in French locale ("12 mars 2026")', () => {
    render(
      <TimelineEntry
        matchId="match-3"
        opponent={baseOpponent}
        result="victory"
        date="2026-03-12T14:00:00.000Z"
        hasEvolutions={false}
      />
    )
    // French date format: "12 mars 2026"
    expect(screen.getByText(/mars 2026/i)).toBeTruthy()
  })

  it('[3.1-COMP-004] renders data-testid="timeline-entry" on root element', () => {
    const { container } = render(
      <TimelineEntry
        matchId="match-4"
        opponent={baseOpponent}
        result="victory"
        date="2026-03-12T14:00:00.000Z"
        hasEvolutions={false}
      />
    )
    expect(container.querySelector('[data-testid="timeline-entry"]')).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// AC3 — Task 7.10: result badge shows correct letter per result value
// ---------------------------------------------------------------------------

describe('[AC3][P0] TimelineEntry — result badge', () => {
  it('[3.1-COMP-005] result="victory" renders "V" badge with data-testid="result-badge"', () => {
    render(
      <TimelineEntry
        matchId="match-5"
        opponent={baseOpponent}
        result="victory"
        date="2026-03-01T00:00:00.000Z"
        hasEvolutions={false}
      />
    )
    const badge = screen.getByTestId('result-badge')
    expect(badge).toBeTruthy()
    expect(badge.textContent).toBe('V')
  })

  it('[3.1-COMP-006] result="defeat" renders "D" badge', () => {
    render(
      <TimelineEntry
        matchId="match-6"
        opponent={baseOpponent}
        result="defeat"
        date="2026-03-01T00:00:00.000Z"
        hasEvolutions={false}
      />
    )
    const badge = screen.getByTestId('result-badge')
    expect(badge.textContent).toBe('D')
  })

  it('[3.1-COMP-007] result="draw" renders "E" badge (Egalite)', () => {
    render(
      <TimelineEntry
        matchId="match-7"
        opponent={baseOpponent}
        result="draw"
        date="2026-03-01T00:00:00.000Z"
        hasEvolutions={false}
      />
    )
    const badge = screen.getByTestId('result-badge')
    expect(badge.textContent).toBe('E')
  })

  it('[3.1-COMP-008] result="victory" badge has green styling (color: #2d7a3a or class indicating bonus)', () => {
    const { container } = render(
      <TimelineEntry
        matchId="match-8"
        opponent={baseOpponent}
        result="victory"
        date="2026-03-01T00:00:00.000Z"
        hasEvolutions={false}
      />
    )
    const badge = container.querySelector('[data-testid="result-badge"]') as HTMLElement | null
    expect(badge).not.toBeNull()
    if (badge) {
      // Either inline style or a CSS class indicating victory/green
      const hasGreenStyle = badge.style.color === 'rgb(45, 122, 58)' || badge.style.color === '#2d7a3a'
      const hasGreenClass = badge.className.includes('victory') || badge.className.includes('green') || badge.className.includes('bonus')
      expect(hasGreenStyle || hasGreenClass).toBe(true)
    }
  })

  it('[3.1-COMP-009] result="defeat" badge has red styling (color: #b82c2c or class indicating malus)', () => {
    const { container } = render(
      <TimelineEntry
        matchId="match-9"
        opponent={baseOpponent}
        result="defeat"
        date="2026-03-01T00:00:00.000Z"
        hasEvolutions={false}
      />
    )
    const badge = container.querySelector('[data-testid="result-badge"]') as HTMLElement | null
    expect(badge).not.toBeNull()
    if (badge) {
      const hasRedStyle = badge.style.color === 'rgb(184, 44, 44)' || badge.style.color === '#b82c2c'
      const hasRedClass = badge.className.includes('defeat') || badge.className.includes('red') || badge.className.includes('malus')
      expect(hasRedStyle || hasRedClass).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// AC3, AC6 — Task 7.11 / 7.12: evolution indicator
// ---------------------------------------------------------------------------

describe('[AC3][AC6][P0] TimelineEntry — evolution indicator', () => {
  it('[3.1-COMP-010] hasEvolutions=true does NOT show "Evolutions saisies" text (removed in 4-1b)', () => {
    render(
      <TimelineEntry
        matchId="match-10"
        opponent={baseOpponent}
        result="victory"
        date="2026-03-01T00:00:00.000Z"
        hasEvolutions={true}
      />
    )
    expect(screen.queryByText(/Evolutions saisies/i)).toBeNull()
  })

  it('[3.1-COMP-011] hasEvolutions=false renders NO "Evolutions saisies" text (clean absence)', () => {
    render(
      <TimelineEntry
        matchId="match-11"
        opponent={baseOpponent}
        result="victory"
        date="2026-03-01T00:00:00.000Z"
        hasEvolutions={false}
      />
    )
    expect(screen.queryByText(/Evolutions saisies/i)).toBeNull()
  })

  it('[3.1-COMP-012] hasEvolutions=false renders NO placeholder text in evolution area', () => {
    const { container } = render(
      <TimelineEntry
        matchId="match-12"
        opponent={baseOpponent}
        result="victory"
        date="2026-03-01T00:00:00.000Z"
        hasEvolutions={false}
      />
    )
    // No text hinting at an empty evolution state should be displayed
    expect(container.textContent).not.toMatch(/aucune.*evolution|evolution.*aucune|en attente/i)
  })
})

// ---------------------------------------------------------------------------
// AC6 — Task 7.13: no result badge when result is null (pending match)
// ---------------------------------------------------------------------------

describe('[AC6][P0] TimelineEntry — null result (pending)', () => {
  it('[3.1-COMP-013] result=null renders no result badge (data-testid="result-badge" absent)', () => {
    render(
      <TimelineEntry
        matchId="match-13"
        opponent={baseOpponent}
        result={null}
        date="2026-03-01T00:00:00.000Z"
        hasEvolutions={false}
      />
    )
    expect(screen.queryByTestId('result-badge')).toBeNull()
  })

  it('[3.1-COMP-014] result=null still renders opponent name and date (partial data display)', () => {
    render(
      <TimelineEntry
        matchId="match-14"
        opponent={baseOpponent}
        result={null}
        date="2026-03-01T00:00:00.000Z"
        hasEvolutions={false}
      />
    )
    expect(screen.getByText('Armée Elfique')).toBeTruthy()
    expect(screen.getByText('Hauts Elfes · Alice')).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// AC3 — timeline-entry.tsx structural contract (file existence and prop shape)
// ---------------------------------------------------------------------------

describe('[AC3][P0] TimelineEntry — source file structural contract', () => {
  it('[3.1-COMP-015] src/components/timeline-entry.tsx exports TimelineEntry as named export', () => {
    const { readFileSync, existsSync } = require('node:fs')
    const { resolve } = require('node:path')
    const filePath = resolve(__dirname, '..', 'src/components/timeline-entry.tsx')
    expect(existsSync(filePath)).toBe(true)
    const code = readFileSync(filePath, 'utf-8')
    expect(code).toMatch(/export (function TimelineEntry|const TimelineEntry)/)
  })

  it('[3.1-COMP-016] TimelineEntry component accepts matchId, opponent, result, date, hasEvolutions props', () => {
    const { readFileSync } = require('node:fs')
    const { resolve } = require('node:path')
    const filePath = resolve(__dirname, '..', 'src/components/timeline-entry.tsx')
    const code = readFileSync(filePath, 'utf-8')
    expect(code).toMatch(/matchId/)
    expect(code).toMatch(/opponent/)
    expect(code).toMatch(/result/)
    expect(code).toMatch(/hasEvolutions/)
  })

  it('[3.1-COMP-017] TimelineEntry uses Intl.DateTimeFormat with fr-FR locale', () => {
    const { readFileSync } = require('node:fs')
    const { resolve } = require('node:path')
    const filePath = resolve(__dirname, '..', 'src/components/timeline-entry.tsx')
    const code = readFileSync(filePath, 'utf-8')
    expect(code).toContain("'fr-FR'")
  })
})
