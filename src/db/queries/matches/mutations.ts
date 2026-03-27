import { eq, and, ne, desc, isNull, gte } from 'drizzle-orm'
import { db } from '../../index'
import { matches, matchParticipants } from '../../schema'

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
      // Historical placeholder date — always excluded by the gte(initialXpCompletedAt) timeline filter
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

// Note: inline latest-match query (FOR UPDATE) intentionally duplicates getLatestMatchIdForArmy for TOCTOU safety
export async function updateMatchResultOnLatest(
  matchId: string,
  myPlayerId: string,
  armyId: string,
  initialXpCompletedAt: Date | null,
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
    // Align with getLatestMatchIdForArmy: filter by initialXpCompletedAt to exclude pre-completion matches
    const latestWhere = initialXpCompletedAt
      ? and(eq(matchParticipants.armyId, armyId), gte(matches.date, initialXpCompletedAt))
      : eq(matchParticipants.armyId, armyId)
    const latestRows = await tx
      .select({ matchId: matchParticipants.matchId })
      .from(matchParticipants)
      .innerJoin(matches, eq(matchParticipants.matchId, matches.id))
      .where(latestWhere)
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
