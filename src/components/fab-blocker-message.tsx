import { FAB_BOTTOM } from '../lib/layout-constants'

export function FabBlockerMessage({
  visible,
  message,
}: {
  visible: boolean
  message: string
}) {
  if (!visible) return null

  return (
    <div
      style={{
        position: 'absolute',
        bottom: FAB_BOTTOM + 68,
        right: 16,
        background: 'var(--color-brand-dark)',
        color: 'var(--color-surface)',
        padding: '8px 14px',
        borderRadius: 8,
        fontSize: 13,
        zIndex: 3,
        maxWidth: 260,
        textAlign: 'right',
      }}
    >
      {message}
    </div>
  )
}
