// Campaign TOW — Unit mutation server functions
// Extracted from src/routes/armies/$armyId.tsx

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { armyOwnerMiddleware } from '../lib/middleware'
import {
  assertUnitBelongsToArmy,
  assertModifierBelongsToArmy,
  assertGainBelongsToArmy,
  assertSubProfileBelongsToArmy,
} from './guards'
import type { ServerResult } from '../lib/types'
import { calculateTier } from '../lib/tier'
import type { TierLevel } from '../lib/tier'
import { resolveHonourType } from '../lib/format'

// ---------------------------------------------------------------------------
// Valid stats constant
// ---------------------------------------------------------------------------

export const VALID_STATS = ['m', 'cc', 'ct', 'f', 'e', 'pv', 'i', 'a', 'cd'] as const

// ---------------------------------------------------------------------------
// Server function — add stat modifier
// ---------------------------------------------------------------------------

export const addStatModifierFn = createServerFn({ method: 'POST' })
  .middleware([armyOwnerMiddleware])
  .validator(
    z.object({
      armyId: z.string().uuid(),
      unitId: z.string().uuid(),
      stat: z.enum(VALID_STATS),
      delta: z.number().int().refine((v) => v !== 0, {
        message: 'Le delta doit être un entier non nul',
      }),
      source: z.string().trim().min(1, { message: 'La source ne peut pas être vide' }).max(200),
      temporary: z.boolean(),
    }),
  )
  .handler(async ({ data }): Promise<ServerResult<{ id: string }>> => {
    const guard = await assertUnitBelongsToArmy(data.unitId, data.armyId)
    if (!guard.ok) return guard.result
    const { insertStatModifier } = await import('../db/queries')
    const row = await insertStatModifier(data.unitId, data.stat, data.delta, data.source, data.temporary)
    return { success: true as const, data: { id: row.id } }
  })

// ---------------------------------------------------------------------------
// Server function — remove stat modifier
// ---------------------------------------------------------------------------

export const removeStatModifierFn = createServerFn({ method: 'POST' })
  .middleware([armyOwnerMiddleware])
  .validator(z.object({ armyId: z.string().uuid(), modifierId: z.string().uuid() }))
  .handler(async ({ data }): Promise<ServerResult<null>> => {
    const guard = await assertModifierBelongsToArmy(data.modifierId, data.armyId)
    if (!guard.ok) return guard.result
    const { deleteStatModifier } = await import('../db/queries')
    const deleted = await deleteStatModifier(data.modifierId)
    if (!deleted) {
      return { success: false as const, error: { code: 'NOT_FOUND', message: 'Modificateur introuvable' } }
    }
    return { success: true as const, data: null }
  })

// ---------------------------------------------------------------------------
// Server function — add unit gain
// ---------------------------------------------------------------------------

export const addUnitGainFn = createServerFn({ method: 'POST' })
  .middleware([armyOwnerMiddleware])
  .validator(
    z.object({
      armyId: z.string().uuid(),
      unitId: z.string().uuid(),
      description: z.string().trim().min(1, { message: 'La description ne peut pas être vide' }).max(200),
    }),
  )
  .handler(async ({ data }): Promise<ServerResult<{ id: string }>> => {
    const guard = await assertUnitBelongsToArmy(data.unitId, data.armyId)
    if (!guard.ok) return guard.result
    const { insertUnitGain } = await import('../db/queries')
    const row = await insertUnitGain(data.unitId, data.description, resolveHonourType(data.description))
    return { success: true as const, data: { id: row.id } }
  })

// ---------------------------------------------------------------------------
// Server function — remove unit gain
// ---------------------------------------------------------------------------

export const removeUnitGainFn = createServerFn({ method: 'POST' })
  .middleware([armyOwnerMiddleware])
  .validator(z.object({ armyId: z.string().uuid(), gainId: z.string().uuid() }))
  .handler(async ({ data }): Promise<ServerResult<null>> => {
    const guard = await assertGainBelongsToArmy(data.gainId, data.armyId)
    if (!guard.ok) return guard.result
    const { deleteUnitGain } = await import('../db/queries')
    const deleted = await deleteUnitGain(data.gainId)
    if (!deleted) {
      return { success: false as const, error: { code: 'NOT_FOUND', message: 'Capacité introuvable' } }
    }
    return { success: true as const, data: null }
  })

