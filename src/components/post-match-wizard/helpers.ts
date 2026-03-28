// Campaign TOW — PostMatchWizard helpers (pure, no React)

import { detectTierCrossings } from '../../lib/tier'
import { expandQueueEntry } from './phase-tierup'
import type { InjuryResult, DestructionResult, InitialConsequenceItem, ConsequenceEntry, WizardUnit, FlaggedUnit, TierUpQueueEntry } from './types'

// ---------------------------------------------------------------------------
// buildConsequencesArray
// ---------------------------------------------------------------------------

export function buildConsequencesArray(
  pendingConsequences: Map<string, InjuryResult | (DestructionResult & { xpLostAmount?: number })>,
  initialConsequences: InitialConsequenceItem[],
  opponentPlayerName: string,
): ConsequenceEntry[] {
  const consequences: ConsequenceEntry[] = []
  for (const [unitId, result] of pendingConsequences) {
    if ('bannerLost' in result) {
      // DestructionResult (possibly extended with xpLostAmount)
      const entry: ConsequenceEntry = { unitId, type: result.type, bannerLost: result.bannerLost }
      if (result.type === 'rancune') {
        entry.opponentPlayerName = opponentPlayerName
      }
      const extResult = result as DestructionResult & { xpLostAmount?: number }
      if (result.type === 'deroute_sanglante' && extResult.xpLostAmount != null) {
        entry.xpLostAmount = extResult.xpLostAmount
      }
      consequences.push(entry)
    } else {
      // InjuryResult
      const entry: ConsequenceEntry = { unitId, type: result.type }
      if ('stat' in result && result.stat) entry.stat = result.stat
      if ('delta' in result) entry.delta = result.delta
      if (result.type === 'haine') {
        entry.opponentPlayerName = opponentPlayerName
      }
      consequences.push(entry)
    }
  }
  // Append initial-xp mode consequences (already ConsequenceEntry-shaped)
  for (const item of initialConsequences) {
    const { _localId: _id, ...entry } = item
    consequences.push(entry)
  }
  return consequences
}

// ---------------------------------------------------------------------------
// buildChampionKilledIds
// ---------------------------------------------------------------------------

export function buildChampionKilledIds(championFlags: Map<string, boolean>): string[] {
  const ids: string[] = []
  for (const [unitId, killed] of championFlags) {
    if (killed) ids.push(unitId)
  }
  return ids
}

// ---------------------------------------------------------------------------
// buildTierUpQueue
// ---------------------------------------------------------------------------

export function buildTierUpQueue(
  units: WizardUnit[],
  xpResults: Map<string, { oldXp: number; newXp: number }>,
): TierUpQueueEntry[] {
  const queue: TierUpQueueEntry[] = []
  for (const unit of units) {
    const result = xpResults.get(unit.id)
    if (!result) {
      console.warn(`[PostMatchWizard] No XP result found for unit ${unit.id} (${unit.name}). Treating as 0 XP gained — no tier crossing.`)
      continue
    }
    const crossings = detectTierCrossings(result.oldXp, result.newXp, unit.type)
    const existingGains = unit.existingGains ?? []
    for (const crossing of crossings) {
      const isHonour = crossing.tierLabel === 'Honneur de bataille'
      let filteredMinor = crossing.minorImprovements
      if (isHonour) {
        filteredMinor = crossing.minorImprovements.filter((imp) => !existingGains.some((g) => g.description === imp.label))
      }
      if (isHonour && filteredMinor.length === 0) continue
      const baseEntry: TierUpQueueEntry = {
        ...crossing,
        minorImprovements: isHonour ? filteredMinor : crossing.minorImprovements,
        unitId: unit.id,
        unitName: unit.name,
        unitNickname: unit.nickname,
        unitType: unit.type,
        hasMount: unit.hasMount ?? false,
        commandement: unit.commandement ?? 0,
      }
      queue.push(...expandQueueEntry(baseEntry))
    }
  }
  return queue
}

// ---------------------------------------------------------------------------
// buildBatchGainsPayload
// ---------------------------------------------------------------------------

export function buildBatchGainsPayload(
  pendingGains: Map<string, Array<{ descriptions: string[]; thresholdXp: number | null }>>,
): Array<{ unitId: string; descriptions: string[]; thresholdXp?: number | null }> {
  const gains: Array<{ unitId: string; descriptions: string[]; thresholdXp?: number | null }> = []
  for (const [unitId, groups] of pendingGains) {
    for (const group of groups) {
      gains.push({ unitId, descriptions: group.descriptions, thresholdXp: group.thresholdXp })
    }
  }
  return gains
}

// ---------------------------------------------------------------------------
// buildFlaggedUnits
// ---------------------------------------------------------------------------

export function buildFlaggedUnits(
  units: WizardUnit[],
  consequenceFlags: Map<string, boolean>,
): FlaggedUnit[] {
  const characters = units.filter((u) => u.type === 'Personnages' && consequenceFlags.get(u.id))
  const others = units.filter((u) => u.type !== 'Personnages' && consequenceFlags.get(u.id))
  return [...characters, ...others].map((u) => ({
    id: u.id,
    name: u.name,
    type: u.type,
    existingGains: u.existingGains ?? [],
  }))
}
