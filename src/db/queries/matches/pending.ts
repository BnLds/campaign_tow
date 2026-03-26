import { eq, and, ne, desc, isNull, or } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db } from '../../index'
import { players, armies, matches, matchParticipants } from '../../schema'

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
