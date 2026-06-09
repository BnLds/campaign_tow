// Integration test — factions seed verification
// AC: #9 — fresh DB boot produces exactly 18 faction rows with correct data.
// Requires test DB (DATABASE_URL from vitest env = postgresql://test:test@localhost:5432/test_campaign_tow)

import { describe, it, expect, afterAll } from 'vitest'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { factions } from '../schema'
import { CANONICAL_FACTIONS } from '@/db/seeds/factions'

if (!process.env.DATABASE_URL) {
  throw new Error('[factions tests] DATABASE_URL is required — refusing to fall back to local PG defaults')
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const db = drizzle(pool, { schema: { factions } })

afterAll(async () => {
  await pool.end()
})

describe('[AC#9][P0] factions seed — fresh DB boot', () => {
  it('[1.1-SEED-001] factions table contains at least 18 rows and all 18 canonical IDs are present', async () => {
    const rows = await db.select().from(factions)
    expect(rows.length).toBeGreaterThanOrEqual(18)
    const ids = new Set(rows.map(r => r.id))
    for (const { id } of CANONICAL_FACTIONS) {
      expect(ids.has(id)).toBe(true)
    }
  })

  it('[1.1-SEED-002] chaos-dwarfs row has correct display_name', async () => {
    const rows = await db.select().from(factions)
    const chaosDwarfs = rows.find(f => f.id === 'chaos-dwarfs')
    expect(chaosDwarfs).toBeDefined()
    expect(chaosDwarfs?.displayName).toBe('Nains du Chaos')
  })

  it('[1.1-SEED-003] kingdom-of-bretonnia row has correct name and displayName', async () => {
    const rows = await db.select().from(factions)
    const bretonnia = rows.find(f => f.id === 'kingdom-of-bretonnia')
    expect(bretonnia?.name).toBe('Kingdom of Bretonnia')
    expect(bretonnia?.displayName).toBe('Royaume de Bretonnie')
  })

  it('[1.1-SEED-004] all faction IDs are unique', async () => {
    const rows = await db.select().from(factions)
    const ids = rows.map(f => f.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
