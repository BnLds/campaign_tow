import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { addUnitFn } from '#/server-fns/admin-armies'
import type { AdminQueries } from './-use-admin-queries'
import { createEmptyStats } from './-admin-helpers'
import type { ResultMessage } from './-admin-helpers'
import type { StatFields } from '#/db/queries/units'

export interface AddUnitState {
  addUnitArmyId: string
  addUnitName: string
  addUnitType: string
  addUnitStats: StatFields
  addUnitResult: ResultMessage
}

export interface AddUnitActions {
  handleAddUnit: () => void
  setAddUnitArmyId: (v: string) => void
  setAddUnitName: (v: string) => void
  setAddUnitType: (v: string) => void
  setAddUnitStats: (s: StatFields) => void
}

export interface AddUnitApi {
  state: AddUnitState
  actions: AddUnitActions
  isPending: boolean
  error: Error | null
}

export function useAddUnit(queries: AdminQueries): AddUnitApi {
  const [addUnitArmyId, setAddUnitArmyId] = useState('')
  const [addUnitName, setAddUnitName] = useState('')
  const [addUnitType, setAddUnitType] = useState('')
  const [addUnitStats, setAddUnitStats] = useState(createEmptyStats())
  const [addUnitResult, setAddUnitResult] = useState<ResultMessage>(null)

  const addUnitMutation = useMutation({
    mutationFn: async (variables: { armyId: string; name: string; type: string; stats: StatFields }) => {
      const result = await addUnitFn({
        data: {
          armyId: variables.armyId,
          name: variables.name,
          type: variables.type,
          ...variables.stats,
        },
      })
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: (_data, variables) => {
      setAddUnitResult({ success: true, message: `Unité "${variables.name}" ajoutée avec succès` })
      setAddUnitName('')
      setAddUnitType('')
      setAddUnitArmyId('')
      setAddUnitStats(createEmptyStats())
      void queries.queryClient.invalidateQueries({ queryKey: ['admin', 'armies'] })
      void queries.queryClient.invalidateQueries({ queryKey: ['admin', 'army-units', variables.armyId] })
    },
  })

  function handleAddUnit() {
    setAddUnitResult(null)
    addUnitMutation.mutate({ armyId: addUnitArmyId, name: addUnitName, type: addUnitType, stats: addUnitStats })
  }

  return {
    state: {
      addUnitArmyId,
      addUnitName,
      addUnitType,
      addUnitStats,
      addUnitResult,
    },
    actions: {
      handleAddUnit,
      setAddUnitArmyId,
      setAddUnitName,
      setAddUnitType,
      setAddUnitStats,
    },
    isPending: addUnitMutation.isPending,
    error: addUnitMutation.error,
  }
}
