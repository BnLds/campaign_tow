// Campaign TOW — OWB Army Parser
// Pure function: no DB access, no side effects.
// Input: raw OWB text export → Output: ParsedArmy
// Throws a descriptive error on malformed input.

export interface ParsedSubProfile {
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

export interface ParsedUnit {
  name: string
  type: string
  points: number
  modelCount: number | null
  specialRules: string | null
  options: string | null
  subProfiles: ParsedSubProfile[]
}

export interface ParsedArmy {
  name: string
  faction: string
  totalPoints: number
  units: ParsedUnit[]
}

// Extract a single stat value from a sub-profile line.
// Handles nested parentheses: PV((+1)) → "(+1)"
function extractStat(line: string, statName: string): string | null {
  const re = new RegExp(`${statName}\\((\\([^)]+\\)|[^)]+)\\)`)
  const m = line.match(re)
  return m ? m[1] : null
}

function parseSubProfile(line: string): ParsedSubProfile | null {
  const labelMatch = line.match(/\[([^\]]+)\]/)
  if (!labelMatch) return null
  const label = labelMatch[1].trim()
  // Extract stats only from the portion AFTER the closing bracket
  // to avoid false matches if the label contains stat-like patterns (e.g. "I(mperial)")
  const statsSection = line.slice(line.indexOf(']') + 1)
  return {
    label,
    isMount: false,
    m: extractStat(statsSection, 'M'),
    cc: extractStat(statsSection, 'CC'),
    ct: extractStat(statsSection, 'CT'),
    f: extractStat(statsSection, 'F'),
    e: extractStat(statsSection, 'E'),
    pv: extractStat(statsSection, 'PV'),
    i: extractStat(statsSection, 'I'),
    a: extractStat(statsSection, 'A'),
    cd: extractStat(statsSection, 'Cd'),
  }
}

export function parseOwbExport(text: string): ParsedArmy {
  if (!text || !text.trim()) {
    throw new Error('OWB export is empty — veuillez coller un export texte Old World Builder valide')
  }

  // OWB exports use NBSP (U+00A0) between tokens — normalize to regular spaces for parsing
  const lines = text.replace(/\u00a0/g, ' ').split('\n')

  // Line 1: ## Army Name [500 pts]
  const headerMatch = lines[0]?.match(/^## (.+?) \[(\d+) pts\]/)
  if (!headerMatch) {
    throw new Error(
      'Format OWB invalide — la première ligne doit être "## Nom de l\'armée [N pts]"',
    )
  }
  const armyName = headerMatch[1].trim()
  const totalPoints = parseInt(headerMatch[2], 10)

  // Line 2: Warhammer: The Old World, Faction, Colonne de Bataille
  const factionLine = lines[1] ?? ''
  const factionMatch = factionLine.match(/^Warhammer: The Old World, (.+?), /)
  if (!factionMatch) {
    throw new Error(
      'Format OWB invalide — la deuxième ligne doit commencer par "Warhammer: The Old World, {faction},"',
    )
  }
  const faction = factionMatch[1].trim()

  const units: ParsedUnit[] = []
  let currentType = ''
  let currentUnit: ParsedUnit | null = null

  for (let i = 2; i < lines.length; i++) {
    const line = lines[i]

    // Section header: ### Personnages [102 pts]
    if (line.startsWith('### ')) {
      const typeMatch = line.match(/^### (.+?) \[/)
      if (typeMatch) {
        currentType = typeMatch[1].trim()
      }
      continue
    }

    // Unit line: - 15 Unit Name [159 pts]  OR  - Unit Name [102 pts]
    // Starts with '- ' (no leading space)
    if (line.startsWith('- ')) {
      // Push previous unit before starting a new one
      if (currentUnit) {
        units.push(currentUnit)
        currentUnit = null
      }

      // Match: - [count ]name [pts pts]
      const unitMatch = line.match(/^- (\d+ )?(.+?) \[(\d+) pts\]/)
      if (unitMatch) {
        const modelCount = unitMatch[1] ? parseInt(unitMatch[1].trim(), 10) : null
        const name = unitMatch[2].trim()
        const points = parseInt(unitMatch[3], 10)
        currentUnit = {
          name,
          type: currentType,
          points,
          modelCount,
          specialRules: null,
          options: null,
          subProfiles: [],
        }
      }
      continue
    }

    // Equipment/options line: " -# (...)"
    if (line.includes('-# ') && currentUnit) {
      const optMatch = line.match(/-# \((.+)\)/)
      if (optMatch) currentUnit.options = optMatch[1].trim()
      continue
    }

    // Special rules line: " - __Règles spéciales:__ *...*"
    if (line.includes('__Règles spéciales:__') && currentUnit) {
      const rulesMatch = line.match(/__Règles spéciales:__ \*(.+)\*/)
      if (rulesMatch) currentUnit.specialRules = rulesMatch[1].trim()
      continue
    }

    // Sub-profile line: " - [Label] M(4) CC(5) ..."
    // Must have bracket-label AND at least one stat marker
    if (line.trim().startsWith('- [') && line.includes('M(') && currentUnit) {
      const sp = parseSubProfile(line)
      if (sp) currentUnit.subProfiles.push(sp)
      continue
    }
  }

  // Push last unit (the loop ends without a new unit line to trigger the push)
  if (currentUnit) units.push(currentUnit)

  if (units.length === 0) {
    throw new Error(
      "Aucune unité trouvée dans l'export OWB — vérifiez que le texte contient des entrées d'unités",
    )
  }

  return { name: armyName, faction, totalPoints, units }
}
