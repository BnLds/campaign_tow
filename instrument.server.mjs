import * as Sentry from '@sentry/tanstackstart-react'
import { isRedirect } from '@tanstack/react-router'

const AUTH_BUSINESS_MESSAGES = new Set([
  'UNAUTHORIZED',
  'FORBIDDEN',
  'BAD_REQUEST',
  'NOT_FOUND',
])

const sentryDsn = process.env.SENTRY_DSN

if (process.env.NODE_ENV === 'production' && !sentryDsn) {
  throw new Error('[Sentry server] SENTRY_DSN is required in production')
}

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: process.env.NODE_ENV ?? 'development',

    // Release = SHA du commit déployé (injecté via SENTRY_RELEASE par docker-compose).
    // Doit matcher la release sous laquelle les sourcemaps sont uploadées au build.
    release: process.env.SENTRY_RELEASE,

    // Adds request headers and IP for users, for more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/tanstackstart-react/configuration/options/#sendDefaultPii
    sendDefaultPii: true,

    // Enable logs to be sent to Sentry
    enableLogs: true,

    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for tracing.
    // We recommend adjusting this value in production
    // Learn more at
    // https://docs.sentry.io/platforms/javascript/configuration/options/#traces-sample-rate
    tracesSampleRate: 1.0,
    beforeSend(event, hint) {
      const err = hint?.originalException

      // 1. Redirects TanStack canoniques (authMiddleware + futurs usages)
      if (isRedirect(err)) return null

      // 2. Erreurs métier depuis les middlewares TanStack :
      //    message exact ET mechanism.type issu du wrapper Sentry middleware.
      //    Laisse passer les vrais bugs qui contiendraient ces strings (DB, libs tierces).
      if (err instanceof Error && AUTH_BUSINESS_MESSAGES.has(err.message)) {
        const mechanism = event.exception?.values?.[0]?.mechanism?.type
        if (mechanism?.startsWith('auto.middleware.tanstackstart')) {
          return null
        }
      }

      return event
    },
  })
}
