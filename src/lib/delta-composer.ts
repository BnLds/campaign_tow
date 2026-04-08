// Campaign TOW — Delta Composer
// PURE FUNCTION MODULE: no DB imports, no side effects.

import type { UnitGainType } from '../db/queries/units'
import { stripConstraintHint } from './format'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StatModifier {
  id: string
  unitId: string
  stat: string
  delta: number
  source: string
  temporary: boolean
}

export interface UnitGain {
  id: string
  unitId: string
  description: string
  type: UnitGainType
}

export interface StatDelta {
  stat: string
  delta: number
  source: string
  temporary: boolean
}

export interface GroupedStatDelta extends StatDelta {
  count: number
}

export interface GroupedUnitGain extends UnitGain {
  count: number
}

export interface StatEntry {
  value: string        // Display string: base stat or arithmetic result (e.g. "4"+1 → "5")
  delta: number | null // Net sum of all modifiers on this stat, null if none
  modified: boolean    // true if any stat_modifier targets this stat
}

export interface ComposedSubProfile {
  label: string
  isMount: boolean
  stats: Record<string, StatEntry>  // keys: m, cc, ct, f, e, pv, i, a, cd
}

export interface ComposedUnitView {
  subProfiles: ComposedSubProfile[]
  deltas: GroupedStatDelta[]  // Stat modifiers grouped by stat|delta|temporary (for delta chips)
  gains: GroupedUnitGain[]    // Unit gains grouped by display label|type
}

// ---------------------------------------------------------------------------
// SubProfile input shape (matches Drizzle schema row)
// ---------------------------------------------------------------------------

