// Campaign TOW — ArmyImportForm
// Self-service OWB army import form for players with no army.
// Shared between Campaign view (/) and Armies list view (/armies).

import { useState } from 'react'
import { playerImportArmyFn } from '../lib/server-fns/player-import-army'

interface ArmyImportFormProps {
  onSuccess: (data: { armyId: string; armyName: string; faction: string; unitCount: number }) => Promise<void> | void
}

export function ArmyImportForm({ onSuccess }: ArmyImportFormProps) {
  const [owbText, setOwbText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const trimmed = owbText.trim()

  const handleSubmit = async () => {
    setSubmitting(true)
    setResult(null)
    try {
      const response = await playerImportArmyFn({ data: { rawText: trimmed } })
      if (response.success) {
        const { armyName, faction, unitCount } = response.data
        setResult({
          success: true,
          message: `Armee importee : ${armyName} (${faction}) — ${unitCount} unite${unitCount > 1 ? 's' : ''}`,
        })
        setOwbText('')
        await onSuccess(response.data)
      } else {
        setResult({ success: false, message: response.error.message })
      }
    } catch {
      setResult({ success: false, message: "Erreur serveur — veuillez reessayer" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); void handleSubmit() }}
      style={{
        padding: '1.5rem',
        borderRadius: '0.5rem',
        border: '1px solid var(--color-separator)',
        background: 'var(--color-surface)',
        marginBottom: '1.5rem',
      }}
    >
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '1.125rem',
          color: 'var(--color-text-primary)',
          marginBottom: '0.5rem',
        }}
      >
        Creer votre armee
      </h2>
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '0.875rem',
          color: 'var(--color-text-secondary)',
          marginBottom: '0.75rem',
        }}
      >
        Collez ici l'export de votre armee depuis Old World Builder
      </p>

      <textarea
        data-testid="player-owb-import-textarea"
        value={owbText}
        onChange={(e) => setOwbText(e.target.value)}
        disabled={submitting}
        placeholder="Collez ici l'export de votre armee depuis Old World Builder..."
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
        data-testid="player-owb-import-submit"
        type="submit"
        disabled={submitting || !trimmed}
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
          cursor: submitting || !trimmed ? 'not-allowed' : 'pointer',
          opacity: submitting || !trimmed ? 0.6 : 1,
        }}
      >
        {submitting ? 'Import en cours...' : 'Importer'}
      </button>

      {result && (
        <p
          style={{
            marginTop: '0.75rem',
            padding: '0.625rem',
            borderRadius: '0.375rem',
            background: result.success ? 'var(--color-bonus-bg)' : 'var(--color-malus-bg)',
            color: result.success ? 'var(--color-bonus)' : 'var(--color-malus)',
            border: `1px solid ${result.success ? 'var(--color-bonus)' : 'var(--color-malus)'}`,
            fontSize: '0.875rem',
            fontFamily: 'var(--font-body)',
          }}
        >
          {result.message}
        </p>
      )}
    </form>
  )
}
