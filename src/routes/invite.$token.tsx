// Campaign TOW — Invite link route
// AC3: first access (passwordHash null) → setup form
// AC4: subsequent access (passwordHash set) → auto-login + redirect
// AC5: invalid token → generic error page
// AC13: rate limiting per IP (10 requests / 15 min)

import { createFileRoute, redirect, Link, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useForm } from '@tanstack/react-form'
import { useState } from 'react'
import { z } from 'zod'
import type { ServerResult } from '../lib/types'
import { inviteFormSchema } from '../lib/validators'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

// ---------------------------------------------------------------------------
// Rate limiter — in-memory, per IP address
// 10 token lookups per IP per 15 min (defense-in-depth against brute-force)
// ---------------------------------------------------------------------------

const INVITE_RATE_WINDOW_MS = 15 * 60 * 1000
const INVITE_RATE_MAX = 10
const inviteAttempts = new Map<string, { count: number; resetAt: number }>()

function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  )
}

function isInviteRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = inviteAttempts.get(ip)
  if (!entry || now >= entry.resetAt) return false
  return entry.count >= INVITE_RATE_MAX
}

function recordInviteAttempt(ip: string): void {
  const now = Date.now()
  const entry = inviteAttempts.get(ip)
  if (!entry || now >= entry.resetAt) {
    inviteAttempts.set(ip, { count: 1, resetAt: now + INVITE_RATE_WINDOW_MS })
  } else {
    entry.count++
  }
  // Lazy eviction: purge expired entries when map grows large
  if (inviteAttempts.size > 1000) {
    for (const [key, val] of inviteAttempts) {
      if (now >= val.resetAt) inviteAttempts.delete(key)
    }
  }
}

// ---------------------------------------------------------------------------
// Server functions
// ---------------------------------------------------------------------------

type InvitePageData =
  | { status: 'rate_limited' }
  | { status: 'invalid' }
  | { status: 'setup'; playerId: string; username: string }
  | { status: 'activated' }

const getInviteDataFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ token: z.string() }))
  .handler(async ({ data }): Promise<InvitePageData> => {
    // Reject non-UUID tokens before hitting the DB
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(data.token)) {
      return { status: 'invalid' }
    }

    const { getRequest } = await import('@tanstack/react-start/server')
    const req = getRequest()
    const ip = getClientIp(req)

    if (isInviteRateLimited(ip)) {
      return { status: 'rate_limited' }
    }
    recordInviteAttempt(ip)

    const { getPlayerByInviteToken } = await import('../db/queries')
    const player = await getPlayerByInviteToken(data.token)
    if (!player) return { status: 'invalid' }

    if (!player.passwordHash) {
      return { status: 'setup', playerId: player.id, username: player.username }
    }

    return { status: 'activated' }
  })

const autoLoginViaInviteFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ token: z.string().uuid() }))
  .handler(async ({ data }): Promise<ServerResult<null>> => {
    const { getRequest } = await import('@tanstack/react-start/server')
    const req = getRequest()
    const ip = getClientIp(req)

    if (isInviteRateLimited(ip)) {
      return { success: false, error: { code: 'RATE_LIMITED', message: 'Trop de tentatives, réessayez plus tard.' } }
    }
    recordInviteAttempt(ip)

    const { getPlayerByInviteToken } = await import('../db/queries')
    const player = await getPlayerByInviteToken(data.token)

    if (!player || !player.passwordHash) {
      return { success: false, error: { code: 'INVALID_TOKEN', message: 'Lien invalide' } }
    }

    const { deletePlayerSessions, createSession } = await import('../lib/auth')
    await deletePlayerSessions(player.id)
    await createSession(player.id)

    return { success: true, data: null }
  })

const completeInviteSetupFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      token: z.string().uuid(),
      playerId: z.string().uuid(),
      username: z.string().trim().min(2).max(50),
      password: z.string().min(6).max(100),
    }),
  )
  .handler(async ({ data }): Promise<ServerResult<null>> => {
    const { getRequest } = await import('@tanstack/react-start/server')
    const req = getRequest()
    const ip = getClientIp(req)

    if (isInviteRateLimited(ip)) {
      return { success: false, error: { code: 'RATE_LIMITED', message: 'Trop de tentatives, réessayez plus tard.' } }
    }
    recordInviteAttempt(ip)

    // Re-verify token ownership (TOCTOU prevention)
    const { getPlayerByInviteToken, activatePlayer, checkUsernameExists } = await import('../db/queries')
    const player = await getPlayerByInviteToken(data.token)
    if (!player || player.id !== data.playerId) {
      return { success: false, error: { code: 'INVALID_TOKEN', message: 'Lien invalide' } }
    }

    if (player.passwordHash) {
      return { success: false, error: { code: 'ALREADY_ACTIVATED', message: 'Ce compte a déjà été activé' } }
    }

    // Uniqueness check — short-circuit if username unchanged (avoid false positive on own record)
    if (data.username !== player.username) {
      const taken = await checkUsernameExists(data.username, data.playerId)
      if (taken) {
        return { success: false, error: { code: 'USERNAME_TAKEN', message: "Ce nom d'utilisateur est deja pris" } }
      }
    }

    const bcryptjs = await import('bcryptjs')
    const passwordHash = await bcryptjs.hash(data.password, 12)

    try {
      await activatePlayer(data.playerId, passwordHash, data.username)
    } catch (err: unknown) {
      const { isUniqueViolation } = await import('../lib/db-errors')
      if (isUniqueViolation(err)) {
        return { success: false, error: { code: 'USERNAME_TAKEN', message: "Ce nom d'utilisateur est deja pris" } }
      }
      if (err instanceof Error && err.message === 'Player already activated') {
        return { success: false, error: { code: 'ALREADY_ACTIVATED', message: 'Ce compte a déjà été activé' } }
      }
      throw err
    }

    const { createSession } = await import('../lib/auth')
    await createSession(data.playerId)

    return { success: true, data: null }
  })

