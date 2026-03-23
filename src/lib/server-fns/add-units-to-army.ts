// Campaign TOW — addUnitsToArmyFn
// Incremental unit import: appends new units to an existing army.
// Uses armyOwnerMiddleware for auth + ownership check.
// Receives pre-parsed structured data (no OWB text parsing server-side).

import { createServerFn } from '@tanstack/react-start'
import { armyOwnerMiddleware } from '../middleware'
import { addUnitsToArmySchema } from '../validators'
import type { ServerResult } from '../types'

export const addUnitsToArmyFn = createServerFn({ method: 'POST' })
  .middleware([armyOwnerMiddleware])
  .inputValidator(addUnitsToArmySchema)
  .handler(async ({ data }): Promise<ServerResult<{ unitCount: number }>> => {
    const { db } = await import('../../db')
    const { units, subProfiles } = await import('../../db/schema')

    try {
      const unitCount = await db.transaction(async (tx) => {
        for (const unit of data.units) {
          const [insertedUnit] = await tx
            .insert(units)
            .values({
              armyId: data.armyId,
              name: unit.name,
              type: unit.type,
              points: unit.points,
              modelCount: unit.modelCount,
              specialRules: unit.specialRules,
              options: unit.options,
            })
            .returning({ id: units.id })

          if (unit.subProfiles.length > 0) {
            await tx.insert(subProfiles).values(
              unit.subProfiles.map((sp, idx) => ({
                unitId: insertedUnit.id,
                sortOrder: idx,
                label: sp.label,
                isMount: sp.isMount,
                m: sp.m,
                cc: sp.cc,
                ct: sp.ct,
                f: sp.f,
                e: sp.e,
                pv: sp.pv,
                i: sp.i,
                a: sp.a,
                cd: sp.cd,
              })),
            )
          }
        }

        return data.units.length
      })

      return { success: true, data: { unitCount } }
    } catch (err) {
      console.error('[addUnitsToArmyFn] transaction error', err)
      return {
        success: false,
        error: { code: 'SERVER_ERROR', message: "Erreur serveur lors de l'ajout des unités — veuillez réessayer" },
      }
    }
  })
