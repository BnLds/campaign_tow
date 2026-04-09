import { eq, and, ne, desc, inArray, gte, or } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db } from '../../index'
import { players, armies, units, matches, matchParticipants, matchXpEntries, statModifiers, unitGains } from '../../schema'
import type { UnitGainType } from '../units'
import { getArmyXpAndPointsTotalsBatch, getUnitsTotalsByIds } from '../units'
import { getUnitSelectionForParticipant } from './unit-selections'
import { invariant } from '../../../lib/invariant'

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
  unitSelectionCompletedAt: Date | null
  opponentUnitSelectionCompletedAt: Date | null
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

export async function getLatestMatchIdForArmy(armyId: string, initialXpCompletedAt: Date | null): Promise<string | null> {
  if (!initialXpCompletedAt) return null
  const rows = await db
    .select({ matchId: matchParticipants.matchId })
    .from(matchParticipants)
    .innerJoin(matches, eq(matchParticipants.matchId, matches.id))
    .where(and(eq(matchParticipants.armyId, armyId), gte(matches.date, initialXpCompletedAt)))
    .orderBy(desc(matches.date), desc(matches.createdAt))
    .limit(1)
  return rows[0]?.matchId ?? null
}

type GainRow = { matchParticipantId: string | null; unitId: string; description: string; type: UnitGainType }
type StatModRow = { matchParticipantId: string | null; unitId: string; stat: string; delta: number; temporary: boolean }
type XpRow = { matchParticipantId: string; unitId: string; unitName: string; unitType: string; xpGained: number }

function buildGainsMap(gainRows: GainRow[]): Map<string, TimelineGain[]> {
  const gainsMap = new Map<string, TimelineGain[]>()
  for (const row of gainRows) {
    if (!row.matchParticipantId) continue
    const key = `${row.matchParticipantId}:${row.unitId}`
    const arr = gainsMap.get(key) ?? []
    arr.push({ description: row.description, type: row.type })
    gainsMap.set(key, arr)
  }
  return gainsMap
}

function buildStatChangesMap(statModRows: StatModRow[]): Map<string, TimelineStatChange[]> {
  const statChangesMap = new Map<string, TimelineStatChange[]>()
  for (const row of statModRows) {
    if (!row.matchParticipantId) continue
    const key = `${row.matchParticipantId}:${row.unitId}`
    const arr = statChangesMap.get(key) ?? []
    arr.push({ stat: row.stat, delta: row.delta, temporary: row.temporary })
    statChangesMap.set(key, arr)
  }
  return statChangesMap
}

function buildXpEntriesMap(
  xpRows: XpRow[],
  gainsMap: Map<string, TimelineGain[]>,
  statChangesMap: Map<string, TimelineStatChange[]>,
): Map<string, Array<{ unitName: string; unitType: string; xpGained: number; gains: TimelineGain[]; statChanges: TimelineStatChange[] }>> {
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
  return xpMap
}

