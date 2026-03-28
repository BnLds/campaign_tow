import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { updateSubProfileFn, getArmyUnitsFn } from '#/server-fns/admin-armies'
import type { AdminQueries } from './-use-admin-queries'
import { createEmptyStats } from './-admin-helpers'
import type { ResultMessage } from './-admin-helpers'
import type { StatFields } from '#/db/queries/units'

export interface CorrectionState {
  corrArmyId: string
  corrUnitId: string
  corrSubProfileId: string
  corrStats: StatFields
  corrResult: ResultMessage
}

export interface CorrectionDerived {
  corrUnits: Array<{
    id: string
    name: string
    subProfiles: Array<{
      id: string
      label: string
      m: string | null
      cc: string | null
      ct: string | null
      f: string | null
      e: string | null
      pv: string | null
      i: string | null
      a: string | null
      cd: string | null
    }>
  }>
  corrSelectedUnit: CorrectionDerived['corrUnits'][number] | undefined
  corrSubProfiles: CorrectionDerived['corrUnits'][number]['subProfiles']
  armyUnitsLoading: boolean
  armyUnitsError: boolean
}

export interface CorrectionActions {
  handleCorrectStats: () => void
  setCorrArmyId: (id: string) => void
  setCorrUnitId: (id: string) => void
  setCorrSubProfileId: (id: string) => void
  setCorrStats: (s: StatFields) => void
}

export interface CorrectionApi {
  state: CorrectionState
  derived: CorrectionDerived
  actions: CorrectionActions
  isPending: boolean
  error: Error | null
}

export function useCorrection(queries: AdminQueries): CorrectionApi {
  const [corrArmyId, setCorrArmyIdRaw] = useState('')
  const [corrUnitId, setCorrUnitIdRaw] = useState('')
  const [corrSubProfileId, setCorrSubProfileIdRaw] = useState('')
  const [corrStats, setCorrStats] = useState(createEmptyStats())
  const [corrResult, setCorrResult] = useState<ResultMessage>(null)

  const armyUnitsQuery = useQuery({
    queryKey: ['admin', 'army-units', corrArmyId],
    queryFn: () => getArmyUnitsFn({ data: { armyId: corrArmyId } }),
    enabled: !!corrArmyId,
  })

  const corrUnits = armyUnitsQuery.data ?? []
  const corrSelectedUnit = corrUnits.find((u) => u.id === corrUnitId)
  const corrSubProfiles = corrSelectedUnit?.subProfiles ?? []
  const armyUnitsLoading = armyUnitsQuery.isPending && !!corrArmyId
  const armyUnitsError = !!armyUnitsQuery.error

  function setCorrArmyId(id: string) {
    setCorrArmyIdRaw(id)
    setCorrUnitIdRaw('')
    setCorrSubProfileIdRaw('')
    setCorrStats(createEmptyStats())
    setCorrResult(null)
  }

  function setCorrUnitId(id: string) {
    setCorrUnitIdRaw(id)
    setCorrSubProfileIdRaw('')
    setCorrStats(createEmptyStats())
    // If unit has exactly 1 sub-profile, auto-select
    const unit = corrUnits.find((u) => u.id === id)
    if (unit && unit.subProfiles.length === 1) {
      const sp = unit.subProfiles[0]
      setCorrSubProfileIdRaw(sp.id)
      setCorrStats({
        m: sp.m ?? '',
        cc: sp.cc ?? '',
        ct: sp.ct ?? '',
        f: sp.f ?? '',
        e: sp.e ?? '',
        pv: sp.pv ?? '',
        i: sp.i ?? '',
        a: sp.a ?? '',
        cd: sp.cd ?? '',
      })
    }
  }

  function setCorrSubProfileId(id: string) {
    setCorrSubProfileIdRaw(id)
    const sp = corrSubProfiles.find((s) => s.id === id)
    if (sp) {
      setCorrStats({
        m: sp.m ?? '',
        cc: sp.cc ?? '',
        ct: sp.ct ?? '',
        f: sp.f ?? '',
        e: sp.e ?? '',
        pv: sp.pv ?? '',
        i: sp.i ?? '',
        a: sp.a ?? '',
        cd: sp.cd ?? '',
      })
    }
  }

  const correctStatsMutation = useMutation({
    mutationFn: async (variables: { subProfileId: string; stats: StatFields; armyId: string }) => {
      const result = await updateSubProfileFn({
        data: {
          subProfileId: variables.subProfileId,
          ...variables.stats,
        },
      })
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: (_data, variables) => {
      setCorrResult({ success: true, message: 'Stats mises à jour avec succès' })
      void queries.queryClient.invalidateQueries({ queryKey: ['admin', 'army-units', variables.armyId] })
    },
  })

  function handleCorrectStats() {
    setCorrResult(null)
    correctStatsMutation.mutate({ subProfileId: corrSubProfileId, stats: corrStats, armyId: corrArmyId })
  }

  return {
    state: {
      corrArmyId,
      corrUnitId,
      corrSubProfileId,
      corrStats,
      corrResult,
    },
    derived: {
      corrUnits,
      corrSelectedUnit,
      corrSubProfiles,
      armyUnitsLoading,
      armyUnitsError,
    },
    actions: {
      handleCorrectStats,
      setCorrArmyId,
      setCorrUnitId,
      setCorrSubProfileId,
      setCorrStats,
    },
    isPending: correctStatsMutation.isPending,
    error: correctStatsMutation.error,
  }
}
