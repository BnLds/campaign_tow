// Campaign TOW — UnitEditPanel orchestrator (directory module)

import { useEffect, useState } from 'react'
import { Button } from '../ui/button'
import { fetchUnitDeltasFn } from '../../server-fns/unit-queries'
import { NicknameField } from './nickname-field'
import { SubProfilesSection } from './sub-profiles-section'
import { StatModifiersSection } from './stat-modifiers-section'
import { UnitGainsSection } from './unit-gains-section'
import { PointsSection } from './points-section'
import { XpSection } from './xp-section'
import { DangerZone } from './danger-zone'
import type { StatModifierRow, UnitGainRow, SubProfileItem } from './types'

export type { SubProfileItem }

export interface UnitEditPanelProps {
  armyId: string
  unitId: string
  unitName: string
  unitNickname: string | null
  unitType: string
  currentXp: number
  currentPoints: number | null
  subProfiles: SubProfileItem[]
  isAdmin: boolean
  onClose: () => void
  onMutationSuccess: () => Promise<void>
}

export function UnitEditPanel({
  armyId,
  unitId,
  unitName,
  unitNickname,
  unitType,
  currentXp,
  currentPoints,
  subProfiles,
  isAdmin,
  onClose,
  onMutationSuccess,
}: UnitEditPanelProps) {
  const [statModifiers, setStatModifiers] = useState<StatModifierRow[]>([])
  const [unitGains, setUnitGains] = useState<UnitGainRow[]>([])
  const [loadingDeltas, setLoadingDeltas] = useState(true)

  useEffect(() => {
    if (!isAdmin) {
      setLoadingDeltas(false)
      return
    }
    let mounted = true
    async function fetchDeltas() {
      setLoadingDeltas(true)
      try {
        const result = await fetchUnitDeltasFn({ data: { armyId, unitId } })
        if (!mounted) return
        setStatModifiers(result.statModifiers)
        setUnitGains(result.unitGains)
      } catch {
        // silently fail
      } finally {
        if (mounted) setLoadingDeltas(false)
      }
    }
    void fetchDeltas()
    return () => { mounted = false }
  }, [unitId, armyId, isAdmin])

  const refetchDeltas = async () => {
    try {
      const result = await fetchUnitDeltasFn({ data: { armyId, unitId } })
      setStatModifiers(result.statModifiers)
      setUnitGains(result.unitGains)
    } catch {
      // silently fail
    }
  }

  return (
    <div
      data-testid={`unit-edit-panel-${unitId}`}
      className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4 mb-4"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-[family-name:var(--font-body)] font-semibold text-sm text-[var(--color-text-primary)]">
          Modifier : {unitName}
        </h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          ✕
        </Button>
      </div>

      <NicknameField
        armyId={armyId}
        unitId={unitId}
        unitNickname={unitNickname}
        onMutationSuccess={onMutationSuccess}
      />

      <SubProfilesSection
        armyId={armyId}
        subProfiles={subProfiles}
        onMutationSuccess={onMutationSuccess}
      />

      {isAdmin && (
        <StatModifiersSection
          armyId={armyId}
          unitId={unitId}
          statModifiers={statModifiers}
          loadingDeltas={loadingDeltas}
          onMutationSuccess={onMutationSuccess}
          onDeltaChange={refetchDeltas}
        />
      )}

      {isAdmin && (
        <UnitGainsSection
          armyId={armyId}
          unitId={unitId}
          unitGains={unitGains}
          loadingDeltas={loadingDeltas}
          onMutationSuccess={onMutationSuccess}
          onDeltaChange={refetchDeltas}
        />
      )}

      <PointsSection
        armyId={armyId}
        unitId={unitId}
        currentPoints={currentPoints}
        onMutationSuccess={onMutationSuccess}
      />

      {isAdmin && (
        <XpSection
          armyId={armyId}
          unitId={unitId}
          unitType={unitType}
          currentXp={currentXp}
          onMutationSuccess={onMutationSuccess}
        />
      )}

      <DangerZone
        armyId={armyId}
        unitId={unitId}
        onMutationSuccess={onMutationSuccess}
      />
    </div>
  )
}
