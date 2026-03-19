// Campaign TOW — Reusable DB query functions
// All direct drizzle-orm and DB access for named operations lives here.

import { eq, inArray, desc, and, ne, sql, isNull, or } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db } from './index'
import { players, armies, units, subProfiles, statModifiers, unitGains, matches, matchParticipants, matchXpEntries } from './schema'
import type { ParsedArmy } from '../lib/owb-parser'

export async function markPlayerWelcomeSeen(playerId: string): Promise<void> {
  await db.update(players).set({ hasSeenWelcome: true }).where(eq(players.id, playerId))
}

export async function updatePlayerDisplayName(playerId: string, displayName: string): Promise<void> {
  await db.update(players).set({ displayName }).where(eq(players.id, playerId))
}

// Story 1.4 — Admin: player account creation

export async function checkUsernameExists(username: string): Promise<boolean> {
  const existing = await db
    .select({ id: players.id })
    .from(players)
    .where(eq(players.username, username))
    .limit(1)
  return existing.length > 0
}

export async function createPlayer(
  username: string,
  passwordHash: string,
): Promise<{ id: string; username: string; displayName: string }> {
  const [player] = await db
    .insert(players)
    .values({
      username,
      passwordHash,
      displayName: username,
      isAdmin: false,
      hasSeenWelcome: false,
    })
    .returning({ id: players.id, username: players.username, displayName: players.displayName })
  return player
}

// Story 1.6 — Admin: player account list & delete

export async function getAllPlayers() {
  return db
    .select({
      id: players.id,
      username: players.username,
      displayName: players.displayName,
      isAdmin: players.isAdmin,
      createdAt: players.createdAt,
    })
    .from(players)
    .where(eq(players.isGuest, false))
    .orderBy(players.createdAt)
}

export async function deletePlayer(playerId: string): Promise<void> {
  await db.delete(players).where(eq(players.id, playerId))
}

// Story 1.7 — Ghost player for guest access

export async function ensureGhostPlayer(): Promise<string> {
  await db.insert(players).values({
    username: '__guest__',
    passwordHash: '!no-login!',
    displayName: 'Invité',
    isGuest: true,
    isAdmin: false,
    hasSeenWelcome: true,
  }).onConflictDoNothing({ target: players.username })

  const result = await db
    .select({ id: players.id })
    .from(players)
    .where(eq(players.username, '__guest__'))
    .limit(1)

  return result[0].id
}

export async function getGhostPlayerId(): Promise<string | null> {
  const result = await db
    .select({ id: players.id })
    .from(players)
    .where(eq(players.username, '__guest__'))
    .limit(1)
  return result.length > 0 ? result[0].id : null
}

// Story 2.1 — Army CRUD functions

export async function createArmyWithUnits(
  data: ParsedArmy,
): Promise<{ armyId: string; unitCount: number }> {
  return db.transaction(async (tx) => {
    const [army] = await tx
      .insert(armies)
      .values({ name: data.name, faction: data.faction })
      .returning({ id: armies.id })

    for (const unit of data.units) {
      const [insertedUnit] = await tx
        .insert(units)
        .values({
          armyId: army.id,
          name: unit.name,
          type: unit.type,
          points: unit.points,
          modelCount: unit.modelCount,
          specialRules: unit.specialRules,
          options: unit.options,
        })
        .returning({ id: units.id })

      if (unit.subProfiles.length > 0) {
        await tx.insert(subProfiles).values(
          unit.subProfiles.map((sp, idx) => ({
            unitId: insertedUnit.id,
            sortOrder: idx,
            label: sp.label,
            isMount: sp.isMount,
            m: sp.m,
            cc: sp.cc,
            ct: sp.ct,
            f: sp.f,
            e: sp.e,
            pv: sp.pv,
            i: sp.i,
            a: sp.a,
            cd: sp.cd,
          })),
        )
      }
    }

    return { armyId: army.id, unitCount: data.units.length }
  })
}

export async function assignArmyToPlayer(armyId: string, playerId: string): Promise<boolean> {
  const result = await db
    .update(armies)
    .set({ playerId })
    .where(eq(armies.id, armyId))
    .returning({ id: armies.id })
  return result.length > 0
}

export async function getArmyOwner(armyId: string): Promise<{ playerId: string | null } | null> {
  const rows = await db
    .select({ playerId: armies.playerId })
    .from(armies)
    .where(eq(armies.id, armyId))
    .limit(1)
  return rows.length > 0 ? rows[0] : null
}

