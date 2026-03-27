// Campaign TOW — AddUnitsSheet
// Bottom sheet for incremental unit import via OWB export paste.
// Client-side parsing with parseOwbExport, then structured data sent to server.

import { useState, useEffect, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { parseOwbExport } from '../lib/owb-parser'
import { addUnitsToArmyFn } from '../lib/server-fns/add-units-to-army'

interface AddUnitsSheetProps {
  armyId: string
  open: boolean
  onClose: () => void
  onSuccess: (unitCount: number) => void
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'

export function AddUnitsSheet({ armyId, open, onClose, onSuccess }: AddUnitsSheetProps) {
  const [owbText, setOwbText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const sheetRef = useRef<HTMLDivElement>(null)

  const { mutate, isPending } = useMutation({
    mutationFn: async (units: ReturnType<typeof parseOwbExport>['units']) => {
      const result = await addUnitsToArmyFn({ data: { armyId, units } })
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: (data) => {
      onSuccess(data.unitCount)
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Erreur serveur, veuillez réessayer')
    },
  })

  // Capture the trigger element for focus restoration
  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement as HTMLElement
    }
  }, [open])

  // Reset state when sheet closes
  useEffect(() => {
    if (!open) {
      setOwbText('')
      setError(null)
    }
  }, [open])

  // Focus trap + ESC handler
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }

      if (e.key === 'Tab' && sheetRef.current) {
        const focusable = sheetRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
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
    // Focus textarea after sheet renders
    requestAnimationFrame(() => {
      sheetRef.current?.querySelector('textarea')?.focus()
    })

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      triggerRef.current?.focus()
    }
  }, [open, onClose])

  const handleSubmit = () => {
    setError(null)
    const trimmed = owbText.trim()
    if (!trimmed) return

    let parsed
    try {
      parsed = parseOwbExport(trimmed)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'analyse du texte")
      return
    }

    if (parsed.units.length === 0) {
      setError('Aucune unité trouvée')
      return
    }

    mutate(parsed.units)
  }

  if (!open) return null

  const trimmed = owbText.trim()

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 1000,
        }}
      />
      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Ajouter des unités"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight: '80vh',
          background: 'var(--color-surface)',
          borderTop: '1px solid var(--color-separator)',
          borderRadius: '1rem 1rem 0 0',
          padding: '1.5rem',
          zIndex: 1001,
          overflowY: 'auto',
          animation: 'addUnitsSlideUp 0.2s ease-out',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '1.125rem',
              color: 'var(--color-text-primary)',
              margin: 0,
            }}
          >
            Ajouter des unités
          </h2>
          <button
            onClick={onClose}
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
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.875rem',
            color: 'var(--color-text-secondary)',
            marginBottom: '0.75rem',
          }}
        >
          Collez l'export OWB contenant uniquement les nouvelles unités
        </p>

        <textarea
          data-testid="add-units-textarea"
          value={owbText}
          onChange={(e) => setOwbText(e.target.value)}
          disabled={isPending}
          placeholder="Collez ici l'export OWB des nouvelles unités..."
          rows={6}
          maxLength={50000}
          style={{
            width: '100%',
            padding: '0.625rem',
            borderRadius: '0.375rem',
            border: '1px solid var(--color-border)',
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            resize: 'vertical',
            background: 'var(--color-surface)',
            boxSizing: 'border-box',
          }}
        />

        <button
          data-testid="add-units-submit"
          type="button"
          onClick={handleSubmit}
          disabled={isPending || !trimmed}
          style={{
            marginTop: '0.75rem',
            padding: '0.5rem 1.25rem',
            borderRadius: '0.375rem',
            border: 'none',
            background: 'var(--color-brand)',
            color: '#fff',
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: isPending || !trimmed ? 'not-allowed' : 'pointer',
            opacity: isPending || !trimmed ? 0.6 : 1,
            width: '100%',
          }}
        >
          {isPending ? 'Import en cours...' : 'Importer'}
        </button>

        {error && (
          <p
            data-testid="add-units-error"
            style={{
              marginTop: '0.75rem',
              padding: '0.625rem',
              borderRadius: '0.375rem',
              background: 'var(--color-malus-bg)',
              color: 'var(--color-malus)',
              border: '1px solid var(--color-malus)',
              fontSize: '0.875rem',
              fontFamily: 'var(--font-body)',
            }}
          >
            {error}
          </p>
        )}
      </div>
    </>
  )
}
