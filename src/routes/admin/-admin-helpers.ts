// Campaign TOW — Admin helpers (pure, no React)

import type { StatFields } from '#/db/queries/units'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const STAT_KEYS = ['m', 'cc', 'ct', 'f', 'e', 'pv', 'i', 'a', 'cd'] as const

export const btnClass = 'bg-[var(--color-brand)] text-white px-3 py-1.5 rounded-md cursor-pointer text-sm border-0'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ResultMessage = { success: boolean; message: string } | null

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

export function createEmptyStats(): StatFields {
  return { m: '', cc: '', ct: '', f: '', e: '', pv: '', i: '', a: '', cd: '' }
}
