// Campaign TOW — ArmyImportForm
// Self-service OWB army import form for players with no army.
// Shared between Campaign view (/) and Armies list view (/armies).

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { playerImportArmyFn } from '../lib/server-fns/player-import-army'

interface ArmyImportFormProps {
  onSuccess: (data: { armyId: string; armyName: string; faction: string; unitCount: number }) => Promise<void> | void
}

export function ArmyImportForm({ onSuccess }: ArmyImportFormProps) {
  const [owbText, setOwbText] = useState('')
  const [result, setResult] = useState<{ message: string } | null>(null)

  const trimmed = owbText.trim()

  const { mutate, isPending, error: mutationError } = useMutation({
    mutationFn: async (rawText: string) => {
      const response = await playerImportArmyFn({ data: { rawText } })
      if (!response.success) throw new Error(response.error.message)
      return response.data
    },
    onSuccess: async (data) => {
      const { armyName, faction, unitCount } = data
      setResult({
        message: `Armée importée : ${armyName} (${faction}) — ${unitCount} unité${unitCount > 1 ? 's' : ''}`,
      })
      setOwbText('')
      await onSuccess(data)
    },
  })

  const handleSubmit = () => {
    setResult(null)
    mutate(trimmed)
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); handleSubmit() }}
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
        Créer votre armée
      </h2>
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '0.875rem',
          color: 'var(--color-text-secondary)',
          marginBottom: '0.75rem',
        }}
      >
        Collez ici l'export de votre armée depuis Old World Builder
      </p>

      <textarea
        data-testid="player-owb-import-textarea"
        value={owbText}
        onChange={(e) => setOwbText(e.target.value)}
        disabled={isPending}
        placeholder="Collez ici l'export de votre armée depuis Old World Builder..."
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
        }}
      >
        {isPending ? 'Import en cours...' : 'Importer'}
      </button>

      {result && (
        <p
          style={{
            marginTop: '0.75rem',
            padding: '0.625rem',
            borderRadius: '0.375rem',
            background: 'var(--color-bonus-bg)',
            color: 'var(--color-bonus)',
            border: '1px solid var(--color-bonus)',
            fontSize: '0.875rem',
            fontFamily: 'var(--font-body)',
          }}
        >
          {result.message}
        </p>
      )}
      {mutationError && (
        <p
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
          {mutationError.message}
        </p>
      )}
    </form>
  )
}
