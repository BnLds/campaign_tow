import { createFileRoute, redirect } from '@tanstack/react-router'
import AdminPage from './admin-page'

export const Route = createFileRoute('/admin/')({
  beforeLoad: ({ context }) => {
    const { session } = context
    if (!session?.isAdmin) {
      throw redirect({ to: '/' })
    }
  },
  component: AdminPage,
})
