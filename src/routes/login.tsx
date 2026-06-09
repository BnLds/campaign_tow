// Campaign TOW — Login page
// AC1: accessible without auth (no authMiddleware)
// AC2: successful login creates session cookie + redirects to /
// AC3: failed login shows inline error message

import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from '@tanstack/react-form'
import { useState, useEffect } from 'react'
import {useHydrated} from '../lib/useHydrated'
import type { ServerResult } from '../lib/types'
import { loginSchema } from '../lib/validators'

// ---------------------------------------------------------------------------
// Login rate limiter — in-memory, per username
// 10 failed attempts per 15-minute window per username.
// Prevents brute-force on a specific account without requiring IP access.
// ---------------------------------------------------------------------------

const LOGIN_RATE_WINDOW_MS = 15 * 60 * 1000
const LOGIN_RATE_MAX = 10
const loginFailures = new Map<string, { count: number; resetAt: number }>()

function isLoginRateLimited(username: string): boolean {
  const now = Date.now()
  const entry = loginFailures.get(username)
  if (!entry || now >= entry.resetAt) return false
  return entry.count >= LOGIN_RATE_MAX
}

function recordLoginFailure(username: string): void {
  const now = Date.now()
  const entry = loginFailures.get(username)
  if (!entry || now >= entry.resetAt) {
    loginFailures.set(username, { count: 1, resetAt: now + LOGIN_RATE_WINDOW_MS })
  } else {
    entry.count++
  }
}

function clearLoginFailures(username: string): void {
  loginFailures.delete(username)
}

// ---------------------------------------------------------------------------
// Server functions
// ---------------------------------------------------------------------------

const guestLoginFn = createServerFn({ method: 'POST' }).handler(async () => {
  const { ensureGhostPlayer } = await import('../db/queries')
  const { createSession } = await import('../lib/auth')
  const ghostId = await ensureGhostPlayer()
  await createSession(ghostId)
  return { success: true }
})

const loginFn = createServerFn({ method: 'POST' })
  .validator(loginSchema)
  .handler(async ({ data }): Promise<ServerResult<{ redirect: string }>> => {
    // Rate limit check — same message as wrong credentials to prevent timing side-channels
    if (isLoginRateLimited(data.username)) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Identifiant ou mot de passe incorrect' },
      }
    }
    const { loginPlayer } = await import('../lib/auth')
    // Same error message for wrong user + wrong password — prevents username enumeration (AC3)
    const success = await loginPlayer(data.username, data.password)
    if (!success) {
      recordLoginFailure(data.username)
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Identifiant ou mot de passe incorrect' },
      }
    }
    clearLoginFailures(data.username)
    return { success: true, data: { redirect: '/' } }
  })

// ---------------------------------------------------------------------------
// Route definition
// ---------------------------------------------------------------------------

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

// ---------------------------------------------------------------------------
// Login page component
// ---------------------------------------------------------------------------

function LoginPage() {
  const router = useRouter()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const hydrated = useHydrated()

  useEffect(() => {
    if(hydrated) {
      document.documentElement.setAttribute('data-app-hydrated', 'true')
    }
  }, [hydrated])

  const queryClient = useQueryClient()

  const handleGuestLogin = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    setErrorMessage(null)
    try {
      await guestLoginFn()
      queryClient.clear()
      await router.invalidate()
      await router.navigate({ to: '/' })
    } catch {
      setErrorMessage('Erreur lors de la connexion invité')
      setIsSubmitting(false)
    }
  }

  const form = useForm({
    defaultValues: { username: '', password: '' },
    validators: { onSubmit: loginSchema },
    onSubmit: async ({ value }) => {
      setIsSubmitting(true)
      setErrorMessage(null)

      const result = await loginFn({ data: value })

      if (!result.success) {
        setErrorMessage(result.error.message)
        setIsSubmitting(false)
        return
      }

      queryClient.clear()
      await router.invalidate()
      await router.navigate({ to: result.data.redirect as '/' })
    },
  })

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          padding: '24px',
          width: '100%',
          maxWidth: '380px',
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--color-brand)',
            marginBottom: '24px',
            fontSize: '1.5rem',
            textAlign: 'center',
          }}
        >
          Campagne TOW 2026 - Launa'Gamers
        </h1>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="username"
              style={{ display: 'block', marginBottom: '4px', fontSize: '0.875rem' }}
            >
              Identifiant
            </label>
            <form.Field name="username">
              {(field) => (
                <input
                  id="username"
                  data-testid="login-username-input"
                  type="text"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  autoComplete="username"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--color-border)',
                    borderRadius: '4px',
                    fontSize: '1rem',
                    boxSizing: 'border-box',
                  }}
                />
              )}
            </form.Field>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="password"
              style={{ display: 'block', marginBottom: '4px', fontSize: '0.875rem' }}
            >
              Mot de passe
            </label>
            <form.Field name="password">
              {(field) => (
                <input
                  id="password"
                  data-testid="login-password-input"
                  type="password"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  autoComplete="current-password"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--color-border)',
                    borderRadius: '4px',
                    fontSize: '1rem',
                    boxSizing: 'border-box',
                  }}
                />
              )}
            </form.Field>
          </div>

          {errorMessage && (
            <div
              data-testid="login-error-message"
              style={{
                backgroundColor: 'var(--color-malus-bg)',
                color: 'var(--color-malus)',
                padding: '8px 12px',
                borderRadius: '4px',
                marginBottom: '16px',
                fontSize: '0.875rem',
              }}
            >
              {errorMessage}
            </div>
          )}

          <button
            data-testid="login-submit-button"
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: 'var(--color-brand)',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1rem',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            {isSubmitting ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <button
          type="button"
          onClick={handleGuestLogin}
          disabled={isSubmitting}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-info)',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem',
            marginTop: '1rem',
            textAlign: 'center',
            width: '100%',
            opacity: isSubmitting ? 0.7 : 1,
          }}
          data-testid="guest-login-link"
        >
          Continuer en tant qu'invité
        </button>
      </div>
    </div>
  )
}