export async function getTimelineForArmy(armyId: string, initialXpCompletedAt: Date | null): Promise<TimelineEntryData[]> {
  const matchFilter = initialXpCompletedAt
    ? or(eq(matches.matchType, 'initial_setup'), gte(matches.date, initialXpCompletedAt))
    : eq(matches.matchType, 'initial_setup')
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
      unitSelectionCompletedAt: matchParticipants.unitSelectionCompletedAt,
      snapshotXp: matchParticipants.snapshotXp,
      snapshotPoints: matchParticipants.snapshotPoints,
      oppSnapshotXp: oppParticipant.snapshotXp,
      oppSnapshotPoints: oppParticipant.snapshotPoints,
      oppUnitSelectionCompletedAt: oppParticipant.unitSelectionCompletedAt,
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
    .where(and(eq(matchParticipants.armyId, armyId), matchFilter))
    .orderBy(desc(matches.date), desc(matches.createdAt))

  const latestMatchId = rows[0]?.matchId ?? null

  // Batch-fetch army XP & points totals for delta badges
  const allArmyIds = [armyId, ...rows.map((r) => r.oppArmyId).filter((id): id is string => id != null)]
  const uniqueArmyIds = [...new Set(allArmyIds)]
  const totalsMap = await getArmyXpAndPointsTotalsBatch(uniqueArmyIds)
  const playerTotals = totalsMap.get(armyId) ?? { totalXp: 0, totalPoints: 0 }

  // For entries without snapshots but with unit selections, compute selection-aware totals
  // This only applies to the latest pending match (the only entry without a snapshot)
  const selectionTotalsCache = new Map<string, { totalXp: number; totalPoints: number }>()
  for (const row of rows) {
    if (row.matchType === 'initial_setup') continue
    const hasSnapshot = row.snapshotXp != null && row.snapshotPoints != null && row.oppSnapshotXp != null && row.oppSnapshotPoints != null
    if (hasSnapshot) continue
    // No snapshot — check if player or opponent has a selection
    if (row.unitSelectionCompletedAt) {
      const ids = await getUnitSelectionForParticipant(row.matchParticipantId)
      if (ids.length > 0) selectionTotalsCache.set(row.matchParticipantId, await getUnitsTotalsByIds(ids))
    }
    if (row.oppUnitSelectionCompletedAt && row.oppArmyId) {
      // Get opponent participant ID from the row — we need a lookup
      const oppParticipantRows = await db
        .select({ id: matchParticipants.id })
        .from(matchParticipants)
        .where(and(eq(matchParticipants.matchId, row.matchId), ne(matchParticipants.armyId, armyId)))
        .limit(1)
      if (oppParticipantRows[0]) {
        const oppIds = await getUnitSelectionForParticipant(oppParticipantRows[0].id)
        if (oppIds.length > 0) selectionTotalsCache.set(oppParticipantRows[0].id, await getUnitsTotalsByIds(oppIds))
      }
    }
  }

  const entries = rows.map((row) => {
    const oppTotals = row.oppArmyId ? totalsMap.get(row.oppArmyId) : null
    const hasSnapshot = row.snapshotXp != null && row.snapshotPoints != null && row.oppSnapshotXp != null && row.oppSnapshotPoints != null

    let armyTotals: { playerXp: number; playerPoints: number; opponentXp: number; opponentPoints: number; deltaXp: number; deltaPoints: number } | undefined
    if (row.matchType === 'initial_setup' || (!hasSnapshot && !oppTotals)) {
      armyTotals = undefined
    } else if (hasSnapshot) {
      const snapshotXp = invariant(row.snapshotXp, 'hasSnapshot guarantees snapshotXp is set')
      const snapshotPoints = invariant(row.snapshotPoints, 'hasSnapshot guarantees snapshotPoints is set')
      const oppSnapshotXp = invariant(row.oppSnapshotXp, 'hasSnapshot guarantees oppSnapshotXp is set')
      const oppSnapshotPoints = invariant(row.oppSnapshotPoints, 'hasSnapshot guarantees oppSnapshotPoints is set')
      armyTotals = {
        playerXp: snapshotXp,
        playerPoints: snapshotPoints,
        opponentXp: oppSnapshotXp,
        opponentPoints: oppSnapshotPoints,
        deltaXp: snapshotXp - oppSnapshotXp,
        deltaPoints: snapshotPoints - oppSnapshotPoints,
      }
    } else {
      // No snapshot — use selection-aware totals if available, else full army
      const myTotals = selectionTotalsCache.get(row.matchParticipantId) ?? playerTotals
      // Look up opponent's selection totals
      // oppTotals is non-null here: we only reach this else branch when hasSnapshot is false,
      // which means the outer if guard `(!hasSnapshot && !oppTotals)` already returned undefined.
      // Reaching this branch implies oppTotals is defined.
      let effectiveOppTotals = invariant(oppTotals, 'else branch is only reached when oppTotals is defined (guarded by !hasSnapshot && !oppTotals above)')
      // Check if opponent had a selection
      if (row.oppUnitSelectionCompletedAt && row.oppArmyId) {
        // Find the opponent participant's cached totals
        for (const [key, val] of selectionTotalsCache.entries()) {
          if (key !== row.matchParticipantId) {
            effectiveOppTotals = val
            break
          }
        }
      }
      armyTotals = {
        playerXp: myTotals.totalXp,
        playerPoints: myTotals.totalPoints,
        opponentXp: effectiveOppTotals.totalXp,
        opponentPoints: effectiveOppTotals.totalPoints,
        deltaXp: myTotals.totalXp - effectiveOppTotals.totalXp,
        deltaPoints: myTotals.totalPoints - effectiveOppTotals.totalPoints,
      }
    }
    return {
      matchId: row.matchId,
      matchParticipantId: row.matchParticipantId,
      date: row.date.toISOString(),
      matchType: row.matchType as MatchType,
      result: row.result,
      hasEvolutions: row.evolutionsEnteredAt !== null,
      isLatestMatch: row.matchId === latestMatchId,
      unitSelectionCompletedAt: row.unitSelectionCompletedAt ?? null,
      opponentUnitSelectionCompletedAt: row.oppUnitSelectionCompletedAt ?? null,
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

    const gainsMap = buildGainsMap(gainRows)
    const statChangesMap = buildStatChangesMap(statModRows)
    const xpMap = buildXpEntriesMap(xpRows, gainsMap, statChangesMap)

    return entries.map((e) => ({
      ...e,
      unitXpEntries: xpMap.get(e.matchParticipantId) ?? [],
    }))
  }

  return entries
}
