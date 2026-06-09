import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { adminMiddleware } from '../lib/middleware'
import type { ServerResult } from '../lib/types'
import { importArmySchema, assignArmySchema, addUnitSchema, updateSubProfileSchema } from '../lib/validators'

// Story 2.1 — importArmyFn: POST, parses OWB text and inserts army + units + sub_profiles
export const importArmyFn = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .validator(importArmySchema)
  .handler(async ({ data }): Promise<ServerResult<{ armyId: string; armyName: string; unitCount: number }>> => {
    const { parseOwbExport } = await import('../lib/owb-parser')
    const { createArmyWithUnits } = await import('../db/queries')

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

    try {
      const { armyId, unitCount } = await createArmyWithUnits(parsed)
      return { success: true, data: { armyId, armyName: parsed.name, unitCount } }
    } catch {
      return {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: "Erreur serveur lors de l'enregistrement — veuillez réessayer",
        },
      }
    }
  })

// Story 2.1 — listArmiesFn: GET, returns all armies with player info
export const listArmiesFn = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .handler(async () => {
    const { getAllArmies } = await import('../db/queries')
    return getAllArmies()
  })

// Story 2.1 — assignArmyFn: POST, assigns a player to an army
export const assignArmyFn = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .validator(assignArmySchema)
  .handler(async ({ data }): Promise<ServerResult<null>> => {
    const { assignArmyToPlayer } = await import('../db/queries')
    try {
      const assigned = await assignArmyToPlayer(data.armyId, data.playerId)
      if (!assigned) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Armée introuvable' } }
      }
      return { success: true, data: null }
    } catch {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: "Erreur lors de l'assignation — joueur invalide" } }
    }
  })

// Story 2.2 — addUnitFn: POST, manually adds a unit + sub_profile to an army
export const addUnitFn = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .validator(addUnitSchema)
  .handler(async ({ data }): Promise<ServerResult<{ unitId: string; subProfileId: string }>> => {
    const { insertUnit } = await import('../db/queries')
    try {
      const result = await insertUnit(data.armyId, data.name, data.type, {
        m: data.m,
        cc: data.cc,
        ct: data.ct,
        f: data.f,
        e: data.e,
        pv: data.pv,
        i: data.i,
        a: data.a,
        cd: data.cd,
      })
      return { success: true, data: result }
    } catch (err) {
      // FK violation — armyId does not exist (PostgreSQL error code 23503)
      const pgCode = (err as { code?: string }).code
      if (pgCode === '23503') {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Armée introuvable' } }
      }
      return { success: false, error: { code: 'SERVER_ERROR', message: 'Erreur serveur — veuillez réessayer' } }
    }
  })

// Story 2.2 — updateSubProfileFn: POST, updates stat fields on a sub_profile row
export const updateSubProfileFn = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .validator(updateSubProfileSchema)
  .handler(async ({ data }): Promise<ServerResult<null>> => {
    const { updateSubProfileStats } = await import('../db/queries')
    try {
      const updated = await updateSubProfileStats(data.subProfileId, {
        m: data.m,
        cc: data.cc,
        ct: data.ct,
        f: data.f,
        e: data.e,
        pv: data.pv,
        i: data.i,
        a: data.a,
        cd: data.cd,
      })
      if (!updated) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Sous-profil introuvable' } }
      }
      return { success: true, data: null }
    } catch {
      return { success: false, error: { code: 'SERVER_ERROR', message: 'Erreur serveur — veuillez réessayer' } }
    }
  })

// Story 2.2 — getArmyUnitsFn: GET, returns units + sub_profiles for a given army
export const getArmyUnitsFn = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .validator(z.object({ armyId: z.string() }))
  .handler(async ({ data }) => {
    const { getUnitsForArmy } = await import('../db/queries')
    return getUnitsForArmy(data.armyId)
  })
