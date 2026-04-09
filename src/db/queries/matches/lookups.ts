import { eq, and, sql, gte, lt } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db } from '../../index'
import { matches, matchParticipants } from '../../schema'

export async function getArmyRecord(armyId: string): Promise<{ wins: number; draws: number; losses: number }> {
  const rows = await db
    .select({
      wins: sql<string>`count(*) filter (where ${matchParticipants.result} = 'victory')`,
      draws: sql<string>`count(*) filter (where ${matchParticipants.result} = 'draw')`,
      losses: sql<string>`count(*) filter (where ${matchParticipants.result} = 'defeat')`,
    })
    .from(matchParticipants)
    .where(eq(matchParticipants.armyId, armyId))
  return {
    wins: Number(rows[0]?.wins ?? 0),
    draws: Number(rows[0]?.draws ?? 0),
    losses: Number(rows[0]?.losses ?? 0),
  }
}

export async function getAllArmyRecords(): Promise<Map<string, { wins: number; draws: number; losses: number }>> {
  const rows = await db
    .select({
      armyId: matchParticipants.armyId,
      wins: sql<string | null>`count(*) filter (where ${matchParticipants.result} = 'victory')`,
      draws: sql<string | null>`count(*) filter (where ${matchParticipants.result} = 'draw')`,
      losses: sql<string | null>`count(*) filter (where ${matchParticipants.result} = 'defeat')`,
    })
    .from(matchParticipants)
    .groupBy(matchParticipants.armyId)
  const map = new Map<string, { wins: number; draws: number; losses: number }>()
  for (const row of rows) {
    if (!row.armyId) continue
    map.set(row.armyId, {
      wins: Number(row.wins ?? 0),
      draws: Number(row.draws ?? 0),
      losses: Number(row.losses ?? 0),
    })
  }
  return map
}

export async function getMatchParticipantByMatchAndPlayer(
  matchId: string,
  playerId: string,
): Promise<{ id: string; matchId: string; playerId: string; armyId: string | null; result: string | null; unitSelectionCompletedAt: Date | null } | null> {
  const rows = await db
    .select({
      id: matchParticipants.id,
      matchId: matchParticipants.matchId,
      playerId: matchParticipants.playerId,
      armyId: matchParticipants.armyId,
      result: matchParticipants.result,
      unitSelectionCompletedAt: matchParticipants.unitSelectionCompletedAt,
    })
    .from(matchParticipants)
    .where(and(eq(matchParticipants.matchId, matchId), eq(matchParticipants.playerId, playerId)))
    .limit(1)

  return rows[0] ?? null
}

// Read-side pair of createInitialSetupMatch — keep matchType filter and join logic in sync
export async function getInitialSetupMatchForArmy(armyId: string): Promise<{
  matchId: string
  matchParticipantId: string
  evolutionsEnteredAt: Date | null
} | null> {
  const rows = await db
    .select({
      matchId: matchParticipants.matchId,
      matchParticipantId: matchParticipants.id,
      evolutionsEnteredAt: matchParticipants.evolutionsEnteredAt,
    })
    .from(matchParticipants)
    .innerJoin(matches, eq(matchParticipants.matchId, matches.id))
    .where(and(eq(matchParticipants.armyId, armyId), eq(matches.matchType, 'initial_setup')))
    .limit(1)
  return rows[0] ?? null
}

export async function checkDuplicateMatch(player1Id: string, player2Id: string, dateStr: string): Promise<boolean> {
  const startOfDay = new Date(dateStr + 'T00:00:00Z')
  const nextDay = new Date(startOfDay)
  nextDay.setUTCDate(nextDay.getUTCDate() + 1)

  const mp1 = alias(matchParticipants, 'mp1')
  const mp2 = alias(matchParticipants, 'mp2')

  const rows = await db
    .select({ matchId: mp1.matchId })
    .from(mp1)
    .innerJoin(mp2, eq(mp1.matchId, mp2.matchId))
    .innerJoin(matches, eq(mp1.matchId, matches.id))
    .where(
      and(
        eq(mp1.playerId, player1Id),
        eq(mp2.playerId, player2Id),
        eq(matches.matchType, 'standard'),
        gte(matches.date, startOfDay),
        lt(matches.date, nextDay),
      ),
    )
    .limit(1)

  return rows.length > 0
}
