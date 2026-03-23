// XP condition definitions for post-match wizard checkboxes
// Source of truth: docs/xp_rules.md

export type XpCondition = {
  id: string
  label: string
  xp: number
  group: 'base' | 'general' | 'exploit' | 'feat'
  inputType?: 'radio'
}

export const CHARACTER_XP_CONDITIONS: XpCondition[] = [
  { id: 'deployed', label: 'Le personnage est déployé sur le champ de bataille', xp: 1, group: 'base' },
  { id: 'alive', label: 'Le personnage est en vie et n\'est pas en fuite à la fin de la bataille', xp: 1, group: 'base' },
  { id: 'general_win', label: 'C\'est le général et il remporte la bataille', xp: 2, group: 'general', inputType: 'radio' },
  { id: 'general_draw', label: 'C\'est le général et la partie est une égalité', xp: 1, group: 'general', inputType: 'radio' },
  { id: 'exploit_duel', label: 'Exploit : Remporter un duel contre un autre personnage ou un champion qui a 2 PV ou plus', xp: 1, group: 'exploit' },
  { id: 'exploit_destroy_unit', label: 'Exploit : Détruire une unité à lui seul', xp: 1, group: 'exploit' },
  { id: 'exploit_objective', label: 'Exploit : Accomplir un objectif de scénario', xp: 1, group: 'exploit' },
  { id: 'exploit_spells', label: 'Exploit : Lancer/Dissiper 3 sorts', xp: 1, group: 'exploit' },
]

export const UNIT_XP_CONDITIONS: XpCondition[] = [
  { id: 'deployed', label: 'L\'unité est déployée sur le champ de bataille', xp: 1, group: 'base' },
  { id: 'survived', label: 'L\'unité survit à plus de 50 % et n\'est pas en fuite à la fin de la bataille', xp: 1, group: 'base' },
  { id: 'feat_destroy_unit', label: 'Fait d\'armes : Détruire une unité en combat (tir, corps à corps, poursuite)', xp: 1, group: 'feat' },
  { id: 'feat_kill_character', label: 'Fait d\'armes : Mettre hors combat un personnage ennemi', xp: 1, group: 'feat' },
  { id: 'feat_protect_baggage', label: 'Fait d\'armes : Protéger le train de bagage', xp: 1, group: 'feat' },
  { id: 'feat_destroy_baggage', label: 'Fait d\'armes : Détruire le train de bagage ennemi', xp: 1, group: 'feat' },
  { id: 'feat_objective', label: 'Fait d\'armes : Accomplir un objectif du scénario', xp: 1, group: 'feat' },
]

export function getXpConditionsForType(unitType: string): XpCondition[] {
  return unitType === 'Personnages' ? CHARACTER_XP_CONDITIONS : UNIT_XP_CONDITIONS
}

export function computeXpTotal(checkedIds: Set<string>, unitType: string): number {
  const conditions = getXpConditionsForType(unitType)
  let total = 0
  for (const condition of conditions) {
    if (checkedIds.has(condition.id)) {
      total += condition.xp
    }
  }
  return total
}
