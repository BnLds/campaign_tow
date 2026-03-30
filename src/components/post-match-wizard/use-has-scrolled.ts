import { useEffect, useRef, useState } from 'react'

/**
 * Returns [ref, hasScrolled]. Attach `ref` to an element inside a scrollable
 * container — the hook finds the nearest scrollable ancestor and flips
 * `hasScrolled` to true/false as the user scrolls.
 */
export function useHasScrolled<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null)
  const [hasScrolled, setHasScrolled] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Walk up to the first scrollable ancestor
    let scrollParent: HTMLElement | null = el.parentElement
    while (scrollParent) {
      const { overflowY } = getComputedStyle(scrollParent)
      if (overflowY === 'auto' || overflowY === 'scroll') break
      scrollParent = scrollParent.parentElement
    }
    if (!scrollParent) return

    const handler = () => setHasScrolled(scrollParent!.scrollTop > 0)
    handler() // initial check
    scrollParent.addEventListener('scroll', handler, { passive: true })
    return () => scrollParent!.removeEventListener('scroll', handler)
  }, [])

  return [ref, hasScrolled] as const
}
