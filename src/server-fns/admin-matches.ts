import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { adminMiddleware } from '../lib/middleware'
import type { ServerResult } from '../lib/types'
import { createMatchSchema } from '../lib/validators'

// Story 3.1 — createMatchFn: POST admin tool to create a match with two participants
export const createMatchFn = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .inputValidator(createMatchSchema)
  .handler(async ({ context, data }): Promise<ServerResult<{ matchId: string }>> => {
    if (data.army1Id === data.army2Id) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Les deux armées doivent être différentes' } }
    }
    // Validate result coherence when both are set: (victory,defeat), (defeat,victory), or (draw,draw)
    if (data.result1 !== null && data.result2 !== null) {
      const validPairs: Array<[string, string]> = [['victory', 'defeat'], ['defeat', 'victory'], ['draw', 'draw']]
      if (!validPairs.some(([r1, r2]) => r1 === data.result1 && r2 === data.result2)) {
        return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Résultats incohérents (victoire/victoire ou défaite/défaite non autorisé)' } }
      }
    }
    const { createMatchWithParticipants, getArmyById } = await import('../db/queries')
    const matchDate = new Date(`${data.date}T${data.time}:00Z`)
    if (isNaN(matchDate.getTime())) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Date invalide' } }
    }
    const army1 = await getArmyById(data.army1Id)
    const army2 = await getArmyById(data.army2Id)
    if (!army1 || !army1.playerId) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: "L'armée 1 n'est assignée à aucun joueur" } }
    }
    if (!army2 || !army2.playerId) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: "L'armée 2 n'est assignée à aucun joueur" } }
    }
    const result = await createMatchWithParticipants({
      player1Id: army1.playerId,
      army1Id: data.army1Id,
      result1: data.result1,
      player2Id: army2.playerId,
      army2Id: data.army2Id,
      result2: data.result2,
      matchDate,
      evolutionsEntered: data.evolutionsEntered,
      createdByPlayerId: context.session.playerId,
    })
    return { success: true, data: result }
  })

// Delete pending match — admin (no participant check, same guard as player path)
export const deleteMatchAdminFn = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .inputValidator(z.object({ matchId: z.string().min(1) }))
  .handler(async ({ data }): Promise<ServerResult<null>> => {
    const { deleteMatchWithXpRollback } = await import('../db/queries')
    try {
      const result = await deleteMatchWithXpRollback(data.matchId)
      if (!result.deleted) {
        return { success: false, error: { code: 'FORBIDDEN', message: 'Post-match déjà complété' } }
      }
      return { success: true, data: null }
    } catch {
      return { success: false, error: { code: 'SERVER_ERROR', message: 'Erreur serveur lors de la suppression' } }
    }
  })

// List all matches for admin — ordered by date desc
export const listMatchesFn = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .handler(async () => {
    const { getAllMatchesForAdmin } = await import('../db/queries')
    return getAllMatchesForAdmin()
  })
