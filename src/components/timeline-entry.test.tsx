// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TimelineEntry } from './timeline-entry'

const baseProps = {
  matchId: 'match-1',
  date: '2026-03-01T00:00:00Z',
  result: null as null,
  hasEvolutions: false,
}

describe('TimelineEntry — bouton "Passer l\'XP initiale"', () => {
  it('est visible pour initial_setup quand isEditable=true et onSkipInitialXp fourni', () => {
    render(
      <TimelineEntry
        {...baseProps}
        matchType="initial_setup"
        isEditable={true}
        onSkipInitialXp={vi.fn()}
      />
    )
    expect(screen.getByTestId('skip-initial-xp')).toBeInTheDocument()
  })

  it("n'apparaît PAS quand isEditable=false", () => {
    render(
      <TimelineEntry
        {...baseProps}
        matchType="initial_setup"
        isEditable={false}
        onSkipInitialXp={vi.fn()}
      />
    )
    expect(screen.queryByTestId('skip-initial-xp')).toBeNull()
  })

  it("n'apparaît PAS pour une entrée de type standard", () => {
    render(
      <TimelineEntry
        {...baseProps}
        matchType="standard"
        result="victory"
        isEditable={true}
        onSkipInitialXp={vi.fn()}
      />
    )
    expect(screen.queryByTestId('skip-initial-xp')).toBeNull()
  })

  it("n'apparaît PAS quand onSkipInitialXp n'est pas fourni", () => {
    render(
      <TimelineEntry
        {...baseProps}
        matchType="initial_setup"
        isEditable={true}
      />
    )
    expect(screen.queryByTestId('skip-initial-xp')).toBeNull()
  })

  it("n'apparaît PAS quand hasEvolutions=true (évolutions déjà saisies)", () => {
    render(
      <TimelineEntry
        {...baseProps}
        matchType="initial_setup"
        hasEvolutions={true}
        isEditable={true}
        onSkipInitialXp={vi.fn()}
      />
    )
    expect(screen.queryByTestId('skip-initial-xp')).toBeNull()
  })

  it('appelle onSkipInitialXp au clic', async () => {
    const onSkip = vi.fn()
    render(
      <TimelineEntry
        {...baseProps}
        matchType="initial_setup"
        isEditable={true}
        onSkipInitialXp={onSkip}
      />
    )
    await userEvent.click(screen.getByTestId('skip-initial-xp'))
    expect(onSkip).toHaveBeenCalledOnce()
  })
})
