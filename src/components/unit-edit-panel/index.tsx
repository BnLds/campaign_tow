// Campaign TOW — UnitEditPanel orchestrator (directory module)

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../ui/button'
import { unitDeltasQueryOptions } from '../../lib/unit-deltas-queries'
import { NicknameField } from './nickname-field'
import { SubProfilesSection } from './sub-profiles-section'
import { StatModifiersSection } from './stat-modifiers-section'
import { UnitGainsSection } from './unit-gains-section'
import { PointsSection } from './points-section'
import { XpSection } from './xp-section'
import { DangerZone } from './danger-zone'
import type { SubProfileItem } from './types'

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
}: UnitEditPanelProps) {
  const queryClient = useQueryClient()
  const deltasQuery = useQuery({ ...unitDeltasQueryOptions(armyId, unitId), enabled: isAdmin })
  const statModifiers = deltasQuery.data?.statModifiers ?? []
  const unitGains = deltasQuery.data?.unitGains ?? []
  const loadingDeltas = deltasQuery.isLoading

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
      />

      <SubProfilesSection
        armyId={armyId}
        subProfiles={subProfiles}
      />

      {isAdmin && (
        <StatModifiersSection
          armyId={armyId}
          unitId={unitId}
          statModifiers={statModifiers}
          loadingDeltas={loadingDeltas}
          onDeltaChange={() => queryClient.invalidateQueries({ queryKey: unitDeltasQueryOptions(armyId, unitId).queryKey })}
        />
      )}

      {isAdmin && (
        <UnitGainsSection
          armyId={armyId}
          unitId={unitId}
          unitGains={unitGains}
          loadingDeltas={loadingDeltas}
          onDeltaChange={() => queryClient.invalidateQueries({ queryKey: unitDeltasQueryOptions(armyId, unitId).queryKey })}
        />
      )}

      <PointsSection
        armyId={armyId}
        unitId={unitId}
        currentPoints={currentPoints}
      />

      {isAdmin && (
        <XpSection
          armyId={armyId}
          unitId={unitId}
          unitType={unitType}
          currentXp={currentXp}
        />
      )}

      <DangerZone
        armyId={armyId}
        unitId={unitId}
      />
    </div>
  )
}
