// Campaign TOW — InitialConsequenceStep component
// Past consequences multi-select for initial-xp mode (campaign setup).
// Allows recording past destruction/injury consequences per unit.

import { useState } from 'react'
import { DESTRUCTION_OPTIONS } from './unit-destruction-step'
import { INJURY_OPTIONS, PERMANENT_INJURY_SUBTABLE } from './injury-bonus-step'
import type { ConsequenceEntry } from '../lib/validators'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InitialConsequenceItem = ConsequenceEntry & { _localId: number }

type CampaignPlayer = { playerId: string; playerDisplayName: string }

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
// Filtered option sets by unit type
// ---------------------------------------------------------------------------

const CHARACTER_ALLOWED = ['permanent_injury', 'grave_injury', 'haine'] as const
const UNIT_ALLOWED = ['pertes_catastrophiques', 'moral_brise', 'rancune'] as const

// ---------------------------------------------------------------------------
// Helper — short chip label
// ---------------------------------------------------------------------------

function getChipLabel(entry: ConsequenceEntry): string {
  switch (entry.type) {
    case 'permanent_injury': {
      const sub = PERMANENT_INJURY_SUBTABLE.find((s) => s.stat === entry.stat)
      const statDesc = sub ? sub.label.split(' — ')[1] : entry.stat
      return `Blessure Permanente — ${statDesc}`
    }
    case 'grave_injury':
      return 'Blessure Grave'
    case 'haine':
      return `Haine — ${entry.opponentPlayerName ?? ''}`
    case 'rancune':
      return `Rancune — ${entry.opponentPlayerName ?? ''}`
    case 'pertes_catastrophiques':
      return 'Pertes Catastrophiques'
    case 'moral_brise':
      return 'Moral Brisé'
    default:
      return entry.type
  }
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
  const [isAdding, setIsAdding] = useState(false)
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [selectedStat, setSelectedStat] = useState<string | null>(null)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)

  const isCharacter = unitType === 'Personnages'

  const filteredOptions = isCharacter
    ? INJURY_OPTIONS.filter((o) => CHARACTER_ALLOWED.includes(o.type as typeof CHARACTER_ALLOWED[number]))
    : DESTRUCTION_OPTIONS.filter((o) => UNIT_ALLOWED.includes(o.type as typeof UNIT_ALLOWED[number]))

  const needsStat = selectedType === 'permanent_injury'
  const needsPlayer = selectedType === 'haine' || selectedType === 'rancune'

  const isConfirmEnabled =
    selectedType !== null &&
    !(needsStat && selectedStat === null) &&
    !(needsPlayer && (campaignPlayers.length === 0 || selectedPlayerId === null))

  const resetForm = () => {
    setIsAdding(false)
    setSelectedType(null)
    setSelectedStat(null)
    setSelectedPlayerId(null)
  }

  const handleTypeSelect = (type: string) => {
    setSelectedType(type)
    if (type !== 'permanent_injury') setSelectedStat(null)
    if (type !== 'haine' && type !== 'rancune') setSelectedPlayerId(null)
  }

  const handleConfirm = () => {
    if (!selectedType || !isConfirmEnabled) return

    let entry: ConsequenceEntry

    if (selectedType === 'permanent_injury' && selectedStat) {
      entry = { unitId, type: 'permanent_injury', stat: selectedStat, delta: -1 }
    } else if (selectedType === 'grave_injury') {
      entry = { unitId, type: 'grave_injury' }
    } else if ((selectedType === 'haine' || selectedType === 'rancune') && selectedPlayerId) {
      const player = campaignPlayers.find((p) => p.playerId === selectedPlayerId)
      if (!player) return
      entry = { unitId, type: selectedType, opponentPlayerName: player.playerDisplayName }
    } else if (selectedType === 'pertes_catastrophiques') {
      entry = { unitId, type: 'pertes_catastrophiques' }
    } else if (selectedType === 'moral_brise') {
      entry = { unitId, type: 'moral_brise' }
    } else {
      console.warn(`[InitialConsequenceStep] handleConfirm: type non géré "${selectedType}" — ajouter un case`)
      return
    }

    onAdd(entry)
    resetForm()
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        background: 'var(--color-malus-bg, #fdf0f0)',
        borderRadius: '8px',
        padding: '1rem',
        border: '1px solid var(--color-malus, #b82c2c)',
      }}
    >
      {/* Section title */}
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '0.78rem',
          fontWeight: 600,
          color: 'var(--color-malus, #b82c2c)',
          margin: 0,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        Conséquences passées
      </p>

      {/* Consequence chips */}
      {consequences.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {consequences.map((item) => (
            <div
              key={item._localId}
              data-testid={`initial-consequence-chip-${item._localId}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.2rem 0.5rem',
                borderRadius: '9999px',
                border: '1px solid var(--color-malus, #b82c2c)',
                background: 'rgba(184,44,44,0.06)',
                fontFamily: 'var(--font-body)',
                fontSize: '0.78rem',
                color: 'var(--color-malus, #b82c2c)',
              }}
            >
              <span>{getChipLabel(item)}</span>
              <button
                data-testid={`initial-consequence-remove-${item._localId}`}
                type="button"
                onClick={() => onRemove(item._localId)}
                aria-label="Supprimer"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-malus, #b82c2c)',
                  fontSize: '1rem',
                  lineHeight: 1,
                  padding: '0',
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add form or add button */}
      {isAdding ? (
        <div data-testid="initial-consequence-form" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {/* Radio list — filtered options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {filteredOptions.map((option) => (
              <div key={option.type}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.875rem',
                    color: 'var(--color-text-primary)',
                    padding: '0.35rem 0.5rem',
                    borderRadius: '4px',
                    background: selectedType === option.type ? 'rgba(184,44,44,0.08)' : 'transparent',
                  }}
                >
                  <input
                    data-testid={`initial-consequence-type-${option.type}`}
                    type="radio"
                    name={`initial-consequence-type-${unitId}`}
                    value={option.type}
                    checked={selectedType === option.type}
                    onChange={() => handleTypeSelect(option.type)}
                    style={{ accentColor: 'var(--color-malus, #b82c2c)' }}
                  />
                  {option.label}
                </label>
                {selectedType === option.type && (
                  <p
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.78rem',
                      fontStyle: 'italic',
                      color: 'var(--color-text-secondary)',
                      margin: '0 0 0.2rem',
                      padding: '0.3rem 0.75rem',
                      background: 'rgba(184,44,44,0.05)',
                      borderRadius: '4px',
                      borderLeft: '2px solid rgba(184,44,44,0.3)',
                    }}
                  >
                    {option.ruleText}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Sub-table: permanent_injury */}
          {needsStat && (
            <div
              style={{
                marginLeft: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.3rem',
                padding: '0.5rem',
                background: 'rgba(184,44,44,0.05)',
                borderRadius: '4px',
                borderLeft: '2px solid var(--color-malus, #b82c2c)',
              }}
            >
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.78rem',
                  color: 'var(--color-text-secondary)',
                  margin: '0 0 0.2rem',
                }}
              >
                Sous-table 1D6 — Blessure Permanente
              </p>
              {PERMANENT_INJURY_SUBTABLE.map((sub) => (
                <label
                  key={sub.stat}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.85rem',
                    color: 'var(--color-text-primary)',
                    padding: '0.25rem 0.4rem',
                    borderRadius: '4px',
                    background: selectedStat === sub.stat ? 'rgba(184,44,44,0.08)' : 'transparent',
                  }}
                >
                  <input
                    data-testid={`initial-consequence-stat-${sub.stat}`}
                    type="radio"
                    name={`initial-consequence-stat-${unitId}`}
                    value={sub.stat}
                    checked={selectedStat === sub.stat}
                    onChange={() => setSelectedStat(sub.stat)}
                    style={{ accentColor: 'var(--color-malus, #b82c2c)' }}
                  />
                  {sub.label}
                </label>
              ))}
            </div>
          )}

          {/* Player picker: haine / rancune */}
          {needsPlayer && (
            <div style={{ marginLeft: '1rem' }}>
              {campaignPlayers.length === 0 ? (
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.85rem',
                    color: 'var(--color-text-secondary)',
                    fontStyle: 'italic',
                    margin: 0,
                  }}
                >
                  Aucun autre joueur dans la campagne
                </p>
              ) : (
                <select
                  data-testid="initial-consequence-player-select"
                  value={selectedPlayerId ?? ''}
                  onChange={(e) => setSelectedPlayerId(e.target.value || null)}
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.875rem',
                    padding: '0.375rem 0.5rem',
                    borderRadius: '6px',
                    border: '1px solid var(--color-separator)',
                    background: 'var(--color-background)',
                    color: 'var(--color-text-primary)',
                    width: '100%',
                  }}
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
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
            <button
              data-testid="initial-consequence-confirm-btn"
              type="button"
              onClick={handleConfirm}
              disabled={!isConfirmEnabled}
              style={{
                flex: 1,
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                fontSize: '0.875rem',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                background: isConfirmEnabled ? 'var(--color-malus, #b82c2c)' : '#9aa0a6',
                color: '#fff',
                border: 'none',
                cursor: isConfirmEnabled ? 'pointer' : 'not-allowed',
                opacity: isConfirmEnabled ? 1 : 0.7,
              }}
            >
              Ajouter
            </button>
            <button
              data-testid="initial-consequence-cancel-btn"
              type="button"
              onClick={resetForm}
              style={{
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                fontSize: '0.875rem',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                background: 'transparent',
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-separator)',
                cursor: 'pointer',
              }}
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
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--color-malus, #b82c2c)',
            background: 'none',
            border: '1px dashed var(--color-malus, #b82c2c)',
            borderRadius: '6px',
            padding: '0.4rem 0.75rem',
            cursor: 'pointer',
            alignSelf: 'flex-start',
          }}
        >
          + Ajouter une conséquence
        </button>
      )}
    </div>
  )
}
