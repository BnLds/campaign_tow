import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { CANONICAL_FACTIONS } from '../factions'
import { formatSeedRow } from '../../../../scripts/emit-factions-seed'

const root = resolve(__dirname, '../../../..')

describe('[AC#2] CANONICAL_FACTIONS — structure and completeness', () => {
  it('[1.1-FAC-001] exports exactly 18 factions', () => {
    expect(CANONICAL_FACTIONS.length).toBe(18)
  })

  it('[1.1-FAC-002] all IDs are unique', () => {
    const ids = CANONICAL_FACTIONS.map(f => f.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('[1.1-FAC-003] all IDs match kebab-case pattern', () => {
    for (const faction of CANONICAL_FACTIONS) {
      expect(faction.id).toMatch(/^[a-z]+(-[a-z]+)*$/)
    }
  })

  it('[1.1-FAC-004] no faction has empty name or displayName', () => {
    for (const faction of CANONICAL_FACTIONS) {
      expect(faction.name.trim().length).toBeGreaterThan(0)
      expect(faction.displayName.trim().length).toBeGreaterThan(0)
    }
  })

  it('[1.1-FAC-005] IDs, names and displayNames match docs/factions.md — no drift', () => {
    const docsContent = readFileSync(resolve(root, 'docs/factions.md'), 'utf-8')

    // Scope parsing to the faction table only: lines between the header row
    // containing "| ID |" and the next "##" heading (or end of file).
    const lines = docsContent.split('\n')
    const headerIdx = lines.findIndex(l => /^\|\s*ID\s*\|/.test(l))
    if (headerIdx === -1) throw new Error('docs/factions.md: faction table header not found')
    const nextHeadingIdx = lines.findIndex((l, i) => i > headerIdx && /^##/.test(l))
    const tableLines = lines.slice(headerIdx + 1, nextHeadingIdx === -1 ? undefined : nextHeadingIdx)

    // docs/factions.md columns: | ID | Nom (FR) = displayName | Nom (EN) = name |
    const ROW_RE = /^\|\s*([a-z][a-z0-9-]*)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/
    type DocRow = { id: string; displayName: string; name: string }
    const docRows: DocRow[] = []
    for (const line of tableLines) {
      // Skip separator rows (contain ---)
      if (/^\|\s*-/.test(line)) continue
      const match = line.match(ROW_RE)
      if (!match) continue
      const [, id, displayName, name] = match
      if (id === undefined || displayName === undefined || name === undefined) continue
      // Skip header row in case it wasn't filtered by headerIdx+1
      if (id === 'id') continue
      docRows.push({ id, displayName, name })
    }

    const moduleIds = CANONICAL_FACTIONS.map(f => f.id).sort()
    expect(moduleIds).toEqual(docRows.map(r => r.id).sort())

    // Also verify name and displayName columns to catch content drift, not just ID drift.
    const docById = new Map(docRows.map(r => [r.id, r]))
    for (const faction of CANONICAL_FACTIONS) {
      const doc = docById.get(faction.id)
      if (!doc) throw new Error(`faction "${faction.id}" missing from docs/factions.md`)
      expect(faction.name).toBe(doc.name)
      expect(faction.displayName).toBe(doc.displayName)
    }
  })

  describe.each(CANONICAL_FACTIONS)('[1.1-FAC-006] faction $id', (faction) => {
    it('has non-empty id, name, displayName', () => {
      expect(faction.id.length).toBeGreaterThan(0)
      expect(faction.name.length).toBeGreaterThan(0)
      expect(faction.displayName.length).toBeGreaterThan(0)
    })
  })
})

// ---------------------------------------------------------------------------
// TS seed ↔ SQL INSERT parity
// Ensures drizzle/0005_chemical_goliath.sql matches the current CANONICAL_FACTIONS.
// If a displayName is edited in factions.ts without re-running emit-factions-seed.ts,
// this suite fails loudly.
// ---------------------------------------------------------------------------

const migrationSql = readFileSync(
  resolve(root, 'drizzle/0005_chemical_goliath.sql'),
  'utf-8',
)

describe.each(CANONICAL_FACTIONS)('[1.1-FAC-007] seed SQL contains $id', (faction) => {
  it('matches the TS-emitted tuple exactly', () => {
    expect(migrationSql).toContain(formatSeedRow(faction))
  })
})
