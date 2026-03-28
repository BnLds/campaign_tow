// Campaign TOW — useConsequenceForm hook
// Encapsulates form state for consequence type selection

import { useState, useMemo } from 'react'
import { getFilteredOptions } from './helpers'
import type { CampaignPlayer, ConsequenceOption, InitialConsequenceType } from './helpers'

// ---------------------------------------------------------------------------
// API interface
// ---------------------------------------------------------------------------

export interface ConsequenceFormState {
  isAdding: boolean
  selectedType: InitialConsequenceType | null
  selectedStat: string | null
  selectedPlayerId: string | null
}

export interface ConsequenceFormDerived {
  filteredOptions: ConsequenceOption[]
  needsStat: boolean
  needsPlayer: boolean
  isConfirmEnabled: boolean
  resolvedPlayer: CampaignPlayer | null
}

export interface ConsequenceFormActions {
  setIsAdding: (v: boolean) => void
  handleTypeSelect: (type: InitialConsequenceType) => void
  setSelectedStat: (stat: string | null) => void
  setSelectedPlayerId: (id: string | null) => void
  resetForm: () => void
}

export interface ConsequenceFormApi {
  state: ConsequenceFormState
  derived: ConsequenceFormDerived
  actions: ConsequenceFormActions
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useConsequenceForm(
  unitType: string,
  campaignPlayers: CampaignPlayer[]
): ConsequenceFormApi {
  const [isAdding, setIsAdding] = useState(false)
  const [selectedType, setSelectedType] = useState<InitialConsequenceType | null>(null)
  const [selectedStat, setSelectedStat] = useState<string | null>(null)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)

  const filteredOptions = useMemo(() => getFilteredOptions(unitType), [unitType])

  const needsStat = selectedType === 'permanent_injury'
  const needsPlayer = selectedType === 'haine' || selectedType === 'rancune'

  const isConfirmEnabled =
    selectedType !== null &&
    !(needsStat && selectedStat === null) &&
    !(needsPlayer && (campaignPlayers.length === 0 || selectedPlayerId === null))

  const resolvedPlayer = selectedPlayerId
    ? campaignPlayers.find((p) => p.playerId === selectedPlayerId) ?? null
    : null

  const resetForm = () => {
    setIsAdding(false)
    setSelectedType(null)
    setSelectedStat(null)
    setSelectedPlayerId(null)
  }

  const handleTypeSelect = (type: InitialConsequenceType) => {
    setSelectedType(type)
    if (type !== 'permanent_injury') setSelectedStat(null)
    if (type !== 'haine' && type !== 'rancune') setSelectedPlayerId(null)
  }

  return {
    state: { isAdding, selectedType, selectedStat, selectedPlayerId },
    derived: { filteredOptions, needsStat, needsPlayer, isConfirmEnabled, resolvedPlayer },
    actions: { setIsAdding, handleTypeSelect, setSelectedStat, setSelectedPlayerId, resetForm },
  }
}
