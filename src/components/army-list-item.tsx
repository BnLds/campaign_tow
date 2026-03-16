// Campaign TOW — ArmyListItem component
// List item for armies with avatar, record, gold variant for own army.

import { Link } from '@tanstack/react-router'

interface ArmyListItemProps {
  id: string
  name: string
  faction: string
  playerDisplayName: string | null
  record: { wins: number; draws: number; losses: number } | null
  isOwn: boolean
}

export function ArmyListItem({ id, name, faction, playerDisplayName, record, isOwn }: ArmyListItemProps) {
  const totalMatches = record ? record.wins + record.draws + record.losses : 0

  const itemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    border: isOwn ? '1px solid #ead69b' : '1px solid #e0d5c8',
    background: isOwn
      ? 'linear-gradient(180deg, #fff9ec, #fff6eb)'
      : 'rgba(255,251,245,0.92)',
    boxShadow: isOwn ? '0 8px 22px rgba(212,168,67,0.16)' : 'none',
    marginBottom: 7,
    textDecoration: 'none',
    color: 'inherit',
  }

  const avatarStyle: React.CSSProperties = {
    width: 42,
    height: 42,
    borderRadius: '50%',
    background: isOwn ? '#f4e3b2' : '#e8ddd0',
    display: 'grid',
    placeItems: 'center',
    fontFamily: 'var(--font-display)',
    fontSize: 15,
    fontWeight: 700,
    color: isOwn ? '#8a6a10' : 'var(--color-text-primary)',
    flexShrink: 0,
  }

  const listMainStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    gap: 12,
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  }

  const listMetaStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    flexShrink: 0,
  }

  const armyNameStyle: React.CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: 13,
    color: 'var(--color-text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    margin: 0,
  }

  const subtitleStyle: React.CSSProperties = {
    fontFamily: 'var(--font-body)',
    fontSize: 10,
    color: 'var(--color-text-secondary)',
    margin: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }

  const chevronStyle: React.CSSProperties = {
    color: '#a69683',
    fontSize: 16,
    flexShrink: 0,
    alignSelf: 'center',
  }

  const ariaLabel = [
    name,
    faction,
    playerDisplayName,
    record && (record.wins + record.draws + record.losses) > 0
      ? [
          record.wins > 0 ? `${record.wins} victoire${record.wins > 1 ? 's' : ''}` : null,
          record.draws > 0 ? `${record.draws} nul${record.draws > 1 ? 's' : ''}` : null,
          record.losses > 0 ? `${record.losses} défaite${record.losses > 1 ? 's' : ''}` : null,
        ].filter(Boolean).join(', ')
      : 'aucune partie',
  ].filter(Boolean).join(', ')

  return (
    <Link
      to="/armies/$armyId"
      params={{ armyId: id }}
      data-testid="army-list-item"
      aria-label={ariaLabel}
      style={itemStyle}
    >
      <div style={listMainStyle}>
        {/* Avatar */}
        <div data-testid="army-avatar" style={avatarStyle}>
          {name.charAt(0)}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={armyNameStyle}>{name}</p>
          <p style={subtitleStyle}>
            {faction}
            {playerDisplayName && ` · ${playerDisplayName}`}
          </p>
        </div>
      </div>

      {/* Record + chevron */}
      <div style={listMetaStyle}>
        {totalMatches > 0 && record ? (
          <RecordDisplay wins={record.wins} draws={record.draws} losses={record.losses} />
        ) : (
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 10,
              color: 'var(--color-text-muted)',
              fontStyle: 'italic',
            }}
          >
            Aucune partie
          </span>
        )}
        <span style={chevronStyle}>›</span>
      </div>
    </Link>
  )
}

function RecordDisplay({ wins, draws, losses }: { wins: number; draws: number; losses: number }) {
  const parts: React.ReactNode[] = []
  if (wins > 0) parts.push(<span key="wins" style={{ color: '#2d7a3a' }}>{wins}V</span>)
  if (draws > 0) parts.push(<span key="draws" style={{ color: 'var(--color-text-secondary)' }}>{draws}N</span>)
  if (losses > 0) parts.push(<span key="losses" style={{ color: '#b82c2c' }}>{losses}D</span>)

  const separated = parts.reduce<React.ReactNode[]>((acc, part, i) => {
    if (i > 0) acc.push(<span key={`sep-${i}`} style={{ color: 'var(--color-text-muted)' }}> · </span>)
    acc.push(part)
    return acc
  }, [])

  return (
    <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 700, display: 'flex', gap: 4, alignItems: 'center' }}>
      {separated}
    </div>
  )
}
