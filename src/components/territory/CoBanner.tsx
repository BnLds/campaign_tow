type Props = {
  coBalance: number
  factionDisplayName: string
  isFetching?: boolean
}

export function CoBanner({ coBalance, factionDisplayName, isFetching = false }: Props) {
  return (
    <div className="sticky top-0 z-10 bg-[var(--color-brand-dark)] text-white px-4 py-3">
      <div className="max-w-[720px] mx-auto flex items-baseline justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider opacity-70">Trésor royal</div>
          <div
            aria-live="polite"
            className="font-display text-3xl font-bold tabular-nums"
          >
            {coBalance.toLocaleString('fr-FR')} CO
            {isFetching && <span className="ml-2 inline-block h-2 w-2 animate-pulse rounded-full bg-white/60" aria-hidden />}
          </div>
          <div className="text-xs opacity-70 mt-0.5">{factionDisplayName}</div>
        </div>
        <div className="text-right text-xs opacity-70">
          <div>Revenu hebdo</div>
          {/* TODO Epic 5: estimated weekly income */}
          <div className="font-mono text-base">—</div>
        </div>
      </div>
    </div>
  )
}
