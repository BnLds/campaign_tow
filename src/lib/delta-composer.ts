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
  active: boolean
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
  stats: Record<string, StatEntry>  // keys: m, cc, ct, f, e, pv, i, a, cd
}

export interface ComposedUnitView {
  subProfiles: ComposedSubProfile[]
  deltas: StatDelta[]       // Flat list of all stat modifiers (for delta chips)
  gains: UnitGain[]         // Filtered to active=true only
}

export interface UnitCardProps {
  unit: { id: string; name: string; type: string; xp: number }
  composedView: ComposedUnitView
  tier: 0 | 1 | 2 | 3
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

  // Filter gains to active-only
  const gains = unitGains.filter((g) => g.active)

  // Pre-group modifiers by stat key for O(1) lookup
  const modsByStat = new Map<string, StatModifier[]>()
  for (const mod of statModifiers) {
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

      if (mods.length === 0) {
        stats[key] = { value: baseValue, delta: null, modified: false }
      } else {
        const netDelta = mods.reduce((sum, m) => sum + m.delta, 0)
        const numeric = isNumeric(baseValue)
        const displayValue = numeric
          ? String(parseInt(baseValue, 10) + netDelta)
          : baseValue

        stats[key] = { value: displayValue, delta: netDelta, modified: true }
      }
    }

    return { label: sp.label, stats }
  })

  return { subProfiles: composedSubProfiles, deltas, gains }
}