// ---------------------------------------------------------------------------
// Route definition
// ---------------------------------------------------------------------------

export const Route = createFileRoute('/invite/$token')({
  loader: async ({ params }): Promise<InvitePageData> => {
    const data = await getInviteDataFn({ data: { token: params.token } })

    if (data.status === 'activated') {
      await autoLoginViaInviteFn({ data: { token: params.token } })
      throw redirect({ to: '/' })
    }

    return data
  },
  component: InvitePage,
})

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function InvitePage() {
  const data = Route.useLoaderData()

  if (data.status === 'rate_limited') {
    return <InviteErrorPage message="Trop de tentatives, réessayez plus tard." />
  }

  if (data.status === 'invalid') {
    return <InviteErrorPage message="Lien invalide." />
  }

  return <InviteSetupForm token={Route.useParams().token} playerId={data.playerId} defaultUsername={data.username} />
}

function InviteErrorPage({ message }: { message: string }) {
  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60dvh',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.5rem',
          color: 'var(--color-text-primary)',
          marginBottom: '0.75rem',
        }}
      >
        Campaign TOW
      </h1>
      <p style={{ color: 'var(--color-malus)', marginBottom: '1.5rem' }}>{message}</p>
      <Link
        to="/login"
        style={{
          color: 'var(--color-brand)',
          fontSize: '0.875rem',
        }}
      >
        Aller à la page de connexion
      </Link>
    </main>
  )
}

function InviteSetupForm({
  token,
  playerId,
  defaultUsername,
}: {
  token: string
  playerId: string
  defaultUsername: string
}) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { username: defaultUsername, password: '', confirmPassword: '' },
    validators: { onSubmit: inviteFormSchema },
    onSubmit: async ({ value }) => {
      setServerError(null)
      const result = await completeInviteSetupFn({
        data: {
          token,
          playerId,
          username: value.username,
          password: value.password,
        },
      })
      if (result.success) {
        await router.invalidate()
        await router.navigate({ to: '/' })
      } else {
        setServerError(result.error.message)
      }
    },
  })

  return (
    <main
      style={{
        maxWidth: 400,
        margin: '0 auto',
        padding: '2rem 1rem',
      }}
    >
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.5rem',
          fontWeight: 700,
          color: 'var(--color-brand)',
          marginBottom: '0.5rem',
          textAlign: 'center',
        }}
      >
        Bienvenue dans Campaign TOW !
      </h1>
      <p
        style={{
          color: 'var(--color-text-secondary)',
          fontSize: '0.875rem',
          marginBottom: '2rem',
          textAlign: 'center',
        }}
      >
        Choisissez votre nom d'utilisateur et créez votre mot de passe pour accéder à la campagne.
      </p>

      <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}>
        <form.Field name="username">
          {(field) => (
            <div style={{ marginBottom: '1rem' }}>
              <Label htmlFor="username">Nom d'utilisateur</Label>
              <Input
                id="username"
                data-testid="invite-username-input"
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
        </form.Field>

        <form.Field name="password">
          {(field) => (
            <div style={{ marginBottom: '1rem' }}>
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                data-testid="invite-password-input"
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
        </form.Field>

        <form.Field name="confirmPassword">
          {(field) => (
            <div style={{ marginBottom: '1.5rem' }}>
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input
                id="confirmPassword"
                type="password"
                data-testid="invite-confirm-password-input"
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
        </form.Field>

        {serverError && (
          <p style={{ color: 'var(--color-malus)', fontSize: '0.875rem', marginBottom: '1rem' }}>
            {serverError}
          </p>
        )}

        <Button
          type="submit"
          data-testid="invite-submit-button"
          style={{ background: 'var(--color-brand)', color: 'white', width: '100%' }}
        >
          C'est parti
        </Button>
      </form>
    </main>
  )
}
