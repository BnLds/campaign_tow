// Integration test — getFactionById query
// Requires test DB (DATABASE_URL env)

import { describe, it, expect, afterAll } from 'vitest'
import { Pool } from 'pg'

if (!process.env.DATABASE_URL) {
  throw new Error('[factions-query tests] DATABASE_URL is required — refusing to fall back to local PG defaults')
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

afterAll(async () => {
  await pool.end()
})

describe('getFactionById', () => {
  it('[1.5-QRY-001][P0] returns faction row for a known id', async () => {
    const { getFactionById } = await import('../queries/factions')
    const result = await getFactionById('kingdom-of-bretonnia')
    expect(result).toMatchObject({ id: 'kingdom-of-bretonnia', displayName: 'Royaume de Bretonnie' })
  })

  it('[1.5-QRY-002][P1] returns null for an unknown id', async () => {
    const { getFactionById } = await import('../queries/factions')
    const result = await getFactionById('does-not-exist')
    expect(result).toBeNull()
  })
})
