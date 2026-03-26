import { createServerFn } from '@tanstack/react-start'

// Server function: clears session server-side (cookie + DB row).
// Dynamic import pattern (import-protection) — do NOT throw redirect here;
// let the client navigate after the call returns.
export const logoutFn = createServerFn({ method: 'POST' }).handler(async () => {
  const { deleteSession } = await import('../lib/auth')
  await deleteSession()
})
