// Honour gain labels — used to classify gains inserted during post-match flow
export const HONOUR_CHAMPION_LABEL = 'Champion gratuit'
export const HONOUR_BANNER_LABEL = 'Bannière gratuite'

const STAT_ABBREVIATIONS: Record<string, string> = {
  Mouvement: 'M',
  Commandement: 'Cd',
  Force: 'F',
  Endurance: 'E',
  Attaque: 'A',
  Initiative: 'I',
  'Niveau de magie': 'Magie',
}

const STAT_ABBREV_RE = new RegExp(
  Object.keys(STAT_ABBREVIATIONS)
    .sort((a, b) => b.length - a.length) // longest first
    .join('|'),
)

// Negative consequence gains — displayed in red instead of green
const NEGATIVE_GAIN_TYPES = new Set(['death', 'banner_lost', 'champion_lost', 'deroute_sanglante', 'haine'])

// Loss marker types — hidden on army unit card, visible only in timeline
const LOSS_MARKER_TYPES = new Set(['banner_lost', 'champion_lost'])

// Temporary consequence gains — displayed in orange, auto-cleared next match
const TEMPORARY_GAIN_TYPES = new Set(['pertes_catastrophiques'])

export function isNegativeConsequenceGain(type: string): boolean {
  return NEGATIVE_GAIN_TYPES.has(type)
}

export function isLossMarkerGain(type: string): boolean {
  return LOSS_MARKER_TYPES.has(type)
}

export function isTemporaryConsequenceGain(type: string): boolean {
  return TEMPORARY_GAIN_TYPES.has(type)
}

/** Format an improvement label for compact display:
 *  1. Strip trailing parenthetical constraint hints
 *  2. Abbreviate stat names to match column headers
 *
 *  "+1 Mouvement (unique)" → "+1 M"
 *  "+1 Commandement" → "+1 Cd"
 *  "+1 Force" → "+1 F"
 *  "+1 CC" → "+1 CC" (already short)
 *  "Champion gratuit" → "Champion gratuit" (no stat to abbreviate)
 */
export function stripConstraintHint(label: string): string {
  const stripped = label.replace(/\s*\([^)]+\)\s*$/, '').trim()
  return stripped.replace(STAT_ABBREV_RE, (match) => STAT_ABBREVIATIONS[match] ?? match)
}
