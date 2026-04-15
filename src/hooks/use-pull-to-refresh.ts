import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

type Options = {
  scrollRef: RefObject<HTMLDivElement | null>
  onRefresh: () => Promise<void>
  enabled: boolean
  threshold?: number
}

type Result = { pullDistance: number; isRefreshing: boolean; isArmed: boolean }

function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(pointer: coarse)').matches
}

export function usePullToRefresh({ scrollRef, onRefresh, enabled, threshold = 70 }: Options): Result {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const startYRef = useRef<number | null>(null)
  const armedRef = useRef(false)
  const refreshingRef = useRef(false)

  const isArmed = pullDistance >= threshold * (1 - Math.exp(-1))

  useEffect(() => {
    const elOrNull = scrollRef.current
    if (!elOrNull) return
    const el: HTMLDivElement = elOrNull

    function onTouchStart(e: TouchEvent) {
      if (!enabled || !isTouchDevice()) return
      if (el.scrollTop !== 0) return
      const touch = (e.touches as unknown as Touch[])[0]
      if (!touch) return
      startYRef.current = touch.clientY
      armedRef.current = false
    }

    function onTouchMove(e: TouchEvent) {
      if (startYRef.current === null) return
      const touch = (e.touches as unknown as Touch[])[0]
      if (!touch) return
      const deltaY = touch.clientY - startYRef.current
      if (deltaY <= 0) {
        startYRef.current = null
        setPullDistance(0)
        return
      }
      e.preventDefault()
      const raw = threshold * (1 - Math.exp(-deltaY / threshold))
      const capped = Math.min(raw, threshold * 1.5)
      const nowArmed = deltaY >= threshold
      if (nowArmed && !armedRef.current) {
        armedRef.current = true
        // navigator.vibrate absent sur iOS/Safari — cast nécessaire pour contourner le type lib.dom strict
        ;(navigator.vibrate as ((ms: number) => void) | undefined)?.(10)
      }
      setPullDistance(capped)
    }

    function onTouchEnd() {
      if (startYRef.current === null) return
      startYRef.current = null
      if (!armedRef.current || refreshingRef.current) {
        setPullDistance(0)
        armedRef.current = false
        return
      }
      armedRef.current = false
      refreshingRef.current = true
      setIsRefreshing(true)
      Promise.all([onRefresh(), new Promise<void>((r) => setTimeout(r, 300))])
        .catch((err) => console.error('[pull-to-refresh] onRefresh failed:', err))
        .finally(() => {
          refreshingRef.current = false
          setIsRefreshing(false)
          setPullDistance(0)
        })
    }

    function onTouchCancel() {
      startYRef.current = null
      armedRef.current = false
      setPullDistance(0)
    }

    el.addEventListener('touchstart', onTouchStart, { passive: false })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: false })
    el.addEventListener('touchcancel', onTouchCancel, { passive: false })

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchCancel)
    }
  }, [scrollRef, onRefresh, enabled, threshold])

  return { pullDistance, isRefreshing, isArmed }
}
