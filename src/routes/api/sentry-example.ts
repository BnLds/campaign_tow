// Campaign TOW — Route de test Sentry (admin uniquement)
// Déclenche volontairement une erreur côté serveur pour vérifier la capture Sentry.

import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/sentry-example')({
  server: {
    handlers: {
      GET: () => {
        throw new Error('Sentry Example Route Error')
      },
    },
  },
})
