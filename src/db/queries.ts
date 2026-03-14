// Campaign TOW — Reusable DB query functions
// All direct drizzle-orm and DB access for named operations lives here.

import { eq, inArray } from 'drizzle-orm'
import { db } from './index'
import { players, armies, units, subProfiles, statModifiers, unitGains } from './schema'
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

export async function getArmyById(armyId: string) {
  const armyRows = await db
    .select({
      id: armies.id,
      name: armies.name,
      faction: armies.faction,
      playerId: armies.playerId,
      createdAt: armies.createdAt,
    })
    .from(armies)
    .where(eq(armies.id, armyId))
    .limit(1)

  if (armyRows.length === 0) return null
  const army = armyRows[0]

  const unitRows = await db
    .select()
    .from(units)
    .where(eq(units.armyId, armyId))
    .orderBy(units.createdAt)

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
    ...army,
    units: unitRows.map((u) => ({
      ...u,
      subProfiles: spRows.filter((sp) => sp.unitId === u.id),
    })),
  }
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
        m: stats.m || null,
        cc: stats.cc || null,
        ct: stats.ct || null,
        f: stats.f || null,
        e: stats.e || null,
        pv: stats.pv || null,
        i: stats.i || null,
        a: stats.a || null,
        cd: stats.cd || null,
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
      m: stats.m || null,
      cc: stats.cc || null,
      ct: stats.ct || null,
      f: stats.f || null,
      e: stats.e || null,
      pv: stats.pv || null,
      i: stats.i || null,
      a: stats.a || null,
      cd: stats.cd || null,
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
    .orderBy(units.createdAt)

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
  const armyRows = await db
    .select({
      id: armies.id,
      name: armies.name,
      faction: armies.faction,
      playerId: armies.playerId,
    })
    .from(armies)
    .where(eq(armies.id, armyId))
    .limit(1)

  if (armyRows.length === 0) return null
  const army = armyRows[0]

  // Fetch player info if assigned
  let playerInfo: { displayName: string } | null = null
  if (army.playerId) {
    const playerRows = await db
      .select({ displayName: players.displayName })
      .from(players)
      .where(eq(players.id, army.playerId))
      .limit(1)
    playerInfo = playerRows.length > 0 ? playerRows[0] : null
  }

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
    player: playerInfo,
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

