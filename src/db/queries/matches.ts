import { eq, and, ne, desc, isNull, or, inArray, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db } from '../index'
import { players, armies, units, matches, matchParticipants, matchXpEntries, statModifiers, unitGains } from '../schema'

export type TimelineStatChange = { stat: string; delta: number; temporary: boolean }

export type TimelineEntryData = {
  matchId: string
  matchParticipantId: string
  date: string // ISO 8601 string
  result: string | null
  hasEvolutions: boolean
  opponent: {
    name: string
    faction: string
    playerName: string | null
  }
  unitXpEntries: Array<{ unitName: string; unitType: string; xpGained: number; gains: string[]; statChanges: TimelineStatChange[] }>
}

export async function getTimelineForArmy(armyId: string): Promise<TimelineEntryData[]> {
  const oppParticipant = alias(matchParticipants, 'opp')
  const oppArmy = alias(armies, 'opp_army')
  const oppPlayer = alias(players, 'opp_player')

  const rows = await db
    .select({
      matchId: matches.id,
      matchParticipantId: matchParticipants.id,
      date: matches.date,
      result: matchParticipants.result,
      evolutionsEnteredAt: matchParticipants.evolutionsEnteredAt,
      opponentName: oppArmy.name,
      opponentFaction: oppArmy.faction,
      opponentPlayerName: oppPlayer.displayName,
    })
    .from(matchParticipants)
    .innerJoin(matches, eq(matchParticipants.matchId, matches.id))
    .innerJoin(oppParticipant, and(eq(oppParticipant.matchId, matches.id), ne(oppParticipant.armyId, matchParticipants.armyId)))
    .innerJoin(oppArmy, eq(oppParticipant.armyId, oppArmy.id))
    .leftJoin(oppPlayer, eq(oppArmy.playerId, oppPlayer.id))
    .where(eq(matchParticipants.armyId, armyId))
    .orderBy(desc(matches.date), desc(matches.createdAt))

  const entries = rows.map((row) => ({
    matchId: row.matchId,
    matchParticipantId: row.matchParticipantId,
    date: row.date.toISOString(),
    result: row.result,
    hasEvolutions: row.evolutionsEnteredAt !== null,
    opponent: {
      name: row.opponentName,
      faction: row.opponentFaction,
      playerName: row.opponentPlayerName ?? null,
    },
    unitXpEntries: [] as Array<{ unitName: string; unitType: string; xpGained: number; gains: string[]; statChanges: TimelineStatChange[] }>,
  }))

  // Secondary query: load XP entries for entries that have evolutions
  const participantIds = entries
    .filter((e) => e.hasEvolutions)
    .map((e) => e.matchParticipantId)

  if (participantIds.length > 0) {
    const [xpRows, gainRows, statModRows] = await Promise.all([
      db
        .select({
          matchParticipantId: matchXpEntries.matchParticipantId,
          unitId: matchXpEntries.unitId,
          unitName: units.name,
          unitType: units.type,
          xpGained: matchXpEntries.xpGained,
        })
        .from(matchXpEntries)
        .innerJoin(units, eq(matchXpEntries.unitId, units.id))
        .where(inArray(matchXpEntries.matchParticipantId, participantIds)),
      db
        .select({
          matchParticipantId: unitGains.matchParticipantId,
          unitId: unitGains.unitId,
          description: unitGains.description,
        })
        .from(unitGains)
        .where(inArray(unitGains.matchParticipantId, participantIds)),
      db
        .select({
          matchParticipantId: statModifiers.matchParticipantId,
          unitId: statModifiers.unitId,
          stat: statModifiers.stat,
          delta: statModifiers.delta,
          temporary: statModifiers.temporary,
        })
        .from(statModifiers)
        .where(inArray(statModifiers.matchParticipantId, participantIds)),
    ])

    // Group gains by matchParticipantId + unitId
    const gainsMap = new Map<string, string[]>()
    for (const row of gainRows) {
      if (!row.matchParticipantId) continue
      const key = `${row.matchParticipantId}:${row.unitId}`
      const arr = gainsMap.get(key) ?? []
      arr.push(row.description)
      gainsMap.set(key, arr)
    }

    // Group stat changes by matchParticipantId + unitId
    const statChangesMap = new Map<string, TimelineStatChange[]>()
    for (const row of statModRows) {
      if (!row.matchParticipantId) continue
      const key = `${row.matchParticipantId}:${row.unitId}`
      const arr = statChangesMap.get(key) ?? []
      arr.push({ stat: row.stat, delta: row.delta, temporary: row.temporary })
      statChangesMap.set(key, arr)
    }

    // Group by matchParticipantId, sorted by unit type: personnage > base > spécial > rare
    const UNIT_TYPE_ORDER: Record<string, number> = { 'Personnages': 0, 'Unités de base': 1, 'Unités spéciales': 2, 'Unités rares': 3 }
    const xpMap = new Map<string, Array<{ unitName: string; unitType: string; xpGained: number; gains: string[]; statChanges: TimelineStatChange[] }>>()
    for (const row of xpRows) {
      const arr = xpMap.get(row.matchParticipantId) ?? []
      const unitGainsForMatch = gainsMap.get(`${row.matchParticipantId}:${row.unitId}`) ?? []
      const unitStatChanges = statChangesMap.get(`${row.matchParticipantId}:${row.unitId}`) ?? []
      arr.push({ unitName: row.unitName, unitType: row.unitType, xpGained: row.xpGained, gains: unitGainsForMatch, statChanges: unitStatChanges })
      xpMap.set(row.matchParticipantId, arr)
    }
    for (const arr of xpMap.values()) {
      arr.sort((a, b) => (UNIT_TYPE_ORDER[a.unitType] ?? 99) - (UNIT_TYPE_ORDER[b.unitType] ?? 99))
    }

    return entries.map((e) => ({
      ...e,
      unitXpEntries: xpMap.get(e.matchParticipantId) ?? [],
    }))
  }

  return entries
}

