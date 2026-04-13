// Campaign TOW — Pure helper for computing all match snapshot deltas

/**
 * Shape returned by computeMatchSnapshotDeltas.
 *
 * All values are player-centric (positive = player ahead of opponent).
 */
export type MatchSnapshotDeltas = {
  /** Signed XP delta: mySnapshotXp - oppSnapshotXp */
  signedDeltaXp: number
  /** Signed points delta: mySnapshotPoints - oppSnapshotPoints */
  signedDeltaPoints: number
  /** Catchup XP delta (clamped ≥ 0): max(0, oppSnapshotXp - mySnapshotXp) */
  catchupDeltaXp: number
  /** Catchup bonus XP: floor(catchupDeltaXp / 10) */
  catchupBonusXp: number
}

/**
 * Computes all match snapshot deltas from a pair of frozen snapshots.
 *
 * Returns all-zeros when any snapshot is null (data unavailable / legacy match,
 * or initial_setup match which has no opponent and therefore no opp snapshot).
 */
export function computeMatchSnapshotDeltas(params: {
  mySnapshotXp: number | null
  oppSnapshotXp: number | null
  mySnapshotPoints: number | null
  oppSnapshotPoints: number | null
}): MatchSnapshotDeltas {
  const { mySnapshotXp, oppSnapshotXp, mySnapshotPoints, oppSnapshotPoints } = params

  if (mySnapshotXp == null || oppSnapshotXp == null || mySnapshotPoints == null || oppSnapshotPoints == null) {
    return { signedDeltaXp: 0, signedDeltaPoints: 0, catchupDeltaXp: 0, catchupBonusXp: 0 }
  }

  const signedDeltaXp = mySnapshotXp - oppSnapshotXp
  const signedDeltaPoints = mySnapshotPoints - oppSnapshotPoints
  const catchupDeltaXp = Math.max(0, oppSnapshotXp - mySnapshotXp)
  const catchupBonusXp = Math.floor(catchupDeltaXp / 10)

  return { signedDeltaXp, signedDeltaPoints, catchupDeltaXp, catchupBonusXp }
}
