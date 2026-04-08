// Campaign TOW — ArmyView component (extracted from armies/$armyId route)

import { useState, useEffect, useRef } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { Pencil } from 'lucide-react'
import { useHydrated } from '../lib/useHydrated'
import { UnitCard } from './unit-card'
import { AddUnitsSheet } from './add-units-sheet'
import { UnitEditPanel } from './unit-edit-panel'
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
} from './ui/alert-dialog'
import { Button } from './ui/button'
import { LinkButton } from '#/components/link-button'
import {
  deleteUnitFn,
  restoreUnitFn,
} from '../server-fns/unit-mutations'
import { updateArmyNameFn } from '../server-fns/army-mutations'
import type { LoadArmyResult } from '../server-fns/unit-queries'
import { groupUnitsByType } from '../lib/army-utils'

export type ArmyViewProps = LoadArmyResult

export function ArmyView({ army, unitCards, graveyardUnits, isOwner, isAdmin }: ArmyViewProps) {
  const hydrated = useHydrated()
  const router = useRouter()
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null)
  const [addUnitsOpen, setAddUnitsOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [restoringUnitId, setRestoringUnitId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(army.name)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const renameMutation = useMutation({
    mutationFn: (name: string) => updateArmyNameFn({ data: { armyId: army.id, name } }),
    onSuccess: (result) => {
      if (result.success) {
        void router.invalidate({ filter: (d) => d.routeId === '/armies/$armyId' })
      }
      setEditingName(false)
    },
    onError: () => {
      setEditingName(false)
    },
  })

  useEffect(() => {
    setNameInput(army.name)
  }, [army.name])

  useEffect(() => {
    if (editingName) {
      nameInputRef.current?.focus()
      nameInputRef.current?.select()
    }
  }, [editingName])

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
  const totalPoints = unitCards.reduce((sum, c) => sum + (c.unit.effectivePoints ?? 0), 0)
  const allHavePoints = unitCards.length > 0 && unitCards.every((c) => c.unit.points !== null)

  return (
    <main className="p-4 max-w-[720px] mx-auto">
      {/* Army header */}
      <div className="mb-6">
        <div className="flex items-center gap-2.5 mb-2 flex-wrap">
          <Link
            to="/armies"
            className="nav-btn-brand size-[30px] rounded-[999px] border-none bg-cw-brand text-white font-extrabold grid place-items-center no-underline shrink-0 text-base"
            aria-label="Retour aux armées"
          >
            ‹
          </Link>
          {editingName ? (
            <input
              ref={nameInputRef}
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={() => {
                const trimmed = nameInput.trim()
                if (!trimmed || trimmed === army.name) {
                  setNameInput(army.name)
                  setEditingName(false)
                  return
                }
                renameMutation.mutate(trimmed)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
                if (e.key === 'Escape') {
                  setNameInput(army.name)
                  setEditingName(false)
                }
              }}
              disabled={renameMutation.isPending}
              maxLength={100}
              className="font-cw-display font-bold text-2xl text-cw-text-primary m-0 min-w-0 bg-transparent border-none outline-none w-full"
            />
          ) : (
            <h1
              className="font-cw-display font-bold text-2xl text-cw-text-primary m-0 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap"
            >
              {army.name}
            </h1>
          )}
          {isOwner && !editingName && (
            <button
              data-testid="edit-army-name"
              onClick={() => setEditingName(true)}
              className="bg-transparent border-none cursor-pointer p-1 shrink-0"
              aria-label="Modifier le nom de l'armée"
            >
              <Pencil size={16} className="text-cw-text-secondary" />
            </button>
          )}
          {allHavePoints && (
            <span
              data-testid="army-total-points"
              className="font-semibold text-xs text-cw-brand bg-cw-surface border border-cw-brand rounded-full px-2 py-0.5 whitespace-nowrap shrink-0"
            >
              {totalPoints} pts
            </span>
          )}
          {unitCards.length > 0 && (
            <span
              data-testid="army-total-xp"
              className="font-semibold text-xs text-cw-gold bg-cw-surface border border-cw-gold rounded-full px-2 py-0.5 whitespace-nowrap shrink-0"
            >
              {totalXp} XP
            </span>
          )}
        </div>
        <p className="text-cw-text-secondary text-sm">
          {army.faction}
          {army.player && ` — ${army.player.username}`}
        </p>
      </div>

      {/* Success toast — auto-dismiss after 10s */}
      {successMessage && (
        <div
          data-testid="add-units-success"
          className="px-2.5 py-4 rounded-md bg-cw-bonus-bg text-cw-bonus border border-cw-bonus text-sm mb-4"
        >
          {successMessage}
        </div>
      )}

      {/* Add units button — owner only */}
      {isOwner && (
        <Button
          data-testid="add-units-button"
          variant="brand"
          className="w-full mb-6"
          onClick={() => setAddUnitsOpen(true)}
        >
          Ajouter des unités
        </Button>
      )}

      <AddUnitsSheet
        armyId={army.id}
        open={addUnitsOpen}
        onClose={() => setAddUnitsOpen(false)}
        onSuccess={async (unitCount) => {
          setSuccessMessage(`${unitCount} unité${unitCount > 1 ? 's' : ''} ajoutée${unitCount > 1 ? 's' : ''}`)
          await router.invalidate({ filter: (d) => d.routeId === '/armies/$armyId' })
          setAddUnitsOpen(false)
        }}
      />

      {/* Units grouped by type */}
      {groups.map(({ type, cards }) => (
        <section key={type} className="mb-6">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-cw-section-label mb-3">
            {type}
          </h2>
          {cards.map((card) => (
            <div key={card.unit.id}>
              <UnitCard
                unit={card.unit}
                composedView={card.composedView}
                tier={card.tier}
                action={isOwner ? (
                  <LinkButton
                    data-testid={`edit-unit-${card.unit.id}`}
                    onClick={() =>
                      setEditingUnitId(
                        editingUnitId === card.unit.id ? null : card.unit.id,
                      )
                    }
                  >
                    ✏ Modifier
                  </LinkButton>
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
                />
              )}
            </div>
          ))}
        </section>
      ))}

      {unitCards.length === 0 && graveyardUnits.length === 0 && (
        <p className="text-cw-text-secondary">
          Cette armée ne contient aucune unité.
        </p>
      )}

      {/* Graveyard section — owner only */}
      {isOwner && graveyardUnits.length > 0 && (
        <section data-testid="graveyard-section" className="mt-8">
          <div className="border-t border-cw-border pt-4 mb-3">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-cw-text-secondary">
              Cimetière
            </h2>
          </div>
          {graveyardUnits.map((gu) => (
            <div
              key={gu.id}
              data-testid={`graveyard-unit-${gu.id}`}
              className="flex items-center gap-2 py-2 border-b border-cw-separator"
            >
              <div className="flex-1 min-w-0">
                <span className="font-cw-display font-semibold text-sm text-cw-text-secondary">
                  {gu.nickname ?? gu.name}
                </span>
                {gu.nickname && (
                  <span className="text-xs text-cw-text-secondary italic ml-1">
                    ({gu.name})
                  </span>
                )}
                <span className="text-xs text-cw-text-secondary ml-2">
                  {gu.type}
                </span>
                {gu.graveyardReason && (
                  <p className="text-xs italic text-cw-text-secondary mt-0.5">
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
                      await router.invalidate({ filter: (d) => d.routeId === '/armies/$armyId' })
                    }
                  } finally {
                    setRestoringUnitId(null)
                  }
                }}
                className="border-cw-brand text-cw-brand text-xs shrink-0"
              >
                {restoringUnitId === gu.id ? '...' : 'Restaurer'}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    data-testid={`delete-graveyard-unit-${gu.id}`}
                    className="bg-transparent border-none cursor-pointer text-cw-malus text-base p-1 shrink-0"
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
                    <AlertDialogCancel className="border-cw-brand text-cw-brand">
                      Annuler
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async (e) => {
                        e.preventDefault()
                        const result = await deleteUnitFn({
                          data: { armyId: army.id, unitId: gu.id },
                        })
                        if (result.success) {
                          await router.invalidate({ filter: (d) => d.routeId === '/armies/$armyId' })
                        }
                      }}
                      className="bg-cw-malus text-white"
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
