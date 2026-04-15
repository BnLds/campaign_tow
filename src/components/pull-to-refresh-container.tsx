import { useRef } from 'react'
import type { ReactNode } from 'react'
import { ChevronDown, Loader2 } from 'lucide-react'
import { usePullToRefresh } from '../hooks/use-pull-to-refresh'

type Props = {
  enabled: boolean
  onRefresh: () => Promise<void>
  children: ReactNode
}

export function PullToRefreshContainer({ enabled, onRefresh, children }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { pullDistance, isRefreshing, isArmed } = usePullToRefresh({
    scrollRef,
    onRefresh,
    enabled,
    threshold: 70,
  })

  return (
    <div
      ref={scrollRef}
      style={{
        flex: 1,
        overflowY: 'auto',
        paddingBottom: 68,
        minHeight: 0,
        position: 'relative',
        overscrollBehaviorY: 'contain',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 0,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            transform: `translateY(${pullDistance - 40}px)`,
            opacity: Math.min(pullDistance / 70, 1),
          }}
        >
          {isRefreshing ? (
            <Loader2 className="animate-spin" color="#334155" size={24} />
          ) : (
            <ChevronDown
              size={24}
              style={{
                color: isArmed ? '#d4a843' : '#334155',
                transform: `rotate(${isArmed ? 180 : 0}deg)`,
                filter: isArmed ? 'drop-shadow(0 0 6px rgba(212,168,67,0.5))' : 'none',
                transition: 'color 150ms, transform 200ms, filter 150ms',
              }}
            />
          )}
        </div>
      </div>
      <div
        style={{
          transform: `translateY(${isRefreshing ? 40 : pullDistance}px)`,
          transition: pullDistance === 0 || isRefreshing ? 'transform 250ms' : 'none',
        }}
      >
        {children}
      </div>
      <div
        role="status"
        aria-live="polite"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
        }}
      >
        {isRefreshing ? 'Chargement des données…' : ''}
      </div>
    </div>
  )
}
