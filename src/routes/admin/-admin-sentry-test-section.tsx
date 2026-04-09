// Campaign TOW — Section admin de test Sentry
// Déclenche erreurs frontend, erreur backend (via /api/sentry-example) et logs.

import { useState } from 'react'
import * as Sentry from '@sentry/tanstackstart-react'
import { btnClass } from './-admin-helpers'

export function AdminSentryTestSection() {
  const [status, setStatus] = useState<string | null>(null)

  const triggerFrontendError = () => {
    throw new Error('Sentry Test Error (frontend)')
  }

  const triggerBackendError = async () => {
    setStatus('Appel de /api/sentry-example…')
    await Sentry.startSpan(
      { name: 'Admin Sentry Test Span', op: 'test' },
      async () => {
        const res = await fetch('/api/sentry-example')
        if (!res.ok) {
          throw new Error('Sentry Example Frontend Error')
        }
      },
    )
  }

  const triggerLogs = () => {
    Sentry.logger.info('User example action completed')
    Sentry.logger.warn('Slow operation detected', {
      operation: 'data_fetch',
      duration: 3500,
    })
    Sentry.logger.error('Validation failed', {
      field: 'email',
      reason: 'Invalid email',
    })
    setStatus('Logs envoyés (info / warn / error).')
  }

  return (
    <section style={{ marginTop: '2rem' }}>
      <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
        Test Sentry
      </h2>
      <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
        Vérifie la capture d'erreurs, le tracing et les logs côté Sentry.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <button type="button" className={btnClass} onClick={triggerFrontendError}>
          Break the world (frontend)
        </button>
        <button type="button" className={btnClass} onClick={triggerBackendError}>
          Break the world (backend + tracing)
        </button>
        <button type="button" className={btnClass} onClick={triggerLogs}>
          Envoyer des logs Sentry
        </button>
      </div>

      {status && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
          {status}
        </p>
      )}
    </section>
  )
}
