// Campaign TOW — PhaseConsequences component
// Phase 1.5 (consequence flow): injury/destruction per flagged unit.

import { InjuryBonusStep } from '../injury-bonus-step'
import { UnitDestructionStep } from '../unit-destruction-step'
import type { FlaggedUnit, InjuryResult, DestructionResult } from './types'
import { WizardHeader } from './wizard-header'

type PhaseConsequencesProps = {
  flaggedUnit: FlaggedUnit
  onConfirm: (result: InjuryResult | DestructionResult) => void
  onBack: () => void
  onCancel: () => void
}

export function PhaseConsequences({
  flaggedUnit,
  onConfirm,
  onBack,
  onCancel,
}: PhaseConsequencesProps) {
  const isCharacter = flaggedUnit.type === 'Personnages'
  const label = isCharacter ? 'Blessure' : 'Destruction'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Progress row with back button and cancel button */}
      <WizardHeader
        onBack={onBack}
        onCancel={onCancel}
        progressLabel={`${label} — ${flaggedUnit.name}`}
      />

      {/* Consequence step — key resets internal state when index changes (caller responsibility) */}
      {isCharacter ? (
        <InjuryBonusStep
          unitName={flaggedUnit.name}
          onConfirm={(result) => onConfirm(result)}
        />
      ) : (
        <UnitDestructionStep
          unitName={flaggedUnit.name}
          hasBannerGain={flaggedUnit.existingGains.some((g) => g.type === 'honour_banner')}
          onConfirm={(result) => onConfirm(result)}
        />
      )}

      {/* Completion marker */}
      <span data-testid="wizard-complete" style={{ display: 'none' }} />
    </div>
  )
}
