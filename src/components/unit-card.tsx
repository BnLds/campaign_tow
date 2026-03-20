// Campaign TOW — UnitCard component
// Displays a unit's base stats, campaign deltas, tier pill and border.

import React from 'react'
import type { ComposedUnitView, ComposedSubProfile, StatDelta, UnitGain } from '../lib/delta-composer'
import { getTierLabel, getTierColor } from '../lib/tier'
import { stripConstraintHint, isNegativeConsequenceGain, isTemporaryConsequenceGain } from '../lib/format'
import type { TierLevel } from '../lib/tier'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface UnitCardProps {
  unit: { id: string; name: string; type: string; xp: number }
  composedView: ComposedUnitView
  tier: TierLevel
  action?: React.ReactNode
}

// ---------------------------------------------------------------------------
// Tier border styles
// ---------------------------------------------------------------------------

function tierBorderStyle(tier: TierLevel): React.CSSProperties {
  switch (tier) {
    case 4:
      return {
        border: '2px solid var(--color-gold)',
        boxShadow: '0 0 12px 4px #fffcf3',
      }
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
// Stats table (compact layout — single header, all profiles as rows)
// ---------------------------------------------------------------------------

function StatsTable({ subProfiles }: { subProfiles: ComposedSubProfile[] }) {
  if (subProfiles.length === 0) return null

  // Sort: non-mount first, mount last (immutable)
  const sorted = [...subProfiles].sort(
    (a, b) => Number(a.isMount) - Number(b.isMount),
  )
  const hasMount = subProfiles.some((sp) => sp.isMount)

  // Profil column width: fit longest label (ch ≈ character width) + padding
  const maxLabelLen = Math.max(
    'Profil'.length,
    ...sorted.map((sp) => ((sp.label || '').trim() || 'Profil').length),
  )
  const profilWidth = `${maxLabelLen + 2}ch`

  return (
    <>
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            tableLayout: 'fixed',
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: 'var(--font-body)',
            fontSize: '0.75rem',
          }}
        >
          <thead>
            <tr>
              <th
                scope="col"
                style={{
                  width: profilWidth,
                  whiteSpace: 'nowrap',
                  textAlign: 'left',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: 'var(--color-text-secondary)',
                  padding: '0.2rem 0.375rem',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                Profil
              </th>
              {STAT_KEYS.map((key) => (
                <th
                  key={key}
                  scope="col"
                  style={{
                    textAlign: 'center',
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: 'var(--color-text-secondary)',
                    padding: '0.2rem 0',
                    borderBottom: '1px solid var(--color-border)',
                  }}
                >
                  {key.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((sp, idx) => {
              const displayLabel = (sp.label || '').trim() || 'Profil'
              return (
                <tr key={`${sp.label}-${sp.isMount}-${idx}`}>
                  <td
                    style={{
                      textAlign: 'left',
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-body)',
                      padding: '0.25rem 0.375rem',
                      whiteSpace: 'nowrap',
                      background: 'var(--color-stats-bg)',
                      ...(idx > 0 ? { borderTop: '1px solid var(--color-border)' } : {}),
                      ...(sp.isMount
                        ? { borderLeft: '2px solid var(--color-info)' }
                        : {}),
                    }}
                  >
                    {displayLabel}
                  </td>
                  {STAT_KEYS.map((key) => (
                    <td
                      key={key}
                      style={{
                        textAlign: 'center',
                        borderLeft: '1px solid var(--color-border)',
                        background: 'var(--color-stats-bg)',
                        padding: 0,
                        ...(idx > 0 ? { borderTop: '1px solid var(--color-border)' } : {}),
                      }}
                    >
                      <StatCell statKey={key} entry={sp.stats[key]} />
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {hasMount && (
        <div
          style={{
            fontSize: '0.7rem',
            color: 'var(--color-info)',
            padding: '0.25rem 0.5rem',
            fontFamily: 'var(--font-body)',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              background: 'var(--color-info)',
              marginRight: '0.375rem',
              verticalAlign: 'middle',
            }}
          />
          Monture
        </div>
      )}
    </>
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
        const isMalusTemporary = d.delta < 0 && d.temporary
        const isMalusPermanent = d.delta < 0 && !d.temporary

        const chipStyle: React.CSSProperties = isBonus
          ? {
              background: 'var(--color-bonus-bg)',
              color: 'var(--color-bonus)',
              border: '1px solid var(--color-bonus-border)',
            }
          : isMalusTemporary
            ? {
                background: 'var(--color-temporary-bg)',
                color: 'var(--color-temporary)',
                border: '1px solid var(--color-temporary-border)',
              }
            : isMalusPermanent
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
            {prefix}{d.delta} {d.stat.toUpperCase()}
          </span>
        )
      })}
      {gains.map((g, idx) => {
        const isTemp = isTemporaryConsequenceGain(g.description)
        const isNeg = isNegativeConsequenceGain(g.description)
        const chipColors = isTemp
          ? { bg: 'var(--color-temporary-bg)', fg: 'var(--color-temporary)', border: 'var(--color-temporary-border)' }
          : isNeg
            ? { bg: 'var(--color-malus-bg)', fg: 'var(--color-malus)', border: 'var(--color-malus-border)' }
            : { bg: 'var(--color-bonus-bg)', fg: 'var(--color-bonus)', border: 'var(--color-bonus-border)' }
        return (
          <span
            key={`${g.id}-${idx}`}
            style={{
              padding: '0.125rem 0.5rem',
              borderRadius: '9999px',
              background: chipColors.bg,
              color: chipColors.fg,
              border: `1px solid ${chipColors.border}`,
              fontWeight: 600,
            }}
          >
            {stripConstraintHint(g.description)}
          </span>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main UnitCard component
// ---------------------------------------------------------------------------

export function UnitCard({ unit, composedView, tier, action }: UnitCardProps) {
  const tierLabel = getTierLabel(tier, unit.type)
  const tierColor = getTierColor(tier)
  const borderStyle = tierBorderStyle(tier)

  return (
    <div
      data-testid={`unit-card-${unit.id}`}
      style={{
        background: 'var(--color-surface)',
        borderRadius: '0.5rem',
        overflow: 'clip',
        marginBottom: '1rem',
        ...borderStyle,
      }}
    >
      {/* Header: unit name on top, XP + tier label + action below */}
      <div style={{ padding: '0.625rem 0.75rem' }}>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '1rem',
            color: 'var(--color-text-primary)',
          }}
        >
          {unit.name}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginTop: '0.25rem',
          }}
        >
          <span
            data-testid="xp-tier-label"
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: tierColor,
              fontFamily: 'var(--font-body)',
            }}
          >
            {unit.xp} XP{tierLabel ? ` — ${tierLabel}` : ''}
          </span>
          {action && (
            <div style={{ marginLeft: 'auto' }}>{action}</div>
          )}
        </div>
      </div>

      {/* Compact stats table — all profiles as rows under single header */}
      <StatsTable subProfiles={composedView.subProfiles} />

      {/* Delta chips */}
      <DeltaChips deltas={composedView.deltas} gains={composedView.gains} />
    </div>
  )
}