export async function createMatchWithParticipants(params: {
  army1Id: string
  result1: 'victory' | 'defeat' | 'draw' | null
  army2Id: string
  result2: 'victory' | 'defeat' | 'draw' | null
  matchDate: Date
  evolutionsEntered: boolean
  createdByPlayerId: string
}): Promise<{ matchId: string }> {
  const evolutionsEnteredAt = params.evolutionsEntered ? params.matchDate : null

  return db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(matches)
      .values({ date: params.matchDate, createdByPlayerId: params.createdByPlayerId })
      .returning({ id: matches.id })

    await tx.insert(matchParticipants).values([
      { matchId: inserted.id, armyId: params.army1Id, result: params.result1, evolutionsEnteredAt },
      { matchId: inserted.id, armyId: params.army2Id, result: params.result2, evolutionsEnteredAt },
    ])

    return { matchId: inserted.id }
  })
}

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
    map.set(row.armyId, {
      wins: Number(row.wins ?? 0),
      draws: Number(row.draws ?? 0),
      losses: Number(row.losses ?? 0),
    })
  }
  return map
}

export type PendingMatchData = {
  matchId: string
  date: string // ISO 8601
  opponentArmyName: string
  opponentFaction: string
  myResult: string | null
  myEvolutionsEnteredAt: string | null
}

export async function getPendingMatches(armyId: string): Promise<PendingMatchData[]> {
  const oppParticipant = alias(matchParticipants, 'opp')
  const oppArmy = alias(armies, 'opp_army')

  const rows = await db
    .select({
      matchId: matches.id,
      date: matches.date,
      myResult: matchParticipants.result,
      myEvolutionsEnteredAt: matchParticipants.evolutionsEnteredAt,
      opponentArmyName: oppArmy.name,
      opponentFaction: oppArmy.faction,
    })
    .from(matchParticipants)
    .innerJoin(matches, eq(matchParticipants.matchId, matches.id))
    .innerJoin(
      oppParticipant,
      and(eq(oppParticipant.matchId, matches.id), ne(oppParticipant.armyId, matchParticipants.armyId)),
    )
    .innerJoin(oppArmy, eq(oppParticipant.armyId, oppArmy.id))
    .where(
      and(
        eq(matchParticipants.armyId, armyId),
        or(isNull(matchParticipants.result), isNull(matchParticipants.evolutionsEnteredAt)),
      ),
    )
    .orderBy(desc(matches.date), desc(matches.createdAt))

  return rows.map((row) => ({
    matchId: row.matchId,
    date: row.date.toISOString(),
    opponentArmyName: row.opponentArmyName,
    opponentFaction: row.opponentFaction,
    myResult: row.myResult,
    myEvolutionsEnteredAt: row.myEvolutionsEnteredAt ? row.myEvolutionsEnteredAt.toISOString() : null,
  }))
}

export async function getMatchParticipantByMatchAndArmy(
  matchId: string,
  armyId: string,
): Promise<{ id: string; matchId: string; armyId: string; result: string | null } | null> {
  const rows = await db
    .select({
      id: matchParticipants.id,
      matchId: matchParticipants.matchId,
      armyId: matchParticipants.armyId,
      result: matchParticipants.result,
    })
    .from(matchParticipants)
    .where(and(eq(matchParticipants.matchId, matchId), eq(matchParticipants.armyId, armyId)))
    .limit(1)

  return rows.length > 0 ? rows[0] : null
}

export function invertResult(r: 'victory' | 'defeat' | 'draw'): 'victory' | 'defeat' | 'draw' {
  switch (r) {
    case 'victory': return 'defeat'
    case 'defeat': return 'victory'
    case 'draw': return 'draw'
    default: throw new Error(`Unknown result: ${r satisfies never}`)
  }
}

export async function updateMatchResults(
  matchId: string,
  myArmyId: string,
  myResult: 'victory' | 'defeat' | 'draw',
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const mine = await tx
      .update(matchParticipants)
      .set({ result: myResult })
      .where(and(eq(matchParticipants.matchId, matchId), eq(matchParticipants.armyId, myArmyId), isNull(matchParticipants.result)))
      .returning({ id: matchParticipants.id })

    if (mine.length === 0) {
      return false
    }

    const opp = await tx
      .update(matchParticipants)
      .set({ result: invertResult(myResult) })
      .where(and(eq(matchParticipants.matchId, matchId), ne(matchParticipants.armyId, myArmyId), isNull(matchParticipants.result)))
      .returning({ id: matchParticipants.id })

    return opp.length === 1
  })
}
