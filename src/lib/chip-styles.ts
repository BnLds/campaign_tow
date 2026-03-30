export type ChipVariant = 'bonus' | 'malus' | 'temporary' | 'neutral'

export function chipClasses(variant: ChipVariant): string {
  switch (variant) {
    case 'bonus':
      return 'bg-cw-bonus-bg text-cw-bonus border border-cw-bonus-border'
    case 'malus':
      return 'bg-cw-malus-bg text-cw-malus border border-cw-malus-border'
    case 'temporary':
      return 'bg-cw-temporary-bg text-cw-temporary border border-cw-temporary-border'
    case 'neutral':
      return 'bg-cw-neutral-bg text-cw-neutral border border-cw-neutral-border'
    default: {
      const _exhaustive: never = variant
      return _exhaustive
    }
  }
}
