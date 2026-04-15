// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePullToRefresh } from '../use-pull-to-refresh'

function touchEvent(type: string, clientY: number): Event {
  const e = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(e, 'touches', { value: [{ clientY }], writable: false })
  return e
}

function makeScrollDiv(scrollTop = 0): HTMLDivElement {
  const div = document.createElement('div')
  Object.defineProperty(div, 'scrollTop', { value: scrollTop, writable: true })
  document.body.appendChild(div)
  return div
}

beforeEach(() => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query === '(pointer: coarse)',
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
})

describe('usePullToRefresh', () => {
  it('scrollTop > 0 ne déclenche rien', () => {
    const el = makeScrollDiv(10)
    const scrollRef = { current: el }
    const onRefresh = vi.fn()

    const { result } = renderHook(() =>
      usePullToRefresh({ scrollRef, onRefresh, enabled: true }),
    )

    act(() => {
      el.dispatchEvent(touchEvent('touchstart', 100))
      el.dispatchEvent(touchEvent('touchmove', 200))
      el.dispatchEvent(touchEvent('touchend', 200))
    })

    expect({ pullDistance: result.current.pullDistance, called: onRefresh.mock.calls.length }).toEqual({ pullDistance: 0, called: 0 })
    document.body.removeChild(el)
  })

  it('enabled=false ne déclenche rien', () => {
    const el = makeScrollDiv(0)
    const scrollRef = { current: el }
    const onRefresh = vi.fn()

    const { result } = renderHook(() =>
      usePullToRefresh({ scrollRef, onRefresh, enabled: false }),
    )

    act(() => {
      el.dispatchEvent(touchEvent('touchstart', 100))
      el.dispatchEvent(touchEvent('touchmove', 200))
      el.dispatchEvent(touchEvent('touchend', 200))
    })

    expect({ pullDistance: result.current.pullDistance, called: onRefresh.mock.calls.length }).toEqual({ pullDistance: 0, called: 0 })
    document.body.removeChild(el)
  })

  it('desktop (pointer coarse false) est inerte', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    const el = makeScrollDiv(0)
    const scrollRef = { current: el }
    const onRefresh = vi.fn()

    const { result } = renderHook(() =>
      usePullToRefresh({ scrollRef, onRefresh, enabled: true }),
    )

    act(() => {
      el.dispatchEvent(touchEvent('touchstart', 100))
      el.dispatchEvent(touchEvent('touchmove', 200))
      el.dispatchEvent(touchEvent('touchend', 200))
    })

    expect({ pullDistance: result.current.pullDistance, called: onRefresh.mock.calls.length }).toEqual({ pullDistance: 0, called: 0 })
    document.body.removeChild(el)
  })

  it('résistance dégressive précise à deltaY=threshold', () => {
    const el = makeScrollDiv(0)
    const scrollRef = { current: el }

    const { result } = renderHook(() =>
      usePullToRefresh({ scrollRef, onRefresh: vi.fn(), enabled: true, threshold: 70 }),
    )

    act(() => {
      el.dispatchEvent(touchEvent('touchstart', 100))
      el.dispatchEvent(touchEvent('touchmove', 170))
    })

    expect(result.current.pullDistance).toBeCloseTo(70 * (1 - Math.exp(-1)), 2)
    document.body.removeChild(el)
  })

  it('franchissement arme le hook et onRefresh est appelé', async () => {
    const el = makeScrollDiv(0)
    const scrollRef = { current: el }
    const onRefresh = vi.fn().mockResolvedValue(undefined)

    const { result } = renderHook(() =>
      usePullToRefresh({ scrollRef, onRefresh, enabled: true, threshold: 70 }),
    )

    act(() => {
      el.dispatchEvent(touchEvent('touchstart', 100))
      el.dispatchEvent(touchEvent('touchmove', 400))
    })

    expect(result.current.isArmed).toBe(true)

    act(() => {
      el.dispatchEvent(touchEvent('touchend', 400))
    })

    await vi.waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1))

    await vi.waitFor(() =>
      expect({ refreshing: result.current.isRefreshing, pull: result.current.pullDistance }).toEqual({ refreshing: false, pull: 0 }),
    )

    document.body.removeChild(el)
  })

  it('deltaY insuffisant → pas de onRefresh', () => {
    const el = makeScrollDiv(0)
    const scrollRef = { current: el }
    const onRefresh = vi.fn()

    renderHook(() =>
      usePullToRefresh({ scrollRef, onRefresh, enabled: true, threshold: 70 }),
    )

    act(() => {
      el.dispatchEvent(touchEvent('touchstart', 100))
      el.dispatchEvent(touchEvent('touchmove', 130))
      el.dispatchEvent(touchEvent('touchend', 130))
    })

    expect(onRefresh).not.toHaveBeenCalled()
    document.body.removeChild(el)
  })

  it('touchcancel reset pullDistance', () => {
    const el = makeScrollDiv(0)
    const scrollRef = { current: el }

    const { result } = renderHook(() =>
      usePullToRefresh({ scrollRef, onRefresh: vi.fn(), enabled: true, threshold: 70 }),
    )

    act(() => {
      el.dispatchEvent(touchEvent('touchstart', 100))
      el.dispatchEvent(touchEvent('touchmove', 150))
      el.dispatchEvent(new Event('touchcancel', { bubbles: true }))
    })

    expect(result.current.pullDistance).toBe(0)
    document.body.removeChild(el)
  })

  it('onRefresh rejette → état reset', async () => {
    const el = makeScrollDiv(0)
    const scrollRef = { current: el }
    const onRefresh = vi.fn().mockRejectedValue(new Error('x'))

    const { result } = renderHook(() =>
      usePullToRefresh({ scrollRef, onRefresh, enabled: true, threshold: 70 }),
    )

    act(() => {
      el.dispatchEvent(touchEvent('touchstart', 100))
      el.dispatchEvent(touchEvent('touchmove', 400))
      el.dispatchEvent(touchEvent('touchend', 400))
    })

    await vi.waitFor(() => expect(result.current.isRefreshing).toBe(false))

    document.body.removeChild(el)
  })

  it('délai minimal 300ms', async () => {
    vi.useFakeTimers()
    const el = makeScrollDiv(0)
    const scrollRef = { current: el }
    const onRefresh = vi.fn(() => Promise.resolve())

    const { result } = renderHook(() =>
      usePullToRefresh({ scrollRef, onRefresh, enabled: true, threshold: 70 }),
    )

    act(() => {
      el.dispatchEvent(touchEvent('touchstart', 100))
      el.dispatchEvent(touchEvent('touchmove', 400))
      el.dispatchEvent(touchEvent('touchend', 400))
    })

    // Laisse la microtask onRefresh se résoudre avant d'avancer les timers
    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.isRefreshing).toBe(true)

    await act(async () => {
      vi.advanceTimersByTime(400)
      // Flush les microtasks issues de .finally()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(result.current.isRefreshing).toBe(false)

    vi.useRealTimers()
    document.body.removeChild(el)
  })

  it('haptic appelé au franchissement', () => {
    const vibrate = vi.fn()
    vi.stubGlobal('navigator', { ...navigator, vibrate })

    const el = makeScrollDiv(0)
    const scrollRef = { current: el }

    renderHook(() =>
      usePullToRefresh({ scrollRef, onRefresh: vi.fn(), enabled: true, threshold: 70 }),
    )

    act(() => {
      el.dispatchEvent(touchEvent('touchstart', 100))
      el.dispatchEvent(touchEvent('touchmove', 400))
    })

    expect(vibrate).toHaveBeenCalledWith(10)
    document.body.removeChild(el)
  })
})
