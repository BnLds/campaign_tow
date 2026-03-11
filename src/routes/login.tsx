// Campaign TOW — Login page
// AC1: accessible without auth (no authMiddleware)
// AC2: successful login creates session cookie + redirects to /
// AC3: failed login shows inline error message

import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useForm } from '@tanstack/react-form'
import { useState, useEffect } from 'react'
import {useHydrated} from '../lib/useHydrated'
import { deleteSession, loginPlayer } from '../lib/auth'
import type { ServerResult } from '../lib/types'
import { loginSchema } from '../lib/validators'

// ---------------------------------------------------------------------------
// Server functions
// ---------------------------------------------------------------------------

export const loginFn = createServerFn({ method: 'POST' })
  .inputValidator(loginSchema)
  .handler(async ({ data }): Promise<ServerResult<{ redirect: string }>> => {
    // Same error message for wrong user + wrong password — prevents username enumeration (AC3)
    const success = await loginPlayer(data.username, data.password)
    if (!success) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Identifiant ou mot de passe incorrect' },
      }
    }
    return { success: true, data: { redirect: '/' } }
  })

export const logoutFn = createServerFn({ method: 'POST' }).handler(async () => {
  await deleteSession()
  throw redirect({ to: '/login' })
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
          Campaign TOW
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
      </div>
    </div>
  )
}
