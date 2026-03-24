// Campaign TOW — InjuryBonusStep component
// Story 4.3: Character Injuries & Unit Destruction
// Renders the 2D6 character injury table + optional 1D6 sub-table for "Blessure Permanente".

import { useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InjuryResult =
  | { type: 'death' }
  | { type: 'permanent_injury'; stat: string; delta: -1 }
  | { type: 'grave_injury'; stat: 'pv'; delta: -1 }
  | { type: 'no_effect' }
  | { type: 'haine' }
  | { type: 'miracule' }

// ---------------------------------------------------------------------------
// Table data
// ---------------------------------------------------------------------------

export const INJURY_OPTIONS = [
  { type: 'death', label: '2 — Mort', ruleText: 'Le personnage est tué. Si la bataille est gagnée ou nulle, son équipement est récupéré. Sinon, il est perdu avec tout son matériel.' },
  { type: 'permanent_injury', label: '3 — Blessure Permanente', ruleText: 'Jetez 1D6 sur la sous-table des blessures permanentes.' },
  { type: 'grave_injury', label: '4-7 — Blessure Grave', ruleText: 'Commence la prochaine bataille avec –1 PV (minimum 1).' },
  { type: 'no_effect', label: '8-10 — Égratignures', ruleText: 'Aucune séquelle. Quelques cicatrices, et une dent cassée.' },
  { type: 'haine', label: '11 — Haine', ruleText: 'Gagne la règle spéciale Haine contre l\'armée adverse.' },
  { type: 'miracule', label: '12 — Miraculé', ruleText: '+2 XP.' },
] as const

// 1D6 permanent injury sub-table — stat keys match delta-composer STAT_KEYS
export const PERMANENT_INJURY_SUBTABLE = [
  { roll: '1', label: '1 — -1 Endurance', stat: 'e' },
  { roll: '2', label: '2 — -1 Initiative', stat: 'i' },
  { roll: '3', label: '3 — -1 CT', stat: 'ct' },
  { roll: '4', label: '4 — -1 CC', stat: 'cc' },
  { roll: '5', label: '5 — -1 Force', stat: 'f' },
  { roll: '6', label: '6 — -1 Commandement', stat: 'cd' },
] as const

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type InjuryBonusStepProps = {
  unitName: string
  onConfirm: (result: InjuryResult) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InjuryBonusStep({ unitName, onConfirm }: InjuryBonusStepProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [selectedStat, setSelectedStat] = useState<string | null>(null)

  const isPermanentInjury = selectedType === 'permanent_injury'

  const isConfirmEnabled = selectedType !== null && !(isPermanentInjury && selectedStat === null)

  const handleConfirm = () => {
    if (!selectedType) return

    let result: InjuryResult
    if (selectedType === 'permanent_injury' && selectedStat) {
      result = { type: 'permanent_injury', stat: selectedStat, delta: -1 }
    } else if (selectedType === 'grave_injury') {
      result = { type: 'grave_injury', stat: 'pv', delta: -1 }
    } else if (selectedType === 'death') {
      result = { type: 'death' }
    } else if (selectedType === 'no_effect') {
      result = { type: 'no_effect' }
    } else if (selectedType === 'haine') {
      result = { type: 'haine' }
    } else if (selectedType === 'miracule') {
      result = { type: 'miracule' }
    } else {
      return
    }
    onConfirm(result)
  }

  const handleTypeSelect = (type: string) => {
    setSelectedType(type)
    // Reset sub-selection when changing main selection
    if (type !== 'permanent_injury') {
      setSelectedStat(null)
    }
  }

  return (
    <div
      data-testid="injury-bonus-step"
      className="injury-bonus-step-malus"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        background: 'var(--color-malus-bg, #fdf0f0)',
        borderRadius: '8px',
        padding: '1rem',
        border: '1px solid var(--color-malus, #b82c2c)',
      }}
    >
      {/* Unit name header */}
      <p
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '1.1rem',
          color: 'var(--color-malus, #b82c2c)',
          margin: 0,
        }}
      >
        {unitName}
      </p>

      {/* 2D6 injury table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {INJURY_OPTIONS.map((option) => (
          <div key={option.type}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                fontSize: '0.9rem',
                color: 'var(--color-text-primary)',
                padding: '0.4rem 0.5rem',
                borderRadius: '4px',
                background: selectedType === option.type ? 'rgba(184,44,44,0.08)' : 'transparent',
              }}
            >
              <input
                type="radio"
                name="injury-type"
                value={option.type}
                checked={selectedType === option.type}
                onChange={() => handleTypeSelect(option.type)}
                style={{ accentColor: 'var(--color-malus, #b82c2c)' }}
              />
              {option.label}
            </label>
            {selectedType === option.type && (
              <p
                data-testid="rule-text"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.8rem',
                  fontStyle: 'italic',
                  color: 'var(--color-text-secondary)',
                  margin: '0 0 0.25rem',
                  padding: '0.375rem 0.75rem',
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

      {/* 1D6 sub-table for "Blessure Permanente" */}
      {isPermanentInjury && (
        <div
          style={{
            marginLeft: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
            padding: '0.5rem',
            background: 'rgba(184,44,44,0.05)',
            borderRadius: '4px',
            borderLeft: '2px solid var(--color-malus, #b82c2c)',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.8rem',
              color: 'var(--color-text-secondary)',
              margin: '0 0 0.25rem',
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
                fontSize: '0.875rem',
                color: 'var(--color-text-primary)',
                padding: '0.3rem 0.5rem',
                borderRadius: '4px',
                background: selectedStat === sub.stat ? 'rgba(184,44,44,0.08)' : 'transparent',
              }}
            >
              <input
                type="radio"
                name="injury-stat"
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

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
        <button
          data-testid="consequence-confirm"
          type="button"
          onClick={handleConfirm}
          disabled={!isConfirmEnabled}
          style={{
            flex: 1,
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            fontSize: '1rem',
            padding: '0.625rem 1rem',
            borderRadius: '8px',
            background: isConfirmEnabled ? 'var(--color-malus, #b82c2c)' : '#9aa0a6',
            color: '#fff',
            border: 'none',
            cursor: isConfirmEnabled ? 'pointer' : 'not-allowed',
            opacity: isConfirmEnabled ? 1 : 0.7,
          }}
        >
          Confirmer
        </button>
      </div>
    </div>
  )
}
