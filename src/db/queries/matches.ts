import { eq, and, ne, desc, isNull, or, inArray, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db } from '../index'
import { players, armies, units, matches, matchParticipants, matchXpEntries, statModifiers, unitGains } from '../schema'
import type { UnitGainType } from './units'
import { getArmyXpAndPointsTotalsBatch } from './units'

export type MatchType = 'standard' | 'initial_setup'

export type TimelineStatChange = { stat: string; delta: number; temporary: boolean }

export type TimelineGain = { description: string; type: UnitGainType }

export type TimelineEntryData = {
  matchId: string
  matchParticipantId: string
  date: string // ISO 8601 string
  result: string | null
  hasEvolutions: boolean
  isLatestMatch: boolean
  matchType: MatchType
  opponent: {
    name: string | null
    faction: string | null
    playerName: string
  } | null
  unitXpEntries: Array<{ unitName: string; unitType: string; xpGained: number; gains: TimelineGain[]; statChanges: TimelineStatChange[] }>
  armyTotals?: {
    playerXp: number
    playerPoints: number
    opponentXp: number
    opponentPoints: number
    deltaXp: number
    deltaPoints: number
  }
}

export async function getLatestMatchIdForArmy(armyId: string): Promise<string | null> {
  const rows = await db
    .select({ matchId: matchParticipants.matchId })
    .from(matchParticipants)
    .innerJoin(matches, eq(matchParticipants.matchId, matches.id))
    .where(eq(matchParticipants.armyId, armyId))
    .orderBy(desc(matches.date), desc(matches.createdAt))
    .limit(1)
  return rows.length > 0 ? rows[0].matchId : null
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
      matchType: matches.matchType,
      result: matchParticipants.result,
      evolutionsEnteredAt: matchParticipants.evolutionsEnteredAt,
      opponentName: oppArmy.name,
      opponentFaction: oppArmy.faction,
      opponentPlayerName: oppPlayer.username,
      oppArmyId: oppArmy.id,
    })
    .from(matchParticipants)
    .innerJoin(matches, eq(matchParticipants.matchId, matches.id))
    .leftJoin(oppParticipant, and(eq(oppParticipant.matchId, matches.id), ne(oppParticipant.playerId, matchParticipants.playerId)))
    .leftJoin(oppArmy, eq(oppParticipant.armyId, oppArmy.id))
    .leftJoin(oppPlayer, eq(oppParticipant.playerId, oppPlayer.id))
    .where(eq(matchParticipants.armyId, armyId))
    .orderBy(desc(matches.date), desc(matches.createdAt))

  const latestMatchId = rows.length > 0 ? rows[0].matchId : null

  // Batch-fetch army XP & points totals for delta badges
  const allArmyIds = [armyId, ...rows.map((r) => r.oppArmyId).filter((id): id is string => id != null)]
  const uniqueArmyIds = [...new Set(allArmyIds)]
  const totalsMap = await getArmyXpAndPointsTotalsBatch(uniqueArmyIds)
  const playerTotals = totalsMap.get(armyId) ?? { totalXp: 0, totalPoints: 0 }

  const entries = rows.map((row) => {
    const oppTotals = row.oppArmyId ? totalsMap.get(row.oppArmyId) : null
    const armyTotals = (row.matchType !== 'initial_setup' && oppTotals) ? {
      playerXp: playerTotals.totalXp,
      playerPoints: playerTotals.totalPoints,
      opponentXp: oppTotals.totalXp,
      opponentPoints: oppTotals.totalPoints,
      deltaXp: playerTotals.totalXp - oppTotals.totalXp,
      deltaPoints: playerTotals.totalPoints - oppTotals.totalPoints,
    } : undefined
    return {
      matchId: row.matchId,
      matchParticipantId: row.matchParticipantId,
      date: row.date.toISOString(),
      matchType: (row.matchType ?? 'standard') as MatchType,
      result: row.result,
      hasEvolutions: row.evolutionsEnteredAt !== null,
      isLatestMatch: row.matchId === latestMatchId,
      opponent: row.opponentPlayerName != null
        ? {
            name: row.opponentName ?? null,
            faction: row.opponentFaction ?? null,
            playerName: row.opponentPlayerName,
          }
        : null,
      unitXpEntries: [] as Array<{ unitName: string; unitType: string; xpGained: number; gains: TimelineGain[]; statChanges: TimelineStatChange[] }>,
      armyTotals,
    }
  })

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
          type: unitGains.type,
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
    const gainsMap = new Map<string, TimelineGain[]>()
    for (const row of gainRows) {
      if (!row.matchParticipantId) continue
      const key = `${row.matchParticipantId}:${row.unitId}`
      const arr = gainsMap.get(key) ?? []
      arr.push({ description: row.description, type: row.type })
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
    const xpMap = new Map<string, Array<{ unitName: string; unitType: string; xpGained: number; gains: TimelineGain[]; statChanges: TimelineStatChange[] }>>()
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
  player1Id: string
  army1Id: string | null
  result1: 'victory' | 'defeat' | 'draw' | null
  player2Id: string
  army2Id: string | null
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
      { matchId: inserted.id, playerId: params.player1Id, armyId: params.army1Id, result: params.result1, evolutionsEnteredAt },
      { matchId: inserted.id, playerId: params.player2Id, armyId: params.army2Id, result: params.result2, evolutionsEnteredAt },
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
    if (!row.armyId) continue
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
  opponentArmyName: string | null
  opponentFaction: string | null
  opponentPlayerName: string
  myResult: string | null
  myEvolutionsEnteredAt: string | null
}

