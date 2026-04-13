import { describe, it, expect } from 'vitest'
import { computeMatchSnapshotDeltas } from '../match-deltas'

describe('computeMatchSnapshotDeltas', () => {
  // 1. Les 4 snapshots présents, joueur devant en XP & pts → signed positifs, catchup 0
  it('all snapshots present, player ahead in XP and points → positive signed deltas, catchup 0', () => {
    expect(computeMatchSnapshotDeltas({
      mySnapshotXp: 150,
      oppSnapshotXp: 100,
      mySnapshotPoints: 2000,
      oppSnapshotPoints: 1500,
    })).toEqual({ signedDeltaXp: 50, signedDeltaPoints: 500, catchupDeltaXp: 0, catchupBonusXp: 0 })
  })

  // 2. Les 4 snapshots présents, joueur derrière en XP → signed XP négatif, catchup > 0
  it('all snapshots present, player behind in XP → negative signedDeltaXp, catchup > 0', () => {
    expect(computeMatchSnapshotDeltas({
      mySnapshotXp: 100,
      oppSnapshotXp: 125,
      mySnapshotPoints: 1800,
      oppSnapshotPoints: 2000,
    })).toEqual({ signedDeltaXp: -25, signedDeltaPoints: -200, catchupDeltaXp: 25, catchupBonusXp: 2 })
  })

  // 3. Égalité parfaite → tout à 0
  it('perfect equality → all zeros', () => {
    expect(computeMatchSnapshotDeltas({
      mySnapshotXp: 100,
      oppSnapshotXp: 100,
      mySnapshotPoints: 1500,
      oppSnapshotPoints: 1500,
    })).toEqual({ signedDeltaXp: 0, signedDeltaPoints: 0, catchupDeltaXp: 0, catchupBonusXp: 0 })
  })

  // 4. Joueur devant en XP de exactement 10 → catchup 0 (Math.max clamp)
  it('player ahead by exactly 10 XP → catchupDeltaXp 0 via Math.max clamp', () => {
    expect(computeMatchSnapshotDeltas({
      mySnapshotXp: 110,
      oppSnapshotXp: 100,
      mySnapshotPoints: 1500,
      oppSnapshotPoints: 1500,
    })).toEqual({ signedDeltaXp: 10, signedDeltaPoints: 0, catchupDeltaXp: 0, catchupBonusXp: 0 })
  })

  // 5. Joueur derrière en XP de 25 → catchupDeltaXp: 25, catchupBonusXp: 2
  it('player behind by 25 XP → catchupDeltaXp: 25, catchupBonusXp: 2', () => {
    expect(computeMatchSnapshotDeltas({
      mySnapshotXp: 100,
      oppSnapshotXp: 125,
      mySnapshotPoints: 1500,
      oppSnapshotPoints: 1500,
    })).toEqual({ signedDeltaXp: -25, signedDeltaPoints: 0, catchupDeltaXp: 25, catchupBonusXp: 2 })
  })

  // 6. Joueur derrière de 9 → catchup delta 9, bonus 0
  it('player behind by 9 XP → catchupDeltaXp: 9, catchupBonusXp: 0 (floor)', () => {
    expect(computeMatchSnapshotDeltas({
      mySnapshotXp: 91,
      oppSnapshotXp: 100,
      mySnapshotPoints: 1500,
      oppSnapshotPoints: 1500,
    })).toEqual({ signedDeltaXp: -9, signedDeltaPoints: 0, catchupDeltaXp: 9, catchupBonusXp: 0 })
  })

  // 7. mySnapshotXp === null → tout à 0
  it('mySnapshotXp null → all zeros', () => {
    expect(computeMatchSnapshotDeltas({
      mySnapshotXp: null,
      oppSnapshotXp: 100,
      mySnapshotPoints: 1500,
      oppSnapshotPoints: 1500,
    })).toEqual({ signedDeltaXp: 0, signedDeltaPoints: 0, catchupDeltaXp: 0, catchupBonusXp: 0 })
  })

  // 8. mySnapshotPoints === null → tout à 0 (un seul snapshot manquant suffit)
  it('mySnapshotPoints null → all zeros (one missing snapshot is enough)', () => {
    expect(computeMatchSnapshotDeltas({
      mySnapshotXp: 100,
      oppSnapshotXp: 100,
      mySnapshotPoints: null,
      oppSnapshotPoints: 1500,
    })).toEqual({ signedDeltaXp: 0, signedDeltaPoints: 0, catchupDeltaXp: 0, catchupBonusXp: 0 })
  })

  // 9. oppSnapshotXp === null → tout à 0
  it('oppSnapshotXp null → all zeros', () => {
    expect(computeMatchSnapshotDeltas({
      mySnapshotXp: 100,
      oppSnapshotXp: null,
      mySnapshotPoints: 1500,
      oppSnapshotPoints: 1500,
    })).toEqual({ signedDeltaXp: 0, signedDeltaPoints: 0, catchupDeltaXp: 0, catchupBonusXp: 0 })
  })

  // 10. Tous null → tout à 0
  it('all null → all zeros', () => {
    expect(computeMatchSnapshotDeltas({
      mySnapshotXp: null,
      oppSnapshotXp: null,
      mySnapshotPoints: null,
      oppSnapshotPoints: null,
    })).toEqual({ signedDeltaXp: 0, signedDeltaPoints: 0, catchupDeltaXp: 0, catchupBonusXp: 0 })
  })
})
