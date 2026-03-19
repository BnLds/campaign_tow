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
  return stripped.replace(STAT_ABBREV_RE, (match) => STAT_ABBREVIATIONS[match]!)
}
