// Campaign TOW — UnitCard component
// Displays a unit's base stats, campaign deltas, tier pill and border.

import React from 'react'
import type { ComposedUnitView, ComposedSubProfile, GroupedStatDelta, GroupedUnitGain } from '../lib/delta-composer'
import { getTierLabel, tierColorClass } from '../lib/tier'
import { stripConstraintHint, isNegativeConsequenceGain, isTemporaryConsequenceGain, isLossMarkerGain } from '../lib/format'
import type { TierLevel } from '../lib/tier'
import { cn } from '#/lib/utils'
import { chipClasses } from '#/lib/chip-styles'
import { invariant } from '../lib/invariant'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface UnitCardProps {
  unit: { id: string; name: string; nickname: string | null; type: string; xp: number; points: number | null; effectivePoints: number | null }
  composedView: ComposedUnitView
  tier: TierLevel
  action?: React.ReactNode
}

// ---------------------------------------------------------------------------
// Tier border classes
// ---------------------------------------------------------------------------

function tierBorderClasses(tier: TierLevel): string {
  switch (tier) {
    case 4: return 'border-2 border-cw-gold shadow-tier-gold-lg'
    case 3: return 'border-2 border-cw-gold shadow-tier-gold'
    case 2: return 'border border-cw-silver'
    case 1: return 'border border-cw-bronze'
    default: return 'border border-cw-border'
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
      <div className="overflow-x-auto">
        <table className="table-fixed w-full border-collapse text-xs">
          <thead>
            <tr>
              <th
                scope="col"
                style={{ width: profilWidth }}
                className="whitespace-nowrap text-left text-[0.7rem] font-semibold text-cw-text-secondary px-1.5 py-0.5 border-b border-cw-border"
              >
                Profil
              </th>
              {STAT_KEYS.map((key) => (
                <th
                  key={key}
                  scope="col"
                  className="text-center text-[0.7rem] font-semibold text-cw-text-secondary py-0.5 border-b border-cw-border"
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
                    style={{ width: profilWidth }}
                    className={cn(
                      'text-left text-xs px-1.5 py-1 whitespace-nowrap bg-cw-stats-bg',
                      idx > 0 && 'border-t border-cw-border',
                      sp.isMount && 'border-l-2 border-l-cw-info',
                    )}
                  >
                    {displayLabel}
                  </td>
                  {STAT_KEYS.map((key) => (
                    <td
                      key={key}
                      className={cn(
                        'text-center border-l border-cw-border bg-cw-stats-bg p-0',
                        idx > 0 && 'border-t border-cw-border',
                      )}
                    >
                      <StatCell statKey={key} entry={invariant(sp.stats[key], `unit-card: stat '${key}' must exist in composed sub-profile`)} />
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {hasMount && (
        <div className="text-[0.7rem] text-cw-info px-2 py-1">
          <span className="inline-block size-2 bg-cw-info mr-1.5 align-middle" />
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

  if (isBonus) {
    return (
      <div
        className={cn('py-1 text-center font-bold text-cw-bonus bg-cw-bonus-bg')}
        data-stat-modified="true"
        data-delta-positive="true"
      >
        {entry.value}
      </div>
    )
  }

  if (isMalus) {
    return (
      <div
        className={cn('py-1 text-center font-bold text-cw-malus bg-cw-malus-bg')}
        data-stat-modified="true"
        data-delta-positive="false"
      >
        {entry.value}
      </div>
    )
  }

  return <div className="py-1 text-center text-cw-text-primary">{entry.value}</div>
}

// ---------------------------------------------------------------------------
// Delta chips
// ---------------------------------------------------------------------------

function DeltaChips({ deltas, gains }: { deltas: GroupedStatDelta[]; gains: GroupedUnitGain[] }) {
  if (deltas.length === 0 && gains.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5 p-2 text-xs">
      {deltas.map((d, idx) => {
        const isBonus = d.delta > 0
        const isMalusTemporary = d.delta < 0 && d.temporary
        const isMalusPermanent = d.delta < 0 && !d.temporary

        const variant = isBonus
          ? 'bonus'
          : isMalusTemporary
            ? 'temporary'
            : isMalusPermanent
              ? 'malus'
              : 'neutral'

        const prefix = d.delta > 0 ? '+' : ''

        return (
          <span
            key={`${d.stat}-${d.delta}-${d.source}-${idx}`}
            className={cn('px-2 py-0.5 rounded-full font-semibold', chipClasses(variant))}
          >
            {prefix}{d.delta} {d.stat.toUpperCase()}{d.count > 1 && ` ×${d.count}`}
          </span>
        )
      })}
      {gains
        .filter((g) => !isLossMarkerGain(g.type))
        .map((g, idx) => {
        const isTemp = isTemporaryConsequenceGain(g.type)
        const isNeg = isNegativeConsequenceGain(g.type)
        const variant = isTemp ? 'temporary' : isNeg ? 'malus' : 'bonus'
        return (
          <span
            key={`${g.id}-${idx}`}
            className={cn('px-2 py-0.5 rounded-full font-semibold', chipClasses(variant))}
          >
            {stripConstraintHint(g.description)}{g.count > 1 && ` ×${g.count}`}
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

  return (
    <div
      data-testid={`unit-card-${unit.id}`}
      className={cn('bg-cw-surface rounded-lg overflow-clip mb-4', tierBorderClasses(tier))}
    >
      {/* Header: unit name on top, XP + tier label + action below */}
      <div className="px-3 py-2.5">
        {(() => {
          const displayNickname = unit.nickname && unit.nickname !== unit.name ? unit.nickname : null
          return (
            <>
              <div className="font-cw-display font-bold text-base text-cw-text-primary">
                {displayNickname ?? unit.name}
              </div>
              {displayNickname && (
                <div className="text-[0.8125rem] text-cw-text-secondary">
                  {unit.name}
                </div>
              )}
            </>
          )
        })()}
        <div className="flex items-center gap-2 mt-1">
          {unit.points !== null && (
            <>
              <span className={cn('text-xs font-semibold',
                unit.effectivePoints !== unit.points ? 'text-cw-malus' : 'text-cw-brand'
              )}>
                {unit.effectivePoints} pts
                {unit.effectivePoints !== unit.points && (
                  <span className="text-[0.65rem] font-normal"> (÷2)</span>
                )}
              </span>
              <span className="text-cw-separator text-[0.65rem]">·</span>
            </>
          )}
          <span
            data-testid="xp-tier-label"
            className={cn('text-xs font-semibold', tierColorClass(tier))}
          >
            {unit.xp} XP{tierLabel ? ` — ${tierLabel}` : ''}
          </span>
          {action && (
            <div className="ml-auto">{action}</div>
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
