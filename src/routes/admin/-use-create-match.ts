import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { createMatchFn, deleteMatchAdminFn } from '#/server-fns/admin-matches'
import type { AdminQueries } from './-use-admin-queries'
import type { ResultMessage } from './-admin-helpers'

const RESULT_OPTIONS: { value: 'victory' | 'defeat' | 'draw' | ''; label: string }[] = [
  { value: '', label: '— Résultat non saisi —' },
  { value: 'victory', label: 'Victoire' },
  { value: 'defeat', label: 'Défaite' },
  { value: 'draw', label: 'Égalité' },
]

export interface CreateMatchState {
  matchArmy1Id: string
  matchResult1: 'victory' | 'defeat' | 'draw' | ''
  matchArmy2Id: string
  matchResult2: 'victory' | 'defeat' | 'draw' | ''
  matchDate: string
  matchTime: string
  matchEvolutions: boolean
  matchResult: ResultMessage
}

export interface CreateMatchDerived {
  today: string
  resultOptions: typeof RESULT_OPTIONS
}

export interface CreateMatchActions {
  handleCreateMatch: () => void
  handleDeleteMatchAdmin: (matchId: string, label: string) => void
  setMatchArmy1Id: (v: string) => void
  setMatchResult1: (v: 'victory' | 'defeat' | 'draw' | '') => void
  setMatchArmy2Id: (v: string) => void
  setMatchResult2: (v: 'victory' | 'defeat' | 'draw' | '') => void
  setMatchDate: (v: string) => void
  setMatchTime: (v: string) => void
  setMatchEvolutions: (v: boolean) => void
}

export interface CreateMatchApi {
  state: CreateMatchState
  derived: CreateMatchDerived
  actions: CreateMatchActions
  createIsPending: boolean
  createError: Error | null
  deleteIsPending: boolean
  deleteError: Error | null
}

export function useCreateMatch(queries: AdminQueries): CreateMatchApi {
  const today = new Date().toISOString().slice(0, 10)
  const [matchArmy1Id, setMatchArmy1Id] = useState('')
  const [matchResult1, setMatchResult1] = useState<'victory' | 'defeat' | 'draw' | ''>('')
  const [matchArmy2Id, setMatchArmy2Id] = useState('')
  const [matchResult2, setMatchResult2] = useState<'victory' | 'defeat' | 'draw' | ''>('')
  const [matchDate, setMatchDate] = useState(today)
  const [matchTime, setMatchTime] = useState(() => {
    const now = new Date()
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  })
  const [matchEvolutions, setMatchEvolutions] = useState(false)
  const [matchResult, setMatchResult] = useState<ResultMessage>(null)

  const createMatchMutation = useMutation({
    mutationFn: async () => {
      const result = await createMatchFn({
        data: {
          army1Id: matchArmy1Id,
          result1: matchResult1 === '' ? null : matchResult1,
          army2Id: matchArmy2Id,
          result2: matchResult2 === '' ? null : matchResult2,
          date: matchDate,
          time: matchTime,
          evolutionsEntered: matchEvolutions,
        },
      })
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: (data) => {
      setMatchResult({ success: true, message: `Partie créée (id: ${data.matchId.slice(0, 8)}…)` })
      setMatchArmy1Id('')
      setMatchResult1('')
      setMatchArmy2Id('')
      setMatchResult2('')
      setMatchDate(today)
      const now = new Date()
      setMatchTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`)
      setMatchEvolutions(false)
      void queries.queryClient.invalidateQueries({ queryKey: ['admin', 'matches'] })
    },
  })

  const deleteMatchMutation = useMutation({
    mutationFn: async (matchId: string) => {
      const result = await deleteMatchAdminFn({ data: { matchId } })
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      void queries.queryClient.invalidateQueries({ queryKey: ['admin', 'matches'] })
    },
  })

  function handleCreateMatch() {
    setMatchResult(null)
    createMatchMutation.mutate()
  }

  function handleDeleteMatchAdmin(matchId: string, label: string) {
    if (!window.confirm(`Supprimer la partie ${label} ? Cette action est irréversible.`)) return
    deleteMatchMutation.mutate(matchId)
  }

  return {
    state: {
      matchArmy1Id,
      matchResult1,
      matchArmy2Id,
      matchResult2,
      matchDate,
      matchTime,
      matchEvolutions,
      matchResult,
    },
    derived: {
      today,
      resultOptions: RESULT_OPTIONS,
    },
    actions: {
      handleCreateMatch,
      handleDeleteMatchAdmin,
      setMatchArmy1Id,
      setMatchResult1,
      setMatchArmy2Id,
      setMatchResult2,
      setMatchDate,
      setMatchTime,
      setMatchEvolutions,
    },
    createIsPending: createMatchMutation.isPending,
    createError: createMatchMutation.error,
    deleteIsPending: deleteMatchMutation.isPending,
    deleteError: deleteMatchMutation.error,
  }
}
