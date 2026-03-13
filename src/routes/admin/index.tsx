import { useForm } from '@tanstack/react-form'
import { createFileRoute, redirect, useRouteContext } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { adminMiddleware } from '../../lib/middleware'
import type { ServerResult } from '../../lib/types'
import { createPlayerSchema } from '../../lib/validators'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { useHydrated } from '../../lib/useHydrated'

const createPlayerFn = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .inputValidator(createPlayerSchema)
  .handler(async ({ data }): Promise<ServerResult<{ id: string; username: string; displayName: string }>> => {
    const bcryptjs = await import('bcryptjs')
    const { checkUsernameExists, createPlayer } = await import('../../db/queries')

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
    try {
      const player = await createPlayer(data.username, passwordHash)
      return { success: true, data: player }
    } catch {
      // Unique constraint violation (race condition between check and insert)
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: "Ce nom d'utilisateur existe déjà" },
      }
    }
  })

// Story 1.6 — listPlayersFn: GET loader, returns all players (no ServerResult wrapper)
const listPlayersFn = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .handler(async () => {
    const { getAllPlayers } = await import('../../db/queries')
    return getAllPlayers()
  })

// Story 1.6 — deletePlayerFn: POST mutation, returns ServerResult<null>
const deletePlayerFn = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .inputValidator(z.object({ playerId: z.string() }))
  .handler(async ({ context, data }): Promise<ServerResult<null>> => {
    if (data.playerId === context.session.playerId) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Impossible de supprimer votre propre compte' } }
    }
    const { deletePlayer } = await import('../../db/queries')
    await deletePlayer(data.playerId)
    return { success: true, data: null }
  })

export const Route = createFileRoute('/admin/')({
  beforeLoad: ({ context }) => {
    const { session } = context
    if (!session?.isAdmin) {
      throw redirect({ to: '/' })
    }
  },
  component: AdminPage,
})

function AdminPage() {
  const context = useRouteContext({ from: '__root__' })
  const { session } = context
  const queryClient = useQueryClient()
  const [createdPlayer, setCreatedPlayer] = useState<{ username: string } | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const hydrated = useHydrated()

  useEffect(() => {
    if (hydrated) {
      document.documentElement.setAttribute('data-app-hydrated', 'true')
    }
  }, [hydrated])

  const playersQuery = useQuery({
    queryKey: ['admin', 'players'],
    queryFn: () => listPlayersFn(),
  })

  const form = useForm({
    defaultValues: { username: '', tempPassword: '' },
    validators: { onSubmit: createPlayerSchema },
    onSubmit: async ({ value }) => {
      setServerError(null)
      setCreatedPlayer(null)
      const result = await createPlayerFn({ data: value })
      if (result.success) {
        setCreatedPlayer({ username: result.data.username })
        form.reset()
        await queryClient.invalidateQueries({ queryKey: ['admin', 'players'] })
      } else {
        setServerError(result.error.message)
      }
    },
  })

  const handleDelete = async (playerId: string, username: string) => {
    if (!window.confirm(`Supprimer le compte de ${username} ? Cette action est irréversible.`)) return
    setDeleteError(null)
    const result = await deletePlayerFn({ data: { playerId } })
    if (result.success) {
      setCreatedPlayer(null)
      await queryClient.invalidateQueries({ queryKey: ['admin', 'players'] })
    } else {
      setDeleteError(result.error.message)
    }
  }

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

      <section style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
          Joueurs
        </h2>

        {(deleteError || playersQuery.error) && (
          <div
            style={{
              background: 'var(--color-malus-bg)',
              border: '1px solid var(--color-malus)',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              marginBottom: '1rem',
              color: 'var(--color-malus)',
            }}
          >
            {[playersQuery.error ? 'Impossible de charger la liste des joueurs' : null, deleteError].filter(Boolean).join(' — ')}
          </div>
        )}

        {playersQuery.isPending ? (
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>Chargement…</p>
        ) : <div>
          {(playersQuery.data ?? []).map((player) => (
            <div
              key={player.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.625rem 0',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <span style={{ fontWeight: 600, fontFamily: 'monospace', minWidth: '8rem' }}>
                {player.username}
              </span>
              <span style={{ color: 'var(--color-text-secondary)', flex: 1 }}>
                {player.displayName || '—'}
              </span>
              {player.isAdmin && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.125rem 0.375rem',
                    borderRadius: '0.25rem',
                    background: 'var(--color-brand)',
                    color: 'white',
                  }}
                >
                  Admin
                </span>
              )}
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                {new Date(player.createdAt).toLocaleDateString('fr-FR')}
              </span>
              {player.id !== session?.playerId && (
                <button
                  data-testid={`delete-player-${player.id}`}
                  onClick={() => handleDelete(player.id, player.username)}
                  style={{
                    background: 'none',
                    border: '1px solid var(--color-malus)',
                    color: 'var(--color-malus)',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                  }}
                >
                  Supprimer
                </button>
              )}
            </div>
          ))}
        </div>}
      </section>
    </main>
  )
}
