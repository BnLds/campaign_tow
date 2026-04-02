// Campaign TOW — Shared match predicates

export function requiresUnitSelection(matchType: string): boolean {
  return matchType !== 'initial_setup'
}
