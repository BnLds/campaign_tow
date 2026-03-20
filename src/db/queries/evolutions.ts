import { eq, and, inArray, or, sql } from 'drizzle-orm'
import { db } from '../index'
import { units, statModifiers, unitGains, matchParticipants, matchXpEntries } from '../schema'
import type { ConsequenceEntry } from '../../lib/validators'

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

export async function deleteUnitGainsForMatchParticipant(matchParticipantId: string): Promise<number> {
  const deleted = await db
    .delete(unitGains)
    .where(eq(unitGains.matchParticipantId, matchParticipantId))
    .returning({ id: unitGains.id })
  return deleted.length
}

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

export async function completeEvolutionsWithGainsTransaction(
  matchParticipantId: string,
  gains: Array<{ unitId: string; descriptions: string[] }>,
  consequences: ConsequenceEntry[] = [],
  armyId?: string,
  championKilledIds?: string[],
): Promise<void> {
  await db.transaction(async (tx) => {
    // AC24: Clear (soft-delete) temporary injury/destruction modifiers for this army's units
    // Also clear temporary unit_gains (Pertes Catastrophiques) from previous match
    // Cleared entries remain in DB for timeline history but are excluded from army view
    if (armyId) {
      const armyUnitRows = await tx
        .select({ id: units.id })
        .from(units)
        .where(eq(units.armyId, armyId))
      const armyUnitIds = armyUnitRows.map((u) => u.id)
      if (armyUnitIds.length > 0) {
        await tx.update(statModifiers)
          .set({ cleared: true })
          .where(and(
            inArray(statModifiers.unitId, armyUnitIds),
            eq(statModifiers.temporary, true),
            eq(statModifiers.cleared, false),
            or(eq(statModifiers.source, 'injury'), eq(statModifiers.source, 'destruction')),
          ))
        await tx.update(unitGains)
          .set({ cleared: true })
          .where(and(
            inArray(unitGains.unitId, armyUnitIds),
            eq(unitGains.cleared, false),
            sql`${unitGains.description} LIKE 'Pertes Catastrophiques%'`,
          ))
      }
    }

    // Insert tier-up gains
    for (const { unitId, descriptions } of gains) {
      for (const description of descriptions) {
        await tx.insert(unitGains).values({
          unitId,
          description,
          matchParticipantId,
        })
      }
    }

    // Process consequence entries (AC4, AC5, AC6, AC8, AC15-AC21)
    for (const consequence of consequences) {
      switch (consequence.type) {
        case 'permanent_injury':
          await tx.insert(statModifiers).values({
            unitId: consequence.unitId,
            stat: consequence.stat!,
            delta: consequence.delta!,
            source: 'injury',
            temporary: false,
            matchParticipantId,
          })
          break
        case 'grave_injury':
          await tx.insert(statModifiers).values({
            unitId: consequence.unitId,
            stat: 'pv',
            delta: -1,
            source: 'injury',
            temporary: true,
            matchParticipantId,
          })
          break
        case 'haine': {
          const haineName = consequence.opponentPlayerName || 'blessure'
          await tx.insert(unitGains).values({
            unitId: consequence.unitId,
            description: `Haine — ${haineName}`,
            matchParticipantId,
          })
          break
        }
        case 'death':
          await tx.insert(unitGains).values({
            unitId: consequence.unitId,
            description: 'Mort (MHC)',
            matchParticipantId,
          })
          break
        case 'moral_brise':
          await tx.insert(statModifiers).values({
            unitId: consequence.unitId,
            stat: 'cd',
            delta: -2,
            source: 'destruction',
            temporary: true,
            matchParticipantId,
          })
          break
        case 'pertes_catastrophiques':
          await tx.insert(unitGains).values({
            unitId: consequence.unitId,
            description: 'Pertes Catastrophiques (effectif réduit de moitié pour la prochaine bataille)',
            matchParticipantId,
          })
          break
        case 'rancune': {
          const haineName = consequence.opponentPlayerName || 'ennemi'
          await tx.insert(unitGains).values({
            unitId: consequence.unitId,
            description: `Haine — ${haineName}`,
            matchParticipantId,
          })
          break
        }
        case 'deroute_sanglante':
          if (consequence.xpLostAmount != null && consequence.xpLostAmount > 0) {
            await tx.insert(unitGains).values({
              unitId: consequence.unitId,
              description: `Déroute Sanglante (–${consequence.xpLostAmount} XP)`,
              matchParticipantId,
            })
          }
          break
      }

      // AC21: banner loss (independent of main consequence type)
      if (consequence.bannerLost === true) {
        await tx.delete(unitGains)
          .where(and(
            eq(unitGains.unitId, consequence.unitId),
            eq(unitGains.description, 'Bannière gratuite'),
          ))
        await tx.insert(unitGains).values({
          unitId: consequence.unitId,
          description: 'Bannière perdue (destruction)',
          matchParticipantId,
        })
      }
    }

    // Champion killed in challenge — delete champion unit_gain
    if (championKilledIds && championKilledIds.length > 0) {
      for (const unitId of championKilledIds) {
        await tx.delete(unitGains)
          .where(and(
            eq(unitGains.unitId, unitId),
            sql`${unitGains.description} LIKE '%Champion%'`,
          ))
      }
    }

    await tx.update(matchParticipants)
      .set({ evolutionsEnteredAt: new Date() })
      .where(eq(matchParticipants.id, matchParticipantId))
  })
}
