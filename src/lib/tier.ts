// Campaign TOW — XP Tier utility
// Pure function: no DB imports, no side effects.

import { UNIT_THRESHOLDS, CHARACTER_THRESHOLDS, HONOUR_THRESHOLDS } from './constants'
import type { ThresholdEntry } from './constants'

// Module-level set for O(1) honour threshold lookup (avoid per-call allocation)
const HONOUR_SET = new Set<number>(HONOUR_THRESHOLDS)

// TierLevel type alias — exported for use in all call sites
export type TierLevel = 0 | 1 | 2 | 3 | 4

// XP thresholds per unit type (Story 4.2)
// Units:      0→0, 10→1, 25→2, 50→3, 80→4
// Characters: 0→0, 6→1,  20→2, 40→3, 70→4
// NOTE: Honneur de bataille (3, 9) are NOT visual tiers — detected only by detectTierCrossings()

export function calculateTier(xp: number, unitType: string): TierLevel {
  if (unitType === 'Personnages') {
    // Character tiers
    if (xp >= 70) return 4  // Héroïque
    if (xp >= 40) return 3  // Vétéran
    if (xp >= 20) return 2  // Expérimenté
    if (xp >= 6) return 1   // Aguerri
    return 0                 // (no label for characters at tier 0)
  } else {
    // All non-Personnages types use standard unit thresholds
    if (xp >= 80) return 4  // Légendaire
    if (xp >= 50) return 3  // Vétéran
    if (xp >= 25) return 2  // Expérimenté
    if (xp >= 10) return 1  // Aguerri
    return 0                 // Bleusaille
  }
}

export function getTierLabel(tier: TierLevel, unitType?: string): string {
  switch (tier) {
    case 4:
      return unitType === 'Personnages' ? '✦ Héroïque' : '✦ Légendaire'
    case 3: return '✦ Vétéran'
    case 2: return '◆ Expérimenté'
    case 1: return '◈ Aguerri'
    default:
      // Tier 0: units → Bleusaille, characters → '' (no label)
      return unitType === 'Personnages' ? '' : 'Bleusaille'
  }
}

export function getTierColor(tier: TierLevel): string {
  switch (tier) {
    case 4: return 'var(--color-gold)'
    case 3: return 'var(--color-gold)'
    case 2: return 'var(--color-silver)'
    case 1: return 'var(--color-bronze)'
    default: return 'var(--color-neutral)'
  }
}

// ---------------------------------------------------------------------------
// detectTierCrossings — returns all threshold entries crossed between oldXp and newXp
// Used by PostMatchWizard to build Phase 2 tier-up queue.
// ---------------------------------------------------------------------------

export function detectTierCrossings(
  oldXp: number,
  newXp: number,
  unitType: string,
): ThresholdEntry[] {
  if (newXp <= oldXp) return []

  const thresholds: ThresholdEntry[] = unitType === 'Personnages'
    ? CHARACTER_THRESHOLDS
    : UNIT_THRESHOLDS

  return thresholds
    .filter((t) => t.xp > oldXp && t.xp <= newXp)
    .sort((a, b) => a.xp - b.xp)
}

// ---------------------------------------------------------------------------
// detectLostThresholds — returns unit tier threshold XP values lost between preXp and postXp
// Used by completeEvolutionsWithGainsTransaction for deroute tier-down gain removal.
// Excludes HONOUR_THRESHOLDS (3, 9) — champion/banner gains are never cleared.
// Only applies to units (non-Personnages). Returns empty array if postXp >= preXp.
// ---------------------------------------------------------------------------

export function detectLostThresholds(
  preXp: number,
  postXp: number,
  unitType: string,
): number[] {
  if (postXp >= preXp) return []
  // Deroute sanglante only applies to units (not characters)
  if (unitType === 'Personnages') return []

  return UNIT_THRESHOLDS
    .filter((t) => preXp >= t.xp && t.xp > postXp && !HONOUR_SET.has(t.xp))
    .map((t) => t.xp)
}
