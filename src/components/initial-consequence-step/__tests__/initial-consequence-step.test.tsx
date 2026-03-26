// @vitest-environment jsdom
// src/components/__tests__/initial-consequence-step.test.tsx
// Tests for InitialConsequenceStep — past consequences multi-select (initial-xp mode)

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { renderHook, act } from '@testing-library/react'
import { InitialConsequenceStep } from '../initial-consequence-step'
import type { InitialConsequenceItem } from '../initial-consequence-step'
import { useConsequenceForm } from '../use-consequence-form'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const UNIT_ID = 'unit-abc'

const SAMPLE_PLAYERS = [
  { playerId: 'player-1', playerDisplayName: 'Alice' },
  { playerId: 'player-2', playerDisplayName: 'Bob' },
]

const noOp = () => {}

function renderUnit(props: Partial<Parameters<typeof InitialConsequenceStep>[0]> = {}) {
  return render(
    <InitialConsequenceStep
      unitId={UNIT_ID}
      unitType="Infanterie"
      campaignPlayers={SAMPLE_PLAYERS}
      consequences={[]}
      onAdd={noOp}
      onRemove={noOp}
      {...props}
    />
  )
}

function renderCharacter(props: Partial<Parameters<typeof InitialConsequenceStep>[0]> = {}) {
  return renderUnit({ unitType: 'Personnages', ...props })
}

// ---------------------------------------------------------------------------
// [IC-001] Renders "+ Ajouter" button, no form visible initially
// ---------------------------------------------------------------------------

