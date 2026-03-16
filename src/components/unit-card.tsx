// Campaign TOW — UnitCard component
// Displays a unit's base stats, campaign deltas, tier pill and border.

import React from 'react'
import type { ComposedUnitView, StatDelta, UnitGain } from '../lib/delta-composer'
import { getTierLabel, getTierColor } from '../lib/tier'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface UnitCardProps {
  unit: { id: string; name: string; type: string; xp: number }
  composedView: ComposedUnitView
  tier: 0 | 1 | 2 | 3
}

// ---------------------------------------------------------------------------
// Tier border styles
// ---------------------------------------------------------------------------

function tierBorderStyle(tier: 0 | 1 | 2 | 3): React.CSSProperties {
  switch (tier) {
    case 3:
      return {
        border: '2px solid var(--color-gold)',
        boxShadow: '0 0 8px 2px #fffcf3',
      }
    case 2:
      return { border: '1px solid var(--color-silver)' }
    case 1:
      return { border: '1px solid var(--color-bronze)' }
    default:
      return { border: '1px solid var(--color-border)' }
  }
}

// ---------------------------------------------------------------------------
// Stat keys
// ---------------------------------------------------------------------------

const STAT_KEYS = ['m', 'cc', 'ct', 'f', 'e', 'pv', 'i', 'a', 'cd'] as const

// ---------------------------------------------------------------------------
// Sub-profile section
// ---------------------------------------------------------------------------

interface SubProfileSectionProps {
  label: string
  isMount: boolean
  stats: Record<string, { value: string; delta: number | null; modified: boolean }>
  showLabel: boolean
}

