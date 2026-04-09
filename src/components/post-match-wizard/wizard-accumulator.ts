// Campaign TOW — WizardAccumulator factory
// Centralises all cross-step mutable accumulation state for the PostMatchWizard.

import type { ExtendedDestructionResult, FlaggedUnit, TierUpQueueEntry, WizardAccumulator } from './types'
import type { InjuryResult } from '../injury-bonus-step'
import { invariant } from '../../lib/invariant'

// ---------------------------------------------------------------------------
// Internal rollback helper (ported from use-post-match-wizard.ts)
// ---------------------------------------------------------------------------

function rollbackTierUpStep(
  prevEntry: TierUpQueueEntry,
  prevSelections: string[],
  pendingGains: Map<string, Array<{ descriptions: string[]; thresholdXp: number | null }>>,
  cumulativeGains: Map<string, string[]>,
  cumulativeHonourSelections: Map<string, Set<string>>,
): void {
  const descriptionsToRemove = prevSelections.filter((d) => d !== '2 améliorations mineures')

  // Remove from pendingGains
  const pendingGroups = pendingGains.get(prevEntry.unitId)
  if (pendingGroups) {
    const updatedGroups = pendingGroups
      .map((group) => {
        if (group.thresholdXp !== prevEntry.xp) return group
        const updatedDescs = [...group.descriptions]
        for (const desc of descriptionsToRemove) {
          const idx = updatedDescs.indexOf(desc)
          if (idx !== -1) updatedDescs.splice(idx, 1)
        }
        return { ...group, descriptions: updatedDescs }
      })
      .filter((group) => group.descriptions.length > 0)
    if (updatedGroups.length > 0) {
      pendingGains.set(prevEntry.unitId, updatedGroups)
    } else {
      pendingGains.delete(prevEntry.unitId)
    }
  }

  // Remove from cumulativeGains
  const cumGains = cumulativeGains.get(prevEntry.unitId)
  if (cumGains) {
    const updated = [...cumGains]
    for (const desc of descriptionsToRemove) {
      const idx = updated.indexOf(desc)
      if (idx !== -1) updated.splice(idx, 1)
    }
    cumulativeGains.set(prevEntry.unitId, updated)
  }

  // Remove from cumulativeHonourSelections
  if (prevEntry.honourKind) {
    const honours = cumulativeHonourSelections.get(prevEntry.unitId)
    if (honours) {
      for (const d of prevSelections) honours.delete(d)
    }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createWizardAccumulator(): WizardAccumulator {
  const submittedUnits: Set<string> = new Set()
  const xpResults: Map<string, { oldXp: number; newXp: number }> = new Map()
  const consequenceFlags: Map<string, boolean> = new Map()
  const championFlags: Map<string, boolean> = new Map()
  const pendingConsequences: Map<string, InjuryResult | ExtendedDestructionResult> = new Map()
  const pendingGains: Map<string, Array<{ descriptions: string[]; thresholdXp: number | null }>> = new Map()
  const cumulativeGains: Map<string, string[]> = new Map()
  const cumulativeHonourSelections: Map<string, Set<string>> = new Map()
  const flaggedUnits: FlaggedUnit[] = []
  const submittedXpByStep: Map<number, Set<string>> = new Map()
  const submittedTierUpsByStep: Map<number, string[]> = new Map()

  const acc: WizardAccumulator = {
    submittedUnits,
    xpResults,
    consequenceFlags,
    championFlags,
    pendingConsequences,
    pendingGains,
    cumulativeGains,
    cumulativeHonourSelections,
    flaggedUnits,
    submittedXpByStep,
    submittedTierUpsByStep,

    recordXp(unitId: string, oldXp: number, newXp: number): void {
      xpResults.set(unitId, { oldXp, newXp })
      submittedUnits.add(unitId)
    },

    recordConsequence(unitId: string, result: InjuryResult | ExtendedDestructionResult): void {
      pendingConsequences.set(unitId, result)
    },

    recordTierUp(step: number, tierUpEntry: TierUpQueueEntry, descriptions: string[]): void {
      // Store all descriptions for potential rollback (including '2 améliorations mineures')
      submittedTierUpsByStep.set(step, descriptions)

      // Only persist meaningful descriptions (not the "2 minor improvements" meta-option)
      const descriptionsToSave = descriptions.filter(
        (d) => d !== '2 améliorations mineures' && d !== 'Non applicable',
      )

      if (descriptionsToSave.length === 0) return

      // Accumulate in pendingGains grouped by threshold XP
      const existingGroups = pendingGains.get(tierUpEntry.unitId) ?? []
      const groupIdx = existingGroups.findIndex((g) => g.thresholdXp === tierUpEntry.xp)
      if (groupIdx !== -1) {
        const existingGroup = invariant(existingGroups[groupIdx], 'groupIdx was found via findIndex — element must exist')
        existingGroups[groupIdx] = {
          ...existingGroup,
          descriptions: [...existingGroup.descriptions, ...descriptionsToSave],
        }
        pendingGains.set(tierUpEntry.unitId, existingGroups)
      } else {
        pendingGains.set(tierUpEntry.unitId, [
          ...existingGroups,
          { descriptions: descriptionsToSave, thresholdXp: tierUpEntry.xp },
        ])
      }

      // Update cumulativeGains
      const existing = cumulativeGains.get(tierUpEntry.unitId) ?? []
      cumulativeGains.set(tierUpEntry.unitId, [...existing, ...descriptionsToSave])

      // Update cumulativeHonourSelections for honour tiers
      if (tierUpEntry.honourKind) {
        const honours = cumulativeHonourSelections.get(tierUpEntry.unitId) ?? new Set<string>()
        for (const d of descriptionsToSave) honours.add(d)
        cumulativeHonourSelections.set(tierUpEntry.unitId, honours)
      }
    },

    rollbackTierUp(step: number, prevEntry: TierUpQueueEntry): void {
      const prevSelections = submittedTierUpsByStep.get(step)
      if (!prevSelections) return

      rollbackTierUpStep(prevEntry, prevSelections, pendingGains, cumulativeGains, cumulativeHonourSelections)

      submittedTierUpsByStep.delete(step)
    },

    setFlaggedUnits(units: FlaggedUnit[]): void {
      acc.flaggedUnits = units
    },
  }

  return acc
}
