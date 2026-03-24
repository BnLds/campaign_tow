// Campaign TOW — Settings page
// AC7: password change (requires current password for activated accounts)
// AC10: accessible via header menu for non-guest players

import { createFileRoute, redirect, useRouteContext, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useForm } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { authMiddleware } from '../lib/middleware'
import type { ServerResult } from '../lib/types'
import { changePasswordSchema, updateDisplayNameSchema } from '../lib/validators'
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

const updateDisplayNameFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator(updateDisplayNameSchema)
  .handler(async ({ context, data }): Promise<ServerResult<{ displayName: string }>> => {
    if (context.session.isGuest) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Connexion requise' } }
    }
    const { updatePlayerDisplayName } = await import('../db/queries')
    await updatePlayerDisplayName(context.session.playerId, data.displayName)
    return { success: true, data: { displayName: data.displayName } }
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
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [displayNameSuccess, setDisplayNameSuccess] = useState<string | null>(null)
  const [displayNameError, setDisplayNameError] = useState<string | null>(null)

  const passwordForm = useForm({
    defaultValues: { currentPassword: '', newPassword: '', confirmNewPassword: '' },
    validators: { onSubmit: changePasswordSchema },
    onSubmit: async ({ value }) => {
      setPasswordError(null)
      setPasswordSuccess(null)
      const result = await changePasswordFn({ data: value })
      if (result.success) {
        setPasswordSuccess('Mot de passe mis à jour.')
        passwordForm.reset()
      } else {
        setPasswordError(result.error.message)
      }
    },
  })

  const displayNameForm = useForm({
    defaultValues: { displayName: session?.displayName ?? '' },
    validators: { onSubmit: updateDisplayNameSchema },
    onSubmit: async ({ value }) => {
      setDisplayNameError(null)
      setDisplayNameSuccess(null)
      const result = await updateDisplayNameFn({ data: value })
      if (result.success) {
        setDisplayNameSuccess('Nom d\'affichage mis à jour.')
        await queryClient.invalidateQueries(sessionQueryOptions())
        await router.invalidate()
      } else {
        setDisplayNameError(result.error.message)
      }
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

      {/* Display name section */}
      <section style={sectionStyle}>
        <h2 style={headingStyle}>Nom d'affichage</h2>
        <form onSubmit={(e) => { e.preventDefault(); displayNameForm.handleSubmit() }}>
          <displayNameForm.Field name="displayName">
            {(field) => (
              <div style={{ marginBottom: '1rem' }}>
                <Label htmlFor="displayName">Nom d'affichage</Label>
                <Input
                  id="displayName"
                  data-testid="settings-display-name-input"
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
          </displayNameForm.Field>
          {displayNameSuccess && (
            <p style={{ color: 'var(--color-bonus)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>{displayNameSuccess}</p>
          )}
          {displayNameError && (
            <p style={{ color: 'var(--color-malus)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>{displayNameError}</p>
          )}
          <Button
            type="submit"
            data-testid="settings-display-name-submit"
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
          {passwordSuccess && (
            <p style={{ color: 'var(--color-bonus)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>{passwordSuccess}</p>
          )}
          {passwordError && (
            <p style={{ color: 'var(--color-malus)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>{passwordError}</p>
          )}
          <Button
            type="submit"
            data-testid="settings-change-password-submit"
            style={{ background: 'var(--color-brand)', color: 'white' }}
          >
            Changer le mot de passe
          </Button>
        </form>
      </section>
    </main>
  )
}
