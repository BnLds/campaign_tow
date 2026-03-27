// Campaign TOW — Settings page
// AC7: password change (requires current password for activated accounts)
// AC10: accessible via header menu for non-guest players

import { createFileRoute, redirect, useRouteContext, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authMiddleware } from '../lib/middleware'
import type { ServerResult } from '../lib/types'
import { changePasswordSchema, updateUsernameSchema } from '../lib/validators'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { sessionQueryOptions } from '../lib/session-queries'

// ---------------------------------------------------------------------------
// Server functions
// ---------------------------------------------------------------------------

const changePasswordFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator(changePasswordSchema)
  .handler(async ({ context, data }): Promise<ServerResult<null>> => {
    if (context.session.isGuest) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Connexion requise' } }
    }

    const { db } = await import('../db/index')
    const { players } = await import('../db/schema')
    const { eq } = await import('drizzle-orm')
    const bcryptjs = await import('bcryptjs')

    const playerRow = await db.query.players.findFirst({ where: eq(players.id, context.session.playerId) })
    if (!playerRow) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Joueur introuvable' } }
    }

    // If player has a password set, current password is required
    if (playerRow.passwordHash) {
      if (!data.currentPassword) {
        return { success: false, error: { code: 'INVALID_CURRENT_PASSWORD', message: 'Le mot de passe actuel est requis' } }
      }
      const valid = await bcryptjs.compare(data.currentPassword, playerRow.passwordHash)
      if (!valid) {
        return { success: false, error: { code: 'INVALID_CURRENT_PASSWORD', message: 'Mot de passe actuel incorrect' } }
      }
    }

    const newHash = await bcryptjs.hash(data.newPassword, 12)
    const { updatePlayerPassword } = await import('../db/queries')
    await updatePlayerPassword(context.session.playerId, newHash)

    return { success: true, data: null }
  })

const updateUsernameFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator(updateUsernameSchema)
  .handler(async ({ context, data }): Promise<ServerResult<{ username: string }>> => {
    if (context.session.isGuest) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Connexion requise' } }
    }

    // Short-circuit: no DB call needed if username is unchanged
    if (data.username === context.session.username) {
      return { success: true, data: { username: data.username } }
    }

    const { checkUsernameExists, updatePlayerUsername } = await import('../db/queries')
    const taken = await checkUsernameExists(data.username, context.session.playerId)
    if (taken) {
      return { success: false, error: { code: 'USERNAME_TAKEN', message: "Ce nom d'utilisateur est deja pris" } }
    }

    try {
      await updatePlayerUsername(context.session.playerId, data.username)
    } catch (err: unknown) {
      const { isUniqueViolation } = await import('../lib/db-errors')
      if (isUniqueViolation(err)) {
        return { success: false, error: { code: 'USERNAME_TAKEN', message: "Ce nom d'utilisateur est deja pris" } }
      }
      throw err
    }

    return { success: true, data: { username: data.username } }
  })

// ---------------------------------------------------------------------------
// Route definition
// ---------------------------------------------------------------------------

