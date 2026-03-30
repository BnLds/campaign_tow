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
    <div className="flex flex-col">
      {/* Progress row with back button and cancel button */}
      <div className="sticky top-0 z-10 bg-[var(--color-bg)] pb-5">
        <WizardHeader
          onBack={onBack}
          onCancel={onCancel}
          progressLabel={`${label} — ${flaggedUnit.name}`}
        />
      </div>

      {/* Content wrapper */}
      <div className="flex flex-col gap-5">
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
        <span data-testid="wizard-complete" className="hidden" />
      </div>
    </div>
  )
}
