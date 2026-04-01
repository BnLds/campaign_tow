import { eq, and, inArray, sql } from 'drizzle-orm'
import { db } from '../../index'
import { matchUnitSelections, matchParticipants, units } from '../../schema'

export async function submitUnitSelection(
  matchParticipantId: string,
  unitIds: string[],
  externalTx?: Parameters<Parameters<typeof db.transaction>[0]>[0],
): Promise<{ totalXp: number; totalPoints: number }> {
  const run = async (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => {
    // Ownership check: verify all unitIds belong to the participant's army and are active
    const [participantRow] = await tx
      .select({ armyId: matchParticipants.armyId })
      .from(matchParticipants)
      .where(eq(matchParticipants.id, matchParticipantId))
      .limit(1)

    if (!participantRow?.armyId) {
      throw new Error('PARTICIPANT_NOT_FOUND')
    }

    const armyUnits = await tx
      .select({ id: units.id })
      .from(units)
      .where(and(eq(units.armyId, participantRow.armyId), eq(units.status, 'active'), inArray(units.id, unitIds)))

    const validUnitIds = new Set(armyUnits.map((u) => u.id))
    const invalidIds = unitIds.filter((id) => !validUnitIds.has(id))
    if (invalidIds.length > 0) {
      throw new Error('INVALID_UNIT_IDS')
    }

    // Replace strategy: delete existing, insert new
    await tx.delete(matchUnitSelections).where(eq(matchUnitSelections.matchParticipantId, matchParticipantId))

    await tx.insert(matchUnitSelections).values(
      unitIds.map((unitId) => ({ matchParticipantId, unitId })),
    )

    // Set unitSelectionCompletedAt
    await tx
      .update(matchParticipants)
      .set({ unitSelectionCompletedAt: new Date() })
      .where(eq(matchParticipants.id, matchParticipantId))

    // Compute totals of selected units
    const [totals] = await tx
      .select({
        totalXp: sql<string>`COALESCE(SUM(${units.xp}), 0)`,
        totalPoints: sql<string>`COALESCE(SUM(${units.points}), 0)`,
      })
      .from(units)
      .where(inArray(units.id, unitIds))

    return { totalXp: Number(totals.totalXp), totalPoints: Number(totals.totalPoints) }
  }
  return externalTx ? run(externalTx) : db.transaction(run)
}

export async function getUnitSelectionForParticipant(
  matchParticipantId: string,
  executor?: Parameters<Parameters<typeof db.transaction>[0]>[0],
): Promise<string[]> {
  const ex = executor ?? db
  const rows = await ex
    .select({ unitId: matchUnitSelections.unitId })
    .from(matchUnitSelections)
    .where(eq(matchUnitSelections.matchParticipantId, matchParticipantId))

  return rows.map((r) => r.unitId)
}

export async function getSelectedUnitsTotalsForMatch(
  matchId: string,
): Promise<Record<string, { totalXp: number; totalPoints: number; unitSelectionCompletedAt: Date | null }>> {
  // Get all participants for the match
  const participants = await db
    .select({
      id: matchParticipants.id,
      unitSelectionCompletedAt: matchParticipants.unitSelectionCompletedAt,
    })
    .from(matchParticipants)
    .where(eq(matchParticipants.matchId, matchId))

  const result: Record<string, { totalXp: number; totalPoints: number; unitSelectionCompletedAt: Date | null }> = {}

  for (const p of participants) {
    if (p.unitSelectionCompletedAt) {
      // Has selection — compute from selected units
      const rows = await db
        .select({
          totalXp: sql<string>`COALESCE(SUM(${units.xp}), 0)`,
          totalPoints: sql<string>`COALESCE(SUM(${units.points}), 0)`,
        })
        .from(matchUnitSelections)
        .innerJoin(units, eq(matchUnitSelections.unitId, units.id))
        .where(eq(matchUnitSelections.matchParticipantId, p.id))

      result[p.id] = {
        totalXp: Number(rows[0]?.totalXp ?? 0),
        totalPoints: Number(rows[0]?.totalPoints ?? 0),
        unitSelectionCompletedAt: p.unitSelectionCompletedAt,
      }
    } else {
      result[p.id] = { totalXp: 0, totalPoints: 0, unitSelectionCompletedAt: null }
    }
  }

  return result
}

export async function hasCompletedUnitSelection(matchParticipantId: string): Promise<boolean> {
  const rows = await db
    .select({ unitSelectionCompletedAt: matchParticipants.unitSelectionCompletedAt })
    .from(matchParticipants)
    .where(eq(matchParticipants.id, matchParticipantId))
    .limit(1)

  return rows.length > 0 && rows[0].unitSelectionCompletedAt !== null
}
