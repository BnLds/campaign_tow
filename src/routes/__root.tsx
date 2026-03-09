import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
  redirect,
} from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import TanStackQueryProvider from '../integrations/tanstack-query/root-provider'
import appCss from '../styles.css?url'
import type { QueryClient } from '@tanstack/react-query'

// Server function: reads session server-side.
// Dynamic import keeps auth.ts (server-only) out of the client bundle.
const getSessionFn = createServerFn({ method: 'GET' }).handler(async () => {
  const { getSession } = await import('../lib/auth')
  return getSession()
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
    // Allow the login page without authentication (AC1)
    if (location.pathname === '/login') return

    const session = await getSessionFn()
    if (!session) {
      throw redirect({ to: '/login' })
    }
    return { session }
  },
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        <TanStackQueryProvider>
          {children}
        </TanStackQueryProvider>
        <Scripts />
      </body>
    </html>
  )
}