interface SubProfile {
  id: string
  unitId: string
  sortOrder: number
  label: string
  isMount: boolean
  m: string | null
  cc: string | null
  ct: string | null
  f: string | null
  e: string | null
  pv: string | null
  i: string | null
  a: string | null
  cd: string | null
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STAT_KEYS = ['m', 'cc', 'ct', 'f', 'e', 'pv', 'i', 'a', 'cd'] as const
type StatKey = (typeof STAT_KEYS)[number]

export const STAT_CAP = 10
// UNCAPPED_STATS: no floor at 0 and no upper cap in display. Only Mouvement is uncapped.
// Upper cap at STAT_CAP applies only to Commandement per campaign rules (checked separately in tier-up).
export const UNCAPPED_STATS: StatKey[] = ['m']
// CD_CAPPED: only Commandement is capped at STAT_CAP per campaign rules.
export const CD_STAT: StatKey = 'cd'

// ---------------------------------------------------------------------------
// Gain description → stat modifier mapping
// Parses unit_gain descriptions (e.g. "+1 CC") into stat deltas.
// Returns null for non-stat gains (Champion, Bannière, Compétence, etc.)
// ---------------------------------------------------------------------------

const GAIN_STAT_PATTERNS: Array<{ pattern: RegExp; stat: StatKey }> = [
  { pattern: /^\+(\d+) Initiative/i, stat: 'i' },
  { pattern: /^\+(\d+) CC(?:\s|$)/i, stat: 'cc' },
  { pattern: /^\+(\d+) CT(?:\s|$)/i, stat: 'ct' },
  { pattern: /^\+(\d+) Mouvement/i, stat: 'm' },
  { pattern: /^\+(\d+) Commandement/i, stat: 'cd' },
  { pattern: /^\+(\d+) Force/i, stat: 'f' },
  { pattern: /^\+(\d+) Endurance/i, stat: 'e' },
  { pattern: /^\+(\d+) Attaque/i, stat: 'a' },
  { pattern: /^\+(\d+) PV/i, stat: 'pv' },
]

// Legacy pattern: "+1 CC ou +1 CT" was stored as a single combined label before the split.
// We map it to CC by convention (the choice was made at selection time).
const LEGACY_COMBINED_PATTERN = /^\+(\d+) CC ou \+\d+ CT$/i

export function parseGainStat(description: string): { stat: StatKey; delta: number } | null {
  // Check legacy combined pattern first
  const legacyMatch = LEGACY_COMBINED_PATTERN.exec(description)
  if (legacyMatch) {
    return { stat: 'cc', delta: parseInt(legacyMatch[1], 10) }
  }
  for (const { pattern, stat } of GAIN_STAT_PATTERNS) {
    const match = pattern.exec(description)
    if (match) {
      return { stat, delta: parseInt(match[1], 10) }
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Helper: is a stat value numeric?
// ---------------------------------------------------------------------------

function isNumeric(value: string): boolean {
  const trimmed = value.trim()
  if (trimmed === '') return false
  const parsed = parseInt(trimmed, 10)
  return !isNaN(parsed) && String(parsed) === trimmed
}

// ---------------------------------------------------------------------------
// groupItems — deduplicate items by key, preserving first-occurrence order
// ---------------------------------------------------------------------------

function groupItems<T>(items: T[], keyFn: (item: T) => string): (T & { count: number })[] {
  const map = new Map<string, T & { count: number }>()
  const result: (T & { count: number })[] = []
  for (const item of items) {
    const key = keyFn(item)
    const existing = map.get(key)
    if (existing) {
      existing.count++
    } else {
      const grouped = { ...item, count: 1 }
      map.set(key, grouped)
      result.push(grouped)
    }
  }
  return result
}

// ---------------------------------------------------------------------------
// composeUnitView — main pure function
// ---------------------------------------------------------------------------

export function composeUnitView(
  subProfiles: SubProfile[],
  statModifiers: StatModifier[],
  unitGains: UnitGain[],
): ComposedUnitView {
  // Build flat delta list (all modifiers, regardless of profile)
  const deltas: StatDelta[] = statModifiers.map((mod) => ({
    stat: mod.stat,
    delta: mod.delta,
    source: mod.source,
    temporary: mod.temporary,
  }))

  const gains = unitGains

  // Convert stat-affecting gains into virtual stat modifiers
  const gainMods: StatModifier[] = []
  for (const gain of unitGains) {
    const parsed = parseGainStat(gain.description)
    if (parsed) {
      gainMods.push({
        id: `gain-${gain.id}`,
        unitId: gain.unitId,
        stat: parsed.stat,
        delta: parsed.delta,
        source: 'Progression',
        temporary: false,
      })
    }
  }

  const allModifiers = [...statModifiers, ...gainMods]

  // Pre-group modifiers by stat key for O(1) lookup
  const modsByStat = new Map<string, StatModifier[]>()
  for (const mod of allModifiers) {
    const existing = modsByStat.get(mod.stat)
    if (existing) {
      existing.push(mod)
    } else {
      modsByStat.set(mod.stat, [mod])
    }
  }

  // Cavalry rule: mods apply to mount only if no rider sub-profile has this stat
  const riderStats = new Set<string>()
  for (const sp of subProfiles) {
    if (!sp.isMount) {
      for (const key of STAT_KEYS) {
        if (sp[key] != null && sp[key] !== '-') riderStats.add(key)
      }
    }
  }

  // Compose each sub-profile
  const composedSubProfiles: ComposedSubProfile[] = subProfiles.map((sp) => {
    const stats: Record<string, StatEntry> = {}

    for (const key of STAT_KEYS as readonly StatKey[]) {
      const baseValue = sp[key] ?? '-'
      const mods = sp.isMount
        ? (riderStats.has(key) ? [] : (modsByStat.get(key) ?? []))
        : (modsByStat.get(key) ?? [])

      // "-" means the unit doesn't have this stat — ignore all modifiers
      if (baseValue === '-' || mods.length === 0) {
        stats[key] = { value: baseValue, delta: null, modified: false }
      } else {
        const netDelta = mods.reduce((sum, m) => sum + m.delta, 0)
        const numeric = isNumeric(baseValue)
        let displayValue: string
        if (numeric) {
          const rawValue = parseInt(baseValue, 10) + netDelta
          // AC25: stat floor at 0 for all non-uncapped stats (injury/destruction modifiers can be large negatives)
          // Upper cap at STAT_CAP applies only to Commandement per campaign rules.
          const floored = UNCAPPED_STATS.includes(key) ? rawValue : Math.max(0, rawValue)
          displayValue = key === CD_STAT ? String(Math.min(floored, STAT_CAP)) : String(floored)
        } else {
          // Non-numeric stat (e.g. "3D6", "D6", "3+"): append +N or -N suffix
          const sign = netDelta >= 0 ? '+' : ''
          displayValue = `${baseValue}${sign}${netDelta}`
        }

        stats[key] = { value: displayValue, delta: netDelta, modified: true }
      }
    }

    return { label: sp.label, isMount: sp.isMount, stats }
  })

  const groupedDeltas = groupItems(deltas, (d) => `${d.stat}|${d.delta}|${d.temporary}`)
  const groupedGains = groupItems(gains, (g) => `${stripConstraintHint(g.description)}|${g.type}`)

  return { subProfiles: composedSubProfiles, deltas: groupedDeltas, gains: groupedGains }
}

// ---------------------------------------------------------------------------
// computeEffectiveStats — compute effective stat values from base + gains
// ---------------------------------------------------------------------------

export function computeEffectiveStats(
  baseStats: Record<string, number | null>,
  gains: UnitGain[],
): Record<string, number | null> {
  const result: Record<string, number | null> = { ...baseStats }

  for (const gain of gains) {
    const parsed = parseGainStat(gain.description)
    if (!parsed) continue
    const current = result[parsed.stat]
    if (current == null) continue
    result[parsed.stat] = current + parsed.delta
  }

  return result
}
