import { eq, and, ne, desc, inArray, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db } from '../../index'
import { players, matches, matchParticipants, matchXpEntries, units } from '../../schema'
import type { MatchType } from './timeline'

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
    // UUID text comparison for participant deduplication — ensures each match appears once (arbitrary but stable ordering)
    .innerJoin(p2, and(eq(p2.matchId, matches.id), sql`${p2.id} > ${matchParticipants.id}`))
    .innerJoin(player1, eq(player1.id, matchParticipants.playerId))
    .innerJoin(player2, eq(player2.id, p2.playerId))
    .where(ne(matches.matchType, 'initial_setup'))
    .orderBy(desc(matches.date), desc(matches.createdAt))

  return rows.map((r) => ({
    matchId: r.matchId,
    date: r.date.toISOString(),
    matchType: r.matchType as MatchType,
    player1Name: r.player1Name,
    player2Name: r.player2Name,
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
): Promise<{ deleted: true } | { deleted: false; reason: 'NOT_FOUND' | 'POST_MATCH_COMPLETED' }> {
  return db.transaction(async (tx) => {
    // Lock all participant rows to prevent concurrent post-match completion or double-delete
    const participants = await tx
      .select({ id: matchParticipants.id, evolutionsEnteredAt: matchParticipants.evolutionsEnteredAt })
      .from(matchParticipants)
      .where(eq(matchParticipants.matchId, matchId))
      .for('update')

    if (participants.length === 0) {
      return { deleted: false, reason: 'NOT_FOUND' }
    }

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
      // Aggregate total XP to rollback per unit (a unit may have multiple XP entries)
      const xpPerUnit = new Map<string, number>()
      for (const entry of xpEntries) {
        xpPerUnit.set(entry.unitId, (xpPerUnit.get(entry.unitId) ?? 0) + entry.xpGained)
      }
      for (const [unitId, totalXp] of xpPerUnit) {
        await tx
          .update(units)
          .set({ xp: sql`GREATEST(0, ${units.xp} - ${totalXp})` })
          .where(eq(units.id, unitId))
      }
    }

    // Delete the match — FK cascade handles matchParticipants and matchXpEntries
    await tx.delete(matches).where(eq(matches.id, matchId))

    return { deleted: true }
  })
}
