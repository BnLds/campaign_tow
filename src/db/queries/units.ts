import { eq, and, inArray, sql, isNull } from 'drizzle-orm'
import { db } from '../index'
import { players, armies, units, subProfiles, statModifiers, unitGains, matchXpEntries, matchParticipants } from '../schema'

export type StatFields = {
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
    .where(and(eq(units.armyId, armyId), eq(units.status, 'active')))
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

export async function getArmyWithUnits(armyId: string) {
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

  const unitRows = await db
    .select()
    .from(units)
    .where(and(eq(units.armyId, armyId), eq(units.status, 'active')))
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
    .where(and(eq(statModifiers.unitId, unitId), eq(statModifiers.cleared, false)))
    .orderBy(statModifiers.stat)
}

export async function getUnitGains(unitId: string) {
  return db
    .select()
    .from(unitGains)
    .where(and(eq(unitGains.unitId, unitId), eq(unitGains.cleared, false)))
}

export async function getUnitDeltas(unitIds: string[]): Promise<{
  statModifiers: typeof statModifiers.$inferSelect[]
  unitGains: typeof unitGains.$inferSelect[]
}> {
  if (unitIds.length === 0) {
    return { statModifiers: [], unitGains: [] }
  }

  const [modRows, gainRows] = await Promise.all([
    db.select().from(statModifiers).where(and(inArray(statModifiers.unitId, unitIds), eq(statModifiers.cleared, false))),
    db.select().from(unitGains).where(and(inArray(unitGains.unitId, unitIds), eq(unitGains.cleared, false))),
  ])

  return { statModifiers: modRows, unitGains: gainRows }
}

export async function insertStatModifier(
  unitId: string,
  stat: string,
  delta: number,
  source: string,
  temporary: boolean,
  matchParticipantId?: string,
) {
  const rows = await db
    .insert(statModifiers)
    .values({ unitId, stat, delta, source, temporary, matchParticipantId: matchParticipantId ?? null })
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
      status: units.status,
    })
    .from(units)
    .where(eq(units.id, unitId))
    .limit(1)
  return rows.length > 0 ? rows[0] : null
}

export async function getGraveyardUnits(armyId: string) {
  return db
    .select({
      id: units.id,
      name: units.name,
      type: units.type,
      graveyardReason: units.graveyardReason,
    })
    .from(units)
    .where(and(eq(units.armyId, armyId), eq(units.status, 'graveyard')))
    .orderBy(units.name)
}

export async function sendUnitToGraveyard(unitId: string, reason: string) {
  return db
    .update(units)
    .set({ status: 'graveyard', graveyardReason: reason })
    .where(eq(units.id, unitId))
    .returning()
}

export async function restoreUnitFromGraveyard(unitId: string) {
  return db
    .update(units)
    .set({ status: 'active', graveyardReason: null })
    .where(eq(units.id, unitId))
    .returning()
}

export async function deleteUnitPermanently(unitId: string) {
  return db
    .delete(units)
    .where(eq(units.id, unitId))
    .returning()
}

export async function hasInProgressPostMatch(unitId: string): Promise<boolean> {
  const rows = await db
    .select({ id: matchXpEntries.id })
    .from(matchXpEntries)
    .innerJoin(matchParticipants, eq(matchXpEntries.matchParticipantId, matchParticipants.id))
    .where(and(eq(matchXpEntries.unitId, unitId), isNull(matchParticipants.evolutionsEnteredAt)))
    .limit(1)
  return rows.length > 0
}
