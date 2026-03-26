import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import type { ReactFormExtendedApi } from '@tanstack/react-form'
import { createPlayerSchema } from '#/lib/validators'
import {
  createPlayerFn,
  deletePlayerFn,
  getInviteLinkFn,
  regenerateInviteTokenFn,
  generateAllMissingTokensFn,
} from '#/server-fns/admin-players'
import type { AdminQueries } from './use-admin-queries'

export interface PlayerSectionState {
  createdPlayer: { username: string; inviteToken: string } | null
  serverError: string | null
  deleteError: string | null
  playerTokens: Record<string, string | null>
  copyFeedback: Record<string, boolean>
  regenDialogPlayerId: string | null
  bulkGenerateResult: string | null
}

export interface PlayerSectionActions {
  handleDelete: (playerId: string, username: string) => Promise<void>
  handleCopyInviteLink: (playerId: string) => Promise<void>
  handleRegenConfirm: () => Promise<void>
  handleBulkGenerate: () => Promise<void>
  setRegenDialogPlayerId: (id: string | null) => void
  form: ReactFormExtendedApi<{ username: string }, any, any, any, any, any, any, any, any, any, any, any>
}

export interface PlayerSectionApi {
  state: PlayerSectionState
  actions: PlayerSectionActions
}

export function usePlayerSection(queries: AdminQueries): PlayerSectionApi {
  const [createdPlayer, setCreatedPlayer] = useState<{ username: string; inviteToken: string } | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [playerTokens, setPlayerTokens] = useState<Record<string, string | null>>({})
  const [copyFeedback, setCopyFeedback] = useState<Record<string, boolean>>({})
  const [regenDialogPlayerId, setRegenDialogPlayerId] = useState<string | null>(null)
  const [bulkGenerateResult, setBulkGenerateResult] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { username: '' },
    validators: { onSubmit: createPlayerSchema },
    onSubmit: async ({ value }) => {
      setServerError(null)
      setCreatedPlayer(null)
      const result = await createPlayerFn({ data: value })
      if (result.success) {
        setCreatedPlayer({ username: result.data.username, inviteToken: result.data.inviteToken })
        form.reset()
        await queries.queryClient.invalidateQueries({ queryKey: ['admin', 'players'] })
      } else {
        setServerError(result.error.message)
      }
    },
  })

  const handleDelete = async (playerId: string, username: string): Promise<void> => {
    if (!window.confirm(`Supprimer le compte de ${username} ? Cette action est irréversible.`)) return
    setDeleteError(null)
    const result = await deletePlayerFn({ data: { playerId } })
    if (result.success) {
      setCreatedPlayer(null)
      await queries.queryClient.invalidateQueries({ queryKey: ['admin', 'players'] })
    } else {
      setDeleteError(result.error.message)
    }
  }

  const handleCopyInviteLink = async (playerId: string): Promise<void> => {
    let token = playerTokens[playerId] ?? null
    if (token === null) {
      const result = await getInviteLinkFn({ data: { playerId } })
      if (!result.success) return
      token = result.data.inviteToken
      if (!token) {
        const regenResult = await regenerateInviteTokenFn({ data: { playerId } })
        if (!regenResult.success) return
        token = regenResult.data.inviteToken
      }
      setPlayerTokens((prev) => ({ ...prev, [playerId]: token }))
    }
    if (!token) return
    const url = `${window.location.origin}/invite/${token}`
    await navigator.clipboard.writeText(url)
    setCopyFeedback((prev) => ({ ...prev, [playerId]: true }))
    setTimeout(() => setCopyFeedback((prev) => ({ ...prev, [playerId]: false })), 2000)
  }

  const handleRegenConfirm = async (): Promise<void> => {
    if (!regenDialogPlayerId) return
    const result = await regenerateInviteTokenFn({ data: { playerId: regenDialogPlayerId } })
    if (result.success) {
      setPlayerTokens((prev) => ({ ...prev, [regenDialogPlayerId]: result.data.inviteToken }))
    }
    setRegenDialogPlayerId(null)
  }

  const handleBulkGenerate = async (): Promise<void> => {
    const result = await generateAllMissingTokensFn()
    if (result.success) {
      setBulkGenerateResult(`${result.data.count} lien(s) généré(s)`)
      await queries.queryClient.invalidateQueries({ queryKey: ['admin', 'players'] })
    }
  }

  return {
    state: {
      createdPlayer,
      serverError,
      deleteError,
      playerTokens,
      copyFeedback,
      regenDialogPlayerId,
      bulkGenerateResult,
    },
    actions: {
      handleDelete,
      handleCopyInviteLink,
      handleRegenConfirm,
      handleBulkGenerate,
      setRegenDialogPlayerId,
      form,
    },
  }
}
