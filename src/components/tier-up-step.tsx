// Campaign TOW — TierUpStep component
// Story 4.2: Tier-Up Detection & Improvement Choice
// Renders inline in the PostMatchWizard Phase 2 flow (not a modal/overlay).

import { useState } from 'react'
import type { Improvement } from '../lib/constants'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface TierUpStepProps {
  tierLabel: string
  majorImprovements: Improvement[]
  minorImprovements: Improvement[]
  majorCount: number
  minorCount: number
  unitName: string
  onConfirm: (result: { descriptions: string[] }) => void
  isMounted?: boolean
  /** Button label override for the last step (default: 'Confirmer') */
  confirmLabel?: string
}

// ---------------------------------------------------------------------------
// TierUpStep component
// ---------------------------------------------------------------------------

export function TierUpStep({
  tierLabel,
  majorImprovements,
  minorImprovements,
  majorCount,
  minorCount,
  unitName,
  onConfirm,
  isMounted,
  confirmLabel = 'Confirmer',
}: TierUpStepProps) {
  // Filter out character Endurance (slotCost=2) when majorCount < 2
  const filteredMajors = majorImprovements.filter((imp) => {
    const cost = imp.slotCost ?? 1
    if (cost >= 2 && majorCount < 2) return false
    return true
  })

  // State: selected major improvement IDs + selected minor improvement IDs
  const [selectedMajorIds, setSelectedMajorIds] = useState<string[]>([])
  const [selectedMinorIds, setSelectedMinorIds] = useState<string[]>([])

  // Compute used major slots
  const usedMajorSlots = selectedMajorIds.reduce((sum, id) => {
    const imp = filteredMajors.find((m) => m.id === id)
    return sum + (imp?.slotCost ?? 1)
  }, 0)

  // Is the confirm button enabled?
  const isValid = usedMajorSlots === majorCount && selectedMinorIds.length === minorCount

  // Determine UI mode
  const isMixed = majorCount > 0 && minorCount > 0

  // Handle major selection
  function handleMajorClick(id: string) {
    const imp = filteredMajors.find((m) => m.id === id)
    if (!imp) return
    const cost = imp.slotCost ?? 1

    if (selectedMajorIds.includes(id)) {
      // Deselect
      setSelectedMajorIds((prev) => prev.filter((x) => x !== id))
    } else {
      // Select if there's room
      const remaining = majorCount - usedMajorSlots
      if (remaining >= cost) {
        if (majorCount === 1) {
          // Radio mode
          setSelectedMajorIds([id])
        } else {
          setSelectedMajorIds((prev) => [...prev, id])
        }
      }
    }
  }

  // Handle minor selection
  function handleMinorClick(id: string) {
    if (selectedMinorIds.includes(id)) {
      setSelectedMinorIds((prev) => prev.filter((x) => x !== id))
    } else if (minorCount === 1) {
      // Radio mode
      setSelectedMinorIds([id])
    } else if (selectedMinorIds.length < minorCount) {
      setSelectedMinorIds((prev) => [...prev, id])
    }
  }

  function handleConfirm() {
    if (!isValid) return
    const majorDescriptions = selectedMajorIds.map((id) => {
      const imp = filteredMajors.find((m) => m.id === id)
      return imp?.label ?? id
    })
    const minorDescriptions = selectedMinorIds.map((id) => {
      const imp = minorImprovements.find((m) => m.id === id)
      return imp?.label ?? id
    })
    onConfirm({ descriptions: [...majorDescriptions, ...minorDescriptions] })
  }

  // Determine if a major improvement is disabled (slots exhausted or Endurance blocks others)
  function isMajorDisabled(imp: Improvement): boolean {
    if (selectedMajorIds.includes(imp.id)) return false // already selected
    const cost = imp.slotCost ?? 1
    const remaining = majorCount - usedMajorSlots
    return remaining < cost
  }

  // Render improvement item as radio or checkbox
  function renderMajorItem(imp: Improvement) {
    const checked = selectedMajorIds.includes(imp.id)
    const disabled = !checked && isMajorDisabled(imp)
    const inputType = majorCount === 1 ? 'radio' : 'checkbox'
    const inputName = `major-${tierLabel}-${unitName}`

    return (
      <label
        key={imp.id}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.375rem 0',
          fontFamily: 'var(--font-body)',
          fontSize: '0.875rem',
          color: disabled ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <input
          type={inputType}
          name={inputName}
          checked={checked}
          disabled={disabled}
          onChange={() => handleMajorClick(imp.id)}
          aria-label={imp.label}
        />
        {imp.label}
        {(imp.slotCost ?? 1) > 1 && (
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
            ({imp.slotCost} emplacements)
          </span>
        )}
      </label>
    )
  }

  function renderMinorItem(imp: Improvement) {
    const checked = selectedMinorIds.includes(imp.id)
    const disabled = !checked && selectedMinorIds.length >= minorCount
    const inputType = minorCount === 1 ? 'radio' : 'checkbox'
    const inputName = `minor-${tierLabel}-${unitName}`

    return (
      <label
        key={imp.id}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.375rem 0',
          fontFamily: 'var(--font-body)',
          fontSize: '0.875rem',
          color: disabled ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <input
          type={inputType}
          name={inputName}
          checked={checked}
          disabled={disabled}
          onChange={() => handleMinorClick(imp.id)}
          aria-label={imp.label}
        />
        {imp.label}
      </label>
    )
  }

  return (
    <div
      data-testid="tier-up-step"
      style={{
        background: '#fffbf5',
        border: '1px solid #e0d5c8',
        borderRadius: '8px',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      {/* Header: tier badge + unit name */}
      <div>
        <p
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '1rem',
            color: 'var(--color-gold)',
            margin: '0 0 0.25rem',
          }}
        >
          {tierLabel}
        </p>
        <p
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: '1.125rem',
            color: 'var(--color-text-primary)',
            margin: 0,
          }}
        >
          {unitName}
        </p>
      </div>

      {/* Mounted callout */}
      {isMounted && (
        <p
          data-testid="tier-up-mounted-callout"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.8rem',
            color: 'var(--color-text-secondary)',
            margin: 0,
            fontStyle: 'italic',
          }}
        >
          Les améliorations s'appliquent au cavalier/servant uniquement
        </p>
      )}

      {/* Improvements sections */}
      {isMixed ? (
        // Mixed mode: two separate sections
        <>
          <div data-testid="tier-up-major-section">
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontWeight: 700,
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--color-text-secondary)',
                marginBottom: '0.5rem',
              }}
            >
              Choisir {majorCount} amélioration{majorCount > 1 ? 's' : ''} majeure{majorCount > 1 ? 's' : ''}
            </p>
            <div>
              {filteredMajors.map((imp) => renderMajorItem(imp))}
            </div>
          </div>
          <div data-testid="tier-up-minor-section">
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontWeight: 700,
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--color-text-secondary)',
                marginBottom: '0.5rem',
              }}
            >
              Choisir {minorCount} amélioration{minorCount > 1 ? 's' : ''} mineure{minorCount > 1 ? 's' : ''}
            </p>
            <div>
              {minorImprovements.map((imp) => renderMinorItem(imp))}
            </div>
          </div>
        </>
      ) : (
        // Single section mode
        <div>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontWeight: 700,
              fontSize: '0.8rem',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--color-text-secondary)',
              marginBottom: '0.5rem',
            }}
          >
            {majorCount > 0
              ? `Choisir ${majorCount} amélioration${majorCount > 1 ? 's' : ''} majeure${majorCount > 1 ? 's' : ''}`
              : `Choisir ${minorCount} amélioration${minorCount > 1 ? 's' : ''} mineure${minorCount > 1 ? 's' : ''}`}
          </p>
          <div>
            {majorCount > 0
              ? filteredMajors.map((imp) => renderMajorItem(imp))
              : minorImprovements.map((imp) => renderMinorItem(imp))}
          </div>
        </div>
      )}

      {/* Confirm button */}
      <button
        data-testid="tier-up-confirm-button"
        onClick={handleConfirm}
        disabled={!isValid}
        style={{
          fontFamily: 'var(--font-body)',
          fontWeight: 600,
          fontSize: '1rem',
          minHeight: '44px',
          padding: '0.625rem 1rem',
          borderRadius: '8px',
          background: !isValid ? '#9aa0a6' : 'var(--color-gold)',
          color: '#fff',
          border: 'none',
          cursor: !isValid ? 'not-allowed' : 'pointer',
          opacity: !isValid ? 0.7 : 1,
        }}
      >
        {confirmLabel}
      </button>
    </div>
  )
}
