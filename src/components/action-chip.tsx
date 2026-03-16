// Campaign TOW — ActionChip component
// Story 3.2: Displays a pending action chip in the action strip on the Campaign view.

import { useState } from 'react'

type ActionChipProps = {
  label: string
  href?: string
  onClick?: () => void
}

const baseChipStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  background: '#eef4ff',
  border: '1px solid #d7e1ef',
  borderRadius: 999,
  padding: '8px 12px',
  fontSize: 11,
  fontWeight: 700,
  color: '#334155',
  boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  textDecoration: 'none',
  fontFamily: 'var(--font-body)',
}

const hoverChipStyle: React.CSSProperties = {
  ...baseChipStyle,
  background: '#ddeeff',
}

const chevronStyle: React.CSSProperties = {
  marginLeft: 6,
  fontWeight: 900,
  opacity: 0.72,
}

export function ActionChip({ label, href, onClick }: ActionChipProps) {
  const [hovered, setHovered] = useState(false)
  const chipStyle = hovered ? hoverChipStyle : baseChipStyle

  if (href) {
    return (
      <a
        href={href}
        data-testid="action-chip"
        style={chipStyle}
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {label}
        <span style={chevronStyle}>›</span>
      </a>
    )
  }

  return (
    <button
      type="button"
      role="button"
      data-testid="action-chip"
      style={chipStyle}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {label}
      <span style={chevronStyle}>›</span>
    </button>
  )
}
