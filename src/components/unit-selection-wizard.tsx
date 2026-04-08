// Campaign TOW — UnitSelectionWizard
// Full-screen overlay letting players pick which units participate in a match.
// Groups units by type; sticky footer shows live point/XP totals.

import { useState, useEffect, useRef, useMemo } from 'react'
import { cn } from '#/lib/utils'
import { Button } from '#/components/ui/button'
import type { ServerResult } from '../lib/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Unit = {
  id: string
  name: string
  type: string
  xp: number
  points: number | null
  effectivePoints: number | null
}

export type UnitSelectionWizardProps = {
  matchId: string
  loadUnits: () => Promise<ServerResult<{ units: Unit[]; preSelectedUnitIds: string[] }>>
  onSubmit: (unitIds: string[]) => Promise<void>
  onCancel: () => void
}

// ---------------------------------------------------------------------------
// Group ordering
// ---------------------------------------------------------------------------

const GROUP_ORDER = [
  'Personnages',
  'Unités de base',
  'Unités spéciales',
  'Unités rares',
]

// Units whose type doesn't match any of the above go at the end under their own label.
function sortedGroups(units: Unit[]): Array<{ label: string; units: Unit[] }> {
  const known = GROUP_ORDER.map((label) => ({
    label,
    units: units.filter((u) => u.type === label),
  })).filter((g) => g.units.length > 0)

  const knownTypes = new Set(GROUP_ORDER)
  const otherTypes = [...new Set(units.filter((u) => !knownTypes.has(u.type)).map((u) => u.type))]
  const other = otherTypes.map((label) => ({
    label,
    units: units.filter((u) => u.type === label),
  }))

  return [...known, ...other]
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UnitSelectionWizard({
  loadUnits,
  onSubmit,
  onCancel,
}: UnitSelectionWizardProps) {
  const [units, setUnits] = useState<Unit[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const loadedRef = useRef(false)

  // Load units on mount
  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true
    loadUnits()
      .then((result) => {
        if (!result.success) {
          setLoadError(result.error.message)
          return
        }
        setUnits(result.data.units)
        // If preSelectedUnitIds is non-empty, use those; otherwise select all
        const ids = result.data.preSelectedUnitIds.length > 0
          ? result.data.preSelectedUnitIds
          : result.data.units.map((u) => u.id)
        setSelected(new Set(ids))
      })
      .catch(() => setLoadError('Erreur de chargement'))
      .finally(() => setIsLoading(false))
  }, [loadUnits])

  const overlayRef = useRef<HTMLDivElement>(null)
  const FOCUSABLE_SELECTOR =
    'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'

  // Focus trap + ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
        return
      }
      if (e.key === 'Tab' && overlayRef.current) {
        const focusable = overlayRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    // Focus first focusable element after render
    requestAnimationFrame(() => {
      overlayRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)[0]?.focus()
    })
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  const toggleUnit = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectedUnits = units.filter((u) => selected.has(u.id))
  const totalPoints = selectedUnits.reduce((sum, u) => sum + (u.effectivePoints ?? 0), 0)
  const totalXp = selectedUnits.reduce((sum, u) => sum + u.xp, 0)

  const handleSubmit = async () => {
    if (selected.size === 0 || isSubmitting) return
    setIsSubmitting(true)
    try {
      await onSubmit([...selected])
    } finally {
      setIsSubmitting(false)
    }
  }

  const groups = useMemo(() => sortedGroups(units), [units])

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onCancel}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.45)',
          zIndex: 1100,
        }}
      />

      {/* Full-screen overlay panel */}
      <div
        ref={overlayRef}
        role="dialog"
        aria-modal="true"
        aria-label="Sélection des unités"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1101,
          background: 'var(--color-bg)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'var(--color-surface)',
            borderBottom: '1px solid var(--color-separator)',
            padding: '1rem 1rem 0.875rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '1.125rem',
              color: 'var(--color-text-primary)',
              margin: 0,
            }}
          >
            Unités participantes
          </h2>
          <button
            onClick={onCancel}
            aria-label="Fermer"
            style={{
              width: 30,
              height: 30,
              borderRadius: 999,
              border: 'none',
              background: 'var(--color-malus)',
              color: '#fff',
              fontWeight: 800,
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              fontSize: '1rem',
              padding: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable unit list */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0.75rem 1rem 1rem',
          }}
        >
          {isLoading && (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--color-text-secondary)', textAlign: 'center', marginTop: '2rem' }}>
              Chargement…
            </p>
          )}
          {loadError && (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--color-malus)', textAlign: 'center', marginTop: '2rem' }}>
              {loadError}
            </p>
          )}
          {!isLoading && !loadError && groups.length === 0 && (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--color-text-secondary)', fontStyle: 'italic', marginTop: '1.5rem', textAlign: 'center' }}>
              Aucune unité dans cette armée
            </p>
          )}

          {!isLoading && !loadError && groups.map((group) => (
            <div key={group.label} style={{ marginBottom: '1.25rem' }}>
              {/* Group label */}
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontWeight: 700,
                  fontSize: '0.6875rem',
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  color: 'var(--color-section-label)',
                  margin: '0 0 0.375rem',
                }}
              >
                {group.label}
              </p>

              {/* Unit rows */}
              <div
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '0.625rem',
                  overflow: 'hidden',
                }}
              >
                {group.units.map((unit, idx) => {
                  const isChecked = selected.has(unit.id)
                  const isLast = idx === group.units.length - 1
                  return (
                    <label
                      key={unit.id}
                      htmlFor={`unit-check-${unit.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.625rem 0.875rem',
                        cursor: 'pointer',
                        borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
                        background: isChecked ? 'var(--color-surface)' : 'var(--color-bg)',
                        transition: 'background 0.1s',
                      }}
                    >
                      {/* Checkbox */}
                      <input
                        id={`unit-check-${unit.id}`}
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleUnit(unit.id)}
                        style={{
                          width: 18,
                          height: 18,
                          flexShrink: 0,
                          accentColor: 'var(--color-brand)',
                          cursor: 'pointer',
                        }}
                      />

                      {/* Unit name */}
                      <span
                        style={{
                          flex: 1,
                          fontFamily: 'var(--font-display)',
                          fontWeight: 600,
                          fontSize: '0.9rem',
                          color: isChecked
                            ? 'var(--color-text-primary)'
                            : 'var(--color-text-secondary)',
                        }}
                      >
                        {unit.name}
                      </span>

                      {/* Points + XP badges */}
                      <div
                        style={{
                          display: 'flex',
                          gap: '0.375rem',
                          alignItems: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {unit.points !== null && (
                          <span
                            style={{
                              fontFamily: 'var(--font-body)',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              color: unit.effectivePoints !== unit.points ? 'var(--color-malus)' : 'var(--color-text-secondary)',
                              background: 'var(--color-stats-bg)',
                              border: '1px solid var(--color-border)',
                              borderRadius: '0.375rem',
                              padding: '1px 6px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {unit.effectivePoints ?? unit.points} pts
                            {unit.effectivePoints !== unit.points && (
                              <span style={{ fontSize: '0.65rem', color: 'var(--color-malus)' }}> (÷2)</span>
                            )}
                          </span>
                        )}
                        <span
                          style={{
                            fontFamily: 'var(--font-body)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: 'var(--color-bonus)',
                            background: 'var(--color-bonus-bg)',
                            border: '1px solid var(--color-bonus-border)',
                            borderRadius: '0.375rem',
                            padding: '1px 6px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {unit.xp} XP
                        </span>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sticky footer */}
        <div
          style={{
            background: 'var(--color-surface)',
            borderTop: '1px solid var(--color-separator)',
            padding: '0.75rem 1rem',
            flexShrink: 0,
          }}
        >
          {/* Totals row */}
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'var(--color-text-secondary)',
              margin: '0 0 0.625rem',
              textAlign: 'center',
            }}
          >
            Total :{' '}
            <span style={{ color: 'var(--color-text-primary)' }}>
              {totalPoints} pts
            </span>
            {' · '}
            <span style={{ color: 'var(--color-bonus)' }}>
              {totalXp} XP
            </span>
            {selected.size === 0 && (
              <span
                style={{
                  color: 'var(--color-malus)',
                  fontWeight: 500,
                  marginLeft: '0.5rem',
                }}
              >
                (aucune unité sélectionnée)
              </span>
            )}
          </p>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className={cn('flex-1')}
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Annuler
            </Button>
            <Button
              variant="brand"
              onClick={handleSubmit}
              disabled={selected.size === 0 || isSubmitting}
              className={cn('flex-1')}
              style={{ fontFamily: 'var(--font-body)', fontWeight: 700 }}
            >
              {isSubmitting ? 'Enregistrement…' : 'Valider'}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
