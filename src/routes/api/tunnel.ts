import { createFileRoute } from '@tanstack/react-router'

// Tunnel Sentry — proxy entre le navigateur et l'ingest Sentry pour contourner
// les ad-blockers. Voir docs.sentry.io/platforms/javascript/troubleshooting/
// (section "Dealing with Ad-Blockers").
//
// SÉCURITÉ : la whitelist host + projectId est essentielle. Sans elle, cet
// endpoint devient un proxy ouvert vers n'importe quel projet Sentry.
// On dérive ces valeurs depuis SENTRY_DSN (env) — une seule source de vérité.
const sentryDsn = process.env.SENTRY_DSN
if (process.env.NODE_ENV === 'production' && !sentryDsn) {
  throw new Error(
    '[Sentry tunnel] SENTRY_DSN environment variable is required in production',
  )
}

export const Route = createFileRoute('/api/tunnel')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!sentryDsn) {
          return new Response(null, { status: 204 })
        }

        try {
          const allowedDsn = new URL(sentryDsn)
          const sentryHost = allowedDsn.hostname
          const sentryProjectIds = new Set([
            allowedDsn.pathname.replace(/^\//, ''),
          ])

          // L'envelope doit être lue en bytes — elle peut contenir du binaire
          // (attachments, payloads Replay) qu'on ne doit pas re-sérialiser.
          const envelopeBytes = await request.arrayBuffer()
          const envelope = new TextDecoder().decode(envelopeBytes)

          const piece = envelope.split('\n')[0]
          if (!piece) {
            return new Response('invalid envelope', { status: 400 })
          }

          const header = JSON.parse(piece) as { dsn?: string }
          if (!header.dsn) {
            return new Response('missing dsn', { status: 400 })
          }

          const dsn = new URL(header.dsn)
          const projectId = dsn.pathname.replace(/^\//, '')

          if (dsn.hostname !== sentryHost) {
            return new Response('invalid sentry host', { status: 400 })
          }
          if (!sentryProjectIds.has(projectId)) {
            return new Response('invalid project id', { status: 400 })
          }

          const upstream = `https://${sentryHost}/api/${projectId}/envelope/`
          const upstreamRes = await fetch(upstream, {
            method: 'POST',
            body: envelopeBytes,
            headers: { 'Content-Type': 'application/x-sentry-envelope' },
          })

          return new Response(null, { status: upstreamRes.status })
        } catch {
          return new Response('tunnel error', { status: 500 })
        }
      },
    },
  },
})