export const Route = createFileRoute('/settings')({
  beforeLoad: ({ context }) => {
    const { session } = context
    if (!session || session.isGuest) {
      throw redirect({ to: '/login' })
    }
  },
  component: SettingsPage,
})

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function SettingsPage() {
  const context = useRouteContext({ from: '__root__' })
  const { session } = context
  const router = useRouter()
  const queryClient = useQueryClient()

  const passwordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string; confirmNewPassword: string }) => {
      const result = await changePasswordFn({ data })
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      passwordForm.reset()
    },
  })

  const usernameMutation = useMutation({
    mutationFn: async (data: { username: string }) => {
      const result = await updateUsernameFn({ data })
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries(sessionQueryOptions())
      await router.invalidate()
      usernameForm.reset()
    },
  })

  const passwordForm = useForm({
    defaultValues: { currentPassword: '', newPassword: '', confirmNewPassword: '' },
    validators: { onSubmit: changePasswordSchema },
    onSubmit: ({ value }) => {
      passwordMutation.reset()
      passwordMutation.mutate(value)
    },
  })

  const usernameForm = useForm({
    defaultValues: { username: session?.username ?? '' },
    validators: { onSubmit: updateUsernameSchema },
    onSubmit: ({ value }) => {
      if (!window.confirm("Attention : votre nom d'utilisateur sert aussi d'identifiant de connexion. Continuer ?")) return
      usernameMutation.reset()
      usernameMutation.mutate(value)
    },
  })

  const sectionStyle = {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: '0.75rem',
    padding: '1.25rem',
    marginBottom: '1.5rem',
  }

  const headingStyle = {
    fontFamily: 'var(--font-display)',
    fontSize: '1rem',
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    marginBottom: '1rem',
  }

  return (
    <main style={{ maxWidth: 440, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.25rem',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          marginBottom: '1.5rem',
        }}
      >
        Paramètres
      </h1>

      {/* Username section */}
      <section style={sectionStyle}>
        <h2 style={headingStyle}>Nom d'utilisateur</h2>
        <form onSubmit={(e) => { e.preventDefault(); usernameForm.handleSubmit() }}>
          <usernameForm.Field name="username">
            {(field) => (
              <div style={{ marginBottom: '1rem' }}>
                <Label htmlFor="username">Nom d'utilisateur</Label>
                <Input
                  id="username"
                  data-testid="settings-username-input"
                  autoComplete="username"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  style={{ marginTop: '0.25rem' }}
                />
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  Ce nom sera votre identifiant de connexion.
                </p>
                {field.state.meta.errors.length > 0 && (
                  <p style={{ color: 'var(--color-malus)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                    {typeof field.state.meta.errors[0] === 'string'
                      ? field.state.meta.errors[0]
                      : (field.state.meta.errors[0] as { message: string } | undefined)?.message}
                  </p>
                )}
              </div>
            )}
          </usernameForm.Field>
          {usernameMutation.isSuccess && (
            <p style={{ color: 'var(--color-bonus)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>Nom d'utilisateur mis a jour.</p>
          )}
          {usernameMutation.error && (
            <p style={{ color: 'var(--color-malus)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>{usernameMutation.error.message}</p>
          )}
          <Button
            type="submit"
            data-testid="settings-username-submit"
            disabled={usernameMutation.isPending}
            style={{ background: 'var(--color-brand)', color: 'white' }}
          >
            Enregistrer
          </Button>
        </form>
      </section>

      {/* Password change section */}
      <section style={sectionStyle}>
        <h2 style={headingStyle}>Mot de passe</h2>
        <form onSubmit={(e) => { e.preventDefault(); passwordForm.handleSubmit() }}>
          <passwordForm.Field name="currentPassword">
            {(field) => (
              <div style={{ marginBottom: '1rem' }}>
                <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  data-testid="settings-current-password-input"
                  value={field.state.value ?? ''}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
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
          </passwordForm.Field>
          <passwordForm.Field name="newPassword">
            {(field) => (
              <div style={{ marginBottom: '1rem' }}>
                <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                <Input
                  id="newPassword"
                  type="password"
                  data-testid="settings-new-password-input"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
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
          </passwordForm.Field>
          <passwordForm.Field name="confirmNewPassword">
            {(field) => (
              <div style={{ marginBottom: '1.5rem' }}>
                <Label htmlFor="confirmNewPassword">Confirmer le nouveau mot de passe</Label>
                <Input
                  id="confirmNewPassword"
                  type="password"
                  data-testid="settings-confirm-password-input"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
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
          </passwordForm.Field>
          {passwordMutation.isSuccess && (
            <p style={{ color: 'var(--color-bonus)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>Mot de passe mis à jour.</p>
          )}
          {passwordMutation.error && (
            <p style={{ color: 'var(--color-malus)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>{passwordMutation.error.message}</p>
          )}
          <Button
            type="submit"
            data-testid="settings-change-password-submit"
            disabled={passwordMutation.isPending}
            style={{ background: 'var(--color-brand)', color: 'white' }}
          >
            Changer le mot de passe
          </Button>
        </form>
      </section>
    </main>
  )
}
