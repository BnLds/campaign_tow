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
const NEGATIVE_CONSEQUENCE_PREFIXES = [
  'Mort',
  'Bannière perdue',
  'Déroute Sanglante',
  'Haine',
  'Rancune', // legacy format for existing data
]

// Temporary consequence gains — displayed in orange, auto-cleared next match
const TEMPORARY_CONSEQUENCE_PREFIXES = [
  'Pertes Catastrophiques',
]

export function isNegativeConsequenceGain(description: string): boolean {
  return NEGATIVE_CONSEQUENCE_PREFIXES.some((prefix) =>
    description.startsWith(prefix),
  )
}

export function isTemporaryConsequenceGain(description: string): boolean {
  return TEMPORARY_CONSEQUENCE_PREFIXES.some((prefix) =>
    description.startsWith(prefix),
  )
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
