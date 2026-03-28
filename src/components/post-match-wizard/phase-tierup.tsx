// Campaign TOW — PhaseTierUp component
// Phase 2 (tier-up flow): improvement selection per tier crossing.

import { useState } from 'react'
import { TierUpStep } from '../tier-up-step'
import { parseGainStat, STAT_CAP, UNCAPPED_STATS, CD_STAT } from '../../lib/delta-composer'
import type { WizardUnit, TierUpQueueEntry } from './types'
import { WizardHeader } from './wizard-header'

// ---------------------------------------------------------------------------
// expandQueueEntry — pure helper (sole consumer is this file)
// ---------------------------------------------------------------------------

export function expandQueueEntry(entry: TierUpQueueEntry): TierUpQueueEntry[] {
  const { majorCount, minorCount } = entry

  // Simple entry: exactly one category with count 1 — no expansion needed
  const needsExpansion = majorCount > 1 || minorCount > 1 || (majorCount > 0 && minorCount > 0)
  if (!needsExpansion) {
    return [entry]
  }

  const expanded: TierUpQueueEntry[] = []

  // Expand major picks (one step per major selection)
  for (let i = 0; i < majorCount; i++) {
    expanded.push({
      ...entry,
      majorCount: 1,
      minorCount: 0,
      minorImprovements: [],
      tierLabel: majorCount > 1
        ? `${entry.tierLabel} — Majeure ${i + 1}/${majorCount}`
        : entry.tierLabel,
    })
  }

  // Expand minor picks (one step per minor selection)
  for (let i = 0; i < minorCount; i++) {
    expanded.push({
      ...entry,
      majorCount: 0,
      minorCount: 1,
      majorImprovements: [],
      tierLabel: minorCount > 1
        ? `${entry.tierLabel} — Mineure ${i + 1}/${minorCount}`
        : (majorCount > 0 ? `${entry.tierLabel} — Mineure` : entry.tierLabel),
    })
  }

  return expanded
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type PhaseTierUpProps = {
  currentTierUp: TierUpQueueEntry
  tierUpStep: number
  totalTierUps: number
  isLastStep: boolean
  units: WizardUnit[]
  cumulativeHonourSelections: Map<string, Set<string>>
  cumulativeGains: Map<string, string[]>
  onConfirm: (result: { descriptions: string[] }) => Promise<void>
  onBack: () => void
  onCancel: () => void
}

export function PhaseTierUp({
  currentTierUp,
  tierUpStep,
  totalTierUps,
  isLastStep,
  units,
  cumulativeHonourSelections,
  cumulativeGains,
  onConfirm,
  onBack,
  onCancel,
}: PhaseTierUpProps) {
  const [, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // For honour thresholds, dynamically filter out improvements already selected
  // in earlier tier-up steps of the same unit (within this session) — O(1) lookup
  let dynamicMinorImprovements = currentTierUp.minorImprovements
  if (currentTierUp.tierLabel === 'Honneur de bataille') {
    const priorSelections = cumulativeHonourSelections.get(currentTierUp.unitId)
    if (priorSelections && priorSelections.size > 0) {
      dynamicMinorImprovements = currentTierUp.minorImprovements.filter(
        (imp) => !priorSelections.has(imp.label)
      )
    }
  }

  // Compute disabled improvement IDs based on existingGains + session cumulative gains
  const unitData = units.find((u) => u.id === currentTierUp.unitId)
  const existingGains = unitData?.existingGains ?? []
  const sessionGains = cumulativeGains.get(currentTierUp.unitId) ?? []
  const allGains = [...existingGains.map((g) => g.description), ...sessionGains]

  const disabledIds: string[] = []
  const isCharacter = currentTierUp.unitType === 'Personnages'

  // Count occurrences of gain patterns
  const mouvCount = allGains.filter((g) => /Mouvement/i.test(g)).length
  const enduranceCount = allGains.filter((g) => /Endurance/i.test(g)).length
  const attaqueCount = allGains.filter((g) => /Attaque/i.test(g)).length
  const pvCount = allGains.filter((g) => /PV/i.test(g)).length

  // Disable +1 Mouvement if already taken (unit + char)
  if (mouvCount >= 1) {
    for (const imp of [...currentTierUp.majorImprovements, ...dynamicMinorImprovements]) {
      if (/Mouvement/i.test(imp.label)) disabledIds.push(imp.id)
    }
  }

  // Commandement cap constraint: disable improvements that would push Cd beyond STAT_CAP (10).
  const capBlockedIds: string[] = []
  const unitEffective = unitData?.effectiveStats ?? {}
  const allImprovements = [...currentTierUp.majorImprovements, ...dynamicMinorImprovements]
  for (const imp of allImprovements) {
    const parsed = parseGainStat(imp.label)
    if (!parsed || parsed.stat !== CD_STAT || unitEffective[parsed.stat] == null) continue
    if ((UNCAPPED_STATS as readonly string[]).includes(parsed.stat)) continue
    // Session gains for Commandement
    const sessionDelta = sessionGains
      .map((g) => parseGainStat(g))
      .filter((p) => p?.stat === CD_STAT)
      .reduce((sum, p) => sum + (p?.delta ?? 0), 0)
    if ((unitEffective[parsed.stat] as number) + sessionDelta + parsed.delta > STAT_CAP) {
      capBlockedIds.push(imp.id)
      if (!disabledIds.includes(imp.id)) disabledIds.push(imp.id)
    }
  }

  if (isCharacter) {
    // Char: +1 PV max 2x
    if (pvCount >= 2) {
      for (const imp of currentTierUp.majorImprovements) {
        if (/PV/i.test(imp.label)) disabledIds.push(imp.id)
      }
    }
    // Char: +1 Attaque — pas de plafond (xp_rules.md ligne 63)
  } else {
    // Unit: +1 Endurance max 1x
    if (enduranceCount >= 1) {
      for (const imp of currentTierUp.majorImprovements) {
        if (/Endurance/i.test(imp.label)) disabledIds.push(imp.id)
      }
    }
    // Unit: +1 Attaque max 1x
    if (attaqueCount >= 1) {
      for (const imp of currentTierUp.majorImprovements) {
        if (/Attaque/i.test(imp.label) && !/CC|CT/i.test(imp.label)) disabledIds.push(imp.id)
      }
    }
  }

  const handleConfirm = async (result: { descriptions: string[] }) => {
    setIsSubmitting(true)
    setError(null)
    try {
      await onConfirm(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Progress row with back and cancel buttons */}
      <WizardHeader
        onBack={onBack}
        onCancel={onCancel}
        progressLabel={`Amélioration ${tierUpStep + 1} / ${totalTierUps}`}
      />

      {/* Error message */}
      {error && (
        <p
          data-testid="wizard-error"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.875rem',
            color: '#b82c2c',
            margin: 0,
          }}
        >
          {error}
        </p>
      )}

      {/* TierUpStep — key resets internal useState when advancing to next step (C1) */}
      <TierUpStep
        tierLabel={currentTierUp.tierLabel}
        majorImprovements={currentTierUp.majorImprovements}
        minorImprovements={dynamicMinorImprovements}
        majorCount={currentTierUp.majorCount}
        minorCount={currentTierUp.minorCount}
        unitName={currentTierUp.unitName}
        unitNickname={currentTierUp.unitNickname}
        isMounted={currentTierUp.hasMount}
        confirmLabel={isLastStep ? 'Terminer' : 'Suivant'}
        disabledImprovementIds={disabledIds}
        capBlockedImprovementIds={capBlockedIds}
        onConfirm={(result) => void handleConfirm(result)}
      />

      {/* Completion marker */}
      <span data-testid="wizard-complete" style={{ display: 'none' }} />
    </div>
  )
}
