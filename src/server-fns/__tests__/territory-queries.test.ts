// Integration test — buildTerritoryDashboard helper (Story 1.5 AC #10)
// Tests the extracted pure helper; the createServerFn wrapper is not directly testable.
// Requires test DB (DATABASE_URL env var).

import { describe, it, expect, afterAll } from 'vitest'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { eq, inArray } from 'drizzle-orm'
import { players, armies, playerTerritories } from '../../db/schema'
import { buildTerritoryDashboard } from '../territory-queries'

if (!process.env.DATABASE_URL) {
  throw new Error('[territory-queries tests] DATABASE_URL is required — refusing to fall back to local PG defaults')
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const db = drizzle(pool, { schema: { players, armies, playerTerritories } })

const createdArmyIds: string[] = []
const createdPlayerIds: string[] = []

async function createTestPlayerWithArmy(): Promise<{ playerId: string; armyId: string }> {
  const playerId = crypto.randomUUID()
  const username = `terr-q-test-${playerId}`
  await db.insert(players).values({ id: playerId, username })
  createdPlayerIds.push(playerId)

  const rows = await db
    .insert(armies)
    .values({ playerId, faction: 'kingdom-of-bretonnia', name: `Test Army ${playerId}` })
    .returning({ id: armies.id })
  const armyRow = rows[0]
  if (!armyRow) throw new Error('insert armies failed')
  const armyId = armyRow.id
  createdArmyIds.push(armyId)

  return { playerId, armyId }
}

async function createTestPlayerNoArmy(): Promise<string> {
  const playerId = crypto.randomUUID()
  await db.insert(players).values({ id: playerId, username: `terr-q-noarmy-${playerId}` })
  createdPlayerIds.push(playerId)
  return playerId
}

afterAll(async () => {
  // Delete armies before players (armies.playerId has onDelete: 'set null' — no cascade)
  if (createdArmyIds.length > 0) {
    await db.delete(armies).where(inArray(armies.id, createdArmyIds))
  }
  // Delete players (cascades player_territories)
  if (createdPlayerIds.length > 0) {
    await db.delete(players).where(inArray(players.id, createdPlayerIds))
  }
  await pool.end()
})

describe('buildTerritoryDashboard', () => {
  it('[1.5-INT-001][P0] first call for a player with no territory creates one and returns correct data', async () => {
    const { playerId } = await createTestPlayerWithArmy()
    const session = { playerId, isGuest: false, isAdmin: false, username: 'test' }
    const result = await buildTerritoryDashboard(session)
    expect(result).toMatchObject({
      success: true,
      data: {
        coBalance: 0,
        factionId: 'kingdom-of-bretonnia',
        factionDisplayName: 'Royaume de Bretonnie',
        setupCompletedAt: null,
      },
    })
  })

  it('[1.5-INT-002][P0] second call for the same player reuses existing territory row', async () => {
    const { playerId } = await createTestPlayerWithArmy()
    const session = { playerId, isGuest: false, isAdmin: false, username: 'test' }
    await buildTerritoryDashboard(session)
    await buildTerritoryDashboard(session)
    const count = (await db.select().from(playerTerritories).where(eq(playerTerritories.playerId, playerId))).length
    expect(count).toBe(1)
  })

  it('[1.5-INT-003][P0] player with no army returns NOT_FOUND and no territory row created', async () => {
    const playerId = await createTestPlayerNoArmy()
    const session = { playerId, isGuest: false, isAdmin: false, username: 'test' }
    const result = await buildTerritoryDashboard(session)
    expect(result).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } })
    const count = (await db.select().from(playerTerritories).where(eq(playerTerritories.playerId, playerId))).length
    expect(count).toBe(0)
  })

  it('[1.5-INT-004][P1] guest session returns FORBIDDEN', async () => {
    const session = { playerId: 'unused', isGuest: true, isAdmin: false, username: 'guest' }
    const result = await buildTerritoryDashboard(session)
    expect(result).toMatchObject({ success: false, error: { code: 'FORBIDDEN' } })
  })

  it('[1.5-INT-005][P1] setupCompletedAt is serialized as ISO string when set', async () => {
    const { playerId } = await createTestPlayerWithArmy()
    const session = { playerId, isGuest: false, isAdmin: false, username: 'test' }
    await buildTerritoryDashboard(session)
    await db.update(playerTerritories).set({ setupCompletedAt: new Date('2026-01-15T10:00:00Z') }).where(eq(playerTerritories.playerId, playerId))
    const result = await buildTerritoryDashboard(session)
    expect(result).toMatchObject({ success: true, data: { setupCompletedAt: '2026-01-15T10:00:00.000Z' } })
  })
})