export async function getPendingMatches(playerId: string): Promise<PendingMatchData[]> {
  const oppParticipant = alias(matchParticipants, 'opp')
  const oppArmy = alias(armies, 'opp_army')
  const oppPlayer = alias(players, 'opp_player')

  const rows = await db
    .select({
      matchId: matches.id,
      date: matches.date,
      myResult: matchParticipants.result,
      myEvolutionsEnteredAt: matchParticipants.evolutionsEnteredAt,
      opponentArmyName: oppArmy.name,
      opponentFaction: oppArmy.faction,
      opponentPlayerName: oppPlayer.username,
    })
    .from(matchParticipants)
    .innerJoin(matches, eq(matchParticipants.matchId, matches.id))
    .innerJoin(
      oppParticipant,
      and(eq(oppParticipant.matchId, matches.id), ne(oppParticipant.playerId, matchParticipants.playerId)),
    )
    .leftJoin(oppArmy, eq(oppParticipant.armyId, oppArmy.id))
    .innerJoin(oppPlayer, eq(oppParticipant.playerId, oppPlayer.id))
    .where(
      and(
        eq(matchParticipants.playerId, playerId),
        or(isNull(matchParticipants.result), isNull(matchParticipants.evolutionsEnteredAt)),
        ne(matches.matchType, 'initial_setup'),
      ),
    )
    .orderBy(desc(matches.date), desc(matches.createdAt))

  return rows.map((row) => ({
    matchId: row.matchId,
    date: row.date.toISOString(),
    opponentArmyName: row.opponentArmyName ?? null,
    opponentFaction: row.opponentFaction ?? null,
    opponentPlayerName: row.opponentPlayerName ?? 'Adversaire',
    myResult: row.myResult,
    myEvolutionsEnteredAt: row.myEvolutionsEnteredAt ? row.myEvolutionsEnteredAt.toISOString() : null,
  }))
}

