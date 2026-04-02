// Campaign TOW — UnitEditPanel shared types

export interface StatModifierRow {
  id: string
  unitId: string
  stat: string
  delta: number
  source: string
  temporary: boolean
}

export interface UnitGainRow {
  id: string
  unitId: string
  description: string
  type: string
}

export interface SubProfileItem {
  id: string
  label: string
  isMount: boolean
  sortOrder: number
}
