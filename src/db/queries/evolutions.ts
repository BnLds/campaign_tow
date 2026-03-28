import { eq, and, inArray, or, sql, desc } from 'drizzle-orm'
import { db } from '../index'
import { units, statModifiers, unitGains, matchParticipants, matchXpEntries, matches, armies } from '../schema'
import type { ConsequenceEntry } from '../../lib/validators'
import { detectLostThresholds } from '../../lib/tier'
import { HONOUR_CHAMPION_LABEL, HONOUR_BANNER_LABEL } from '../../lib/format'
import type { UnitGainType } from './units'

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

export async function getMatchParticipantForEvolutionByPlayer(
  matchId: string,
  playerId: string,
): Promise<{ id: string; matchId: string; playerId: string; armyId: string | null; result: string | null; evolutionsEnteredAt: Date | null } | null> {
  const rows = await db
    .select({
      id: matchParticipants.id,
      matchId: matchParticipants.matchId,
      playerId: matchParticipants.playerId,
      armyId: matchParticipants.armyId,
      result: matchParticipants.result,
      evolutionsEnteredAt: matchParticipants.evolutionsEnteredAt,
    })
    .from(matchParticipants)
    .where(and(eq(matchParticipants.matchId, matchId), eq(matchParticipants.playerId, playerId)))
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

export async function upsertMatchXpEntryWithIncrement(
  matchParticipantId: string,
  unitId: string,
  xpGained: number,
  derouteXpLost: number = 0,
): Promise<{ previousXpGained: number | null; previousDerouteXpLost: number; newUnitXp: number }> {
  return db.transaction(async (tx) => {
    // Upsert match XP entry
    const existing = await tx.select({ xpGained: matchXpEntries.xpGained, derouteXpLost: matchXpEntries.derouteXpLost })
      .from(matchXpEntries)
      .where(
        and(
          eq(matchXpEntries.matchParticipantId, matchParticipantId),
          eq(matchXpEntries.unitId, unitId),
        ),
      )
      .limit(1)

    const previousXpGained = existing.length > 0 ? existing[0].xpGained : null
    const previousDerouteXpLost = existing.length > 0 ? existing[0].derouteXpLost : 0

    await tx.insert(matchXpEntries)
      .values({ matchParticipantId, unitId, xpGained, derouteXpLost })
      .onConflictDoUpdate({
        target: [matchXpEntries.matchParticipantId, matchXpEntries.unitId],
        set: { xpGained, derouteXpLost },
      })

    // Compute delta: (newXpGained - prevXpGained) - (newDerouteXpLost - prevDerouteXpLost)
    const delta = (xpGained - (previousXpGained ?? 0)) - (derouteXpLost - previousDerouteXpLost)
    if (delta !== 0) {
      const [updated] = await tx.update(units)
        .set({ xp: sql`GREATEST(0, ${units.xp} + ${delta})` })
        .where(eq(units.id, unitId))
        .returning({ xp: units.xp })
      return { previousXpGained, previousDerouteXpLost, newUnitXp: updated.xp }
    }

    // delta === 0: read current XP
    const [current] = await tx.select({ xp: units.xp })
      .from(units)
      .where(eq(units.id, unitId))
      .limit(1)
    return { previousXpGained, previousDerouteXpLost, newUnitXp: current.xp }
  })
}

export async function getMatchXpEntries(
  matchParticipantId: string,
): Promise<Array<{ unitId: string; xpGained: number; derouteXpLost: number }>> {
  return db
    .select({
      unitId: matchXpEntries.unitId,
      xpGained: matchXpEntries.xpGained,
      derouteXpLost: matchXpEntries.derouteXpLost,
    })
    .from(matchXpEntries)
    .where(eq(matchXpEntries.matchParticipantId, matchParticipantId))
}

// ---------------------------------------------------------------------------
// Transaction sub-functions — non-exported, each receives tx
// ---------------------------------------------------------------------------

async function lockAndCheckReentry(
  tx: DbTransaction,
  matchParticipantId: string,
  armyId: string | undefined,
  matchId: string,
): Promise<void> {
  // Lock participant row to serialize concurrent commits
  const [mpRow] = await tx
    .select({ evolutionsEnteredAt: matchParticipants.evolutionsEnteredAt })
    .from(matchParticipants)
    .where(eq(matchParticipants.id, matchParticipantId))
    .for('update')
  const isReentry = mpRow?.evolutionsEnteredAt !== null

  if (isReentry) {
    // Re-verify this is the army's latest match inside the transaction (prevents TOCTOU)
    if (armyId) {
      const latestRows = await tx
        .select({ matchId: matchParticipants.matchId })
        .from(matchParticipants)
        .innerJoin(matches, eq(matchParticipants.matchId, matches.id))
        .where(eq(matchParticipants.armyId, armyId))
        .orderBy(desc(matches.date), desc(matches.createdAt))
        .limit(1)
      if (latestRows.length === 0 || latestRows[0].matchId !== matchId) {
        throw new Error('NOT_LATEST_MATCH')
      }
    }
    // Un-clear gains that were cleared by this matchParticipantId (deroute reversal on re-entry)
    await tx.update(unitGains)
      .set({ cleared: false, clearedByMatchParticipantId: null })
      .where(eq(unitGains.clearedByMatchParticipantId, matchParticipantId))
    // Delete old gains and stat modifiers for this participant
    await tx.delete(unitGains)
      .where(eq(unitGains.matchParticipantId, matchParticipantId))
    await tx.delete(statModifiers)
      .where(eq(statModifiers.matchParticipantId, matchParticipantId))
  }
}

async function clearTemporaryEffects(tx: DbTransaction, armyId: string): Promise<void> {
  // AC24: Clear (soft-delete) temporary injury/destruction modifiers for this army's units
  // Also clear temporary unit_gains (Pertes Catastrophiques) from previous match
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
        eq(unitGains.type, 'pertes_catastrophiques'),
      ))
  }
}

