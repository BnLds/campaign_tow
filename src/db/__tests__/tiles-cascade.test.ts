// Integration test — tiles table behaviour
// AC: #10 (INT) — insert defaults, ON DELETE CASCADE, river-adjacency CHECK,
// enum rejection, name nullable + verbatim storage.
// Requires test DB (DATABASE_URL env var).

import { describe, it, expect, afterAll } from 'vitest'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { eq, inArray } from 'drizzle-orm'
import { players, playerTerritories, tiles } from '../schema'
import { getOrCreatePlayerTerritory } from '../queries/territory'

if (!process.env.DATABASE_URL) {
  throw new Error('[tiles cascade tests] DATABASE_URL is required — refusing to fall back to local PG defaults')
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const db = drizzle(pool, { schema: { players, playerTerritories, tiles } })

const createdPlayerIds: string[] = []

async function createTestPlayerWithTerritory(): Promise<{ playerId: string; territoryId: string }> {
  const playerId = crypto.randomUUID()
  await db.insert(players).values({ id: playerId, username: `tiles-test-${playerId}` })
  createdPlayerIds.push(playerId)
  const territory = await getOrCreatePlayerTerritory(playerId)
  return { playerId, territoryId: territory.id }
}

afterAll(async () => {
  // CASCADE chain: players → player_territories → tiles
  // Surface delete failures — do NOT swallow with .catch(() => {})
  if (createdPlayerIds.length > 0) {
    await db.delete(players).where(inArray(players.id, createdPlayerIds))
  }
  await pool.end()
})

describe('[Story 2.1] tiles table — integration', () => {
  it('[2.1-INT-001][P0] insert with default river_adjacent stores expected shape', async () => {
    const { territoryId } = await createTestPlayerWithTerritory()
    const [row] = await db.insert(tiles)
      .values({ playerTerritoryId: territoryId, terrainType: 'plaine_agricole' })
      .returning()
    expect(row).toMatchObject({ terrainType: 'plaine_agricole', riverAdjacent: false, name: null })
  })

  it('[2.1-INT-002][P0] ON DELETE CASCADE: deleting parent territory removes its tiles', async () => {
    const { playerId, territoryId } = await createTestPlayerWithTerritory()
    await db.insert(tiles).values([
      { playerTerritoryId: territoryId, terrainType: 'plaines' },
      { playerTerritoryId: territoryId, terrainType: 'foret' },
    ])
    await db.delete(players).where(eq(players.id, playerId))
    const idx = createdPlayerIds.indexOf(playerId)
    if (idx !== -1) createdPlayerIds.splice(idx, 1)
    expect(
      (await db.select().from(tiles).where(eq(tiles.playerTerritoryId, territoryId))).length
    ).toBe(0)
  })

  it('[2.1-INT-003][P0] river-adjacency invariant rejects (plaines, river_adjacent=true) with CHECK violation', async () => {
    const { territoryId } = await createTestPlayerWithTerritory()
    let caught: unknown
    try {
      await db.insert(tiles).values({ playerTerritoryId: territoryId, terrainType: 'plaines', riverAdjacent: true })
    } catch (e) {
      caught = e
    }
    // Couple the existence of an error with its identification as the CHECK on tiles_river_adjacent_only_on_plaine_fluviale.
    // Drizzle wraps the pg error; the original carries SQLSTATE 23514 and the constraint name.
    const cause = (caught as { cause?: { code?: string; constraint?: string } } | undefined)?.cause
    expect({ code: cause?.code, constraint: cause?.constraint }).toEqual({
      code: '23514',
      constraint: 'tiles_river_adjacent_only_on_plaine_fluviale',
    })
  })

  it('[2.1-INT-004][P0] river-adjacency permitted on plaine_fluviale', async () => {
    const { territoryId } = await createTestPlayerWithTerritory()
    const [row] = await db.insert(tiles)
      .values({ playerTerritoryId: territoryId, terrainType: 'plaine_fluviale', riverAdjacent: true })
      .returning()
    expect(row).toMatchObject({ terrainType: 'plaine_fluviale', riverAdjacent: true })
  })

  it('[2.1-INT-005][P1] terrain_type enum rejects unknown value at the DB level', async () => {
    const { territoryId } = await createTestPlayerWithTerritory()
    await expect(
      pool.query(
        `INSERT INTO tiles (id, player_territory_id, terrain_type) VALUES ($1, $2, $3)`,
        [crypto.randomUUID(), territoryId, 'tundra'],
      )
    ).rejects.toThrow(/invalid input value for enum terrain_type/i)
  })

  it('[2.1-INT-006][P1] name accepts a non-null value and stores it verbatim', async () => {
    const { territoryId } = await createTestPlayerWithTerritory()
    const [row] = await db.insert(tiles)
      .values({ playerTerritoryId: territoryId, terrainType: 'foret', name: 'Bois de Loren' })
      .returning()
    expect(row).toMatchObject({ terrainType: 'foret', name: 'Bois de Loren' })
  })
})
