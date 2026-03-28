import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import type { ReactFormExtendedApi } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'
import { createPlayerSchema } from '#/lib/validators'
import {
  createPlayerFn,
  deletePlayerFn,
  getInviteLinkFn,
  regenerateInviteTokenFn,
  generateAllMissingTokensFn,
} from '#/server-fns/admin-players'
import type { AdminQueries } from './-use-admin-queries'

export interface PlayerSectionState {
  createdPlayer: { username: string; inviteToken: string } | null
  serverError: string | null
  playerTokens: Record<string, string | null>
  copyFeedback: Record<string, boolean>
  regenDialogPlayerId: string | null
  bulkGenerateResult: string | null
  deleteError: string | null | undefined
  copyLinkError: string | null | undefined
  regenError: string | null | undefined
  bulkGenerateError: string | null | undefined
  isDeletePending: boolean
  isCopyLinkPending: boolean
  isRegenPending: boolean
  isBulkGeneratePending: boolean
}

export interface PlayerSectionActions {
  handleDelete: (playerId: string, username: string) => void
  handleCopyInviteLink: (playerId: string) => void
  handleRegenConfirm: () => void
  handleBulkGenerate: () => void
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

  const deleteMutation = useMutation({
    mutationFn: async (playerId: string) => {
      const result = await deletePlayerFn({ data: { playerId } })
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: async () => {
      setCreatedPlayer(null)
      await queries.queryClient.invalidateQueries({ queryKey: ['admin', 'players'] })
    },
  })

  const copyLinkMutation = useMutation({
    mutationFn: async (playerId: string) => {
      const result = await getInviteLinkFn({ data: { playerId } })
      if (!result.success) throw new Error(result.error.message)
      let token = result.data.inviteToken
      if (!token) {
        const fallback = await regenerateInviteTokenFn({ data: { playerId } })
        if (!fallback.success) throw new Error(fallback.error.message)
        token = fallback.data.inviteToken
      }
      return { playerId, token }
    },
    onSuccess: async ({ playerId, token }) => {
      setPlayerTokens((prev) => ({ ...prev, [playerId]: token }))
      const url = `${window.location.origin}/invite/${token}`
      await navigator.clipboard.writeText(url)
      setCopyFeedback((prev) => ({ ...prev, [playerId]: true }))
      setTimeout(() => setCopyFeedback((prev) => ({ ...prev, [playerId]: false })), 2000)
    },
  })

  const regenMutation = useMutation({
    mutationFn: async (playerId: string) => {
      const result = await regenerateInviteTokenFn({ data: { playerId } })
      if (!result.success) throw new Error(result.error.message)
      return { playerId, token: result.data.inviteToken }
    },
    onSuccess: ({ playerId, token }) => {
      setPlayerTokens((prev) => ({ ...prev, [playerId]: token }))
      setRegenDialogPlayerId(null)
    },
  })

  const bulkMutation = useMutation({
    mutationFn: async () => {
      const result = await generateAllMissingTokensFn()
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: async (data) => {
      setBulkGenerateResult(`${data.count} lien(s) généré(s)`)
      await queries.queryClient.invalidateQueries({ queryKey: ['admin', 'players'] })
    },
  })

  const handleDelete = (playerId: string, username: string): void => {
    if (!window.confirm(`Supprimer le compte de ${username} ? Cette action est irréversible.`)) return
    deleteMutation.mutate(playerId)
  }

  const handleCopyInviteLink = (playerId: string): void => {
    const cached = playerTokens[playerId]
    if (cached) {
      const url = `${window.location.origin}/invite/${cached}`
      void navigator.clipboard.writeText(url).then(() => {
        setCopyFeedback((prev) => ({ ...prev, [playerId]: true }))
        setTimeout(() => setCopyFeedback((prev) => ({ ...prev, [playerId]: false })), 2000)
      })
      return
    }
    copyLinkMutation.mutate(playerId)
  }

  const handleRegenConfirm = (): void => {
    if (!regenDialogPlayerId) return
    regenMutation.mutate(regenDialogPlayerId)
  }

  const handleBulkGenerate = (): void => {
    bulkMutation.mutate()
  }

  return {
    state: {
      createdPlayer,
      serverError,
      playerTokens,
      copyFeedback,
      regenDialogPlayerId,
      bulkGenerateResult,
      deleteError: deleteMutation.error?.message,
      copyLinkError: copyLinkMutation.error?.message,
      regenError: regenMutation.error?.message,
      bulkGenerateError: bulkMutation.error?.message,
      isDeletePending: deleteMutation.isPending,
      isCopyLinkPending: copyLinkMutation.isPending,
      isRegenPending: regenMutation.isPending,
      isBulkGeneratePending: bulkMutation.isPending,
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
