import { useState } from 'react'
import { assignArmyFn } from '#/server-fns/admin-armies'
import type { AdminQueries } from './-use-admin-queries'
import type { ResultMessage } from './-admin-helpers'

export interface ArmyAssignmentState { selectedPlayers: Record<string, string | undefined>; assignResult: ResultMessage; assigningArmyId: string | null }
export interface ArmyAssignmentActions { handleAssign: (armyId: string) => Promise<void>; setSelectedPlayer: (armyId: string, playerId: string) => void }
export interface ArmyAssignmentApi { state: ArmyAssignmentState; actions: ArmyAssignmentActions }

export function useArmyAssignment(queries: AdminQueries): ArmyAssignmentApi {
  const [selectedPlayers, setSelectedPlayers] = useState<Record<string, string | undefined>>({})
  const [assignResult, setAssignResult] = useState<ResultMessage>(null)
  const [assigningArmyId, setAssigningArmyId] = useState<string | null>(null)

  const setSelectedPlayer = (armyId: string, playerId: string) => {
    setSelectedPlayers((prev) => ({ ...prev, [armyId]: playerId }))
  }

  const handleAssign = async (armyId: string) => {
    const playerId = selectedPlayers[armyId]
    if (!playerId) return
    setAssigningArmyId(armyId)
    setAssignResult(null)
    try {
      const result = await assignArmyFn({ data: { armyId, playerId } })
      if (result.success) {
        setAssignResult({ success: true, message: 'Armée assignée avec succès' })
        await queries.queryClient.invalidateQueries({ queryKey: ['admin', 'armies'] })
      } else {
        setAssignResult({ success: false, message: result.error.message })
      }
    } catch {
      setAssignResult({ success: false, message: "Erreur réseau — veuillez réessayer" })
    } finally {
      setAssigningArmyId(null)
    }
  }

  return {
    state: { selectedPlayers, assignResult, assigningArmyId },
    actions: { handleAssign, setSelectedPlayer },
  }
}
