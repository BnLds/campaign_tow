// Campaign TOW — InitialConsequenceStep component
// Orchestrator: past consequences multi-select for initial-xp mode (campaign setup).

import type { ConsequenceEntry } from '../../lib/validators'
import type { CampaignPlayer } from './helpers'
import { useConsequenceForm } from './use-consequence-form'
import { ConsequenceChips } from './consequence-chips'
import { ConsequenceForm } from './consequence-form'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InitialConsequenceItem = ConsequenceEntry & { _localId: number }

export type InitialConsequenceStepProps = {
  unitId: string
  unitType: string
  campaignPlayers: CampaignPlayer[]
  /** Consequences already added for this unit (filtered by unitId in parent) */
  consequences: InitialConsequenceItem[]
  onAdd: (entry: ConsequenceEntry) => void
  onRemove: (localId: number) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InitialConsequenceStep({
  unitId,
  unitType,
  campaignPlayers,
  consequences,
  onAdd,
  onRemove,
}: InitialConsequenceStepProps) {
  const form = useConsequenceForm(unitType, campaignPlayers)

  return (
    <div className="flex flex-col gap-3 bg-[var(--color-malus-bg,#fdf0f0)] rounded-lg p-4 border border-[var(--color-malus,#b82c2c)]">
      <p className="font-[family-name:var(--font-body)] text-xs font-semibold text-[var(--color-malus,#b82c2c)] m-0 uppercase tracking-[0.04em]">
        Conséquences passées
      </p>

      <ConsequenceChips consequences={consequences} onRemove={onRemove} />

      {form.state.isAdding ? (
        <ConsequenceForm form={form} campaignPlayers={campaignPlayers} unitId={unitId} onAdd={onAdd} />
      ) : (
        <button
          data-testid="initial-consequence-add-btn"
          type="button"
          onClick={() => form.actions.setIsAdding(true)}
          className="font-[family-name:var(--font-body)] text-sm font-semibold text-[var(--color-malus,#b82c2c)] bg-none border border-dashed border-[var(--color-malus,#b82c2c)] rounded-md py-[0.4rem] px-3 cursor-pointer self-start"
        >
          + Ajouter une conséquence
        </button>
      )}
    </div>
  )
}
