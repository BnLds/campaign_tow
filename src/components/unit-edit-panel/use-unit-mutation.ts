// Campaign TOW — Shared mutation hook for UnitEditPanel sections

import { useEffect, useRef, useState } from 'react'
import type { ServerResult } from '../../lib/types'
import type { useFeedback } from './use-feedback'

export function useUnitMutation(
  feedback: ReturnType<typeof useFeedback>,
  onMutationSuccess: () => Promise<void>,
) {
  const pendingCountRef = useRef(0)
  const [isPending, setIsPending] = useState(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  async function mutate<T>(
    fn: () => Promise<ServerResult<T>>,
    opts: { successMsg: string; onSuccess?: (data: T) => void | Promise<void> },
  ): Promise<void> {
    pendingCountRef.current++
    if (mountedRef.current) setIsPending(true)
    try {
      const result = await fn()
      if (!mountedRef.current) return
      if (result.success) {
        feedback.show(opts.successMsg, false)
        await onMutationSuccess()
        await opts.onSuccess?.(result.data)
      } else {
        feedback.show(result.error.message, true)
      }
    } catch {
      if (mountedRef.current) feedback.show('Erreur réseau', true)
    } finally {
      pendingCountRef.current--
      if (mountedRef.current) setIsPending(pendingCountRef.current > 0)
    }
  }

  return { mutate, isPending }
}
