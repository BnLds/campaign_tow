// Campaign TOW — TierUpStep component
// Story 4.2: Tier-Up Detection & Improvement Choice
// Renders inline in the PostMatchWizard Phase 2 flow (not a modal/overlay).

import { useState } from 'react'
import type { Improvement } from '../lib/constants'
import { isMinorSkillImprovement, isMajorSkillImprovement, MAJOR_SKILL_OPTIONS } from '../lib/constants'

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
  unitNickname?: string | null
  onConfirm: (result: { descriptions: string[] }) => void
  isMounted?: boolean
  /** Button label override for the last step (default: 'Confirmer') */
  confirmLabel?: string
  /** IDs of improvements that should be disabled (already taken, at max, etc.) */
  disabledImprovementIds?: string[]
  /** IDs of improvements blocked because the stat has reached STAT_CAP (10) */
  capBlockedImprovementIds?: string[]
  /** Optional contextual subtitle shown below the tier label (e.g. XP threshold or recovery context) */
  subtitle?: string
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
  unitNickname,
  onConfirm,
  isMounted,
  confirmLabel = 'Confirmer',
  disabledImprovementIds = [],
  capBlockedImprovementIds = [],
  subtitle,
}: TierUpStepProps) {
  // Major improvements are passed as-is (Endurance exclusion at 20 XP is done in constants)
  const filteredMajors = majorImprovements

  // State: selected major improvement IDs + selected minor improvement IDs
  const [selectedMajorIds, setSelectedMajorIds] = useState<string[]>([])
  const [selectedMinorIds, setSelectedMinorIds] = useState<string[]>([])
  const [skillText, setSkillText] = useState('')
  const [skillChoice, setSkillChoice] = useState<string | null>(null)

  // Is the confirm button enabled?
  const hasMinorSkillSelected = selectedMinorIds.some(isMinorSkillImprovement)
  const hasMajorSkillSelected = selectedMajorIds.some(isMajorSkillImprovement)
  const skillDetailProvided =
    (!hasMinorSkillSelected || skillText.trim() !== '') &&
    (!hasMajorSkillSelected || skillChoice !== null)
  const isValid =
    selectedMajorIds.length === majorCount &&
    selectedMinorIds.length === minorCount &&
    skillDetailProvided

  // Determine UI mode
  const isMixed = majorCount > 0 && minorCount > 0

  // Handle major selection
  function handleMajorClick(id: string) {
    const imp = filteredMajors.find((m) => m.id === id)
    if (!imp) return

    // Check disabled list
    if (disabledImprovementIds.includes(id)) return

    if (selectedMajorIds.includes(id)) {
      // Deselect
      setSelectedMajorIds((prev) => prev.filter((x) => x !== id))
      if (isMajorSkillImprovement(id)) setSkillChoice(null)
    } else if (majorCount === 1) {
      // Radio mode — always replace current selection
      // Reset skill choice if replacing a skill with a non-skill (or vice versa)
      if (!isMajorSkillImprovement(id) || (selectedMajorIds.length > 0 && isMajorSkillImprovement(selectedMajorIds[0]))) {
        setSkillChoice(null)
      }
      setSelectedMajorIds([id])
    } else {
      // Checkbox mode — select if there's room
      const remaining = majorCount - selectedMajorIds.length
      if (remaining > 0) {
        setSelectedMajorIds((prev) => [...prev, id])
      }
    }
  }

  // Handle minor selection
  function handleMinorClick(id: string) {
    // Check disabled list
    if (disabledImprovementIds.includes(id)) return

    if (selectedMinorIds.includes(id)) {
      setSelectedMinorIds((prev) => prev.filter((x) => x !== id))
      if (isMinorSkillImprovement(id)) setSkillText('')
    } else if (minorCount === 1) {
      // Radio mode — always replace current selection
      // Reset skill text if replacing a skill with a non-skill (or vice versa)
      if (!isMinorSkillImprovement(id) || (selectedMinorIds.length > 0 && isMinorSkillImprovement(selectedMinorIds[0]))) {
        setSkillText('')
      }
      setSelectedMinorIds([id])
    } else if (selectedMinorIds.length < minorCount) {
      setSelectedMinorIds((prev) => [...prev, id])
    }
  }

  function resolveDescription(imp: Improvement, isMajor: boolean): string {
    if (!isMajor && isMinorSkillImprovement(imp.id)) return skillText.trim()
    if (isMajor && isMajorSkillImprovement(imp.id)) return skillChoice!
    return imp.label
  }

  function handleConfirm() {
    if (!isValid) return
    const majorDescriptions = selectedMajorIds.map((id) => {
      const imp = filteredMajors.find((m) => m.id === id)
      return imp ? resolveDescription(imp, true) : id
    })
    const minorDescriptions = selectedMinorIds.map((id) => {
      const imp = minorImprovements.find((m) => m.id === id)
      return imp ? resolveDescription(imp, false) : id
    })
    onConfirm({ descriptions: [...majorDescriptions, ...minorDescriptions] })
  }

  // Determine if a major improvement is disabled (slots exhausted or constraint-disabled)
  function isMajorDisabled(imp: Improvement): boolean {
    if (disabledImprovementIds.includes(imp.id)) return true
    if (selectedMajorIds.includes(imp.id)) return false // already selected
    if (majorCount === 1) return false // radio mode — can always switch
    const remaining = majorCount - selectedMajorIds.length
    return remaining <= 0
  }

  // Render improvement item as radio or checkbox
  function renderMajorItem(imp: Improvement) {
    const checked = selectedMajorIds.includes(imp.id)
    const disabled = !checked && isMajorDisabled(imp)
    const isCapBlocked = capBlockedImprovementIds.includes(imp.id)
    const inputType = majorCount === 1 ? 'radio' : 'checkbox'
    const inputName = `major-${tierLabel}-${unitName}`

    return (
      <div key={imp.id}>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.375rem 0',
            fontFamily: 'var(--font-body)',
            fontSize: '0.875rem',
            color: isCapBlocked ? 'var(--color-malus)' : disabled ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
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
          {isCapBlocked && (
            <span style={{ color: 'var(--color-malus)', fontSize: '0.75rem' }}>
              — valeur 10 atteinte
            </span>
          )}
        </label>
        {checked && isMajorSkillImprovement(imp.id) && (
          <div
            data-testid="skill-choice-group"
            style={{
              marginTop: '0.25rem',
              marginLeft: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
            }}
          >
            {MAJOR_SKILL_OPTIONS.map((option) => (
              <label
                key={option}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name={`skill-choice-${imp.id}`}
                  checked={skillChoice === option}
                  onChange={() => setSkillChoice(option)}
                />
                {option}
              </label>
            ))}
          </div>
        )}
      </div>
    )
  }

  function renderMinorItem(imp: Improvement) {
    const checked = selectedMinorIds.includes(imp.id)
    const isConstraintDisabled = disabledImprovementIds.includes(imp.id)
    const isCapBlocked = capBlockedImprovementIds.includes(imp.id)
    const disabled = isConstraintDisabled || (!checked && minorCount > 1 && selectedMinorIds.length >= minorCount)
    const inputType = minorCount === 1 ? 'radio' : 'checkbox'
    const inputName = `minor-${tierLabel}-${unitName}`

    return (
      <div key={imp.id}>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.375rem 0',
            fontFamily: 'var(--font-body)',
            fontSize: '0.875rem',
            color: isCapBlocked ? 'var(--color-malus)' : disabled ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
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
          {isCapBlocked && (
            <span style={{ color: 'var(--color-malus)', fontSize: '0.75rem' }}>
              — valeur 10 atteinte
            </span>
          )}
        </label>
        {checked && isMinorSkillImprovement(imp.id) && (
          <input
            data-testid="skill-text-input"
            type="text"
            placeholder="ex: vétéran, si l'unité y a droit"
            value={skillText}
            onChange={(e) => setSkillText(e.target.value)}
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.875rem',
              padding: '0.375rem 0.5rem',
              marginTop: '0.25rem',
              marginLeft: '1.5rem',
              borderRadius: '4px',
              border: '1px solid var(--color-border)',
              width: 'calc(100% - 1.5rem)',
            }}
          />
        )}
      </div>
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
        {subtitle && (
          <p
            data-testid="tier-up-subtitle"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.8125rem',
              color: 'var(--color-text-secondary)',
              margin: '0 0 0.125rem',
            }}
          >
            {subtitle}
          </p>
        )}
        <p
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: '1.125rem',
            color: 'var(--color-text-primary)',
            margin: 0,
          }}
        >
          {unitNickname ? `${unitNickname}, ${unitName}` : unitName}
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
          Les améliorations s'appliquent en priorité au cavalier/servant. Si celui-ci n'a pas la caractéristique, la monture peut être améliorée.
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
