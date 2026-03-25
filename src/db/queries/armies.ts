import { eq, and, ne, isNull } from 'drizzle-orm'
import { db } from '../index'
import { players, armies, units, subProfiles, matchParticipants } from '../schema'
import type { ParsedArmy } from '../../lib/owb-parser'

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
          nickname: unit.nickname,
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
  return db.transaction(async (tx) => {
    await tx.update(armies).set({ playerId: null }).where(and(eq(armies.playerId, playerId), ne(armies.id, armyId)))
    const result = await tx
      .update(armies)
      .set({ playerId })
      .where(eq(armies.id, armyId))
      .returning({ id: armies.id })
    if (result.length === 0) return false
    // Backfill: link pending matches to the newly assigned army
    await tx.update(matchParticipants)
      .set({ armyId })
      .where(and(eq(matchParticipants.playerId, playerId), isNull(matchParticipants.armyId)))
    return true
  })
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
      playerUsername: players.username,
    })
    .from(armies)
    .leftJoin(players, eq(armies.playerId, players.id))
    .orderBy(armies.createdAt)
}

export async function getPlayerArmy(playerId: string): Promise<{
  id: string
  name: string
  faction: string
  playerId: string | null
  playerUsername: string | null
  needsInitialXp: boolean
} | null> {
  const rows = await db
    .select({
      id: armies.id,
      name: armies.name,
      faction: armies.faction,
      playerId: armies.playerId,
      playerUsername: players.username,
      needsInitialXp: armies.needsInitialXp,
    })
    .from(armies)
    .leftJoin(players, eq(armies.playerId, players.id))
    .where(eq(armies.playerId, playerId))
    .limit(1)

  return rows.length > 0 ? rows[0] : null
}

export async function deleteArmy(armyId: string): Promise<void> {
  await db.delete(armies).where(eq(armies.id, armyId))
}
