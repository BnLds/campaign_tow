import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { assignArmyFn } from '#/server-fns/admin-armies'
import type { AdminQueries } from './-use-admin-queries'
import type { ResultMessage } from './-admin-helpers'

export interface ArmyAssignmentState { selectedPlayers: Record<string, string | undefined>; assignResult: ResultMessage }
export interface ArmyAssignmentActions { handleAssign: (armyId: string) => void; setSelectedPlayer: (armyId: string, playerId: string) => void }
export interface ArmyAssignmentApi { state: ArmyAssignmentState; actions: ArmyAssignmentActions; isPending: boolean; error: Error | null }

export function useArmyAssignment(queries: AdminQueries): ArmyAssignmentApi {
  const [selectedPlayers, setSelectedPlayers] = useState<Record<string, string | undefined>>({})
  const [assignResult, setAssignResult] = useState<ResultMessage>(null)

  const mutation = useMutation({
    mutationFn: async ({ armyId, playerId }: { armyId: string; playerId: string }) => {
      const result = await assignArmyFn({ data: { armyId, playerId } })
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: async () => {
      setAssignResult({ success: true, message: 'Armée assignée avec succès' })
      await queries.queryClient.invalidateQueries({ queryKey: ['admin', 'armies'] })
    },
  })

  const setSelectedPlayer = (armyId: string, playerId: string) => {
    setSelectedPlayers((prev) => ({ ...prev, [armyId]: playerId }))
  }

  const handleAssign = (armyId: string) => {
    const playerId = selectedPlayers[armyId]
    if (!playerId) return
    setAssignResult(null)
    // Disable ALL assign buttons while any mutation is pending — simpler than per-row tracking
    // and prevents race conditions from concurrent assignments.
    mutation.mutate({ armyId, playerId })
  }

  return {
    state: { selectedPlayers, assignResult },
    actions: { handleAssign, setSelectedPlayer },
    isPending: mutation.isPending,
    error: mutation.error,
  }
}