function SubProfileSection({ label, isMount, stats, showLabel }: SubProfileSectionProps) {
  // Fix E1: fallback for empty sub-profile label
  const displayLabel = label.trim() || 'Profil'

  return (
    <div>
      {showLabel && (
        <div
          className="sub-profile-label"
          style={{
            textTransform: 'uppercase',
            fontSize: '0.7rem',
            fontWeight: 700,
            color: 'var(--color-section-label)',
            letterSpacing: '0.08em',
            padding: '0.375rem 0.5rem 0.25rem',
            borderTop: '1px solid var(--color-separator)',
            fontFamily: 'var(--font-body)',
          }}
        >
          {displayLabel}
          {isMount && (
            <span
              style={{
                textTransform: 'none',
                fontStyle: 'italic',
                fontWeight: 400,
                color: 'var(--color-text-secondary)',
                marginLeft: '0.375rem',
                fontSize: '0.65rem',
                letterSpacing: '0.02em',
              }}
            >
              · Monture
            </span>
          )}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          background: 'var(--color-stats-bg)',
          fontFamily: 'var(--font-body)',
          fontSize: '0.75rem',
        }}
      >
        {/* Header row */}
        <div style={{ display: 'contents' }}>
          {STAT_KEYS.map((key, idx) => (
            <div
              key={key}
              style={{
                flex: 1,
                textAlign: 'center',
                borderLeft: idx > 0 ? '1px solid var(--color-border)' : undefined,
              }}
            >
              <div
                style={{
                  padding: '0.2rem 0',
                  color: 'var(--color-text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                {key.toUpperCase()}
              </div>
              <StatCell statKey={key} entry={stats[key]} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Individual stat cell
// ---------------------------------------------------------------------------

interface StatCellProps {
  statKey: string
  entry: { value: string; delta: number | null; modified: boolean }
}

function StatCell({ entry }: StatCellProps) {
  // Fix E2: delta=0 with modified=true shows neutral (no color change)
  const isBonus = entry.modified && entry.delta !== null && entry.delta > 0
  const isMalus = entry.modified && entry.delta !== null && entry.delta < 0

  const cellStyle: React.CSSProperties = {
    padding: '0.25rem 0',
    textAlign: 'center',
    fontWeight: entry.modified ? 700 : 400,
    color: isBonus
      ? 'var(--color-bonus)'
      : isMalus
        ? 'var(--color-malus)'
        : 'var(--color-text-primary)',
    background: isBonus
      ? 'var(--color-bonus-bg)'
      : isMalus
        ? 'var(--color-malus-bg)'
        : undefined,
  }

  if (isBonus) {
    return (
      <div className="mod" style={cellStyle} data-stat-modified="true" data-delta-positive="true">
        {entry.value}
      </div>
    )
  }

  if (isMalus) {
    return (
      <div className="pen" style={cellStyle} data-stat-modified="true" data-delta-positive="false">
        {entry.value}
      </div>
    )
  }

  return <div style={cellStyle}>{entry.value}</div>
}

// ---------------------------------------------------------------------------
// Delta chips
// ---------------------------------------------------------------------------

function DeltaChips({ deltas, gains }: { deltas: StatDelta[]; gains: UnitGain[] }) {
  if (deltas.length === 0 && gains.length === 0) return null

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.375rem',
        padding: '0.5rem',
        fontFamily: 'var(--font-body)',
        fontSize: '0.75rem',
      }}
    >
      {deltas.map((d, idx) => {
        const isBonus = d.delta > 0
        const isMalus = d.delta < 0

        const chipStyle: React.CSSProperties = isBonus
          ? {
              background: 'var(--color-bonus-bg)',
              color: 'var(--color-bonus)',
              border: '1px solid var(--color-bonus-border)',
            }
          : isMalus
            ? {
                background: 'var(--color-malus-bg)',
                color: 'var(--color-malus)',
                border: '1px solid var(--color-malus-border)',
              }
            : {
                background: '#f3f4f6',
                color: '#6b7280',
                border: '1px solid #d1d5db',
              }

        const prefix = d.delta > 0 ? '+' : ''

        return (
          <span
            key={`${d.stat}-${d.delta}-${d.source}-${idx}`}
            style={{
              padding: '0.125rem 0.5rem',
              borderRadius: '9999px',
              fontWeight: 600,
              ...chipStyle,
            }}
          >
            {d.stat.toUpperCase()} {prefix}{d.delta} ({d.source})
          </span>
        )
      })}
      {gains.map((g, idx) => (
        <span
          key={`${g.id}-${idx}`}
          style={{
            padding: '0.125rem 0.5rem',
            borderRadius: '9999px',
            background: 'var(--color-bonus-bg)',
            color: 'var(--color-bonus)',
            border: '1px solid var(--color-bonus-border)',
            fontWeight: 600,
          }}
        >
          {g.description}
        </span>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main UnitCard component
// ---------------------------------------------------------------------------

export function UnitCard({ unit, composedView, tier }: UnitCardProps) {
  const tierLabel = getTierLabel(tier)
  const tierColor = getTierColor(tier)
  const borderStyle = tierBorderStyle(tier)

  return (
    <div
      data-testid={`unit-card-${unit.id}`}
      style={{
        background: 'var(--color-surface)',
        borderRadius: '0.5rem',
        overflow: 'hidden',
        marginBottom: '1rem',
        ...borderStyle,
      }}
    >
      {/* Header: unit name + tier pill */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.625rem 0.75rem',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '1rem',
            color: 'var(--color-text-primary)',
          }}
        >
          {unit.name}
        </span>
        {tier > 0 && (
          <span
            data-testid="tier-pill"
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: tierColor,
              fontFamily: 'var(--font-body)',
            }}
          >
            {tierLabel}
          </span>
        )}
      </div>

      {/* Sub-profile sections — Fix M5: showLabel always true */}
      {composedView.subProfiles.map((sp, idx) => (
        <SubProfileSection
          key={idx}
          label={sp.label}
          isMount={sp.isMount}
          stats={sp.stats}
          showLabel={true}
        />
      ))}

      {/* Delta chips */}
      <DeltaChips deltas={composedView.deltas} gains={composedView.gains} />
    </div>
  )
}
