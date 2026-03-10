import { useForm } from '@tanstack/react-form'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { checkUsernameExists, createPlayer } from '../../db/queries'
import { adminMiddleware } from '../../lib/middleware'
import type { ServerResult } from '../../lib/types'
import { createPlayerSchema } from '../../lib/validators'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'

const createPlayerFn = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .inputValidator(createPlayerSchema)
  .handler(async ({ data }): Promise<ServerResult<{ id: string; username: string; displayName: string }>> => {
    const bcryptjs = await import('bcryptjs')

    // AC5 — Duplicate username check
    const exists = await checkUsernameExists(data.username)
    if (exists) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: "Ce nom d'utilisateur existe déjà" },
      }
    }

    // AC2 — Hash password and create player
    const passwordHash = await bcryptjs.hash(data.tempPassword, 12)
    const player = await createPlayer(data.username, passwordHash)

    return { success: true, data: player }
  })

export const Route = createFileRoute('/admin/')({
  beforeLoad: ({ context }) => {
    const session = 'session' in context ? context.session : null
    if (!session?.isAdmin) {
      throw redirect({ to: '/' })
    }
  },
  component: AdminPage,
})

function AdminPage() {
  const [createdPlayer, setCreatedPlayer] = useState<{ username: string } | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { username: '', tempPassword: '' },
    validators: { onSubmit: createPlayerSchema },
    onSubmit: async ({ value }) => {
      setServerError(null)
      const result = await createPlayerFn({ data: value })
      if (result.success) {
        setCreatedPlayer({ username: result.data.username })
        form.reset()
      } else {
        setServerError(result.error.message)
      }
    },
  })

  return (
    <main style={{ padding: '1.5rem', maxWidth: '480px', margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-brand)', marginBottom: '1.5rem' }}>
        Administration
      </h1>

      <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
        Créer un compte joueur
      </h2>

      {createdPlayer && (
        <div
          data-testid="admin-success-message"
          style={{
            background: 'var(--color-bonus-bg)',
            border: '1px solid var(--color-bonus)',
            padding: '0.75rem',
            borderRadius: '0.5rem',
            marginBottom: '1rem',
          }}
        >
          Compte créé pour <strong>{createdPlayer.username}</strong>. Le joueur peut maintenant se connecter.
        </div>
      )}

      {serverError && (
        <div
          data-testid="admin-error-message"
          style={{
            background: 'var(--color-malus-bg)',
            border: '1px solid var(--color-malus)',
            padding: '0.75rem',
            borderRadius: '0.5rem',
            marginBottom: '1rem',
            color: 'var(--color-malus)',
          }}
        >
          {serverError}
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}>
        <form.Field name="username">
          {(field) => (
            <div style={{ marginBottom: '1rem' }}>
              <Label htmlFor="username">Nom d'utilisateur</Label>
              <Input
                id="username"
                data-testid="admin-username-input"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder="nom_joueur"
                style={{ marginTop: '0.25rem' }}
              />
              {field.state.meta.errors.length > 0 && (
                <p style={{ color: 'var(--color-malus)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                  {typeof field.state.meta.errors[0] === 'string'
                    ? field.state.meta.errors[0]
                    : (field.state.meta.errors[0] as { message: string } | undefined)?.message}
                </p>
              )}
            </div>
          )}
        </form.Field>

        <form.Field name="tempPassword">
          {(field) => (
            <div style={{ marginBottom: '1.5rem' }}>
              <Label htmlFor="tempPassword">Mot de passe temporaire</Label>
              <Input
                id="tempPassword"
                type="password"
                data-testid="admin-password-input"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder="Minimum 6 caractères"
                style={{ marginTop: '0.25rem' }}
              />
              {field.state.meta.errors.length > 0 && (
                <p style={{ color: 'var(--color-malus)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                  {typeof field.state.meta.errors[0] === 'string'
                    ? field.state.meta.errors[0]
                    : (field.state.meta.errors[0] as { message: string } | undefined)?.message}
                </p>
              )}
            </div>
          )}
        </form.Field>

        <Button
          type="submit"
          data-testid="admin-create-player-button"
          style={{ background: 'var(--color-brand)', color: 'white', width: '100%' }}
        >
          Créer le compte
        </Button>
      </form>
    </main>
  )
}
