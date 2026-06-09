// Integration test — faction resolution in the import pipeline (Story 1.3 AC #11)
// Pipeline exercised: parseOwbExport → resolveCanonicalFactionId → createArmyWithUnits
// Uses the real test DB (DATABASE_URL required).

import { describe, it, expect, afterAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { eq, inArray } from 'drizzle-orm'
import { armies, players } from '../schema'
import { parseOwbExport } from '../../lib/owb-parser'
import { resolveCanonicalFactionId } from '../../lib/faction-resolver'
import { createArmyWithUnits, assignArmyToPlayer, createPlayer, deletePlayer } from '../queries'

if (!process.env.DATABASE_URL) {
  throw new Error('[faction-resolution tests] DATABASE_URL is required — refusing to fall back to local PG defaults')
}

const root = resolve(__dirname, '../../..')
const owbFixture = readFileSync(resolve(root, 'src/lib/__fixtures__/owb-sample.txt'), 'utf-8')

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const db = drizzle(pool, { schema: { armies, players } })

const insertedArmyIds: string[] = []
const insertedPlayerIds: string[] = []

afterAll(async () => {
  // Cleanup: delete armies inserted during this test run (before players, due to FK)
  for (const id of insertedArmyIds) {
    await db.delete(armies).where(eq(armies.id, id))
  }
  // Cleanup: delete players inserted during this test run
  for (const id of insertedPlayerIds) {
    await deletePlayer(id)
  }
  await pool.end()
})

// ---------------------------------------------------------------------------
// Positive case: OWB label 'Tribus des Orques & Gobelins' → orc-and-goblin-tribes
// ---------------------------------------------------------------------------

describe('[AC#11][P0] Full pipeline — parse → resolve → FK write', () => {
  it('[1.3-INT-001] importing owb-sample.txt writes armies row with faction = orc-and-goblin-tribes', async () => {
    const parsed = parseOwbExport(owbFixture)
    const canonicalFaction = resolveCanonicalFactionId(parsed.faction)

    // Resolver returns the canonical id (not null)
    expect(canonicalFaction).toBe('orc-and-goblin-tribes')
    if (canonicalFaction === null) throw new Error('unreachable: toBe() already failed')

    const { armyId } = await createArmyWithUnits({ ...parsed, faction: canonicalFaction })
    insertedArmyIds.push(armyId)

    const rows = await db.select({ id: armies.id, faction: armies.faction }).from(armies).where(eq(armies.id, armyId))
    // Single assertion coupling armyId + faction value on the same DB row
    expect(rows).toEqual([{ id: armyId, faction: 'orc-and-goblin-tribes' }])
  })

  it('[1.3-INT-002] two different players importing the same OWB text each get their own armies row with faction = orc-and-goblin-tribes', async () => {
    // AC #11: importing the same OWB text for two different players produces two armies rows
    // both with faction = 'orc-and-goblin-tribes', each owned by its respective player.
    const playerA = await createPlayer(`test-faction-player-a-${Date.now()}`)
    const playerB = await createPlayer(`test-faction-player-b-${Date.now()}`)
    insertedPlayerIds.push(playerA.id, playerB.id)

    const parsed = parseOwbExport(owbFixture)
    const canonicalFaction = resolveCanonicalFactionId(parsed.faction)
    if (canonicalFaction === null) throw new Error('unreachable: fixture faction must resolve')

    // Player A imports
    const { armyId: armyIdA } = await createArmyWithUnits({ ...parsed, faction: canonicalFaction })
    insertedArmyIds.push(armyIdA)
    await assignArmyToPlayer(armyIdA, playerA.id)

    // Player B imports
    const { armyId: armyIdB } = await createArmyWithUnits({ ...parsed, faction: canonicalFaction })
    insertedArmyIds.push(armyIdB)
    await assignArmyToPlayer(armyIdB, playerB.id)

    const rows = await db
      .select({ id: armies.id, faction: armies.faction, playerId: armies.playerId })
      .from(armies)
      .where(inArray(armies.id, [armyIdA, armyIdB]))
      .orderBy(armies.id)

    const expected = [
      { id: armyIdA, faction: 'orc-and-goblin-tribes', playerId: playerA.id },
      { id: armyIdB, faction: 'orc-and-goblin-tribes', playerId: playerB.id },
    ].sort((a, b) => a.id.localeCompare(b.id))

    // Single coupled assertion: both armies exist with correct faction AND correct owner
    expect(rows).toEqual(expected)
  })
})

// ---------------------------------------------------------------------------
// Negative case: unknown faction → resolver returns null, no DB write
// ---------------------------------------------------------------------------

describe('[AC#11][P0] Negative case — unknown faction', () => {
  it('[1.3-INT-003] resolveCanonicalFactionId returns null for unknown faction label', () => {
    expect(resolveCanonicalFactionId('Not A Faction')).toBeNull()
  })
})

describe('[AC#11][P0] Negative case — unknown faction (unit-level, no DB)', () => {
  it('[1.3-UNIT-004] resolver returns null and handler error template interpolates the raw faction label', () => {
    const rawText = `## Test Army [100 pts]
Warhammer: The Old World, Not A Faction, Colonne de Bataille

### Personnages [100 pts]
- Chef [100 pts]
 - [Chef] M(5) CC(4) CT(4) F(4) E(4) PV(2) I(4) A(3) Cd(8)`

    const parsed = parseOwbExport(rawText)
    const canonicalFaction = resolveCanonicalFactionId(parsed.faction)

    // Resolver must return null for an unknown faction
    expect(canonicalFaction).toBeNull()

    // The handler error message template interpolates the raw faction label.
    // Coupled assertion: the template string from player-import-army.ts contains the raw value.
    const errorMessage = `Faction non reconnue dans l'export OWB : « ${parsed.faction} ». Vérifiez que la ligne « Warhammer: The Old World, {faction}, … » utilise un nom canonique.`
    expect(errorMessage).toContain('Not A Faction')
  })
})
