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

export const DESTRUCTION_OPTIONS = [
  { type: 'deroute_sanglante', label: '2-3 — Déroute Sanglante', ruleText: "L'unité perd 10/10/15/20/30 XP selon son palier. La perte d'XP se fait après l'ajout des gains de la bataille." },
  { type: 'pertes_catastrophiques', label: '4-6 — Pertes Catastrophiques', ruleText: "L'unité est à moitié d'effectif (arrondi à l'inférieur) pour la bataille suivante." },
  { type: 'moral_brise', label: '7-8 — Moral Brisé', ruleText: "L'unité perd 2 points de Commandement pour la bataille suivante." },
  { type: 'survivants_endurcis', label: '9-10 — Survivants Endurcis', ruleText: 'Aucune conséquence.' },
  { type: 'rancune', label: '11 — Rancune', ruleText: "L'unité gagne Haine contre l'armée qui l'a vaincue." },
  { type: 'fureur_vengeresse', label: '12 — Fureur Vengeresse', ruleText: '+2 XP.' },
] as const

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type UnitDestructionStepProps = {
  unitName: string
  hasBannerGain: boolean
  onConfirm: (result: DestructionResult) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UnitDestructionStep({ unitName, hasBannerGain, onConfirm }: UnitDestructionStepProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null)

  const isConfirmEnabled = selectedType !== null

  const handleConfirm = () => {
    if (!selectedType) return
    onConfirm({
      type: selectedType as DestructionResult['type'],
      bannerLost: hasBannerGain,
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
                name="destruction-type"
                value={option.type}
                checked={selectedType === option.type}
                onChange={() => setSelectedType(option.type)}
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

      {/* Banner auto-loss — shown only if unit had "Bannière gratuite" gain */}
      {hasBannerGain && (
        <p
          data-testid="banner-lost-message"
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            fontSize: '0.875rem',
            color: 'var(--color-malus, #b82c2c)',
            margin: 0,
            paddingTop: '0.25rem',
            borderTop: '1px solid rgba(184,44,44,0.2)',
          }}
        >
          L'unité perd sa bannière gratuite !
        </p>
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
