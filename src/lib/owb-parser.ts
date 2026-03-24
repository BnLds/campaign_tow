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
  nickname: string | null
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

// Detect format: markdown (## header) vs plain text (trailing comma) vs block text (=== delimiters)
function detectFormat(text: string): 'markdown' | 'plaintext' | 'blocktext' {
  const firstLine = text.trimStart().split('\n')[0] ?? ''
  if (firstLine.trim() === '===') return 'blocktext'
  if (firstLine.startsWith('## ')) return 'markdown'
  if (/^.+ \[\d+ pts\],\s*$/.test(firstLine)) return 'plaintext'
  return 'markdown' // fallback — let the markdown parser produce a descriptive error
}

// Convert plain text OWB format to markdown format for the existing parser.
export function normalizePlainText(text: string): string {
  const lines = text.replace(/\u00a0/g, ' ').split('\n')
  const out: string[] = []

  // Line 0: army header — strip trailing comma, prepend "## "
  out.push('## ' + (lines[0] ?? '').replace(/,\s*$/, ''))
  // Line 1: faction line — pass through
  if (lines.length > 1) out.push(lines[1])

  for (let i = 2; i < lines.length; i++) {
    const line = lines[i]

    // Lone comma separator — drop
    if (/^,\s*$/.test(line)) continue

    // Section header: "SectionName [N pts]," (trailing comma, no "[" start, no "M(")
    if (/^[A-Za-z\u00C0-\u017F].+ \[\d+ pts\],\s*$/.test(line) && !line.includes('M(')) {
      out.push('### ' + line.replace(/,\s*$/, ''))
      continue
    }

    // Sub-profile: "[Label] M(..." with optional trailing comma
    if (/^\[.+\] M\(/.test(line)) {
      out.push(' - ' + line.replace(/,\s*$/, ''))
      continue
    }

    // Options: "(stuff)" on its own line
    if (/^\(.*\)\s*$/.test(line)) {
      out.push(' -# ' + line.trim())
      continue
    }

    // Unit line: "[count ]Name [N pts]" (no markdown prefix, no trailing comma)
    if (/^(\d+ )?.+ \[\d+ pts\]\s*$/.test(line)) {
      out.push('- ' + line.trimEnd())
      continue
    }

    // Everything else — pass through (empty lines, footer, etc.)
    out.push(line)
  }

  return out.join('\n')
}

// Convert block text OWB format (=== delimiters, ++ sections ++, bare unit lines) to markdown.
export function normalizeBlockText(text: string): string {
  const lines = text.replace(/\u00a0/g, ' ').split('\n')
  const out: string[] = []
  let pendingEquipment: string[] = []
  let sepCount = 0
  let armyNameEmitted = false
  let factionEmitted = false

  function flushEquipment() {
    if (pendingEquipment.length > 0) {
      out.push(' -# (' + pendingEquipment.join(', ') + ')')
      pendingEquipment = []
    }
  }

  for (const line of lines) {
    const trimmed = line.trim()

    // Footer: stop at ---
    if (trimmed === '---') break

    // === separators
    if (trimmed === '===') {
      sepCount++
      continue
    }

    // Skip blank lines before body
    if (sepCount < 2 && !trimmed) continue

    // Header zone (between first and second ===)
    if (sepCount === 1) {
      if (!armyNameEmitted && trimmed) {
        out.push('## ' + trimmed)
        armyNameEmitted = true
      } else if (!factionEmitted && trimmed) {
        out.push(trimmed)
        factionEmitted = true
      }
      continue
    }

    // Body zone (after second ===)

    // Empty line
    if (!trimmed) {
      out.push('')
      continue
    }

    // Section header: ++ Section [pts] ++
    if (trimmed.startsWith('++') && trimmed.endsWith('++')) {
      flushEquipment()
      out.push('### ' + trimmed.replace(/^\+\+\s*/, '').replace(/\s*\+\+$/, ''))
      continue
    }

    // Sub-profile: [Label] M(...) — starts with [ and contains M(
    if (trimmed.startsWith('[') && trimmed.includes('M(')) {
      flushEquipment()
      out.push(' - ' + trimmed)
      continue
    }

    // Equipment line: - item (checked before unit line since unit lines never start with -)
    if (trimmed.startsWith('-')) {
      const item = trimmed.replace(/^-\s*/, '').trim()
      if (item) pendingEquipment.push(item)
      continue
    }

    // Unit line: [Count ]Name [pts pts]
    if (/^(\d+ )?.+ \[\d+ pts\]\s*$/.test(trimmed)) {
      flushEquipment()
      out.push('- ' + trimmed)
      continue
    }

    // Everything else: pass through
    out.push(line)
  }

  flushEquipment()
  return out.join('\n')
}

export function parseOwbExport(text: string): ParsedArmy {
  if (!text || !text.trim()) {
    throw new Error('OWB export is empty — veuillez coller un export texte Old World Builder valide')
  }

  // Auto-detect and normalize to markdown format
  const detected = detectFormat(text)
  const normalized =
    detected === 'plaintext' ? normalizePlainText(text) :
    detected === 'blocktext' ? normalizeBlockText(text) :
    text

  // OWB exports use NBSP (U+00A0) between tokens — normalize to regular spaces for parsing
  const lines = normalized.replace(/\u00a0/g, ' ').split('\n')

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
        const rawName = unitMatch[2].trim()
        const points = parseInt(unitMatch[3], 10)
        // Nickname extraction: OWB exports use "Nickname, UnitType" when the user names a unit.
        // INVARIANT: canonical OWB unit type names never contain commas — verified across
        // known exports. If OWB ever changes this, the split would produce incorrect results.
        const commaIdx = rawName.indexOf(',')
        let nickname: string | null = null
        let unitName = rawName
        if (commaIdx !== -1) {
          nickname = rawName.slice(0, commaIdx).trim().slice(0, 80)
          unitName = rawName.slice(commaIdx + 1).trim()
        }
        currentUnit = {
          name: unitName,
          nickname,
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

  const hasStats = units.some(u => u.subProfiles.length > 0)
  if (!hasStats) {
    throw new Error(
      'Les statistiques des unités sont manquantes — lors de l\'export depuis Old World Builder, cochez "Afficher les caractéristiques"',
    )
  }

  return { name: armyName, faction, totalPoints, units }
}