export async function getArmyById(armyId: string): Promise<{
  id: string
  name: string
  faction: string
  playerId: string | null
} | null> {
  const rows = await db
    .select({
      id: armies.id,
      name: armies.name,
      faction: armies.faction,
      playerId: armies.playerId,
    })
    .from(armies)
    .where(eq(armies.id, armyId))
    .limit(1)

  return rows.length > 0 ? rows[0] : null
}

export async function getAllArmies() {
  return db
    .select({
      id: armies.id,
      name: armies.name,
      faction: armies.faction,
      playerId: armies.playerId,
      playerDisplayName: players.displayName,
    })
    .from(armies)
    .leftJoin(players, eq(armies.playerId, players.id))
    .orderBy(armies.createdAt)
}

// Story 2.2 — Manual unit entry & post-import correction

type StatFields = {
  m: string
  cc: string
  ct: string
  f: string
  e: string
  pv: string
  i: string
  a: string
  cd: string
}

export async function insertUnit(
  armyId: string,
  name: string,
  type: string,
  stats: StatFields,
): Promise<{ unitId: string; subProfileId: string }> {
  return db.transaction(async (tx) => {
    const [insertedUnit] = await tx
      .insert(units)
      .values({
        armyId,
        name,
        type,
        xp: 0,
      })
      .returning({ id: units.id })

    const [insertedSubProfile] = await tx
      .insert(subProfiles)
      .values({
        unitId: insertedUnit.id,
        sortOrder: 0,
        label: name,
        isMount: false,
        m: stats.m === '' ? null : stats.m,
        cc: stats.cc === '' ? null : stats.cc,
        ct: stats.ct === '' ? null : stats.ct,
        f: stats.f === '' ? null : stats.f,
        e: stats.e === '' ? null : stats.e,
        pv: stats.pv === '' ? null : stats.pv,
        i: stats.i === '' ? null : stats.i,
        a: stats.a === '' ? null : stats.a,
        cd: stats.cd === '' ? null : stats.cd,
      })
      .returning({ id: subProfiles.id })

    return { unitId: insertedUnit.id, subProfileId: insertedSubProfile.id }
  })
}

export async function updateSubProfileStats(
  subProfileId: string,
  stats: StatFields,
): Promise<boolean> {
  const result = await db
    .update(subProfiles)
    .set({
      m: stats.m === '' ? null : stats.m,
      cc: stats.cc === '' ? null : stats.cc,
      ct: stats.ct === '' ? null : stats.ct,
      f: stats.f === '' ? null : stats.f,
      e: stats.e === '' ? null : stats.e,
      pv: stats.pv === '' ? null : stats.pv,
      i: stats.i === '' ? null : stats.i,
      a: stats.a === '' ? null : stats.a,
      cd: stats.cd === '' ? null : stats.cd,
    })
    .where(eq(subProfiles.id, subProfileId))
    .returning()
  return result.length > 0
}

export async function getUnitsForArmy(armyId: string) {
  const unitRows = await db
    .select()
    .from(units)
    .where(eq(units.armyId, armyId))
    .orderBy(
      sql`CASE ${units.type}
        WHEN 'Personnages' THEN 0
        WHEN 'Unités de base' THEN 1
        WHEN 'Unités spéciales' THEN 2
        WHEN 'Unités rares' THEN 3
        ELSE 4
      END`,
      units.name,
    )

  const unitIds = unitRows.map((u) => u.id)
  const spRows =
    unitIds.length > 0
      ? await db
          .select()
          .from(subProfiles)
          .where(inArray(subProfiles.unitId, unitIds))
          .orderBy(subProfiles.unitId, subProfiles.sortOrder)
      : []

  return unitRows.map((u) => ({
    ...u,
    subProfiles: spRows.filter((sp) => sp.unitId === u.id),
  }))
}

// Story 2.3 — Army consultation with units + sub_profiles

