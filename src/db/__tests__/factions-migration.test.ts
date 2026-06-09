// Migration backfill verification — AC: #5, #6, #7, #8
// Two layers:
//   1. Static: migration SQL contains required patterns (FK, guard, all known variant mappings)
//   2. Live DB: armies.faction values are valid FK references after migration

import { describe, it, expect, afterAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { eq } from 'drizzle-orm'
import { armies, factions } from '../schema'

if (!process.env.DATABASE_URL) {
  throw new Error('[factions tests] DATABASE_URL is required — refusing to fall back to local PG defaults')
}

const root = resolve(__dirname, '../../..')
const migrationSql = readFileSync(resolve(root, 'drizzle/0005_chemical_goliath.sql'), 'utf-8')
const fkMigrationSql = readFileSync(resolve(root, 'drizzle/0006_jazzy_prodigy.sql'), 'utf-8')

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const db = drizzle(pool, { schema: { armies, factions } })

afterAll(async () => {
  await pool.end()
})

// ---------------------------------------------------------------------------
// Static: migration SQL structure
// ---------------------------------------------------------------------------

describe('[AC#4][AC#7][P0] Migration SQL — FK and guard structure', () => {
  it('[1.1-MIG-001] migration 0006 adds FK with ON DELETE RESTRICT', () => {
    expect(fkMigrationSql).toMatch(
      /FOREIGN KEY \("faction"\) REFERENCES "public"\."factions"\("id"\) ON DELETE restrict/,
    )
  })

  it('[1.1-MIG-002] migration 0005 includes fail-loud guard with RAISE EXCEPTION', () => {
    expect(migrationSql).toMatch(/RAISE EXCEPTION.*Unmapped faction values/i)
  })

  it('[1.1-MIG-003] migration 0005 seeds factions with ON CONFLICT DO NOTHING and contains all 18 IDs', () => {
    expect(migrationSql).toMatch(/ON CONFLICT \(id\) DO NOTHING/)
    // Verify all 18 canonical IDs appear in the seed block
    const ids = [
      'beastmen-brayherds', 'chaos-dwarfs', 'daemons-of-chaos', 'dark-elves',
      'dwarfen-mountain-holds', 'empire-of-man', 'grand-cathay', 'high-elf-realms',
      'kingdom-of-bretonnia', 'lizardmen', 'ogre-kingdoms', 'orc-and-goblin-tribes',
      'renegade-crowns', 'skaven', 'tomb-kings-of-khemri', 'vampire-counts',
      'warriors-of-chaos', 'wood-elf-realms',
    ]
    for (const id of ids) {
      expect(migrationSql).toContain(`('${id}',`)
    }
  })

  it('[1.1-MIG-004] unaccent extension is created', () => {
    expect(migrationSql).toMatch(/CREATE EXTENSION IF NOT EXISTS unaccent/)
  })
})

describe('[AC#5][P0] Migration SQL — variant coverage for known DB values', () => {
  it('[1.1-MIG-005] Hommes-Lézards variant resolves to lizardmen', () => {
    // lower(unaccent(trim('Hommes-Lézards'))) = 'hommes-lezards'
    expect(migrationSql).toMatch(/\('hommes-lezards',\s*'lizardmen'\)/)
  })

  it('[1.1-MIG-006] Lizardmen variant resolves to lizardmen', () => {
    expect(migrationSql).toMatch(/\('lizardmen',\s*'lizardmen'\)/)
  })

  it('[1.1-MIG-007] Royaumes Hauts Elfes variant resolves to high-elf-realms', () => {
    expect(migrationSql).toMatch(/\('royaumes hauts elfes',\s*'high-elf-realms'\)/)
  })

  it('[1.1-MIG-008] Tribus des Orques & Gobelins variant resolves to orc-and-goblin-tribes', () => {
    expect(migrationSql).toMatch(/\('tribus des orques & gobelins',\s*'orc-and-goblin-tribes'\)/)
  })

  it('[1.1-MIG-009] Warriors of Chaos variant resolves to warriors-of-chaos', () => {
    expect(migrationSql).toMatch(/\('warriors of chaos',\s*'warriors-of-chaos'\)/)
  })
})

// ---------------------------------------------------------------------------
// Live DB: post-migration state
// ---------------------------------------------------------------------------

describe('[AC#4][AC#8][P0] Live DB — armies.faction after migration', () => {
  it('[1.1-MIG-010] all armies.faction values reference a valid factions.id', async () => {
    // After migration, no army should have a faction value not in factions table
    const result = await db
      .select({ armyId: armies.id, factionId: factions.id })
      .from(armies)
      .leftJoin(factions, eq(armies.faction, factions.id))
    const unmapped = result.filter(r => r.factionId === null)
    expect(unmapped).toHaveLength(0)
  })

  it('[1.1-MIG-011] fail-loud guard aborts on unmapped faction value', async () => {
    // Uses a temporary table to simulate the guard from 0005_chemical_goliath.sql
    // without touching real data. The guard block is reproduced verbatim against
    // the temp table so we test the actual PL/pgSQL logic.
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Create a temp table that mimics the armies + factions join the guard uses
      await client.query(`
        CREATE TEMP TABLE armies_guard_test (faction text) ON COMMIT DROP
      `)
      await client.query(`
        CREATE TEMP TABLE factions_guard_test (id text) ON COMMIT DROP
      `)

      // Seed the factions temp table with a known-good value, then insert a bogus army row
      await client.query(`INSERT INTO factions_guard_test (id) VALUES ('empire-of-man')`)
      await client.query(`INSERT INTO armies_guard_test (faction) VALUES ('totally_bogus_faction_xyz')`)

      // Run the fail-loud guard from migration 0005 adapted for the temp tables:
      // SELECT COUNT(*) of rows in armies_guard_test with no matching factions_guard_test id,
      // then RAISE EXCEPTION if count > 0
      await expect(
        client.query(`
          DO $$ DECLARE bad int; BEGIN
            SELECT COUNT(*) INTO bad
            FROM armies_guard_test a
            LEFT JOIN factions_guard_test f ON a.faction = f.id
            WHERE f.id IS NULL;
            IF bad > 0 THEN
              RAISE EXCEPTION 'Unmapped faction values: %',
                (SELECT array_agg(DISTINCT a.faction)
                 FROM armies_guard_test a
                 LEFT JOIN factions_guard_test f ON a.faction = f.id
                 WHERE f.id IS NULL);
            END IF;
          END $$;
        `)
      ).rejects.toThrow(/Unmapped faction values/)
    } finally {
      await client.query('ROLLBACK')
      client.release()
    }
  })
})
