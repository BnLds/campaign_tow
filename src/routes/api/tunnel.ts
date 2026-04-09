import { createFileRoute } from '@tanstack/react-router'

// Tunnel Sentry — proxy entre le navigateur et l'ingest Sentry pour contourner
// les ad-blockers. Voir docs.sentry.io/platforms/javascript/troubleshooting/
// (section "Dealing with Ad-Blockers").
//
// SÉCURITÉ : la whitelist host + projectId est essentielle. Sans elle, cet
// endpoint devient un proxy ouvert vers n'importe quel projet Sentry.
// On dérive ces valeurs depuis SENTRY_DSN (env) — une seule source de vérité.
if (!process.env.SENTRY_DSN) {
  throw new Error('[Sentry tunnel] SENTRY_DSN environment variable is required')
}

const sentryDsn = new URL(process.env.SENTRY_DSN)
const SENTRY_HOST = sentryDsn.hostname
const SENTRY_PROJECT_IDS = new Set([sentryDsn.pathname.replace(/^\//, '')])

export const Route = createFileRoute('/api/tunnel')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
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

          if (dsn.hostname !== SENTRY_HOST) {
            return new Response('invalid sentry host', { status: 400 })
          }
          if (!SENTRY_PROJECT_IDS.has(projectId)) {
            return new Response('invalid project id', { status: 400 })
          }

          const upstream = `https://${SENTRY_HOST}/api/${projectId}/envelope/`
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