export async function getArmyWithUnits(armyId: string) {
  // Single query with LEFT JOIN for player info (M3 fix — avoids extra query)
  const armyRows = await db
    .select({
      id: armies.id,
      name: armies.name,
      faction: armies.faction,
      playerId: armies.playerId,
      playerDisplayName: players.displayName,
    })
    .from(armies)
    .leftJoin(players, eq(armies.playerId, players.id))
    .where(eq(armies.id, armyId))
    .limit(1)

  if (armyRows.length === 0) return null
  const army = armyRows[0]

  // Fetch units ordered by type then name
  const unitRows = await db
    .select()
    .from(units)
    .where(eq(units.armyId, armyId))
    .orderBy(units.type, units.name)

  const unitIds = unitRows.map((u) => u.id)
  const spRows =
    unitIds.length > 0
      ? await db
          .select()
          .from(subProfiles)
          .where(inArray(subProfiles.unitId, unitIds))
          .orderBy(subProfiles.unitId, subProfiles.sortOrder)
      : []

  return {
    id: army.id,
    name: army.name,
    faction: army.faction,
    playerId: army.playerId,
    player: army.playerDisplayName ? { displayName: army.playerDisplayName } : null,
    units: unitRows.map((u) => ({
      ...u,
      subProfiles: spRows.filter((sp) => sp.unitId === u.id),
    })),
  }
}

export async function getStatModifiers(unitId: string) {
  return db
    .select()
    .from(statModifiers)
    .where(eq(statModifiers.unitId, unitId))
    .orderBy(statModifiers.stat)
}

export async function getUnitGains(unitId: string) {
  return db
    .select()
    .from(unitGains)
    .where(eq(unitGains.unitId, unitId))
}

export async function getUnitDeltas(unitIds: string[]): Promise<{
  statModifiers: typeof statModifiers.$inferSelect[]
  unitGains: typeof unitGains.$inferSelect[]
}> {
  if (unitIds.length === 0) {
    return { statModifiers: [], unitGains: [] }
  }

  const [modRows, gainRows] = await Promise.all([
    db.select().from(statModifiers).where(inArray(statModifiers.unitId, unitIds)),
    db.select().from(unitGains).where(inArray(unitGains.unitId, unitIds)),
  ])

  return { statModifiers: modRows, unitGains: gainRows }
}

// Story 2.4 — Direct edit of unit & character deltas

export async function insertStatModifier(
  unitId: string,
  stat: string,
  delta: number,
  source: string,
  temporary: boolean,
) {
  const rows = await db
    .insert(statModifiers)
    .values({ unitId, stat, delta, source, temporary })
    .returning()
  if (rows.length === 0) throw new Error('Insert returned no rows')
  return rows[0]
}

export async function getStatModifierById(modifierId: string) {
  const rows = await db
    .select({ id: statModifiers.id, unitId: statModifiers.unitId })
    .from(statModifiers)
    .where(eq(statModifiers.id, modifierId))
    .limit(1)
  return rows.length > 0 ? rows[0] : null
}

export async function deleteStatModifier(modifierId: string): Promise<boolean> {
  const result = await db
    .delete(statModifiers)
    .where(eq(statModifiers.id, modifierId))
    .returning()
  return result.length > 0
}

export async function insertUnitGain(
  unitId: string,
  description: string,
  matchParticipantId?: string,
) {
  const rows = await db
    .insert(unitGains)
    .values({ unitId, description, matchParticipantId: matchParticipantId ?? null })
    .returning()
  if (rows.length === 0) throw new Error('Insert returned no rows')
  return rows[0]
}

export async function getUnitGainById(gainId: string) {
  const rows = await db
    .select({ id: unitGains.id, unitId: unitGains.unitId })
    .from(unitGains)
    .where(eq(unitGains.id, gainId))
    .limit(1)
  return rows.length > 0 ? rows[0] : null
}

export async function deleteUnitGain(gainId: string): Promise<boolean> {
  const result = await db
    .delete(unitGains)
    .where(eq(unitGains.id, gainId))
    .returning()
  return result.length > 0
}

export async function updateUnitXp(unitId: string, xp: number): Promise<boolean> {
  const result = await db
    .update(units)
    .set({ xp })
    .where(eq(units.id, unitId))
    .returning()
  return result.length > 0
}

export async function getSubProfileById(subProfileId: string) {
  const rows = await db
    .select({ id: subProfiles.id, unitId: subProfiles.unitId, isMount: subProfiles.isMount })
    .from(subProfiles)
    .where(eq(subProfiles.id, subProfileId))
    .limit(1)
  return rows.length > 0 ? rows[0] : null
}

export async function updateSubProfileIsMount(subProfileId: string, isMount: boolean): Promise<boolean> {
  const result = await db.update(subProfiles).set({ isMount }).where(eq(subProfiles.id, subProfileId)).returning({ id: subProfiles.id })
  return result.length > 0
}

