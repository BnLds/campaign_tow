// Campaign TOW — ConsequenceForm sub-component
// Radio list, stat sub-table, player picker, confirm/cancel.

import { PERMANENT_INJURY_SUBTABLE } from '../injury-bonus-step'
import type { ConsequenceEntry } from '../../lib/validators'
import { cn } from '@/lib/utils'
import { buildConsequenceEntry } from './helpers'
import type { CampaignPlayer } from './helpers'
import type { ConsequenceFormApi } from './use-consequence-form'

type ConsequenceFormProps = {
  form: ConsequenceFormApi
  campaignPlayers: CampaignPlayer[]
  unitId: string
  onAdd: (entry: ConsequenceEntry) => void
}

const RADIO_CLS = 'flex items-center gap-2 cursor-pointer font-[family-name:var(--font-body)] text-sm text-[var(--color-text-primary)] py-[0.35rem] px-2 rounded'
const BTN_BASE = 'font-[family-name:var(--font-body)] font-semibold text-sm py-2 px-4 rounded-lg'

export function ConsequenceForm({ form, campaignPlayers, unitId, onAdd }: ConsequenceFormProps) {
  const { selectedType, selectedStat, selectedPlayerId } = form.state
  const { filteredOptions, needsStat, needsPlayer, isConfirmEnabled, resolvedPlayer } = form.derived
  const { handleTypeSelect, setSelectedStat, setSelectedPlayerId, resetForm } = form.actions

  const handleConfirm = () => {
    if (!selectedType || !isConfirmEnabled) return
    const entry = buildConsequenceEntry({ type: selectedType, unitId, stat: selectedStat, player: resolvedPlayer })
    if (!entry) return
    onAdd(entry)
    resetForm()
  }

  return (
    <div data-testid="initial-consequence-form" className="flex flex-col gap-2">
      <div className="flex flex-col gap-[0.35rem]">
        {filteredOptions.map((option) => (
          <div key={option.type}>
            <label className={cn(RADIO_CLS, selectedType === option.type ? 'bg-[rgba(184,44,44,0.08)]' : 'bg-transparent')}>
              <input data-testid={`initial-consequence-type-${option.type}`} type="radio" name={`initial-consequence-type-${unitId}`} value={option.type} checked={selectedType === option.type} onChange={() => handleTypeSelect(option.type)} className="accent-[var(--color-malus,#b82c2c)]" />
              {option.label}
            </label>
            {selectedType === option.type && (
              <p className="font-[family-name:var(--font-body)] text-xs italic text-[var(--color-text-secondary)] mt-0 mb-[0.2rem] py-[0.3rem] px-3 bg-[rgba(184,44,44,0.05)] rounded border-l-2 border-l-[rgba(184,44,44,0.3)]">{option.ruleText}</p>
            )}
          </div>
        ))}
      </div>

      {needsStat && (
        <div className="ml-4 flex flex-col gap-[0.3rem] p-2 bg-[rgba(184,44,44,0.05)] rounded border-l-2 border-l-[var(--color-malus,#b82c2c)]">
          <p className="font-[family-name:var(--font-body)] text-xs text-[var(--color-text-secondary)] mb-[0.2rem] mt-0">Sous-table 1D6 — Blessure Permanente</p>
          {PERMANENT_INJURY_SUBTABLE.map((sub) => (
            <label key={sub.stat} className={cn(RADIO_CLS, 'py-1 px-[0.4rem]', selectedStat === sub.stat ? 'bg-[rgba(184,44,44,0.08)]' : 'bg-transparent')}>
              <input data-testid={`initial-consequence-stat-${sub.stat}`} type="radio" name={`initial-consequence-stat-${unitId}`} value={sub.stat} checked={selectedStat === sub.stat} onChange={() => setSelectedStat(sub.stat)} className="accent-[var(--color-malus,#b82c2c)]" />
              {sub.label}
            </label>
          ))}
        </div>
      )}

      {needsPlayer && (
        <div className="ml-4">
          {campaignPlayers.length === 0 ? (
            <p className="font-[family-name:var(--font-body)] text-sm text-[var(--color-text-secondary)] italic m-0">Aucun autre joueur dans la campagne</p>
          ) : (
            <select data-testid="initial-consequence-player-select" value={selectedPlayerId ?? ''} onChange={(e) => setSelectedPlayerId(e.target.value || null)} className="font-[family-name:var(--font-body)] text-sm py-[0.375rem] px-2 rounded-md border border-[var(--color-separator)] bg-[var(--color-background)] text-[var(--color-text-primary)] w-full">
              <option value="">— Choisir un joueur —</option>
              {campaignPlayers.map((p) => <option key={p.playerId} value={p.playerId}>{p.playerDisplayName}</option>)}
            </select>
          )}
        </div>
      )}

      <div className="flex gap-2 mt-1">
        <button data-testid="initial-consequence-confirm-btn" type="button" onClick={handleConfirm} disabled={!isConfirmEnabled} className={cn(BTN_BASE, 'flex-1 text-white border-none', isConfirmEnabled ? 'bg-[var(--color-malus,#b82c2c)] cursor-pointer opacity-100' : 'bg-[#9aa0a6] cursor-not-allowed opacity-70')}>
          Ajouter
        </button>
        <button data-testid="initial-consequence-cancel-btn" type="button" onClick={resetForm} className={cn(BTN_BASE, 'bg-transparent text-[var(--color-text-secondary)] border border-[var(--color-separator)] cursor-pointer')}>
          Annuler
        </button>
      </div>
    </div>
  )
}
