// Campaign TOW — /armies/$armyId route
// Public consultation: all authenticated users (including guests) can view any army.

import { createFileRoute, notFound, Link, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { useEffect, useState } from 'react'
import { useHydrated } from '../../lib/useHydrated'
import { authMiddleware, armyOwnerMiddleware } from '../../lib/middleware'
import { UnitCard } from '../../components/unit-card'
import { AddUnitsSheet } from '../../components/add-units-sheet'
import { UnitEditPanel } from '../../components/unit-edit-panel'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../components/ui/alert-dialog'
import { Button } from '../../components/ui/button'
import { composeUnitView } from '../../lib/delta-composer'
import { calculateTier } from '../../lib/tier'
import type { TierLevel } from '../../lib/tier'
import type { ComposedUnitView } from '../../lib/delta-composer'

// ---------------------------------------------------------------------------
// Server function — load army with units and deltas
// ---------------------------------------------------------------------------

const loadArmyFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .inputValidator(z.object({ armyId: z.string() }))
  .handler(async ({ data, context }) => {
    const { getArmyWithUnits, getUnitDeltas, getGraveyardUnits } = await import('../../db/queries')

    const army = await getArmyWithUnits(data.armyId)
    if (!army) {
      throw notFound()
    }

    const unitIds = army.units.map((u) => u.id)
    const [{ statModifiers: allMods, unitGains: allGains }, graveyardUnits] = await Promise.all([
      getUnitDeltas(unitIds),
      getGraveyardUnits(data.armyId),
    ])

    // For each unit, group modifiers/gains and compose view
    const unitCards = army.units.map((unit) => {
      const unitMods = allMods.filter((m) => m.unitId === unit.id)
      const unitGainsList = allGains.filter((g) => g.unitId === unit.id)
      const composedView = composeUnitView(unit.subProfiles, unitMods, unitGainsList)
      const tier = calculateTier(unit.xp, unit.type)

      return {
        unit: { id: unit.id, name: unit.name, nickname: unit.nickname, type: unit.type, xp: unit.xp, points: unit.points },
        composedView,
        tier,
        subProfiles: unit.subProfiles.map((sp) => ({
          id: sp.id,
          label: sp.label,
          isMount: sp.isMount,
          sortOrder: sp.sortOrder,
        })),
      }
    })

    const session = context.session
    const isOwner =
      !session.isGuest &&
      (session.isAdmin || army.playerId === session.playerId)

    return {
      army: {
        id: army.id,
        name: army.name,
        faction: army.faction,
        player: army.player,
      },
      unitCards,
      graveyardUnits,
      isOwner,
      isAdmin: session.isAdmin,
    }
  })

// ---------------------------------------------------------------------------
// Server function — fetch unit deltas (for edit panel)
// ---------------------------------------------------------------------------

const fetchUnitDeltasFn = createServerFn({ method: 'GET' })
  .middleware([armyOwnerMiddleware])
  .inputValidator(z.object({ armyId: z.string(), unitId: z.string() }))
  .handler(async ({ data }) => {
    const { getUnitById, getStatModifiers, getUnitGains } = await import('../../db/queries')
    const unit = await getUnitById(data.unitId)
    if (!unit || unit.armyId !== data.armyId) {
      return { statModifiers: [], unitGains: [] }
    }
    const [statModifiers, unitGains] = await Promise.all([
      getStatModifiers(data.unitId),
      getUnitGains(data.unitId),
    ])
    return { statModifiers, unitGains }
  })

// ---------------------------------------------------------------------------
// Server function — add stat modifier
// ---------------------------------------------------------------------------

const VALID_STATS = ['m', 'cc', 'ct', 'f', 'e', 'pv', 'i', 'a', 'cd'] as const

const addStatModifierFn = createServerFn({ method: 'POST' })
  .middleware([armyOwnerMiddleware])
  .inputValidator(
    z.object({
      armyId: z.string(),
      unitId: z.string(),
      stat: z.enum(VALID_STATS),
      delta: z.number().int().refine((v) => v !== 0, {
        message: 'Le delta doit être un entier non nul',
      }),
      source: z.string().trim().min(1, { message: 'La source ne peut pas être vide' }).max(200),
      temporary: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    const { getUnitById, insertStatModifier } = await import('../../db/queries')
    const unit = await getUnitById(data.unitId)
    if (!unit || unit.armyId !== data.armyId) {
      return {
        success: false as const,
        error: { code: 'BAD_REQUEST', message: "Cette unité n'appartient pas à cette armée" },
      }
    }
    const row = await insertStatModifier(data.unitId, data.stat, data.delta, data.source, data.temporary)
    return { success: true as const, data: { id: row.id } }
  })

// ---------------------------------------------------------------------------
// Server function — remove stat modifier
// ---------------------------------------------------------------------------

const removeStatModifierFn = createServerFn({ method: 'POST' })
  .middleware([armyOwnerMiddleware])
  .inputValidator(z.object({ armyId: z.string(), modifierId: z.string() }))
  .handler(async ({ data }) => {
    const { getStatModifierById, getUnitById, deleteStatModifier } = await import('../../db/queries')
    const modifier = await getStatModifierById(data.modifierId)
    if (!modifier) {
      return {
        success: false as const,
        error: { code: 'NOT_FOUND', message: 'Modificateur introuvable' },
      }
    }
    const unit = await getUnitById(modifier.unitId)
    if (!unit || unit.armyId !== data.armyId) {
      return {
        success: false as const,
        error: { code: 'FORBIDDEN', message: "Ce modificateur n'appartient pas à cette armée" },
      }
    }
    const deleted = await deleteStatModifier(data.modifierId)
    if (!deleted) {
      return { success: false as const, error: { code: 'NOT_FOUND', message: 'Modificateur introuvable' } }
    }
    return { success: true as const, data: null }
  })

// ---------------------------------------------------------------------------
// Server function — add unit gain
// ---------------------------------------------------------------------------

const addUnitGainFn = createServerFn({ method: 'POST' })
  .middleware([armyOwnerMiddleware])
  .inputValidator(
    z.object({
      armyId: z.string(),
      unitId: z.string(),
      description: z.string().trim().min(1, { message: 'La description ne peut pas être vide' }).max(200),
    }),
  )
  .handler(async ({ data }) => {
    const { getUnitById, insertUnitGain } = await import('../../db/queries')
    const unit = await getUnitById(data.unitId)
    if (!unit || unit.armyId !== data.armyId) {
      return {
        success: false as const,
        error: { code: 'BAD_REQUEST', message: "Cette unité n'appartient pas à cette armée" },
      }
    }
    const row = await insertUnitGain(data.unitId, data.description, 'tier_up')
    return { success: true as const, data: { id: row.id } }
  })

// ---------------------------------------------------------------------------
// Server function — remove unit gain
// ---------------------------------------------------------------------------

const removeUnitGainFn = createServerFn({ method: 'POST' })
  .middleware([armyOwnerMiddleware])
  .inputValidator(z.object({ armyId: z.string(), gainId: z.string() }))
  .handler(async ({ data }) => {
    const { getUnitGainById, getUnitById, deleteUnitGain } = await import('../../db/queries')
    const gain = await getUnitGainById(data.gainId)
    if (!gain) {
      return {
        success: false as const,
        error: { code: 'NOT_FOUND', message: 'Capacité introuvable' },
      }
    }
    const unit = await getUnitById(gain.unitId)
    if (!unit || unit.armyId !== data.armyId) {
      return {
        success: false as const,
        error: { code: 'FORBIDDEN', message: "Cette capacité n'appartient pas à cette armée" },
      }
    }
    const deleted = await deleteUnitGain(data.gainId)
    if (!deleted) {
      return { success: false as const, error: { code: 'NOT_FOUND', message: 'Capacité introuvable' } }
    }
    return { success: true as const, data: null }
  })

// ---------------------------------------------------------------------------
// Server function — toggle sub-profile mount flag
// ---------------------------------------------------------------------------

const toggleMountFn = createServerFn({ method: 'POST' })
  .middleware([armyOwnerMiddleware])
  .inputValidator(z.object({ armyId: z.string(), subProfileId: z.string(), isMount: z.boolean() }))
  .handler(async ({ data }) => {
    const { getSubProfileById, getUnitById, updateSubProfileIsMount } = await import('../../db/queries')
    const sp = await getSubProfileById(data.subProfileId)
    if (!sp) {
      return { success: false as const, error: { code: 'NOT_FOUND', message: 'Sous-profil introuvable' } }
    }
    const unit = await getUnitById(sp.unitId)
    if (!unit || unit.armyId !== data.armyId) {
      return { success: false as const, error: { code: 'FORBIDDEN', message: "Ce sous-profil n'appartient pas à cette armée" } }
    }
    await updateSubProfileIsMount(data.subProfileId, data.isMount)
    return { success: true as const, data: null }
  })

// ---------------------------------------------------------------------------
// Server function — update unit XP
// ---------------------------------------------------------------------------

const updateXpFn = createServerFn({ method: 'POST' })
  .middleware([armyOwnerMiddleware])
  .inputValidator(
    z.object({
      armyId: z.string(),
      unitId: z.string(),
      xp: z.number().int().min(0, { message: 'XP doit être >= 0' }),
    }),
  )
  .handler(async ({ data }) => {
    const { getUnitById, updateUnitXp } = await import('../../db/queries')
    const unit = await getUnitById(data.unitId)
    if (!unit || unit.armyId !== data.armyId) {
      return {
        success: false as const,
        error: { code: 'BAD_REQUEST', message: "Cette unité n'appartient pas à cette armée" },
      }
    }
    await updateUnitXp(data.unitId, data.xp)
    const tier = calculateTier(data.xp, unit.type)
    return { success: true as const, data: { xp: data.xp, tier } }
  })

// ---------------------------------------------------------------------------
// Server function — update unit points
// ---------------------------------------------------------------------------

const updatePointsFn = createServerFn({ method: 'POST' })
  .middleware([armyOwnerMiddleware])
  .inputValidator(
    z.object({
      armyId: z.string(),
      unitId: z.string(),
      points: z.number().int().min(0, { message: 'Le coût doit être >= 0' }).max(99999, { message: 'Le coût ne peut pas dépasser 99999' }).nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const { getUnitById, updateUnitPoints } = await import('../../db/queries')
    const unit = await getUnitById(data.unitId)
    if (!unit || unit.armyId !== data.armyId) {
      return {
        success: false as const,
        error: { code: 'BAD_REQUEST', message: "Cette unité n'appartient pas à cette armée" },
      }
    }
    if (unit.status !== 'active') {
      return {
        success: false as const,
        error: { code: 'BAD_REQUEST', message: 'Impossible de modifier une unité au cimetière' },
      }
    }
    const updated = await updateUnitPoints(data.unitId, data.points)
    if (!updated) {
      return {
        success: false as const,
        error: { code: 'NOT_FOUND', message: "Cette unité n'existe plus" },
      }
    }
    return { success: true as const }
  })

// ---------------------------------------------------------------------------
// Server function — update unit nickname
// ---------------------------------------------------------------------------

const updateNicknameFn = createServerFn({ method: 'POST' })
  .middleware([armyOwnerMiddleware])
  .inputValidator(
    z.object({
      armyId: z.string(),
      unitId: z.string(),
      nickname: z.string().trim().max(80).nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const { getUnitById, updateUnitNickname } = await import('../../db/queries')
    const unit = await getUnitById(data.unitId)
    if (!unit || unit.armyId !== data.armyId) {
      return {
        success: false as const,
        error: { code: 'BAD_REQUEST', message: "Cette unité n'appartient pas à cette armée" },
      }
    }
    if (unit.status !== 'active') {
      return {
        success: false as const,
        error: { code: 'BAD_REQUEST', message: 'Impossible de modifier une unité au cimetière' },
      }
    }
    // Zod .trim() may produce "" for whitespace-only input; normalize to null
    const nickname = data.nickname === '' ? null : data.nickname
    await updateUnitNickname(data.unitId, nickname)
    return { success: true as const }
  })

// ---------------------------------------------------------------------------
// Server function — send unit to graveyard
// ---------------------------------------------------------------------------

const sendToGraveyardFn = createServerFn({ method: 'POST' })
  .middleware([armyOwnerMiddleware])
  .inputValidator(
    z.object({
      armyId: z.string(),
      unitId: z.string(),
      reason: z.string().trim().min(1, { message: 'La raison ne peut pas être vide' }).max(200),
    }),
  )
  .handler(async ({ data }) => {
    const { getUnitById, sendUnitToGraveyard, hasInProgressPostMatch } = await import('../../db/queries')
    const unit = await getUnitById(data.unitId)
    if (!unit || unit.armyId !== data.armyId) {
      return {
        success: false as const,
        error: { code: 'FORBIDDEN', message: "Cette unité n'appartient pas à cette armée" },
      }
    }
    if (unit.status !== 'active') {
      return {
        success: false as const,
        error: { code: 'BAD_REQUEST', message: "Cette unité n'est pas active" },
      }
    }
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
    return { success: true as const }
  })

// ---------------------------------------------------------------------------
// Server function — permanently delete unit
// ---------------------------------------------------------------------------

const deleteUnitFn = createServerFn({ method: 'POST' })
  .middleware([armyOwnerMiddleware])
  .inputValidator(z.object({ armyId: z.string(), unitId: z.string() }))
  .handler(async ({ data }) => {
    const { getUnitById, deleteUnitPermanently, hasInProgressPostMatch } = await import('../../db/queries')
    const unit = await getUnitById(data.unitId)
    if (!unit || unit.armyId !== data.armyId) {
      return {
        success: false as const,
        error: { code: 'FORBIDDEN', message: "Cette unité n'appartient pas à cette armée" },
      }
    }
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
    return { success: true as const }
  })

// ---------------------------------------------------------------------------
// Server function — restore unit from graveyard
// ---------------------------------------------------------------------------

const restoreUnitFn = createServerFn({ method: 'POST' })
  .middleware([armyOwnerMiddleware])
  .inputValidator(z.object({ armyId: z.string(), unitId: z.string() }))
  .handler(async ({ data }) => {
    const { getUnitById, restoreUnitFromGraveyard } = await import('../../db/queries')
    const unit = await getUnitById(data.unitId)
    if (!unit || unit.armyId !== data.armyId) {
      return {
        success: false as const,
        error: { code: 'FORBIDDEN', message: "Cette unité n'appartient pas à cette armée" },
      }
    }
    if (unit.status !== 'graveyard') {
      return {
        success: false as const,
        error: { code: 'BAD_REQUEST', message: "Cette unité n'est pas au cimetière" },
      }
    }
    const updated = await restoreUnitFromGraveyard(data.unitId)
    if (updated.length === 0) {
      return {
        success: false as const,
        error: { code: 'NOT_FOUND', message: 'Unité introuvable ou déjà modifiée' },
      }
    }
    return { success: true as const }
  })

// ---------------------------------------------------------------------------
// Route definition
// ---------------------------------------------------------------------------

export const Route = createFileRoute('/armies/$armyId')({
  staleTime: 30_000,
  loader: async ({ params }) => {
    return loadArmyFn({ data: { armyId: params.armyId } })
  },
  notFoundComponent: () => (
    <main style={{ padding: '2rem', textAlign: 'center' }}>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
        Armée introuvable
      </p>
      <Link to="/" style={{ color: 'var(--color-brand)' }}>
        Retour à l'accueil
      </Link>
    </main>
  ),
  component: ArmyView,
})

// ---------------------------------------------------------------------------
// Unit type grouping order
// ---------------------------------------------------------------------------

const TYPE_ORDER = ['Personnages', 'Unités de base', 'Unités spéciales', 'Unités rares']

function groupUnitsByType(
  unitCards: Array<{
    unit: { id: string; name: string; nickname: string | null; type: string; xp: number; points: number | null }
    composedView: ComposedUnitView
    tier: TierLevel
    subProfiles: Array<{ id: string; label: string; isMount: boolean; sortOrder: number }>
  }>
) {
  const groups = new Map<string, typeof unitCards>()
  for (const card of unitCards) {
    const existing = groups.get(card.unit.type)
    if (existing) {
      existing.push(card)
    } else {
      groups.set(card.unit.type, [card])
    }
  }
  // Return in canonical order, then any remaining types alphabetically
  const ordered: Array<{ type: string; cards: typeof unitCards }> = []
  for (const type of TYPE_ORDER) {
    const cards = groups.get(type)
    if (cards) {
      ordered.push({ type, cards })
      groups.delete(type)
    }
  }
  for (const [type, cards] of groups) {
    ordered.push({ type, cards })
  }
  return ordered
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------


function ArmyView() {
  const { army, unitCards, graveyardUnits, isOwner, isAdmin } = Route.useLoaderData()
  const hydrated = useHydrated()
  const router = useRouter()
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null)
  const [addUnitsOpen, setAddUnitsOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [restoringUnitId, setRestoringUnitId] = useState<string | null>(null)

  useEffect(() => {
    if (!successMessage) return
    const timer = setTimeout(() => setSuccessMessage(null), 10_000)
    return () => clearTimeout(timer)
  }, [successMessage])

  useEffect(() => {
    if (hydrated) {
      document.documentElement.setAttribute('data-app-hydrated', 'true')
    }
  }, [hydrated])

  const groups = groupUnitsByType(unitCards)
  const totalXp = unitCards.reduce((sum, c) => sum + c.unit.xp, 0)
  const totalPoints = unitCards.reduce((sum, c) => sum + (c.unit.points ?? 0), 0)
  const allHavePoints = unitCards.length > 0 && unitCards.every((c) => c.unit.points !== null)

  const handleMutationSuccess = async () => {
    await router.invalidate({ filter: (d) => d.routeId === '/armies/$armyId' })
  }

  return (
    <main style={{ padding: '1rem', maxWidth: '720px', margin: '0 auto' }}>
      {/* Army header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.5rem', flexWrap: 'wrap' }}>
          <Link
            to="/armies"
            className="nav-btn-brand"
            style={{
              width: 30,
              height: 30,
              borderRadius: 999,
              border: 'none',
              background: 'var(--color-brand)',
              color: '#fff',
              fontWeight: 800,
              display: 'grid',
              placeItems: 'center',
              textDecoration: 'none',
              flexShrink: 0,
              fontSize: '1rem',
            }}
            aria-label="Retour aux armées"
          >
            ‹
          </Link>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '1.5rem',
              color: 'var(--color-text-primary)',
              margin: 0,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {army.name}
          </h1>
          {allHavePoints && (
            <span
              data-testid="army-total-points"
              style={{
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                fontSize: '0.75rem',
                color: 'var(--color-brand)',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-brand)',
                borderRadius: 999,
                padding: '0.125rem 0.5rem',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {totalPoints} pts
            </span>
          )}
          {unitCards.length > 0 && (
            <span
              data-testid="army-total-xp"
              style={{
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                fontSize: '0.75rem',
                color: 'var(--color-gold)',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-gold)',
                borderRadius: 999,
                padding: '0.125rem 0.5rem',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {totalXp} XP
            </span>
          )}
        </div>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
          {army.faction}
          {army.player && ` — ${army.player.username}`}
        </p>
      </div>

      {/* Success toast — auto-dismiss after 10s */}
      {successMessage && (
        <div
          data-testid="add-units-success"
          style={{
            padding: '0.625rem 1rem',
            borderRadius: '0.375rem',
            background: 'var(--color-bonus-bg)',
            color: 'var(--color-bonus)',
            border: '1px solid var(--color-bonus)',
            fontSize: '0.875rem',
            fontFamily: 'var(--font-body)',
            marginBottom: '1rem',
          }}
        >
          {successMessage}
        </div>
      )}

      {/* Add units button — owner only */}
      {isOwner && (
        <button
          data-testid="add-units-button"
          onClick={() => setAddUnitsOpen(true)}
          style={{
            background: '#334155',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '0.5rem 1rem',
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            fontSize: '0.8125rem',
            cursor: 'pointer',
            width: '100%',
            marginBottom: '1.5rem',
          }}
        >
          Ajouter des unités
        </button>
      )}

      <AddUnitsSheet
        armyId={army.id}
        open={addUnitsOpen}
        onClose={() => setAddUnitsOpen(false)}
        onSuccess={async (unitCount) => {
          setSuccessMessage(`${unitCount} unité${unitCount > 1 ? 's' : ''} ajoutée${unitCount > 1 ? 's' : ''}`)
          await handleMutationSuccess()
          setAddUnitsOpen(false)
        }}
      />

      {/* Units grouped by type */}
      {groups.map(({ type, cards }) => (
        <section key={type} style={{ marginBottom: '1.5rem' }}>
          <h2
            style={{
              fontFamily: 'var(--font-body)',
              fontWeight: 600,
              fontSize: '0.875rem',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--color-section-label)',
              marginBottom: '0.75rem',
            }}
          >
            {type}
          </h2>
          {cards.map((card) => (
            <div key={card.unit.id}>
              <UnitCard
                unit={card.unit}
                composedView={card.composedView}
                tier={card.tier}
                action={isOwner ? (
                  <button
                    data-testid={`edit-unit-${card.unit.id}`}
                    onClick={() =>
                      setEditingUnitId(
                        editingUnitId === card.unit.id ? null : card.unit.id,
                      )
                    }
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--color-text-secondary)',
                      fontSize: '0.75rem',
                      padding: '0.25rem 0.5rem',
                    }}
                  >
                    ✏ Modifier
                  </button>
                ) : undefined}
              />
              {isOwner && editingUnitId === card.unit.id && (
                <UnitEditPanel
                  armyId={army.id}
                  unitId={card.unit.id}
                  unitName={card.unit.name}
                  unitNickname={card.unit.nickname}
                  unitType={card.unit.type}
                  currentXp={card.unit.xp}
                  currentPoints={card.unit.points}
                  subProfiles={card.subProfiles}
                  isAdmin={isAdmin}
                  onClose={() => setEditingUnitId(null)}
                  onMutationSuccess={handleMutationSuccess}
                  addStatModifierFn={addStatModifierFn}
                  removeStatModifierFn={removeStatModifierFn}
                  addUnitGainFn={addUnitGainFn}
                  removeUnitGainFn={removeUnitGainFn}
                  updateXpFn={updateXpFn}
                  updatePointsFn={updatePointsFn}
                  updateNicknameFn={updateNicknameFn}
                  fetchUnitDeltasFn={fetchUnitDeltasFn}
                  toggleMountFn={toggleMountFn}
                  sendToGraveyardFn={sendToGraveyardFn}
                  deleteUnitFn={deleteUnitFn}
                />
              )}
            </div>
          ))}
        </section>
      ))}

      {unitCards.length === 0 && graveyardUnits.length === 0 && (
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Cette armée ne contient aucune unité.
        </p>
      )}

      {/* Graveyard section — owner only */}
      {isOwner && graveyardUnits.length > 0 && (
        <section data-testid="graveyard-section" style={{ marginTop: '2rem' }}>
          <div
            style={{
              borderTop: '1px solid var(--color-border)',
              paddingTop: '1rem',
              marginBottom: '0.75rem',
            }}
          >
            <h2
              style={{
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                fontSize: '0.875rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--color-text-secondary)',
              }}
            >
              Cimetière
            </h2>
          </div>
          {graveyardUnits.map((gu) => (
            <div
              key={gu.id}
              data-testid={`graveyard-unit-${gu.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0',
                borderBottom: '1px solid var(--color-separator)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {gu.nickname ?? gu.name}
                </span>
                {gu.nickname && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--color-text-secondary)',
                      fontStyle: 'italic',
                      marginLeft: '0.25rem',
                    }}
                  >
                    ({gu.name})
                  </span>
                )}
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--color-text-secondary)',
                    marginLeft: '0.5rem',
                  }}
                >
                  {gu.type}
                </span>
                {gu.graveyardReason && (
                  <p
                    style={{
                      fontSize: '0.75rem',
                      fontStyle: 'italic',
                      color: 'var(--color-text-secondary)',
                      margin: '0.125rem 0 0',
                    }}
                  >
                    {gu.graveyardReason}
                  </p>
                )}
              </div>
              <Button
                data-testid={`restore-unit-${gu.id}`}
                variant="outline"
                size="sm"
                disabled={restoringUnitId === gu.id}
                onClick={async () => {
                  setRestoringUnitId(gu.id)
                  try {
                    const result = await restoreUnitFn({
                      data: { armyId: army.id, unitId: gu.id },
                    })
                    if (result.success) {
                      await handleMutationSuccess()
                    }
                  } finally {
                    setRestoringUnitId(null)
                  }
                }}
                style={{
                  borderColor: '#334155',
                  color: '#334155',
                  fontSize: '0.75rem',
                  flexShrink: 0,
                }}
              >
                {restoringUnitId === gu.id ? '...' : 'Restaurer'}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    data-testid={`delete-graveyard-unit-${gu.id}`}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--color-malus)',
                      fontSize: '1rem',
                      padding: '0.25rem',
                      flexShrink: 0,
                    }}
                    aria-label="Supprimer définitivement"
                  >
                    🗑
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Suppression définitive</AlertDialogTitle>
                    <AlertDialogDescription>
                      Attention : cette unité, ses sous-profils, ses modificateurs de stats, ses gains et
                      son historique XP par match seront définitivement supprimés. Cette action est irréversible.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel style={{ borderColor: '#334155', color: '#334155' }}>
                      Annuler
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async (e) => {
                        e.preventDefault()
                        const result = await deleteUnitFn({
                          data: { armyId: army.id, unitId: gu.id },
                        })
                        if (result.success) {
                          await handleMutationSuccess()
                        }
                      }}
                      style={{ background: 'var(--color-malus)', color: '#fff' }}
                    >
                      Détruire
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </section>
      )}

    </main>
  )
}
