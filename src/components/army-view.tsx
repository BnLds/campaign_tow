// Campaign TOW — ArmyView component (extracted from armies/$armyId route)

import { useState, useEffect } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
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
import {
  deleteUnitFn,
  restoreUnitFn,
} from '../server-fns/unit-mutations'
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
            background: 'var(--color-brand)',
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
          await router.invalidate({ filter: (d) => d.routeId === '/armies/$armyId' })
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
                      await router.invalidate({ filter: (d) => d.routeId === '/armies/$armyId' })
                    }
                  } finally {
                    setRestoringUnitId(null)
                  }
                }}
                style={{
                  borderColor: 'var(--color-brand)',
                  color: 'var(--color-brand)',
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
                    <AlertDialogCancel style={{ borderColor: 'var(--color-brand)', color: 'var(--color-brand)' }}>
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