describe('[IC-001] renders add button, form hidden initially', () => {
  it('shows the "+ Ajouter" button', () => {
    renderUnit()
    expect(screen.getByTestId('initial-consequence-add-btn')).not.toBeNull()
  })

  it('does not show the form initially', () => {
    renderUnit()
    expect(screen.queryByTestId('initial-consequence-form')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// [IC-002] Non-Personnages unit: shows 3 destruction options
// ---------------------------------------------------------------------------

describe('[IC-002] non-Personnages filtered options (pertes_catastrophiques, moral_brise, rancune)', () => {
  it('shows 3 destruction options after clicking add', () => {
    renderUnit()
    fireEvent.click(screen.getByTestId('initial-consequence-add-btn'))
    expect(screen.getByTestId('initial-consequence-type-pertes_catastrophiques')).not.toBeNull()
    expect(screen.getByTestId('initial-consequence-type-moral_brise')).not.toBeNull()
    expect(screen.getByTestId('initial-consequence-type-rancune')).not.toBeNull()
  })

  it('does NOT show character options (permanent_injury, grave_injury, haine)', () => {
    renderUnit()
    fireEvent.click(screen.getByTestId('initial-consequence-add-btn'))
    expect(screen.queryByTestId('initial-consequence-type-permanent_injury')).toBeNull()
    expect(screen.queryByTestId('initial-consequence-type-grave_injury')).toBeNull()
    expect(screen.queryByTestId('initial-consequence-type-haine')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// [IC-003] Personnages unit: shows 3 injury options
// ---------------------------------------------------------------------------

describe('[IC-003] Personnages filtered options (permanent_injury, grave_injury, haine)', () => {
  it('shows 3 injury options after clicking add', () => {
    renderCharacter()
    fireEvent.click(screen.getByTestId('initial-consequence-add-btn'))
    expect(screen.getByTestId('initial-consequence-type-permanent_injury')).not.toBeNull()
    expect(screen.getByTestId('initial-consequence-type-grave_injury')).not.toBeNull()
    expect(screen.getByTestId('initial-consequence-type-haine')).not.toBeNull()
  })

  it('does NOT show unit options (pertes_catastrophiques, moral_brise, rancune)', () => {
    renderCharacter()
    fireEvent.click(screen.getByTestId('initial-consequence-add-btn'))
    expect(screen.queryByTestId('initial-consequence-type-pertes_catastrophiques')).toBeNull()
    expect(screen.queryByTestId('initial-consequence-type-moral_brise')).toBeNull()
    expect(screen.queryByTestId('initial-consequence-type-rancune')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// [IC-004] permanent_injury: shows stat sub-table, confirm disabled until stat selected
// ---------------------------------------------------------------------------

describe('[IC-004] permanent_injury — stat sub-table required', () => {
  it('shows stat sub-table when permanent_injury is selected', () => {
    renderCharacter()
    fireEvent.click(screen.getByTestId('initial-consequence-add-btn'))
    fireEvent.click(screen.getByTestId('initial-consequence-type-permanent_injury'))
    expect(screen.getByTestId('initial-consequence-stat-e')).not.toBeNull()
    expect(screen.getByTestId('initial-consequence-stat-cc')).not.toBeNull()
  })

  it('confirm button is disabled before stat selected', () => {
    renderCharacter()
    fireEvent.click(screen.getByTestId('initial-consequence-add-btn'))
    fireEvent.click(screen.getByTestId('initial-consequence-type-permanent_injury'))
    expect(screen.getByTestId('initial-consequence-confirm-btn').getAttribute('disabled')).toBe('')
  })

  it('confirm button is enabled after stat selected', () => {
    renderCharacter()
    fireEvent.click(screen.getByTestId('initial-consequence-add-btn'))
    fireEvent.click(screen.getByTestId('initial-consequence-type-permanent_injury'))
    fireEvent.click(screen.getByTestId('initial-consequence-stat-cc'))
    expect(screen.getByTestId('initial-consequence-confirm-btn').getAttribute('disabled')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// [IC-005] haine: shows player dropdown, confirm disabled until player selected
// ---------------------------------------------------------------------------

describe('[IC-005] haine — player picker required', () => {
  it('shows player dropdown when haine is selected', () => {
    renderCharacter()
    fireEvent.click(screen.getByTestId('initial-consequence-add-btn'))
    fireEvent.click(screen.getByTestId('initial-consequence-type-haine'))
    expect(screen.getByTestId('initial-consequence-player-select')).not.toBeNull()
  })

  it('confirm disabled until player selected', () => {
    renderCharacter()
    fireEvent.click(screen.getByTestId('initial-consequence-add-btn'))
    fireEvent.click(screen.getByTestId('initial-consequence-type-haine'))
    expect(screen.getByTestId('initial-consequence-confirm-btn').getAttribute('disabled')).toBe('')
  })

  it('confirm enabled after player selected', () => {
    renderCharacter()
    fireEvent.click(screen.getByTestId('initial-consequence-add-btn'))
    fireEvent.click(screen.getByTestId('initial-consequence-type-haine'))
    fireEvent.change(screen.getByTestId('initial-consequence-player-select'), { target: { value: 'player-1' } })
    expect(screen.getByTestId('initial-consequence-confirm-btn').getAttribute('disabled')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// [IC-006] rancune: shows player dropdown, confirm disabled until player selected
// ---------------------------------------------------------------------------

describe('[IC-006] rancune — player picker required', () => {
  it('shows player dropdown when rancune is selected', () => {
    renderUnit()
    fireEvent.click(screen.getByTestId('initial-consequence-add-btn'))
    fireEvent.click(screen.getByTestId('initial-consequence-type-rancune'))
    expect(screen.getByTestId('initial-consequence-player-select')).not.toBeNull()
  })

  it('confirm disabled until player selected', () => {
    renderUnit()
    fireEvent.click(screen.getByTestId('initial-consequence-add-btn'))
    fireEvent.click(screen.getByTestId('initial-consequence-type-rancune'))
    expect(screen.getByTestId('initial-consequence-confirm-btn').getAttribute('disabled')).toBe('')
  })
})

// ---------------------------------------------------------------------------
// [IC-007] permanent_injury confirm — calls onAdd with { unitId, type, stat, delta: -1 }
// ---------------------------------------------------------------------------

describe('[IC-007] permanent_injury confirm shape', () => {
  it('calls onAdd with correct entry (no bannerLost)', () => {
    const onAdd = vi.fn()
    renderCharacter({ onAdd })
    fireEvent.click(screen.getByTestId('initial-consequence-add-btn'))
    fireEvent.click(screen.getByTestId('initial-consequence-type-permanent_injury'))
    fireEvent.click(screen.getByTestId('initial-consequence-stat-cc'))
    fireEvent.click(screen.getByTestId('initial-consequence-confirm-btn'))
    expect(onAdd).toHaveBeenCalledWith({ unitId: UNIT_ID, type: 'permanent_injury', stat: 'cc', delta: -1 })
    expect(onAdd.mock.calls[0][0]).not.toHaveProperty('bannerLost')
  })
})

// ---------------------------------------------------------------------------
// [IC-008] grave_injury confirm — calls onAdd with { unitId, type }
// ---------------------------------------------------------------------------

describe('[IC-008] grave_injury confirm shape', () => {
  it('calls onAdd with { unitId, type } only (no stat, no delta, no bannerLost)', () => {
    const onAdd = vi.fn()
    renderCharacter({ onAdd })
    fireEvent.click(screen.getByTestId('initial-consequence-add-btn'))
    fireEvent.click(screen.getByTestId('initial-consequence-type-grave_injury'))
    fireEvent.click(screen.getByTestId('initial-consequence-confirm-btn'))
    expect(onAdd).toHaveBeenCalledWith({ unitId: UNIT_ID, type: 'grave_injury' })
    const entry = onAdd.mock.calls[0][0] as Record<string, unknown>
    expect(entry).not.toHaveProperty('stat')
    expect(entry).not.toHaveProperty('delta')
    expect(entry).not.toHaveProperty('bannerLost')
  })
})

// ---------------------------------------------------------------------------
// [IC-009] haine confirm — calls onAdd with opponentPlayerName, no bannerLost
// ---------------------------------------------------------------------------

describe('[IC-009] haine confirm shape', () => {
  it('calls onAdd with { unitId, type: "haine", opponentPlayerName } (no bannerLost)', () => {
    const onAdd = vi.fn()
    renderCharacter({ onAdd })
    fireEvent.click(screen.getByTestId('initial-consequence-add-btn'))
    fireEvent.click(screen.getByTestId('initial-consequence-type-haine'))
    fireEvent.change(screen.getByTestId('initial-consequence-player-select'), { target: { value: 'player-1' } })
    fireEvent.click(screen.getByTestId('initial-consequence-confirm-btn'))
    expect(onAdd).toHaveBeenCalledWith({ unitId: UNIT_ID, type: 'haine', opponentPlayerName: 'Alice' })
    expect(onAdd.mock.calls[0][0]).not.toHaveProperty('bannerLost')
  })
})

// ---------------------------------------------------------------------------
// [IC-010] rancune confirm — calls onAdd with opponentPlayerName, no bannerLost
// ---------------------------------------------------------------------------

describe('[IC-010] rancune confirm shape', () => {
  it('calls onAdd with { unitId, type: "rancune", opponentPlayerName } (no bannerLost)', () => {
    const onAdd = vi.fn()
    renderUnit({ onAdd })
    fireEvent.click(screen.getByTestId('initial-consequence-add-btn'))
    fireEvent.click(screen.getByTestId('initial-consequence-type-rancune'))
    fireEvent.change(screen.getByTestId('initial-consequence-player-select'), { target: { value: 'player-2' } })
    fireEvent.click(screen.getByTestId('initial-consequence-confirm-btn'))
    expect(onAdd).toHaveBeenCalledWith({ unitId: UNIT_ID, type: 'rancune', opponentPlayerName: 'Bob' })
    expect(onAdd.mock.calls[0][0]).not.toHaveProperty('bannerLost')
  })
})

// ---------------------------------------------------------------------------
// [IC-011] pertes_catastrophiques confirm — { unitId, type } only
// ---------------------------------------------------------------------------

describe('[IC-011] pertes_catastrophiques confirm shape', () => {
  it('calls onAdd with { unitId, type: "pertes_catastrophiques" } (no extras)', () => {
    const onAdd = vi.fn()
    renderUnit({ onAdd })
    fireEvent.click(screen.getByTestId('initial-consequence-add-btn'))
    fireEvent.click(screen.getByTestId('initial-consequence-type-pertes_catastrophiques'))
    fireEvent.click(screen.getByTestId('initial-consequence-confirm-btn'))
    expect(onAdd).toHaveBeenCalledWith({ unitId: UNIT_ID, type: 'pertes_catastrophiques' })
  })
})

// ---------------------------------------------------------------------------
// [IC-012] moral_brise confirm — { unitId, type } only
// ---------------------------------------------------------------------------

describe('[IC-012] moral_brise confirm shape', () => {
  it('calls onAdd with { unitId, type: "moral_brise" } (no extras)', () => {
    const onAdd = vi.fn()
    renderUnit({ onAdd })
    fireEvent.click(screen.getByTestId('initial-consequence-add-btn'))
    fireEvent.click(screen.getByTestId('initial-consequence-type-moral_brise'))
    fireEvent.click(screen.getByTestId('initial-consequence-confirm-btn'))
    expect(onAdd).toHaveBeenCalledWith({ unitId: UNIT_ID, type: 'moral_brise' })
  })
})

// ---------------------------------------------------------------------------
// [IC-013] Chips render with correct labels and remove buttons
// ---------------------------------------------------------------------------

describe('[IC-013] consequence chips render', () => {
  it('renders chips for passed consequences with correct labels', () => {
    const consequences: InitialConsequenceItem[] = [
      { _localId: 0, unitId: UNIT_ID, type: 'moral_brise' },
      { _localId: 1, unitId: UNIT_ID, type: 'pertes_catastrophiques' },
    ]
    renderUnit({ consequences })
    expect(screen.getByTestId('initial-consequence-chip-0')).not.toBeNull()
    expect(screen.getByTestId('initial-consequence-chip-1')).not.toBeNull()
    expect(screen.getByTestId('initial-consequence-chip-0').textContent).toContain('Moral Brisé')
    expect(screen.getByTestId('initial-consequence-chip-1').textContent).toContain('Pertes Catastrophiques')
  })

  it('renders remove button for each chip', () => {
    const consequences: InitialConsequenceItem[] = [
      { _localId: 5, unitId: UNIT_ID, type: 'moral_brise' },
    ]
    renderUnit({ consequences })
    expect(screen.getByTestId('initial-consequence-remove-5')).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// [IC-014] Remove button calls onRemove with correct _localId
// ---------------------------------------------------------------------------

describe('[IC-014] remove button calls onRemove', () => {
  it('calls onRemove with correct _localId when remove button clicked', () => {
    const onRemove = vi.fn()
    const consequences: InitialConsequenceItem[] = [
      { _localId: 42, unitId: UNIT_ID, type: 'moral_brise' },
    ]
    renderUnit({ consequences, onRemove })
    fireEvent.click(screen.getByTestId('initial-consequence-remove-42'))
    expect(onRemove).toHaveBeenCalledWith(42)
  })
})

// ---------------------------------------------------------------------------
// [IC-015] Multiple consequences: 3 chips shown
// ---------------------------------------------------------------------------

describe('[IC-015] multiple consequences: 3 chips', () => {
  it('renders 3 chips when 3 consequences passed', () => {
    const consequences: InitialConsequenceItem[] = [
      { _localId: 0, unitId: UNIT_ID, type: 'moral_brise' },
      { _localId: 1, unitId: UNIT_ID, type: 'moral_brise' },
      { _localId: 2, unitId: UNIT_ID, type: 'pertes_catastrophiques' },
    ]
    renderUnit({ consequences })
    expect(screen.getByTestId('initial-consequence-chip-0')).not.toBeNull()
    expect(screen.getByTestId('initial-consequence-chip-1')).not.toBeNull()
    expect(screen.getByTestId('initial-consequence-chip-2')).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// [IC-016] Form resets after confirm — add button visible again
// ---------------------------------------------------------------------------

describe('[IC-016] form resets after confirm', () => {
  it('shows add button again after confirming a consequence', () => {
    const onAdd = vi.fn()
    renderUnit({ onAdd })
    fireEvent.click(screen.getByTestId('initial-consequence-add-btn'))
    fireEvent.click(screen.getByTestId('initial-consequence-type-moral_brise'))
    fireEvent.click(screen.getByTestId('initial-consequence-confirm-btn'))
    // Form should close — add button visible again
    expect(screen.getByTestId('initial-consequence-add-btn')).not.toBeNull()
    expect(screen.queryByTestId('initial-consequence-form')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// [IC-017] "Annuler" button hides form and resets selections
// ---------------------------------------------------------------------------

describe('[IC-017] cancel button hides form', () => {
  it('hides the form and resets when cancel is clicked', () => {
    renderUnit()
    fireEvent.click(screen.getByTestId('initial-consequence-add-btn'))
    fireEvent.click(screen.getByTestId('initial-consequence-type-moral_brise'))
    fireEvent.click(screen.getByTestId('initial-consequence-cancel-btn'))
    // Form hidden, add button back
    expect(screen.getByTestId('initial-consequence-add-btn')).not.toBeNull()
    expect(screen.queryByTestId('initial-consequence-form')).toBeNull()
  })

  it('does not call onAdd when cancel is clicked', () => {
    const onAdd = vi.fn()
    renderUnit({ onAdd })
    fireEvent.click(screen.getByTestId('initial-consequence-add-btn'))
    fireEvent.click(screen.getByTestId('initial-consequence-type-moral_brise'))
    fireEvent.click(screen.getByTestId('initial-consequence-cancel-btn'))
    expect(onAdd).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// [IC-018] Back navigation: chips displayed for consequences passed via props
// ---------------------------------------------------------------------------

describe('[IC-018] back navigation — chips from props', () => {
  it('displays chips for consequences passed via props (parent state preserved)', () => {
    const consequences: InitialConsequenceItem[] = [
      { _localId: 10, unitId: UNIT_ID, type: 'rancune', opponentPlayerName: 'Alice' },
    ]
    renderUnit({ consequences })
    expect(screen.getByTestId('initial-consequence-chip-10')).not.toBeNull()
    expect(screen.getByTestId('initial-consequence-chip-10').textContent).toContain('Rancune')
    expect(screen.getByTestId('initial-consequence-chip-10').textContent).toContain('Alice')
  })
})

// ---------------------------------------------------------------------------
// [IC-019] Empty campaignPlayers: haine/rancune shows disabled message, confirm disabled
// ---------------------------------------------------------------------------

describe('[IC-019] empty campaignPlayers — disabled message', () => {
  it('shows disabled message for haine when no players available', () => {
    renderCharacter({ campaignPlayers: [] })
    fireEvent.click(screen.getByTestId('initial-consequence-add-btn'))
    fireEvent.click(screen.getByTestId('initial-consequence-type-haine'))
    expect(screen.queryByTestId('initial-consequence-player-select')).toBeNull()
    expect(screen.getByText(/Aucun autre joueur/)).not.toBeNull()
    expect(screen.getByTestId('initial-consequence-confirm-btn').getAttribute('disabled')).toBe('')
  })

  it('shows disabled message for rancune when no players available', () => {
    renderUnit({ campaignPlayers: [] })
    fireEvent.click(screen.getByTestId('initial-consequence-add-btn'))
    fireEvent.click(screen.getByTestId('initial-consequence-type-rancune'))
    expect(screen.queryByTestId('initial-consequence-player-select')).toBeNull()
    expect(screen.getByText(/Aucun autre joueur/)).not.toBeNull()
    expect(screen.getByTestId('initial-consequence-confirm-btn').getAttribute('disabled')).toBe('')
  })
})

// ---------------------------------------------------------------------------
// [IC-020] haine → rancune switch: player selection is preserved
// Tests useConsequenceForm hook directly since haine and rancune belong to
// different unit type filter sets and cannot appear in the same UI instance.
// ---------------------------------------------------------------------------

describe('[IC-020] haine → rancune switch preserves player selection', () => {
  it('keeps selectedPlayerId when switching from haine to rancune', () => {
    const players = [{ playerId: 'player-1', playerDisplayName: 'Alice' }]
    const { result } = renderHook(() => useConsequenceForm('Personnages', players))

    // Select haine
    act(() => { result.current.actions.handleTypeSelect('haine') })
    expect(result.current.state.selectedType).toBe('haine')

    // Pick a player
    act(() => { result.current.actions.setSelectedPlayerId('player-1') })
    expect(result.current.state.selectedPlayerId).toBe('player-1')

    // Switch to rancune — player should be preserved (both need a player)
    act(() => { result.current.actions.handleTypeSelect('rancune') })
    expect(result.current.state.selectedType).toBe('rancune')
    expect(result.current.state.selectedPlayerId).toBe('player-1')

    // Confirm should be enabled
    expect(result.current.derived.isConfirmEnabled).toBe(true)
  })
})
