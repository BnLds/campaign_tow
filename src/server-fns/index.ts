// Campaign TOW — Server functions barrel

// Unit domain
export { loadArmyFn, fetchUnitDeltasFn } from './unit-queries'
export type { LoadArmyResult } from './unit-queries'
export { addStatModifierFn, removeStatModifierFn, addUnitGainFn, removeUnitGainFn, toggleMountFn, updateXpFn, updatePointsFn, updateNicknameFn, sendToGraveyardFn, deleteUnitFn, restoreUnitFn } from './unit-mutations'

// Admin domain
export { createPlayerFn, listPlayersFn, deletePlayerFn, getInviteLinkFn, regenerateInviteTokenFn, generateAllMissingTokensFn } from './admin-players'
export { importArmyFn, listArmiesFn, assignArmyFn, addUnitFn, updateSubProfileFn, getArmyUnitsFn } from './admin-armies'
export { createMatchFn, deleteMatchAdminFn, listMatchesFn } from './admin-matches'

// Auth
export { logoutFn } from './logout'

// Guards type (for consumers that need GuardResult)
export type { GuardResult } from './guards'