// ---------------------------------------------------------------------------
// Server function — toggle sub-profile mount flag
// ---------------------------------------------------------------------------

export const toggleMountFn = createServerFn({ method: 'POST' })
  .middleware([armyOwnerMiddleware])
  .validator(z.object({ armyId: z.string().uuid(), subProfileId: z.string().uuid(), isMount: z.boolean() }))
  .handler(async ({ data }): Promise<ServerResult<null>> => {
    const guard = await assertSubProfileBelongsToArmy(data.subProfileId, data.armyId)
    if (!guard.ok) return guard.result
    const { updateSubProfileIsMount } = await import('../db/queries')
    await updateSubProfileIsMount(data.subProfileId, data.isMount)
    return { success: true as const, data: null }
  })

// ---------------------------------------------------------------------------
// Server function — update unit XP
// ---------------------------------------------------------------------------

export const updateXpFn = createServerFn({ method: 'POST' })
  .middleware([armyOwnerMiddleware])
  .validator(
    z.object({
      armyId: z.string().uuid(),
      unitId: z.string().uuid(),
      xp: z.number().int().min(0, { message: 'XP doit être >= 0' }),
    }),
  )
  .handler(async ({ data }): Promise<ServerResult<{ xp: number; tier: TierLevel }>> => {
    const guard = await assertUnitBelongsToArmy(data.unitId, data.armyId)
    if (!guard.ok) return guard.result
    const { updateUnitXp } = await import('../db/queries')
    await updateUnitXp(data.unitId, data.xp)
    const tier = calculateTier(data.xp, guard.data.type)
    return { success: true as const, data: { xp: data.xp, tier } }
  })

// ---------------------------------------------------------------------------
// Server function — update unit points
// ---------------------------------------------------------------------------

export const updatePointsFn = createServerFn({ method: 'POST' })
  .middleware([armyOwnerMiddleware])
  .validator(
    z.object({
      armyId: z.string().uuid(),
      unitId: z.string().uuid(),
      points: z
        .number()
        .int()
        .min(0, { message: 'Le coût doit être >= 0' })
        .max(99999, { message: 'Le coût ne peut pas dépasser 99999' })
        .nullable(),
    }),
  )
  .handler(async ({ data }): Promise<ServerResult<null>> => {
    const guard = await assertUnitBelongsToArmy(data.unitId, data.armyId)
    if (!guard.ok) return guard.result
    if (guard.data.status !== 'active') {
      return {
        success: false as const,
        error: { code: 'BAD_REQUEST', message: 'Impossible de modifier une unité au cimetière' },
      }
    }
    const { updateUnitPoints } = await import('../db/queries')
    const updated = await updateUnitPoints(data.unitId, data.points)
    if (!updated) {
      return { success: false as const, error: { code: 'NOT_FOUND', message: "Cette unité n'existe plus" } }
    }
    return { success: true as const, data: null }
  })

// ---------------------------------------------------------------------------
// Server function — update unit nickname
// ---------------------------------------------------------------------------

export const updateNicknameFn = createServerFn({ method: 'POST' })
  .middleware([armyOwnerMiddleware])
  .validator(
    z.object({
      armyId: z.string().uuid(),
      unitId: z.string().uuid(),
      nickname: z.string().trim().max(80).nullable(),
    }),
  )
  .handler(async ({ data }): Promise<ServerResult<null>> => {
    const guard = await assertUnitBelongsToArmy(data.unitId, data.armyId)
    if (!guard.ok) return guard.result
    if (guard.data.status !== 'active') {
      return {
        success: false as const,
        error: { code: 'BAD_REQUEST', message: 'Impossible de modifier une unité au cimetière' },
      }
    }
    // Zod .trim() may produce "" for whitespace-only input; normalize to null
    const nickname = data.nickname === '' ? null : data.nickname
    const { updateUnitNickname } = await import('../db/queries')
    await updateUnitNickname(data.unitId, nickname)
    return { success: true as const, data: null }
  })

