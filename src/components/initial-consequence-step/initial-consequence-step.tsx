// Campaign TOW — InitialConsequenceStep component
// Past consequences multi-select for initial-xp mode (campaign setup).
// Allows recording past destruction/injury consequences per unit.

import { PERMANENT_INJURY_SUBTABLE } from '../injury-bonus-step'
import type { ConsequenceEntry } from '../../lib/validators'
import { cn } from '@/lib/utils'
import { getChipLabel, buildConsequenceEntry } from './helpers'
import type { CampaignPlayer } from './helpers'
import { useConsequenceForm } from './use-consequence-form'

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
  const { isAdding, selectedType, selectedStat, selectedPlayerId } = form.state
  const { filteredOptions, needsStat, needsPlayer, isConfirmEnabled } = form.derived
  const { setIsAdding, handleTypeSelect, setSelectedStat, setSelectedPlayerId, resetForm } = form.actions

  const handleConfirm = () => {
    if (!selectedType || !isConfirmEnabled) return

    const entry = buildConsequenceEntry({
      type: selectedType,
      unitId,
      stat: selectedStat,
      player: form.derived.resolvedPlayer,
    })

    if (!entry) return

    onAdd(entry)
    resetForm()
  }

  return (
    <div className="flex flex-col gap-3 bg-[var(--color-malus-bg,#fdf0f0)] rounded-lg p-4 border border-[var(--color-malus,#b82c2c)]">
      {/* Section title */}
      <p className="font-[family-name:var(--font-body)] text-xs font-semibold text-[var(--color-malus,#b82c2c)] m-0 uppercase tracking-[0.04em]">
        Conséquences passées
      </p>

      {/* Consequence chips */}
      {consequences.length > 0 && (
        <div className="flex flex-wrap gap-[0.4rem]">
          {consequences.map((item) => (
            <div
              key={item._localId}
              data-testid={`initial-consequence-chip-${item._localId}`}
              className="flex items-center gap-[0.3rem] py-[0.2rem] px-[0.5rem] rounded-full border border-[var(--color-malus,#b82c2c)] bg-[rgba(184,44,44,0.06)] font-[family-name:var(--font-body)] text-xs text-[var(--color-malus,#b82c2c)]"
            >
              <span>{getChipLabel(item)}</span>
              <button
                data-testid={`initial-consequence-remove-${item._localId}`}
                type="button"
                onClick={() => onRemove(item._localId)}
                aria-label="Supprimer"
                className="bg-none border-none cursor-pointer text-[var(--color-malus,#b82c2c)] text-base leading-none p-0"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add form or add button */}
      {isAdding ? (
        <div data-testid="initial-consequence-form" className="flex flex-col gap-2">
          {/* Radio list — filtered options */}
          <div className="flex flex-col gap-[0.35rem]">
            {filteredOptions.map((option) => (
              <div key={option.type}>
                <label
                  className={cn(
                    'flex items-center gap-2 cursor-pointer font-[family-name:var(--font-body)] text-sm text-[var(--color-text-primary)] py-[0.35rem] px-2 rounded',
                    selectedType === option.type ? 'bg-[rgba(184,44,44,0.08)]' : 'bg-transparent'
                  )}
                >
                  <input
                    data-testid={`initial-consequence-type-${option.type}`}
                    type="radio"
                    name={`initial-consequence-type-${unitId}`}
                    value={option.type}
                    checked={selectedType === option.type}
                    onChange={() => handleTypeSelect(option.type)}
                    className="accent-[var(--color-malus,#b82c2c)]"
                  />
                  {option.label}
                </label>
                {selectedType === option.type && (
                  <p className="font-[family-name:var(--font-body)] text-xs italic text-[var(--color-text-secondary)] my-[0.2rem] mt-0 py-[0.3rem] px-3 bg-[rgba(184,44,44,0.05)] rounded border-l-2 border-l-[rgba(184,44,44,0.3)]">
                    {option.ruleText}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Sub-table: permanent_injury */}
          {needsStat && (
            <div className="ml-4 flex flex-col gap-[0.3rem] p-2 bg-[rgba(184,44,44,0.05)] rounded border-l-2 border-l-[var(--color-malus,#b82c2c)]">
              <p className="font-[family-name:var(--font-body)] text-xs text-[var(--color-text-secondary)] mb-[0.2rem] mt-0">
                Sous-table 1D6 — Blessure Permanente
              </p>
              {PERMANENT_INJURY_SUBTABLE.map((sub) => (
                <label
                  key={sub.stat}
                  className={cn(
                    'flex items-center gap-2 cursor-pointer font-[family-name:var(--font-body)] text-sm text-[var(--color-text-primary)] py-1 px-[0.4rem] rounded',
                    selectedStat === sub.stat ? 'bg-[rgba(184,44,44,0.08)]' : 'bg-transparent'
                  )}
                >
                  <input
                    data-testid={`initial-consequence-stat-${sub.stat}`}
                    type="radio"
                    name={`initial-consequence-stat-${unitId}`}
                    value={sub.stat}
                    checked={selectedStat === sub.stat}
                    onChange={() => setSelectedStat(sub.stat)}
                    className="accent-[var(--color-malus,#b82c2c)]"
                  />
                  {sub.label}
                </label>
              ))}
            </div>
          )}

          {/* Player picker: haine / rancune */}
          {needsPlayer && (
            <div className="ml-4">
              {campaignPlayers.length === 0 ? (
                <p className="font-[family-name:var(--font-body)] text-sm text-[var(--color-text-secondary)] italic m-0">
                  Aucun autre joueur dans la campagne
                </p>
              ) : (
                <select
                  data-testid="initial-consequence-player-select"
                  value={selectedPlayerId ?? ''}
                  onChange={(e) => setSelectedPlayerId(e.target.value || null)}
                  className="font-[family-name:var(--font-body)] text-sm py-[0.375rem] px-2 rounded-md border border-[var(--color-separator)] bg-[var(--color-background)] text-[var(--color-text-primary)] w-full"
                >
                  <option value="">— Choisir un joueur —</option>
                  {campaignPlayers.map((p) => (
                    <option key={p.playerId} value={p.playerId}>
                      {p.playerDisplayName}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Confirm / Cancel buttons */}
          <div className="flex gap-2 mt-1">
            <button
              data-testid="initial-consequence-confirm-btn"
              type="button"
              onClick={handleConfirm}
              disabled={!isConfirmEnabled}
              className={cn(
                'flex-1 font-[family-name:var(--font-body)] font-semibold text-sm py-2 px-4 rounded-lg text-white border-none',
                isConfirmEnabled
                  ? 'bg-[var(--color-malus,#b82c2c)] cursor-pointer opacity-100'
                  : 'bg-[#9aa0a6] cursor-not-allowed opacity-70'
              )}
            >
              Ajouter
            </button>
            <button
              data-testid="initial-consequence-cancel-btn"
              type="button"
              onClick={resetForm}
              className="font-[family-name:var(--font-body)] font-semibold text-sm py-2 px-4 rounded-lg bg-transparent text-[var(--color-text-secondary)] border border-[var(--color-separator)] cursor-pointer"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button
          data-testid="initial-consequence-add-btn"
          type="button"
          onClick={() => setIsAdding(true)}
          className="font-[family-name:var(--font-body)] text-sm font-semibold text-[var(--color-malus,#b82c2c)] bg-none border border-dashed border-[var(--color-malus,#b82c2c)] rounded-md py-[0.4rem] px-3 cursor-pointer self-start"
        >
          + Ajouter une conséquence
        </button>
      )}
    </div>
  )
}
