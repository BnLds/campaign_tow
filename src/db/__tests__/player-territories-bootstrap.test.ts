// Integration test — player_territories lazy bootstrap
// AC: #4 — getOrCreatePlayerTerritory creates on first call, returns same row on second call,
// handles concurrent creates, and CASCADE removes territory when player is deleted.
// Requires test DB (DATABASE_URL env var).

import { describe, it, expect, afterAll } from 'vitest'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { eq, inArray } from 'drizzle-orm'
import { players, playerTerritories } from '../schema'
import { getOrCreatePlayerTerritory } from '../queries/territory'

if (!process.env.DATABASE_URL) {
  throw new Error('[territory bootstrap tests] DATABASE_URL is required — refusing to fall back to local PG defaults')
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const db = drizzle(pool, { schema: { players, playerTerritories } })

// Track all player ids created in this test suite for cleanup
const createdPlayerIds: string[] = []

async function createTestPlayer(): Promise<string> {
  const id = crypto.randomUUID()
  await db.insert(players).values({
    id,
    username: `terr-test-${id}`,
  })
  createdPlayerIds.push(id)
  return id
}

afterAll(async () => {
  // CASCADE (AC #1) removes player_territories automatically.
  // Surface delete failures — do NOT swallow with .catch(() => {})
  if (createdPlayerIds.length > 0) {
    await db.delete(players).where(inArray(players.id, createdPlayerIds))
  }
  await pool.end()
})

describe('[Story 1.4] player_territories lazy bootstrap', () => {
  it('[1.4-INT-001][P0] first call returns row with coBalance=0, lastIncomeWeek=0, setupCompletedAt=null', async () => {
    const playerId = await createTestPlayer()
    const t = await getOrCreatePlayerTerritory(playerId)
    expect(t).toMatchObject({ coBalance: 0, lastIncomeWeek: 0, setupCompletedAt: null })
  })

  it('[1.4-INT-002][P0] second call with same playerId returns same row (no duplicate insert)', async () => {
    const playerId = await createTestPlayer()
    const first = await getOrCreatePlayerTerritory(playerId)
    const second = await getOrCreatePlayerTerritory(playerId)
    expect(second.id).toBe(first.id)
    const count = (await db.select().from(playerTerritories).where(eq(playerTerritories.playerId, playerId))).length
    expect(count).toBe(1)
  })

  it('[1.4-INT-003][P0] concurrent creates resolve to same row (race handled by unique constraint catch)', async () => {
    const playerId = await createTestPlayer()
    const [a, b] = await Promise.all([
      getOrCreatePlayerTerritory(playerId),
      getOrCreatePlayerTerritory(playerId),
    ])
    expect(a.id).toBe(b.id)
    const count = (await db.select().from(playerTerritories).where(eq(playerTerritories.playerId, playerId))).length
    expect(count).toBe(1)
  })

  it('[1.4-INT-004][P1] ON DELETE CASCADE: deleting player removes territory', async () => {
    const deletedId = await createTestPlayer()
    await getOrCreatePlayerTerritory(deletedId)
    await db.delete(players).where(eq(players.id, deletedId))
    // Remove from cleanup array since already deleted
    const idx = createdPlayerIds.indexOf(deletedId)
    if (idx !== -1) createdPlayerIds.splice(idx, 1)
    expect(
      (await db.select().from(playerTerritories).where(eq(playerTerritories.playerId, deletedId))).length
    ).toBe(0)
  })
})