async function verifyUnitOwnership(tx: DbTransaction, armyId: string, unitIds: string[]): Promise<void> {
  // Security: verify all submitted unitIds belong to the declared army
  const ownedRows = await tx
    .select({ id: units.id })
    .from(units)
    .where(eq(units.armyId, armyId))
  const ownedIds = new Set(ownedRows.map((u) => u.id))
  if (unitIds.some((id) => !ownedIds.has(id))) {
    throw new Error('FORBIDDEN')
  }
}

function resolveHonourType(description: string): UnitGainType {
  if (description === HONOUR_CHAMPION_LABEL) return 'honour_champion'
  if (description === HONOUR_BANNER_LABEL) return 'honour_banner'
  return 'tier_up'
}

async function insertTierUpGains(
  tx: DbTransaction,
  gains: Array<{ unitId: string; descriptions: string[]; thresholdXp?: number | null }>,
  matchParticipantId: string,
): Promise<void> {
  // Insert tier-up gains (with thresholdXp for deroute tier-down tracking)
  // resolveHonourType classifies honour_champion/honour_banner/tier_up by description
  for (const { unitId, descriptions, thresholdXp } of gains) {
    for (const description of descriptions) {
      await tx.insert(unitGains).values({
        unitId,
        description,
        type: resolveHonourType(description),
        matchParticipantId,
        thresholdXp: thresholdXp ?? null,
      })
    }
  }
}

async function handleDerouteTierDown(
  tx: DbTransaction,
  consequence: ConsequenceEntry,
  matchParticipantId: string,
): Promise<void> {
  // Tier-down gain removal: soft-delete unitGains for lost thresholds
  // Read unit XP with FOR UPDATE lock to prevent concurrent modification
  const [unitRow] = await tx
    .select({ xp: units.xp, type: units.type })
    .from(units)
    .where(eq(units.id, consequence.unitId))
    .for('update')
  if (unitRow && unitRow.type !== 'Personnages') {
    // Read matchXpEntries to compute preMatchXp
    const [xpEntry] = await tx
      .select({ xpGained: matchXpEntries.xpGained, derouteXpLost: matchXpEntries.derouteXpLost })
      .from(matchXpEntries)
      .where(
        and(
          eq(matchXpEntries.matchParticipantId, matchParticipantId),
          eq(matchXpEntries.unitId, consequence.unitId),
        ),
      )
      .for('update')
      .limit(1)
    if (xpEntry) {
      const postDerouteXp = unitRow.xp
      const preMatchXp = Math.max(0, postDerouteXp - xpEntry.xpGained + xpEntry.derouteXpLost)
      const lostThresholds = detectLostThresholds(preMatchXp, postDerouteXp, unitRow.type)
      if (lostThresholds.length > 0) {
        await tx.update(unitGains)
          .set({ cleared: true, clearedByMatchParticipantId: matchParticipantId })
          .where(
            and(
              eq(unitGains.unitId, consequence.unitId),
              eq(unitGains.cleared, false),
              inArray(unitGains.thresholdXp, lostThresholds),
            ),
          )
      }
    }
  }
}

