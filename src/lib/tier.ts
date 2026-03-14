// Campaign TOW — XP Tier utility
// Pure function: no DB imports, no side effects.

// XP thresholds (identical for characters and units currently, but unitType kept for future-proofing)
// < 6  → tier 0 (none)
// 6–11 → tier 1 (Aguerri)
// 12–19 → tier 2 (Expérimenté)
// >= 20 → tier 3 (Vétéran / Héroïque maps to tier 3)

export function calculateTier(xp: number, _unitType: string): 0 | 1 | 2 | 3 {
  if (xp >= 20) return 3
  if (xp >= 12) return 2
  if (xp >= 6) return 1
  return 0
}

export function getTierLabel(tier: 0 | 1 | 2 | 3): string {
  switch (tier) {
    case 3: return '✦ Vétéran'
    case 2: return '◆ Expérimenté'
    case 1: return '◈ Aguerri'
    default: return ''
  }
}

export function getTierColor(tier: 0 | 1 | 2 | 3): string {
  switch (tier) {
    case 3: return 'var(--color-gold)'
    case 2: return 'var(--color-silver)'
    case 1: return 'var(--color-bronze)'
    default: return 'var(--color-neutral)'
  }
}