export async function getMatchParticipantByMatchAndPlayer(
  matchId: string,
  playerId: string,
): Promise<{ id: string; matchId: string; playerId: string; armyId: string | null; result: string | null } | null> {
  const rows = await db
    .select({
      id: matchParticipants.id,
      matchId: matchParticipants.matchId,
      playerId: matchParticipants.playerId,
      armyId: matchParticipants.armyId,
      result: matchParticipants.result,
    })
    .from(matchParticipants)
    .where(and(eq(matchParticipants.matchId, matchId), eq(matchParticipants.playerId, playerId)))
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
  myPlayerId: string,
  myResult: 'victory' | 'defeat' | 'draw',
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const mine = await tx
      .update(matchParticipants)
      .set({ result: myResult })
      .where(and(eq(matchParticipants.matchId, matchId), eq(matchParticipants.playerId, myPlayerId), isNull(matchParticipants.result)))
      .returning({ id: matchParticipants.id })

    if (mine.length === 0) {
      return false
    }

    const opp = await tx
      .update(matchParticipants)
      .set({ result: invertResult(myResult) })
      .where(and(eq(matchParticipants.matchId, matchId), ne(matchParticipants.playerId, myPlayerId), isNull(matchParticipants.result)))
      .returning({ id: matchParticipants.id })

    return opp.length === 1
  })
}

// Initial XP entry flow — create or return existing initial_setup match for an army
export async function createInitialSetupMatch(playerId: string, armyId: string): Promise<string> {
  return db.transaction(async (tx) => {
    // Idempotency: return existing match if one already exists for this army
    const existing = await tx
      .select({ matchId: matchParticipants.matchId })
      .from(matchParticipants)
      .innerJoin(matches, eq(matchParticipants.matchId, matches.id))
      .where(and(eq(matchParticipants.armyId, armyId), eq(matches.matchType, 'initial_setup')))
      .limit(1)
    if (existing.length > 0) return existing[0].matchId

    const [inserted] = await tx
      .insert(matches)
      // Historical placeholder date — initial setup matches are always filtered by matchType, not date
      .values({ date: new Date('1993-08-19'), matchType: 'initial_setup', createdByPlayerId: playerId })
      .returning({ id: matches.id })

    await tx.insert(matchParticipants).values({
      matchId: inserted.id,
      playerId,
      armyId,
      result: null,
      evolutionsEnteredAt: null,
    })

    return inserted.id
  })
}

// Initial XP entry flow — get existing initial_setup match for an army
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
  return rows.length > 0 ? rows[0] : null
}

export type AdminMatchRow = {
  matchId: string
  date: string
  matchType: MatchType
  player1Name: string
  player2Name: string
  result1: string | null
  result2: string | null
  evolutions1EnteredAt: string | null
  evolutions2EnteredAt: string | null
}

export async function getAllMatchesForAdmin(): Promise<AdminMatchRow[]> {
  const p2 = alias(matchParticipants, 'p2')
  const player1 = alias(players, 'player1')
  const player2 = alias(players, 'player2')

  const rows = await db
    .select({
      matchId: matches.id,
      date: matches.date,
      matchType: matches.matchType,
      player1Name: player1.username,
      player2Name: player2.username,
      result1: matchParticipants.result,
      result2: p2.result,
      evolutions1EnteredAt: matchParticipants.evolutionsEnteredAt,
      evolutions2EnteredAt: p2.evolutionsEnteredAt,
    })
    .from(matches)
    .innerJoin(matchParticipants, and(eq(matchParticipants.matchId, matches.id)))
    .innerJoin(p2, and(eq(p2.matchId, matches.id), sql`${p2.id} > ${matchParticipants.id}`))
    .innerJoin(player1, eq(player1.id, matchParticipants.playerId))
    .innerJoin(player2, eq(player2.id, p2.playerId))
    .where(ne(matches.matchType, 'initial_setup'))
    .orderBy(desc(matches.date), desc(matches.createdAt))

  return rows.map((r) => ({
    matchId: r.matchId,
    date: r.date.toISOString(),
    matchType: (r.matchType ?? 'standard') as MatchType,
    player1Name: r.player1Name ?? 'Joueur',
    player2Name: r.player2Name ?? 'Joueur',
    result1: r.result1,
    result2: r.result2,
    evolutions1EnteredAt: r.evolutions1EnteredAt ? r.evolutions1EnteredAt.toISOString() : null,
    evolutions2EnteredAt: r.evolutions2EnteredAt ? r.evolutions2EnteredAt.toISOString() : null,
  }))
}

