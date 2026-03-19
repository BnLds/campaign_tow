import { describe, it, expect } from 'vitest'
import { stripConstraintHint } from '../format'

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
