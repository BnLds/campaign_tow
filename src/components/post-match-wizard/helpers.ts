// Campaign TOW — PostMatchWizard helpers (pure, no React)

import { detectTierCrossings } from '../../lib/tier'
import { HONOUR_CHAMPION_LABEL, HONOUR_BANNER_LABEL } from '../../lib/format'
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
// buildHonourRetriggerEntries — synthetic "Honneur de bataille" entries for
// honours lost in the current match (champion killed / banner lost).
// Each lost honour costs 3 XP gained in the same match to re-select.
// ---------------------------------------------------------------------------

function buildHonourRetriggerEntries(
  units: WizardUnit[],
  xpResults: Map<string, { oldXp: number; newXp: number }>,
  lostGainTypes: Map<string, Set<string>>,
): TierUpQueueEntry[] {
  const entries: TierUpQueueEntry[] = []

  for (const [unitId, lostTypes] of lostGainTypes) {
    const unit = units.find((u) => u.id === unitId)
    if (!unit) continue
    // Characters never have honours
    if (unit.type === 'Personnages') continue

    const xpResult = xpResults.get(unitId)
    if (!xpResult) continue

    const xpGained = xpResult.newXp - xpResult.oldXp
    const reselectionSlots = Math.min(lostTypes.size, Math.floor(xpGained / 3))
    if (reselectionSlots <= 0) continue

    for (let i = 0; i < reselectionSlots; i++) {
      // Build available improvements — only include lost honour types + NA
      // IDs include unitId + slot index to be globally unique
      const availableImprovements: TierUpQueueEntry['minorImprovements'] = []
      if (lostTypes.has('honour_champion')) {
        availableImprovements.push({
          id: `u-retrigger-${unitId}-champ-${i}`,
          label: HONOUR_CHAMPION_LABEL,
          category: 'honour',
        })
      }
      if (lostTypes.has('honour_banner')) {
        availableImprovements.push({
          id: `u-retrigger-${unitId}-ban-${i}`,
          label: HONOUR_BANNER_LABEL,
          category: 'honour',
        })
      }
      availableImprovements.push({
        id: `u-retrigger-${unitId}-na-${i}`,
        label: 'Non applicable',
        category: 'honour',
      })

      entries.push({
        xp: 0, // synthetic — not tied to a real threshold
        tierLabel: 'Honneur de bataille',
        majorImprovements: [],
        minorImprovements: availableImprovements,
        majorCount: 0,
        minorCount: 1,
        unitId: unit.id,
        unitName: unit.name,
        unitNickname: unit.nickname,
        unitType: unit.type,
        hasMount: unit.hasMount ?? false,
        commandement: unit.commandement ?? 0,
      })
    }
  }

  return entries
}

// ---------------------------------------------------------------------------
// buildTierUpQueue
// ---------------------------------------------------------------------------

export function buildTierUpQueue(
  units: WizardUnit[],
  xpResults: Map<string, { oldXp: number; newXp: number }>,
  lostGainTypes?: Map<string, Set<string>>,
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
        // Effect A: exclude gains that were lost this match — they should remain selectable
        const unitLostTypes = lostGainTypes?.get(unit.id)
        const effectiveGains = unitLostTypes
          ? existingGains.filter((g) => !unitLostTypes.has(g.type))
          : existingGains
        filteredMinor = crossing.minorImprovements.filter((imp) => !effectiveGains.some((g) => g.description === imp.label))
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

  // Effect B: inject synthetic retrigger entries for lost honours
  if (lostGainTypes && lostGainTypes.size > 0) {
    queue.push(...buildHonourRetriggerEntries(units, xpResults, lostGainTypes))
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
