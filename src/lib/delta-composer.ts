// Campaign TOW — Delta Composer
// PURE FUNCTION MODULE: no DB imports, no side effects.

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
}

export interface StatDelta {
  stat: string
  delta: number
  source: string
  temporary: boolean
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
  deltas: StatDelta[]       // Flat list of all stat modifiers (for delta chips)
  gains: UnitGain[]
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
export const UNCAPPED_STATS: StatKey[] = ['m']

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

  // Compose each sub-profile
  const composedSubProfiles: ComposedSubProfile[] = subProfiles.map((sp) => {
    const stats: Record<string, StatEntry> = {}

    for (const key of STAT_KEYS as readonly StatKey[]) {
      const baseValue = sp[key] ?? '-'
      const mods = sp.isMount ? [] : (modsByStat.get(key) ?? [])

      // "-" means the unit doesn't have this stat — ignore all modifiers
      if (baseValue === '-' || mods.length === 0) {
        stats[key] = { value: baseValue, delta: null, modified: false }
      } else {
        const netDelta = mods.reduce((sum, m) => sum + m.delta, 0)
        const numeric = isNumeric(baseValue)
        let displayValue: string
        if (numeric) {
          const rawValue = parseInt(baseValue, 10) + netDelta
          displayValue = UNCAPPED_STATS.includes(key) ? String(rawValue) : String(Math.min(rawValue, STAT_CAP))
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

  return { subProfiles: composedSubProfiles, deltas, gains }
}

// ---------------------------------------------------------------------------
// computeEffectiveStats — compute effective stat values from base + gains
// ---------------------------------------------------------------------------

export function computeEffectiveStats(
  baseStats: Record<string, number | null>,
  gains: string[],
): Record<string, number | null> {
  const result: Record<string, number | null> = { ...baseStats }

  for (const gain of gains) {
    const parsed = parseGainStat(gain)
    if (!parsed) continue
    const current = result[parsed.stat]
    if (current == null) continue
    result[parsed.stat] = current + parsed.delta
  }

  return result
}
