import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '../../..')
const file = readdirSync(resolve(root, 'drizzle')).find(f => /^0008_.*\.sql$/.test(f))
if (!file) throw new Error('migration 0008 not generated yet — run pnpm db:generate')
const sql = readFileSync(resolve(root, 'drizzle', file), 'utf-8')

describe('[Story 2.1] tiles migration — static SQL assertions', () => {
  it('[2.1-MIG-001][P0] terrain_type enum declared with all 8 values in canonical order', () => {
    expect(sql).toMatch(/CREATE TYPE "public"\."terrain_type" AS ENUM\s*\('port', 'plaines', 'plaine_agricole', 'lisiere_forestiere', 'montagnes', 'foret', 'plaine_fluviale', 'marais'\)/)
  })

  it('[2.1-MIG-002][P0] FK to player_territories.id with ON DELETE cascade', () => {
    expect(sql).toMatch(/FOREIGN KEY \("player_territory_id"\) REFERENCES "public"\."player_territories"\("id"\) ON DELETE cascade/)
  })

  it('[2.1-MIG-003][P0] B-tree index on player_territory_id (not unique)', () => {
    expect(sql).toMatch(/CREATE INDEX "idx_tiles_player_territory_id" ON "tiles"[^;]*\("player_territory_id"\)/)
    expect(sql).not.toMatch(/CREATE UNIQUE INDEX "idx_tiles_player_territory_id"/)
  })

  it('[2.1-MIG-004][P0] river-adjacency CHECK predicate present (disjunction coupled)', () => {
    expect(sql).toMatch(/(?:"tiles"\.)?"river_adjacent" = false OR (?:"tiles"\.)?"terrain_type" = 'plaine_fluviale'/)
  })

  it('[2.1-MIG-005][P1] river_adjacent boolean column with default false', () => {
    expect(sql).toMatch(/"river_adjacent" boolean DEFAULT false NOT NULL/)
  })

  it('[2.1-MIG-006][P1] name is nullable text (no NOT NULL)', () => {
    expect(sql).toMatch(/"name" text(?! NOT NULL)/)
  })

  it('[2.1-MIG-007][P0] no INSERT INTO tiles (no seed data)', () => {
    expect(sql).not.toMatch(/INSERT INTO[^;]*"?tiles"?/i)
  })

  it('[2.1-MIG-008][P0] terrain_type column uses the enum type (not text + CHECK)', () => {
    expect(sql).toMatch(/"terrain_type" "(?:public\.)?terrain_type"/)
  })
})
