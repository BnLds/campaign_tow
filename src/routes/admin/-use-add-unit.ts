import { useState, useRef } from 'react'
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
  addUnitSubmitting: boolean
}

export interface AddUnitActions {
  handleAddUnit: () => Promise<void>
  setAddUnitArmyId: (v: string) => void
  setAddUnitName: (v: string) => void
  setAddUnitType: (v: string) => void
  setAddUnitStats: (s: StatFields) => void
}

export interface AddUnitApi {
  state: AddUnitState
  actions: AddUnitActions
}

export function useAddUnit(queries: AdminQueries): AddUnitApi {
  const [addUnitArmyId, setAddUnitArmyId] = useState('')
  const [addUnitName, setAddUnitName] = useState('')
  const [addUnitType, setAddUnitType] = useState('')
  const [addUnitStats, setAddUnitStats] = useState(createEmptyStats())
  const [addUnitResult, setAddUnitResult] = useState<ResultMessage>(null)
  const [addUnitSubmitting, setAddUnitSubmitting] = useState(false)
  const addUnitSubmitRef = useRef(false)

  async function handleAddUnit() {
    if (addUnitSubmitRef.current) return
    addUnitSubmitRef.current = true
    setAddUnitResult(null)
    setAddUnitSubmitting(true)
    try {
      const result = await addUnitFn({
        data: {
          armyId: addUnitArmyId,
          name: addUnitName,
          type: addUnitType,
          ...addUnitStats,
        },
      })
      if (result.success) {
        const successArmyId = addUnitArmyId
        setAddUnitResult({ success: true, message: `Unité "${addUnitName}" ajoutée avec succès` })
        setAddUnitName('')
        setAddUnitType('')
        setAddUnitArmyId('')
        setAddUnitStats(createEmptyStats())
        await queries.queryClient.invalidateQueries({ queryKey: ['admin', 'armies'] })
        await queries.queryClient.invalidateQueries({ queryKey: ['admin', 'army-units', successArmyId] })
      } else {
        setAddUnitResult({ success: false, message: result.error.message })
      }
    } catch {
      setAddUnitResult({ success: false, message: 'Erreur — veuillez réessayer' })
    } finally {
      addUnitSubmitRef.current = false
      setAddUnitSubmitting(false)
    }
  }

  return {
    state: {
      addUnitArmyId,
      addUnitName,
      addUnitType,
      addUnitStats,
      addUnitResult,
      addUnitSubmitting,
    },
    actions: {
      handleAddUnit,
      setAddUnitArmyId,
      setAddUnitName,
      setAddUnitType,
      setAddUnitStats,
    },
  }
}
