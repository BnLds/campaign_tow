// Campaign TOW — ArmyImportForm
// Self-service OWB army import form for players with no army.
// Shared between Campaign view (/) and Armies list view (/armies).

import { useForm } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'
import { playerImportArmyFn } from '../lib/server-fns/player-import-army'
import { owbTextFormSchema } from '../lib/validators/army'

interface ArmyImportFormProps {
  onSuccess: (data: { armyId: string; armyName: string; faction: string; unitCount: number }) => Promise<void> | void
}

export function ArmyImportForm({ onSuccess }: ArmyImportFormProps) {
  const mutation = useMutation({
    mutationFn: async (rawText: string) => {
      const response = await playerImportArmyFn({ data: { rawText } })
      if (!response.success) throw new Error(response.error.message)
      return response.data
    },
    onSuccess: async (data) => {
      await onSuccess(data)
      form.reset()
    },
  })

  const form = useForm({
    defaultValues: { owbText: '' },
    validators: { onSubmit: owbTextFormSchema },
    onSubmit: ({ value }) => {
      mutation.reset()
      mutation.mutate(value.owbText.trim())
    },
  })

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}
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
        Dans Old World Builder, ouvrez la fenêtre d'export et cochez l'option «&nbsp;<strong>Afficher les caractéristiques</strong>&nbsp;», puis collez le résultat ici.
      </p>

      <form.Field name="owbText">
        {(field) => (
          <>
            <textarea
              data-testid="player-owb-import-textarea"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              disabled={mutation.isPending}
              placeholder="Collez ici l'export OWB (avec caractéristiques)..."
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
            {field.state.meta.errors.length > 0 && (
              <p style={{ marginTop: '0.5rem', color: 'var(--color-malus)', fontSize: '0.875rem', fontFamily: 'var(--font-body)' }}>
                {typeof field.state.meta.errors[0] === 'string'
                  ? field.state.meta.errors[0]
                  : (field.state.meta.errors[0] as { message: string } | undefined)?.message}
              </p>
            )}
          </>
        )}
      </form.Field>

      <form.Subscribe selector={(s) => s.values.owbText}>
        {(owbText) => (
          <button
            data-testid="player-owb-import-submit"
            type="submit"
            disabled={mutation.isPending || !owbText.trim()}
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
              cursor: mutation.isPending || !owbText.trim() ? 'not-allowed' : 'pointer',
              opacity: mutation.isPending || !owbText.trim() ? 0.6 : 1,
            }}
          >
            {mutation.isPending ? 'Import en cours...' : 'Importer'}
          </button>
        )}
      </form.Subscribe>

      {mutation.isSuccess && (() => {
        const { armyName, faction, unitCount } = mutation.data
        return (
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
            Armée importée : {armyName} ({faction}) — {unitCount} unité{unitCount > 1 ? 's' : ''}
          </p>
        )
      })()}
      {mutation.error && (
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
          {mutation.error.message}
        </p>
      )}
    </form>
  )
}
