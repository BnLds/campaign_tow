import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  redirect,
  useRouteContext,
  useRouter,
} from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import TanStackQueryProvider from '../integrations/tanstack-query/root-provider'
import appCss from '../styles.css?url'
import type { QueryClient } from '@tanstack/react-query'
import type { SessionData } from '../lib/auth'

// Server function: reads session server-side.
// Dynamic import keeps auth.ts (server-only) out of the client bundle.
const getSessionFn = createServerFn({ method: 'GET' }).handler(async () => {
  const { getSession } = await import('../lib/auth')
  return getSession()
})

// Server function: clears session server-side (cookie + DB row).
// Dynamic import pattern (import-protection) — do NOT throw redirect here;
// let the client navigate after the call returns.
const logoutFn = createServerFn({ method: 'POST' }).handler(async () => {
  const { deleteSession } = await import('../lib/auth')
  await deleteSession()
})

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Campaign TOW' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  beforeLoad: async ({ location }) => {
    // Always return { session } so TanStack Router updates context on every navigation.
    // Returning undefined for /login would leave stale session in context → AppHeader
    // would persist across login/logout transitions (bug: header visible on /login page).
    if (location.pathname === '/login') return { session: null as SessionData | null }

    const session = await getSessionFn()
    if (!session) {
      throw redirect({ to: '/login' })
    }
    return { session: session as SessionData | null }
  },
  component: RootLayout,
  shellComponent: RootDocument,
})

function RootLayout() {
  const { session } = useRouteContext({ from: '__root__' })

  return (
    <>
      {session && <AppHeader key={session.playerId} session={session} />}
      <Outlet />
    </>
  )
}

function AppHeader({ session }: { session: SessionData }) {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await logoutFn()
      await router.navigate({ to: '/login' })
    } catch {
      setLoggingOut(false)
    }
  }

  const btnStyle = { background: 'none', border: 'none', color: 'var(--color-brand)', cursor: loggingOut ? 'not-allowed' : 'pointer', fontSize: '0.875rem', padding: '0.5rem', opacity: loggingOut ? 0.7 : 1 }

  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.5rem 1rem',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
      }}
    >
      <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
        {session.isGuest ? 'Invité' : session.isAdmin ? 'Admin' : session.displayName}
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
        {session.isGuest ? (
          <button data-testid="login-button" onClick={handleLogout} disabled={loggingOut} style={btnStyle}>
            {loggingOut ? 'Connexion…' : 'Se connecter'}
          </button>
        ) : (
          <button data-testid="logout-button" onClick={handleLogout} disabled={loggingOut} style={btnStyle}>
            {loggingOut ? 'Déconnexion…' : 'Se déconnecter'}
          </button>
        )}
        {session.isAdmin && (
          <a href="/admin" data-testid="admin-link"
            onClick={(e) => { e.preventDefault(); router.navigate({ to: '/admin' }) }}
            style={{ color: 'var(--color-brand)', fontSize: '0.875rem', textDecoration: 'none' }}
          >Administration</a>
        )}
      </div>
    </header>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        <TanStackQueryProvider>{children}</TanStackQueryProvider>
        <Scripts />
      </body>
    </html>
  )
}
