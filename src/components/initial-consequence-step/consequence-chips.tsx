// Campaign TOW — ConsequenceChips sub-component
// Renders the list of already-added consequence chips with remove buttons.

import { getChipLabel } from './helpers'
import type { InitialConsequenceItem } from './helpers'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type ConsequenceChipsProps = {
  consequences: InitialConsequenceItem[]
  onRemove: (localId: number) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ConsequenceChips({ consequences, onRemove }: ConsequenceChipsProps) {
  if (consequences.length === 0) return null

  return (
    <div className="flex flex-wrap gap-[0.4rem]">
      {consequences.map((item) => (
        <div
          key={item._localId}
          data-testid={`initial-consequence-chip-${item._localId}`}
          className="flex items-center gap-[0.3rem] py-[0.2rem] px-[0.5rem] rounded-full border border-[var(--color-malus,#b82c2c)] bg-[color-mix(in_srgb,var(--color-malus)_6%,transparent)] font-[family-name:var(--font-body)] text-xs text-[var(--color-malus,#b82c2c)]"
        >
          <span>{getChipLabel(item)}</span>
          <button
            data-testid={`initial-consequence-remove-${item._localId}`}
            type="button"
            onClick={() => onRemove(item._localId)}
            aria-label="Supprimer"
            className="bg-transparent border-none cursor-pointer text-[var(--color-malus,#b82c2c)] text-base leading-none p-0"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
