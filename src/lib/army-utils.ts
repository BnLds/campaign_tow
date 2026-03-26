// Campaign TOW — Army utility functions

import type { ComposedUnitView } from './delta-composer'
import type { TierLevel } from './tier'

export const TYPE_ORDER = ['Personnages', 'Unités de base', 'Unités spéciales', 'Unités rares']

export function groupUnitsByType(
  unitCards: Array<{
    unit: { id: string; name: string; nickname: string | null; type: string; xp: number; points: number | null }
    composedView: ComposedUnitView
    tier: TierLevel
    subProfiles: Array<{ id: string; label: string; isMount: boolean; sortOrder: number }>
  }>
) {
  const groups = new Map<string, typeof unitCards>()
  for (const card of unitCards) {
    const existing = groups.get(card.unit.type)
    if (existing) {
      existing.push(card)
    } else {
      groups.set(card.unit.type, [card])
    }
  }
  // Return in canonical order, then any remaining types alphabetically
  const ordered: Array<{ type: string; cards: typeof unitCards }> = []
  for (const type of TYPE_ORDER) {
    const cards = groups.get(type)
    if (cards) {
      ordered.push({ type, cards })
      groups.delete(type)
    }
  }
  const remaining = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
  for (const [type, cards] of remaining) {
    ordered.push({ type, cards })
  }
  return ordered
}