async function processConsequences(
  tx: DbTransaction,
  consequences: ConsequenceEntry[],
  matchParticipantId: string,
): Promise<void> {
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
          type: 'haine',
          matchParticipantId,
        })
        break
      }
      case 'death': {
        const deathReason = 'Mort (MHC)'
        await tx.insert(unitGains).values({
          unitId: consequence.unitId,
          description: deathReason,
          type: 'death',
          matchParticipantId,
        })
        await tx
          .update(units)
          .set({ status: 'graveyard', graveyardReason: deathReason })
          .where(eq(units.id, consequence.unitId))
        break
      }
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
          type: 'pertes_catastrophiques',
          matchParticipantId,
        })
        break
      case 'rancune': {
        const haineName = consequence.opponentPlayerName || 'ennemi'
        await tx.insert(unitGains).values({
          unitId: consequence.unitId,
          description: `Haine — ${haineName}`,
          type: 'haine',
          matchParticipantId,
        })
        break
      }
      case 'deroute_sanglante': {
        if (consequence.xpLostAmount != null && consequence.xpLostAmount > 0) {
          await tx.insert(unitGains).values({
            unitId: consequence.unitId,
            description: `Déroute Sanglante (–${consequence.xpLostAmount} XP)`,
            type: 'deroute_sanglante',
            matchParticipantId,
          })
        }
        await handleDerouteTierDown(tx, consequence, matchParticipantId)
        break
      }
      default:
        // no_effect, miracule, survivants_endurcis, fureur_vengeresse: no persistent DB effect
        break
    }

    // AC21: banner loss (independent of main consequence type)
    if (consequence.bannerLost === true) {
      await tx.delete(unitGains)
        .where(and(
          eq(unitGains.unitId, consequence.unitId),
          eq(unitGains.type, 'honour_banner'),
        ))
      await tx.insert(unitGains).values({
        unitId: consequence.unitId,
        description: 'Bannière perdue (destruction)',
        type: 'banner_lost',
        matchParticipantId,
      })
    }
  }
}

async function handleChampionKills(tx: DbTransaction, championKilledIds: string[]): Promise<void> {
  // Champion killed in challenge — delete champion unit_gain
  for (const unitId of championKilledIds) {
    await tx.delete(unitGains)
      .where(and(
        eq(unitGains.unitId, unitId),
        eq(unitGains.type, 'honour_champion'),
      ))
  }
}

async function finalizeEvolutions(
  tx: DbTransaction,
  matchParticipantId: string,
  matchType: 'standard' | 'initial_setup' | undefined,
  armyId: string | undefined,
): Promise<void> {
  const now = new Date()
  await tx.update(matchParticipants)
    .set({ evolutionsEnteredAt: now })
    .where(eq(matchParticipants.id, matchParticipantId))

  // Initial XP entry: set initialXpCompletedAt atomically with the commit
  if (matchType === 'initial_setup' && armyId) {
    await tx.update(armies)
      .set({ initialXpCompletedAt: now })
      .where(eq(armies.id, armyId))
  }
}

// ---------------------------------------------------------------------------
// Public orchestrator
// ---------------------------------------------------------------------------

export async function completeEvolutionsWithGainsTransaction(
  matchParticipantId: string,
  matchId: string,
  gains: Array<{ unitId: string; descriptions: string[]; thresholdXp?: number | null }>,
  consequences: ConsequenceEntry[] = [],
  armyId?: string,
  championKilledIds?: string[],
  matchType?: 'standard' | 'initial_setup',
): Promise<void> {
  await db.transaction(async (tx) => {
    await lockAndCheckReentry(tx, matchParticipantId, armyId, matchId)
    if (armyId) await clearTemporaryEffects(tx, armyId)
    const allSubmittedIds = [
      ...gains.map((g) => g.unitId),
      ...consequences.map((c) => c.unitId),
      ...(championKilledIds ?? []),
    ]
    if (armyId && allSubmittedIds.length > 0) await verifyUnitOwnership(tx, armyId, allSubmittedIds)
    await insertTierUpGains(tx, gains, matchParticipantId)
    await processConsequences(tx, consequences, matchParticipantId)
    if (championKilledIds && championKilledIds.length > 0) await handleChampionKills(tx, championKilledIds)
    await finalizeEvolutions(tx, matchParticipantId, matchType, armyId)
  })
}
