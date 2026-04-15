import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  redirect,
  useLocation,
  useRouteContext,
  useRouter,
} from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import * as Sentry from '@sentry/tanstackstart-react'
import TanStackQueryProvider from '../integrations/tanstack-query/root-provider'
import { TabBar } from '../components/tab-bar'
import { CreateMatchFab } from '../components/create-match-fab'
import { AppHeader } from '../components/app-header'
import appCss from '../styles.css?url'
import type { QueryClient } from '@tanstack/react-query'
import type { SessionData } from '../lib/auth'
import { sessionQueryOptions, armyInfoQueryOptions } from '../lib/session-queries'
import { PullToRefreshContainer } from '../components/pull-to-refresh-container'
import { invalidateArmyState } from '../lib/invalidation-helpers'

const NO_PULL_REFRESH_PATTERNS: RegExp[] = [/^\/match\/[^/]+\/post-match/]

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { title: "Campagne TOW 2026 - Launa'Gamers" },
      { name: 'description', content: 'Suivi de campagne The Old World' },
      { name: 'theme-color', content: '#334155' },
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-title', content: 'Campagne TOW' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'manifest', href: '/manifest.webmanifest' },
      { rel: 'icon', type: 'image/png', sizes: '96x96', href: '/icons/maskable-icon-96.png' },
      { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/icons/maskable-icon-192.png' },
      { rel: 'apple-touch-icon', sizes: '192x192', href: '/icons/apple-touch-icon.png' },
    ],
  }),
  beforeLoad: async ({ location, context: { queryClient } }) => {
    // Always return { session } so TanStack Router updates context on every navigation.
    // Returning undefined for /login would leave stale session in context → AppHeader
    // would persist across login/logout transitions (bug: header visible on /login page).
    if (location.pathname === '/login' || location.pathname.startsWith('/invite')) {
      return { session: null as SessionData | null, army: null, record: null }
    }

    const session = await queryClient.ensureQueryData(sessionQueryOptions())
    if (!session) {
      throw redirect({ to: '/login' })
    }

    // Guests have no army — skip the server call entirely
    if (session.isGuest) {
      return { session, army: null, record: null }
    }

    const info = await queryClient.ensureQueryData(armyInfoQueryOptions(session.playerId))
    return {
      session,
      army: info.army,
      record: info.record,
    }
  },
  component: RootLayout,
  shellComponent: RootDocument,
  errorComponent: RootErrorComponent,
})

function RootErrorComponent({ error }: { error: Error }) {
  // Capture les exceptions SSR (beforeLoad, rendu) et client non couvertes
  // par les middlewares Sentry de start.ts. Sentry déduplique automatiquement
  // si l'erreur remonte aussi côté client lors de l'hydratation.
  Sentry.captureException(error)
  return (
    <html lang="fr">
      <body>
        <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
          <h1>Une erreur est survenue</h1>
          <p>L'équipe a été notifiée. Réessayez dans un instant.</p>
        </div>
      </body>
    </html>
  )
}

function RootLayout() {
  const { session } = useRouteContext({ from: '__root__' })
  const location = useLocation()
  const currentPath = location.pathname
  const router = useRouter()
  const queryClient = useQueryClient()
  const pullEnabled = !NO_PULL_REFRESH_PATTERNS.some((r) => r.test(currentPath))
  const handleRefresh = useCallback(
    () => invalidateArmyState(queryClient, router),
    [queryClient, router],
  )

  // Reactive queries: subscribe to cache so header updates on invalidation
  // (beforeLoad only runs on navigation, not on router.invalidate)
  const playerId = session && !session.isGuest ? session.playerId : undefined
  const { data: armyInfo } = useQuery({
    ...armyInfoQueryOptions(playerId ?? ''),
    enabled: !!playerId,
  })
  const army = armyInfo?.army ?? null
  const record = armyInfo?.record ?? null

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        minHeight: '100%',
        position: 'relative',
      }}
    >
      {session && <AppHeader key={session.playerId} session={session} army={army} record={record} />}
      <PullToRefreshContainer enabled={pullEnabled} onRefresh={handleRefresh}>
        <Outlet />
      </PullToRefreshContainer>
      {session && !session.isGuest && (
        <CreateMatchFab
          session={{ playerId: session.playerId, isGuest: session.isGuest }}
          armyId={army?.id ?? null}
          initialXpCompleted={army?.initialXpCompleted ?? false}
        />
      )}
      {session && <TabBar currentPath={currentPath} />}
    </div>
  )
}

// Capture `beforeinstallprompt` avant hydration React. Si on attend un
// useEffect pour attacher le listener, Chromium tire l'event en premier et
// on ne peut plus le rejouer — le menu "Installer" reste désactivé à vie.
// Note : on N'APPELLE PAS preventDefault() pour laisser Chrome afficher aussi
// sa mini-infobar native en parallèle du menu de l'app.
const pwaBootstrap = `
(function(){
  if (typeof window === 'undefined') return;
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(function(){});
  }
  window.addEventListener('beforeinstallprompt', function(e){
    window.__deferredPwaPrompt = e;
    window.dispatchEvent(new CustomEvent('pwa-install-available'));
  });
  window.addEventListener('appinstalled', function(){
    window.__deferredPwaPrompt = null;
    window.dispatchEvent(new CustomEvent('pwa-installed'));
  });
})();
`

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: pwaBootstrap }} />
      </head>
      <body>
        <TanStackQueryProvider>{children}</TanStackQueryProvider>
        <Scripts />
      </body>
    </html>
  )
}
