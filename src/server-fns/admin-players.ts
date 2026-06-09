import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { adminMiddleware } from '../lib/middleware'
import type { ServerResult } from '../lib/types'
import { createPlayerSchema } from '../lib/validators'

export const createPlayerFn = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .validator(createPlayerSchema)
  .handler(async ({ data }): Promise<ServerResult<{ id: string; username: string; inviteToken: string }>> => {
    const { checkUsernameExists, createPlayer } = await import('../db/queries')

    const exists = await checkUsernameExists(data.username)
    if (exists) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: "Ce nom d'utilisateur existe déjà" },
      }
    }

    try {
      const player = await createPlayer(data.username)
      return { success: true, data: player }
    } catch {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: "Ce nom d'utilisateur existe déjà" },
      }
    }
  })

// Story 1.6 — listPlayersFn: GET loader, returns all players (no ServerResult wrapper)
export const listPlayersFn = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .handler(async () => {
    const { getAllPlayers } = await import('../db/queries')
    return getAllPlayers()
  })

// Story 1.6 — deletePlayerFn: POST mutation, returns ServerResult<null>
export const deletePlayerFn = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .validator(z.object({ playerId: z.string().uuid() }))
  .handler(async ({ context, data }): Promise<ServerResult<null>> => {
    if (data.playerId === context.session.playerId) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Impossible de supprimer votre propre compte' } }
    }
    const { deletePlayer } = await import('../db/queries')
    await deletePlayer(data.playerId)
    return { success: true, data: null }
  })

// Invite link server functions — fetch, regenerate, bulk generate

export const getInviteLinkFn = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .validator(z.object({ playerId: z.string().uuid() }))
  .handler(async ({ data }): Promise<ServerResult<{ inviteToken: string | null }>> => {
    const { getPlayerInviteToken } = await import('../db/queries')
    const result = await getPlayerInviteToken(data.playerId)
    if (!result) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Joueur introuvable' } }
    }
    return { success: true, data: { inviteToken: result.inviteToken } }
  })

export const regenerateInviteTokenFn = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .validator(z.object({ playerId: z.string().uuid() }))
  .handler(async ({ context, data }): Promise<ServerResult<{ inviteToken: string }>> => {
    if (data.playerId === context.session.playerId) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Impossible de regénérer votre propre lien' } }
    }
    const { regenerateInviteToken } = await import('../db/queries')
    const newToken = await regenerateInviteToken(data.playerId)
    if (!newToken) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Joueur introuvable' } }
    }
    return { success: true, data: { inviteToken: newToken } }
  })

export const generateAllMissingTokensFn = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .handler(async (): Promise<ServerResult<{ count: number }>> => {
    const { generateAllMissingInviteTokens } = await import('../db/queries')
    const count = await generateAllMissingInviteTokens()
    return { success: true, data: { count } }
  })
