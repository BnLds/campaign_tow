// Campaign TOW — playerImportArmyFn
// Self-service army import for logged-in non-guest players with no army.
// Uses authMiddleware (not adminMiddleware) — guest check is explicit in handler.

import { createServerFn } from '@tanstack/react-start'
import { authMiddleware } from '../middleware'
import { importArmySchema } from '../validators'
import type { ServerResult } from '../types'

export const playerImportArmyFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(importArmySchema)
  .handler(async ({ context, data }): Promise<ServerResult<{ armyId: string; armyName: string; faction: string; unitCount: number }>> => {
    // Guard: guests cannot import
    if (context.session.isGuest) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Connexion requise' } }
    }

    const { getPlayerArmy, createArmyWithUnits, assignArmyToPlayer, deleteArmy } = await import('../../db/queries')

    // Guard: player already has an army
    const existingArmy = await getPlayerArmy(context.session.playerId)
    if (existingArmy !== null) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Vous avez deja une armee' } }
    }

    // Parse OWB text
    const { parseOwbExport } = await import('../owb-parser')
    let parsed
    try {
      parsed = parseOwbExport(data.rawText)
    } catch (err) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: err instanceof Error ? err.message : "Erreur lors de l'import",
        },
      }
    }

    // Guard: no units found
    if (parsed.units.length === 0) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Aucune unite trouvee dans le texte importe' },
      }
    }

    // Create army, assign to player, verify ownership (race condition check)
    let armyId: string | undefined
    try {
      const { armyId: createdArmyId, unitCount } = await createArmyWithUnits(parsed)
      armyId = createdArmyId

      await assignArmyToPlayer(armyId, context.session.playerId)

      // Re-check: if race was lost, another army was assigned after ours
      const confirmedArmy = await getPlayerArmy(context.session.playerId)
      if (!confirmedArmy || confirmedArmy.id !== armyId) {
        // Race lost — clean up orphaned army
        try { await deleteArmy(armyId) } catch (cleanupErr) { console.error('[army-import] cleanup failed:', cleanupErr) }
        return { success: false, error: { code: 'CONFLICT', message: 'Vous avez deja une armee' } }
      }

      return {
        success: true,
        data: {
          armyId,
          armyName: parsed.name,
          faction: parsed.faction,
          unitCount,
        },
      }
    } catch (err) {
      // Attempt cleanup on unexpected failure
      if (armyId) {
        try { await deleteArmy(armyId) } catch (cleanupErr) { console.error('[army-import] cleanup failed:', cleanupErr) }
      }
      console.error('[playerImportArmyFn] unexpected error', err)
      return {
        success: false,
        error: { code: 'SERVER_ERROR', message: "Erreur serveur lors de l'enregistrement — veuillez reessayer" },
      }
    }
  })
