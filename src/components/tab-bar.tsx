// Campaign TOW — TabBar component
// 3 fixed tabs: Campagne / Armees / References
// Active state determined by currentPath prop

import { Link } from '@tanstack/react-router'

interface TabBarProps {
  currentPath: string
}

export function TabBar({ currentPath }: TabBarProps) {
  const isArmees = currentPath === '/armies' || currentPath.startsWith('/armies/')
  const isReferences = currentPath === '/references'
  const isCampagne = !isArmees && !isReferences && currentPath !== '/login' && !currentPath.startsWith('/admin')

  const containerStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    height: 58,
    flexShrink: 0,
    backgroundColor: 'rgba(236,228,216,0.96)',
    borderTop: '1px solid #d2c3af',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    boxShadow: '0 -6px 20px rgba(0,0,0,.04)',
    zIndex: 3,
  }

  function tabStyle(isActive: boolean): React.CSSProperties {
    return {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      borderRadius: 12,
      padding: '4px 6px',
      textDecoration: 'none',
      color: isActive ? '#334155' : '#9a8d7f',
      backgroundColor: isActive ? '#dfe8f4' : 'transparent',
      boxShadow: isActive ? 'inset 0 0 0 1px #c7d3e4' : 'none',
      position: 'relative',
      fontFamily: 'var(--font-body)',
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
    }
  }

  const iconStyle: React.CSSProperties = {
    fontSize: 16,
    lineHeight: 1,
  }

  return (
    <nav role="navigation" aria-label="Navigation principale" data-testid="tab-bar" style={containerStyle}>
      {/* Campagne tab */}
      <Link
        to="/"
        data-testid="tab-campagne"
        aria-current={isCampagne ? 'page' : undefined}
        style={tabStyle(isCampagne)}
      >
        {isCampagne && (
          <span
            style={{
              position: 'absolute',
              top: -5,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 24,
              height: 3,
              borderRadius: 999,
              background: '#334155',
            }}
          />
        )}
        <span style={iconStyle}>📜</span>
        <span>Campagne</span>
      </Link>

      {/* Armees tab */}
      <Link
        to="/armies"
        data-testid="tab-armees"
        aria-current={isArmees ? 'page' : undefined}
        style={tabStyle(isArmees)}
      >
        {isArmees && (
          <span
            style={{
              position: 'absolute',
              top: -5,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 24,
              height: 3,
              borderRadius: 999,
              background: '#334155',
            }}
          />
        )}
        <span style={iconStyle}>🛡</span>
        <span>Armees</span>
      </Link>

      {/* References tab */}
      <Link
        to="/references"
        data-testid="tab-references"
        aria-current={isReferences ? 'page' : undefined}
        style={tabStyle(isReferences)}
      >
        {isReferences && (
          <span
            style={{
              position: 'absolute',
              top: -5,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 24,
              height: 3,
              borderRadius: 999,
              background: '#334155',
            }}
          />
        )}
        <span style={iconStyle}>📖</span>
        <span>References</span>
      </Link>
    </nav>
  )
}