// ---------------------------------------------------------------------------
// Server function — send unit to graveyard
// ---------------------------------------------------------------------------

export const sendToGraveyardFn = createServerFn({ method: 'POST' })
  .middleware([armyOwnerMiddleware])
  .validator(
    z.object({
      armyId: z.string().uuid(),
      unitId: z.string().uuid(),
      reason: z.string().trim().min(1, { message: 'La raison ne peut pas être vide' }).max(200),
    }),
  )
  .handler(async ({ data }): Promise<ServerResult<null>> => {
    const guard = await assertUnitBelongsToArmy(data.unitId, data.armyId)
    if (!guard.ok) return guard.result
    if (guard.data.status !== 'active') {
      return {
        success: false as const,
        error: { code: 'BAD_REQUEST', message: "Cette unité n'est pas active" },
      }
    }
    const { sendUnitToGraveyard, hasInProgressPostMatch } = await import('../db/queries')
    const inProgress = await hasInProgressPostMatch(data.unitId)
    if (inProgress) {
      return {
        success: false as const,
        error: { code: 'POST_MATCH_IN_PROGRESS', message: 'Cette unité est dans un flux post-match en cours.' },
      }
    }
    const updated = await sendUnitToGraveyard(data.unitId, data.reason)
    if (updated.length === 0) {
      return {
        success: false as const,
        error: { code: 'NOT_FOUND', message: 'Unité introuvable ou déjà modifiée' },
      }
    }
    return { success: true as const, data: null }
  })

// ---------------------------------------------------------------------------
// Server function — permanently delete unit
// ---------------------------------------------------------------------------

export const deleteUnitFn = createServerFn({ method: 'POST' })
  .middleware([armyOwnerMiddleware])
  .validator(z.object({ armyId: z.string().uuid(), unitId: z.string().uuid() }))
  .handler(async ({ data }): Promise<ServerResult<null>> => {
    const guard = await assertUnitBelongsToArmy(data.unitId, data.armyId)
    if (!guard.ok) return guard.result
    const { deleteUnitPermanently, hasInProgressPostMatch } = await import('../db/queries')
    const inProgress = await hasInProgressPostMatch(data.unitId)
    if (inProgress) {
      return {
        success: false as const,
        error: { code: 'POST_MATCH_IN_PROGRESS', message: 'Cette unité est dans un flux post-match en cours.' },
      }
    }
    const deleted = await deleteUnitPermanently(data.unitId)
    if (deleted.length === 0) {
      return {
        success: false as const,
        error: { code: 'NOT_FOUND', message: 'Unité introuvable ou déjà supprimée' },
      }
    }
    return { success: true as const, data: null }
  })

// ---------------------------------------------------------------------------
// Server function — restore unit from graveyard
// ---------------------------------------------------------------------------

export const restoreUnitFn = createServerFn({ method: 'POST' })
  .middleware([armyOwnerMiddleware])
  .validator(z.object({ armyId: z.string().uuid(), unitId: z.string().uuid() }))
  .handler(async ({ data }): Promise<ServerResult<null>> => {
    const guard = await assertUnitBelongsToArmy(data.unitId, data.armyId)
    if (!guard.ok) return guard.result
    if (guard.data.status !== 'graveyard') {
      return {
        success: false as const,
        error: { code: 'BAD_REQUEST', message: "Cette unité n'est pas au cimetière" },
      }
    }
    const { restoreUnitFromGraveyard } = await import('../db/queries')
    const updated = await restoreUnitFromGraveyard(data.unitId)
    if (updated.length === 0) {
      return {
        success: false as const,
        error: { code: 'NOT_FOUND', message: 'Unité introuvable ou déjà modifiée' },
      }
    }
    return { success: true as const, data: null }
  })
