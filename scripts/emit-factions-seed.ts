#!/usr/bin/env tsx
// Emits the INSERT SQL for seeding the factions table from CANONICAL_FACTIONS.
// Usage: npx tsx scripts/emit-factions-seed.ts
// Paste the output into the migration SQL file.

import { CANONICAL_FACTIONS } from '../src/db/seeds/factions'

// Control characters that must never appear in SQL string literals.
// \0 (null) and C0/C1 controls excluding TAB (\x09) and LF (\x0a) and CR (\x0d).
// eslint-disable-next-line no-control-regex
const CONTROL_CHAR_RE = /[\x00-\x08\x0b-\x1f\x7f]/

function escapeSqlString(value: string, factionId: string, field: string): string {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    const char = value[i]
    if (char !== undefined && CONTROL_CHAR_RE.test(char)) {
      throw new Error(
        `[emit-factions-seed] Faction "${factionId}" field "${field}" contains illegal control character (charCode ${code}) at index ${i}`,
      )
    }
  }
  // Backslash MUST be replaced before single-quote to avoid double-escaping.
  return value.replace(/\\/g, '\\\\').replace(/'/g, "''")
}

export function formatSeedRow(f: { id: string; name: string; displayName: string }): string {
  const id = escapeSqlString(f.id, f.id, 'id')
  const name = escapeSqlString(f.name, f.id, 'name')
  const displayName = escapeSqlString(f.displayName, f.id, 'displayName')
  return `('${id}', '${name}', '${displayName}')`
}

const rows = CANONICAL_FACTIONS.map((f) => `  ${formatSeedRow(f)}`).join(',\n')

console.log(`INSERT INTO factions (id, name, display_name) VALUES\n${rows}\nON CONFLICT (id) DO NOTHING;`)