// Note: statModifiers and unitGains have onDelete: 'set null' on matchParticipantId (not cascade).
// Those rows are written inside completeEvolutionsWithGainsTransaction which also sets evolutionsEnteredAt
// in the same atomic transaction. Therefore, statModifiers/unitGains rows cannot exist when
// evolutionsEnteredAt IS NULL — the guard below ensures we never delete a match that has them.
export async function deleteMatchWithXpRollback(
  matchId: string,
): Promise<{ deleted: true } | { deleted: false; reason: 'POST_MATCH_COMPLETED' }> {
  return db.transaction(async (tx) => {
    // Lock all participant rows to prevent concurrent post-match completion or double-delete
    const participants = await tx
      .select({ id: matchParticipants.id, evolutionsEnteredAt: matchParticipants.evolutionsEnteredAt })
      .from(matchParticipants)
      .where(eq(matchParticipants.matchId, matchId))
      .for('update')

    // Guard: if any participant has completed post-match, refuse deletion
    if (participants.some((p) => p.evolutionsEnteredAt !== null)) {
      return { deleted: false, reason: 'POST_MATCH_COMPLETED' }
    }

    const participantIds = participants.map((p) => p.id)

    // Collect partial XP entries (phase 1 started but not committed)
    if (participantIds.length > 0) {
      const xpEntries = await tx
        .select({ unitId: matchXpEntries.unitId, xpGained: matchXpEntries.xpGained })
        .from(matchXpEntries)
        .where(inArray(matchXpEntries.matchParticipantId, participantIds))

      // Rollback: decrement each unit's XP (floor at 0 with GREATEST)
      for (const entry of xpEntries) {
        await tx
          .update(units)
          .set({ xp: sql`GREATEST(0, ${units.xp} - ${entry.xpGained})` })
          .where(eq(units.id, entry.unitId))
      }
    }

    // Delete the match — FK cascade handles matchParticipants and matchXpEntries
    await tx.delete(matches).where(eq(matches.id, matchId))

    return { deleted: true }
  })
}

export async function updateMatchResultOnLatest(
  matchId: string,
  myPlayerId: string,
  armyId: string,
  myResult: 'victory' | 'defeat' | 'draw',
): Promise<boolean> {
  return db.transaction(async (tx) => {
    // Lock my participant row to serialize concurrent re-edits
    const [myRow] = await tx
      .select({ id: matchParticipants.id })
      .from(matchParticipants)
      .where(and(eq(matchParticipants.matchId, matchId), eq(matchParticipants.playerId, myPlayerId)))
      .for('update')
    if (!myRow) return false

    // Re-verify latest match inside transaction (prevents TOCTOU race)
    const latestRows = await tx
      .select({ matchId: matchParticipants.matchId })
      .from(matchParticipants)
      .innerJoin(matches, eq(matchParticipants.matchId, matches.id))
      .where(eq(matchParticipants.armyId, armyId))
      .orderBy(desc(matches.date), desc(matches.createdAt))
      .limit(1)
    if (latestRows.length === 0 || latestRows[0].matchId !== matchId) return false

    const mine = await tx
      .update(matchParticipants)
      .set({ result: myResult })
      .where(and(eq(matchParticipants.matchId, matchId), eq(matchParticipants.playerId, myPlayerId)))
      .returning({ id: matchParticipants.id })

    if (mine.length === 0) return false

    const opp = await tx
      .update(matchParticipants)
      .set({ result: invertResult(myResult) })
      .where(and(eq(matchParticipants.matchId, matchId), ne(matchParticipants.playerId, myPlayerId)))
      .returning({ id: matchParticipants.id })

    return opp.length === 1
  })
}
