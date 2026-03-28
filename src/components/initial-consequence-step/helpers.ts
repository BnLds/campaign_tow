// Campaign TOW — InitialConsequenceStep helpers (pure, no React)

import { INJURY_OPTIONS, PERMANENT_INJURY_SUBTABLE } from '../injury-bonus-step'
import { DESTRUCTION_OPTIONS } from '../unit-destruction-step'
import type { ConsequenceEntry } from '../../lib/validators'

// ---------------------------------------------------------------------------
// Constants & Types
// ---------------------------------------------------------------------------

export const CHARACTER_UNIT_TYPE = 'Personnages'

export type InitialConsequenceType =
  | 'permanent_injury'
  | 'grave_injury'
  | 'haine'
  | 'pertes_catastrophiques'
  | 'moral_brise'
  | 'rancune'

export type CampaignPlayer = { playerId: string; playerDisplayName: string }

export type ConsequenceOption = { type: InitialConsequenceType; label: string; ruleText: string }

export type InitialConsequenceItem = ConsequenceEntry & { _localId: number }

// ---------------------------------------------------------------------------
// Filtered option sets by unit type
// ---------------------------------------------------------------------------

const CHARACTER_ALLOWED: readonly InitialConsequenceType[] = ['permanent_injury', 'grave_injury', 'haine']
const UNIT_ALLOWED: readonly InitialConsequenceType[] = ['pertes_catastrophiques', 'moral_brise', 'rancune']

export function getFilteredOptions(unitType: string): ConsequenceOption[] {
  if (unitType === CHARACTER_UNIT_TYPE) {
    return (INJURY_OPTIONS as readonly ConsequenceOption[]).filter((o) =>
      CHARACTER_ALLOWED.includes(o.type)
    )
  }
  return (DESTRUCTION_OPTIONS as readonly ConsequenceOption[]).filter((o) =>
    UNIT_ALLOWED.includes(o.type)
  )
}

// ---------------------------------------------------------------------------
// Helper — short chip label
// ---------------------------------------------------------------------------

export function getChipLabel(entry: ConsequenceEntry): string {
  switch (entry.type) {
    case 'permanent_injury': {
      const sub = PERMANENT_INJURY_SUBTABLE.find((s) => s.stat === entry.stat)
      const statDesc = sub ? sub.label.split(' — ')[1] : entry.stat
      return `Blessure Permanente — ${statDesc}`
    }
    case 'grave_injury':
      return 'Blessure Grave'
    case 'haine':
      return `Haine — ${entry.opponentPlayerName ?? '(inconnu)'}`
    case 'rancune':
      return `Rancune — ${entry.opponentPlayerName ?? '(inconnu)'}`
    case 'pertes_catastrophiques':
      return 'Pertes Catastrophiques'
    case 'moral_brise':
      return 'Moral Brisé'
    default:
      return entry.type
  }
}

// ---------------------------------------------------------------------------
// buildConsequenceEntry — 6-branch builder extracted from handleConfirm
// ---------------------------------------------------------------------------

export function buildConsequenceEntry({
  type,
  unitId,
  stat,
  player,
}: {
  type: InitialConsequenceType
  unitId: string
  stat: string | null
  player: CampaignPlayer | null
}): ConsequenceEntry | null {
  if (type === 'permanent_injury' && stat) {
    return { unitId, type: 'permanent_injury', stat, delta: -1 }
  }
  if (type === 'permanent_injury' && !stat) {
    console.warn('[buildConsequenceEntry] permanent_injury requires a stat but none was provided')
    return null
  }
  if (type === 'grave_injury') {
    return { unitId, type: 'grave_injury', stat: 'pv', delta: -1 }
  }
  if ((type === 'haine' || type === 'rancune') && player) {
    return { unitId, type: type as 'haine' | 'rancune', opponentPlayerName: player.playerDisplayName }
  }
  if (type === 'haine' && !player) {
    console.warn('[buildConsequenceEntry] haine requires a player but none was provided')
    return null
  }
  if (type === 'rancune' && !player) {
    console.warn('[buildConsequenceEntry] rancune requires a player but none was provided')
    return null
  }
  if (type === 'pertes_catastrophiques') {
    return { unitId, type: 'pertes_catastrophiques' }
  }
  if (type === 'moral_brise') {
    return { unitId, type: 'moral_brise' }
  }
  console.warn(`[buildConsequenceEntry] unhandled type "${type}" — add a case`)
  return null
}
