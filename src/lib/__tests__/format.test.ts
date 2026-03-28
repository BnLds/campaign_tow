import { describe, it, expect } from 'vitest'
import { stripConstraintHint, isNegativeConsequenceGain, isTemporaryConsequenceGain, HONOUR_CHAMPION_LABEL, HONOUR_BANNER_LABEL } from '../format'

describe('stripConstraintHint', () => {
  describe('strips constraint hints', () => {
    it('removes trailing (unique)', () => {
      expect(stripConstraintHint('+1 Mouvement (unique)')).toBe('+1 M')
    })

    it('removes trailing (max +1)', () => {
      expect(stripConstraintHint('+1 Endurance (max +1)')).toBe('+1 E')
    })

    it('abbreviates Commandement without hint', () => {
      expect(stripConstraintHint('+1 Commandement')).toBe('+1 Cd')
    })

    it('removes trailing (max 2x)', () => {
      expect(stripConstraintHint('+1 PV (max 2x)')).toBe('+1 PV')
    })

    it('removes trailing hint with commas inside parens', () => {
      expect(stripConstraintHint('Règle spéciale (sorcier, max 4)')).toBe('Règle spéciale')
    })

    it('removes trailing hint with long content', () => {
      expect(
        stripConstraintHint('Règle spéciale (bien entraîné, vétéran, tenace, mur de bouclier)')
      ).toBe('Règle spéciale')
    })

    it('removes trailing (voir fiche)', () => {
      expect(stripConstraintHint('Règle spéciale (voir fiche)')).toBe('Règle spéciale')
    })
  })

  describe('abbreviates stat names', () => {
    it('Mouvement → M', () => {
      expect(stripConstraintHint('+1 Mouvement')).toBe('+1 M')
    })

    it('Commandement → Cd', () => {
      expect(stripConstraintHint('+1 Commandement')).toBe('+1 Cd')
    })

    it('Force → F', () => {
      expect(stripConstraintHint('+1 Force')).toBe('+1 F')
    })

    it('Endurance → E', () => {
      expect(stripConstraintHint('+1 Endurance')).toBe('+1 E')
    })

    it('Attaque → A', () => {
      expect(stripConstraintHint('+1 Attaque')).toBe('+1 A')
    })

    it('Initiative → I', () => {
      expect(stripConstraintHint('+1 Initiative')).toBe('+1 I')
    })

    it('Niveau de magie → Magie', () => {
      expect(stripConstraintHint('+1 Niveau de magie (sorcier, max 4)')).toBe('+1 Magie')
    })
  })

describe('isNegativeConsequenceGain', () => {
  it('death is negative', () => {
    expect(isNegativeConsequenceGain('death')).toBe(true)
  })

  it('banner_lost is negative', () => {
    expect(isNegativeConsequenceGain('banner_lost')).toBe(true)
  })

  it('deroute_sanglante is negative', () => {
    expect(isNegativeConsequenceGain('deroute_sanglante')).toBe(true)
  })

  it('haine is negative', () => {
    expect(isNegativeConsequenceGain('haine')).toBe(true)
  })

  it('pertes_catastrophiques is NOT negative (it is temporary)', () => {
    expect(isNegativeConsequenceGain('pertes_catastrophiques')).toBe(false)
  })

  it('tier_up is not negative', () => {
    expect(isNegativeConsequenceGain('tier_up')).toBe(false)
  })
})

describe('isTemporaryConsequenceGain', () => {
  it('pertes_catastrophiques is temporary', () => {
    expect(isTemporaryConsequenceGain('pertes_catastrophiques')).toBe(true)
  })

  it('death is not temporary', () => {
    expect(isTemporaryConsequenceGain('death')).toBe(false)
  })

  it('tier_up is not temporary', () => {
    expect(isTemporaryConsequenceGain('tier_up')).toBe(false)
  })
})

describe('HONOUR_CHAMPION_LABEL / HONOUR_BANNER_LABEL', () => {
  it('HONOUR_CHAMPION_LABEL is "Champion gratuit"', () => {
    expect(HONOUR_CHAMPION_LABEL).toBe('Champion gratuit')
  })

  it('HONOUR_BANNER_LABEL is "Bannière gratuite"', () => {
    expect(HONOUR_BANNER_LABEL).toBe('Bannière gratuite')
  })

  it('honour champion label is not negative', () => {
    expect(isNegativeConsequenceGain('honour_champion')).toBe(false)
  })

  it('honour banner label is not negative', () => {
    expect(isNegativeConsequenceGain('honour_banner')).toBe(false)
  })

  it('honour champion label is not temporary', () => {
    expect(isTemporaryConsequenceGain('honour_champion')).toBe(false)
  })
})

  describe('leaves already-short labels unchanged', () => {
    it('+1 CC stays as is', () => {
      expect(stripConstraintHint('+1 CC')).toBe('+1 CC')
    })

    it('+1 CT stays as is', () => {
      expect(stripConstraintHint('+1 CT')).toBe('+1 CT')
    })

    it('non-stat label stays as is', () => {
      expect(stripConstraintHint('Champion gratuit')).toBe('Champion gratuit')
    })

    it('empty string stays as is', () => {
      expect(stripConstraintHint('')).toBe('')
    })

    it('raw skill name "vétéran" stays as is', () => {
      expect(stripConstraintHint('vétéran')).toBe('vétéran')
    })

    it('raw skill name "Bien entraîné" stays as is', () => {
      expect(stripConstraintHint('Bien entraîné')).toBe('Bien entraîné')
    })
  })
})
