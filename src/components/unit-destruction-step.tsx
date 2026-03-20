// Campaign TOW — UnitDestructionStep component
// Story 4.3: Character Injuries & Unit Destruction
// Renders the 2D6 unit destruction table + optional banner checkbox.

import { useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DestructionResult = {
  type:
    | 'deroute_sanglante'
    | 'pertes_catastrophiques'
    | 'moral_brise'
    | 'survivants_endurcis'
    | 'rancune'
    | 'fureur_vengeresse'
  bannerLost: boolean
}

// ---------------------------------------------------------------------------
// Table data
// ---------------------------------------------------------------------------

const DESTRUCTION_OPTIONS = [
  { type: 'deroute_sanglante', label: '2-3 — Déroute Sanglante' },
  { type: 'pertes_catastrophiques', label: '4-6 — Pertes Catastrophiques' },
  { type: 'moral_brise', label: '7-8 — Moral Brisé' },
  { type: 'survivants_endurcis', label: '9-10 — Survivants Endurcis' },
  { type: 'rancune', label: '11 — Rancune' },
  { type: 'fureur_vengeresse', label: '12 — Fureur Vengeresse' },
] as const

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type UnitDestructionStepProps = {
  unitName: string
  onConfirm: (result: DestructionResult) => void
  onBack?: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UnitDestructionStep({ unitName, onConfirm, onBack }: UnitDestructionStepProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [bannerLost, setBannerLost] = useState(false)

  const isConfirmEnabled = selectedType !== null

  const handleConfirm = () => {
    if (!selectedType) return
    onConfirm({
      type: selectedType as DestructionResult['type'],
      bannerLost,
    })
  }

  return (
    <div
      data-testid="unit-destruction-step"
      className="unit-destruction-step-malus"
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

      {/* 2D6 destruction table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {DESTRUCTION_OPTIONS.map((option) => (
          <label
            key={option.type}
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
              name="destruction-type"
              value={option.type}
              checked={selectedType === option.type}
              onChange={() => setSelectedType(option.type)}
              style={{ accentColor: 'var(--color-malus, #b82c2c)' }}
            />
            {option.label}
          </label>
        ))}
      </div>

      {/* Banner checkbox — independent of main selection */}
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          cursor: 'pointer',
          fontFamily: 'var(--font-body)',
          fontSize: '0.875rem',
          color: 'var(--color-text-secondary)',
          paddingTop: '0.25rem',
          borderTop: '1px solid rgba(184,44,44,0.2)',
        }}
      >
        <input
          data-testid="banner-lost-checkbox"
          type="checkbox"
          checked={bannerLost}
          onChange={(e) => setBannerLost(e.target.checked)}
          style={{ accentColor: 'var(--color-malus, #b82c2c)' }}
        />
        L'unité possédait une bannière
      </label>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
        {onBack && (
          <button
            data-testid="consequence-back"
            type="button"
            onClick={onBack}
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.875rem',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: '1px solid #e0d5c8',
              background: 'transparent',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
            }}
          >
            ‹ Retour
          </button>
        )}
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
