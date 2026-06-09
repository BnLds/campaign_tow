// Campaign TOW — Army mutation server functions

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { armyOwnerMiddleware } from '../lib/middleware'
import { db } from '../db'
import { armies } from '../db/schema'
import type { ServerResult } from '../lib/types'

// ---------------------------------------------------------------------------
// Server function — rename army
// ---------------------------------------------------------------------------

export const updateArmyNameFn = createServerFn({ method: 'POST' })
  .middleware([armyOwnerMiddleware])
  .validator(
    z.object({
      armyId: z.string().uuid(),
      name: z
        .string()
        .trim()
        .min(1, { message: 'Le nom ne peut pas être vide' })
        .max(100, { message: 'Le nom ne peut pas dépasser 100 caractères' }),
    }),
  )
  .handler(async ({ data }): Promise<ServerResult<{ name: string }>> => {
    const [updated] = await db
      .update(armies)
      .set({ name: data.name })
      .where(eq(armies.id, data.armyId))
      .returning({ name: armies.name })

    if (!updated) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Armée introuvable' } }
    }

    return { success: true, data: { name: updated.name } }
  })