export async function getUnitById(unitId: string) {
  const rows = await db
    .select({
      id: units.id,
      armyId: units.armyId,
      name: units.name,
      type: units.type,
      xp: units.xp,
    })
    .from(units)
    .where(eq(units.id, unitId))
    .limit(1)
  return rows.length > 0 ? rows[0] : null
}

// Story 3.1 — Timeline query functions

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
  unitXpEntries: Array<{ unitName: string; unitType: string; xpGained: number; gains: string[] }>
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
    unitXpEntries: [] as Array<{ unitName: string; unitType: string; xpGained: number; gains: string[] }>,
  }))

  // Secondary query: load XP entries for entries that have evolutions
  const participantIds = entries
    .filter((e) => e.hasEvolutions)
    .map((e) => e.matchParticipantId)

  if (participantIds.length > 0) {
    const [xpRows, gainRows] = await Promise.all([
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

    // Group by matchParticipantId, sorted by unit type: personnage > base > spécial > rare
    const UNIT_TYPE_ORDER: Record<string, number> = { personnage: 0, base: 1, special: 2, rare: 3 }
    const xpMap = new Map<string, Array<{ unitName: string; unitType: string; xpGained: number; gains: string[] }>>()
    for (const row of xpRows) {
      const arr = xpMap.get(row.matchParticipantId) ?? []
      const unitGainsForMatch = gainsMap.get(`${row.matchParticipantId}:${row.unitId}`) ?? []
      arr.push({ unitName: row.unitName, unitType: row.unitType, xpGained: row.xpGained, gains: unitGainsForMatch })
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

// Story 3.1 — Admin: create a match with two participants
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

// Story 3.1b — Win/draw/loss record queries

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

// Story 3.2 — Pending matches (action chips)

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

export async function getPlayerArmy(playerId: string): Promise<{
  id: string
  name: string
  faction: string
  playerId: string | null
  playerDisplayName: string | null
} | null> {
  const rows = await db
    .select({
      id: armies.id,
      name: armies.name,
      faction: armies.faction,
      playerId: armies.playerId,
      playerDisplayName: players.displayName,
    })
    .from(armies)
    .leftJoin(players, eq(armies.playerId, players.id))
    .where(eq(armies.playerId, playerId))
    .limit(1)

  return rows.length > 0 ? rows[0] : null
}

// Story 3.3 — Match result entry

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

// Story 4.1 — Post-match flow: participant check + XP increment + evolutions stamp

export async function getMatchParticipantForEvolution(
  matchId: string,
  armyId: string,
): Promise<{ id: string; matchId: string; armyId: string; result: string | null; evolutionsEnteredAt: Date | null } | null> {
  const rows = await db
    .select({
      id: matchParticipants.id,
      matchId: matchParticipants.matchId,
      armyId: matchParticipants.armyId,
      result: matchParticipants.result,
      evolutionsEnteredAt: matchParticipants.evolutionsEnteredAt,
    })
    .from(matchParticipants)
    .where(and(eq(matchParticipants.matchId, matchId), eq(matchParticipants.armyId, armyId)))
    .limit(1)
  return rows.length > 0 ? rows[0] : null
}

export async function incrementUnitXp(
  unitId: string,
  xpGained: number,
): Promise<{ id: string; xp: number } | null> {
  const rows = await db.update(units)
    .set({ xp: sql`${units.xp} + ${xpGained}` })
    .where(eq(units.id, unitId))
    .returning({ id: units.id, xp: units.xp })
  return rows.length > 0 ? rows[0] : null
}

export async function markEvolutionsEntered(matchParticipantId: string): Promise<boolean> {
  const rows = await db.update(matchParticipants)
    .set({ evolutionsEnteredAt: new Date() })
    .where(eq(matchParticipants.id, matchParticipantId))
    .returning({ id: matchParticipants.id })
  return rows.length > 0 ? true : false
}

// Story 4-1b — verify match participant ownership
export async function getMatchParticipantArmyId(
  matchParticipantId: string,
): Promise<string | null> {
  const rows = await db
    .select({ armyId: matchParticipants.armyId })
    .from(matchParticipants)
    .where(eq(matchParticipants.id, matchParticipantId))
    .limit(1)
  return rows.length > 0 ? rows[0].armyId : null
}

// Story 4.2 — check whether evolutions have been entered for a participant
export async function getMatchParticipantEvolutionsStatus(
  matchParticipantId: string,
): Promise<{ found: boolean; evolutionsEnteredAt: Date | null }> {
  const rows = await db
    .select({ evolutionsEnteredAt: matchParticipants.evolutionsEnteredAt })
    .from(matchParticipants)
    .where(eq(matchParticipants.id, matchParticipantId))
    .limit(1)
  if (rows.length === 0) return { found: false, evolutionsEnteredAt: null }
  return { found: true, evolutionsEnteredAt: rows[0].evolutionsEnteredAt }
}

// Story 4.2 — delete all unit gains for a match participant (used on wizard resume to reset partial gains)
export async function deleteUnitGainsForMatchParticipant(matchParticipantId: string): Promise<number> {
  const deleted = await db
    .delete(unitGains)
    .where(eq(unitGains.matchParticipantId, matchParticipantId))
    .returning({ id: unitGains.id })
  return deleted.length
}

// Story 4.2 — insert multiple unit gains in a single transaction (C3: prevents partial commits)
export async function insertUnitGainsTransaction(
  unitId: string,
  descriptions: string[],
  matchParticipantId?: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    for (const description of descriptions) {
      await tx.insert(unitGains).values({ unitId, description, matchParticipantId: matchParticipantId ?? null })
    }
  })
}

// Story 4-1b — upsert XP entry and return previous value
// Wrapped in a transaction to guarantee atomicity of the SELECT + upsert pair,
// preventing race conditions where concurrent requests read stale previousXpGained.
export async function upsertMatchXpEntry(
  matchParticipantId: string,
  unitId: string,
  xpGained: number,
): Promise<{ previousXpGained: number | null }> {
  return db.transaction(async (tx) => {
    const existing = await tx.select({ xpGained: matchXpEntries.xpGained })
      .from(matchXpEntries)
      .where(
        and(
          eq(matchXpEntries.matchParticipantId, matchParticipantId),
          eq(matchXpEntries.unitId, unitId),
        ),
      )
      .limit(1)

    const previousXpGained = existing.length > 0 ? existing[0].xpGained : null

    await tx.insert(matchXpEntries)
      .values({ matchParticipantId, unitId, xpGained })
      .onConflictDoUpdate({
        target: [matchXpEntries.matchParticipantId, matchXpEntries.unitId],
        set: { xpGained },
      })

    return { previousXpGained }
  })
}

// Story 4-1b — retrieve XP entries for a match participant (used for wizard pre-fill)
export async function getMatchXpEntries(
  matchParticipantId: string,
): Promise<Array<{ unitId: string; xpGained: number }>> {
  return db
    .select({
      unitId: matchXpEntries.unitId,
      xpGained: matchXpEntries.xpGained,
    })
    .from(matchXpEntries)
    .where(eq(matchXpEntries.matchParticipantId, matchParticipantId))
}

// Batch commit: insert all unit_gains + stamp evolutionsEnteredAt in one transaction
export async function completeEvolutionsWithGainsTransaction(
  matchParticipantId: string,
  gains: Array<{ unitId: string; descriptions: string[] }>,
): Promise<void> {
  await db.transaction(async (tx) => {
    for (const { unitId, descriptions } of gains) {
      for (const description of descriptions) {
        await tx.insert(unitGains).values({
          unitId,
          description,
          matchParticipantId,
        })
      }
    }
    await tx.update(matchParticipants)
      .set({ evolutionsEnteredAt: new Date() })
      .where(eq(matchParticipants.id, matchParticipantId))
  })
}

export async function updateMatchResults(
  matchId: string,
  myArmyId: string,
  myResult: 'victory' | 'defeat' | 'draw',
): Promise<boolean> {
  return db.transaction(async (tx) => {
    // Update MY result
    const mine = await tx
      .update(matchParticipants)
      .set({ result: myResult })
      .where(and(eq(matchParticipants.matchId, matchId), eq(matchParticipants.armyId, myArmyId)))
      .returning({ id: matchParticipants.id })

    // Update OPPONENT's result to inverse
    const opp = await tx
      .update(matchParticipants)
      .set({ result: invertResult(myResult) })
      .where(and(eq(matchParticipants.matchId, matchId), ne(matchParticipants.armyId, myArmyId)))
      .returning({ id: matchParticipants.id })

    return mine.length === 1 && opp.length === 1
  })
}

