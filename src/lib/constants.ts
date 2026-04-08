// Campaign TOW — Improvement constants and threshold data
// Source of truth: docs/xp_rules.md
// Story 4.2: Tier-Up Detection & Improvement Choice
// Story 4.3: Character Injuries & Unit Destruction

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Improvement = {
  id: string
  label: string
  category: 'minor' | 'major' | 'honour'
}

export type ThresholdEntry = {
  xp: number
  tierLabel: string
  majorImprovements: Improvement[]
  minorImprovements: Improvement[]
  majorCount: number  // how many major slots to pick (0 for minor/honour-only tiers)
  minorCount: number  // how many minor slots to pick (0 for major-only tiers)
}

// ---------------------------------------------------------------------------
// Skill improvement helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Déroute Sanglante XP loss per tier (Story 4.3 — AC15, Task 7.3)
// Uses TierLevel (0-4) from src/lib/tier.ts.
// Source: docs/xp_rules.md — "Destruction d'unité" section
// ---------------------------------------------------------------------------

// Honour thresholds — XP values excluded from deroute tier-down gain removal
// Champion and banner gains at these thresholds are NEVER cleared by deroute
export const HONOUR_THRESHOLDS = [3, 9, 12] as const

export const DEROUTE_XP_LOSS: Record<0 | 1 | 2 | 3 | 4, number> = {
  0: 10, // Bleusaille
  1: 10, // Aguerri
  2: 15, // Expérimenté
  3: 20, // Vétéran
  4: 30, // Légendaire
}

export const MAJOR_SKILL_OPTIONS = [
  'Bien entraîné',
  'Vétéran',
  'Tenace',
  'Mur de bouclier',
] as const

export function isMinorSkillImprovement(id: string): boolean {
  return id.endsWith('-min-skill')
}

export function isMajorSkillImprovement(id: string): boolean {
  return id.endsWith('-maj-skill')
}

// ---------------------------------------------------------------------------
// Exported canonical improvement arrays (for reference / import by tests)
// ---------------------------------------------------------------------------

export const UNIT_MINOR_IMPROVEMENTS: Improvement[] = [
  { id: 'u-min-init', label: '+1 Initiative', category: 'minor' },
  { id: 'u-min-cc', label: '+1 CC', category: 'minor' },
  { id: 'u-min-mouv', label: '+1 Mouvement (unique)', category: 'minor' },
  { id: 'u-min-cd', label: '+1 Commandement', category: 'minor' },
  { id: 'u-min-skill', label: "1 compétence de la fiche d'unité", category: 'minor' },
]

export const UNIT_MAJOR_IMPROVEMENTS: Improvement[] = [
  { id: 'u-maj-ct', label: '+1 CT', category: 'major' },
  { id: 'u-maj-f', label: '+1 Force', category: 'major' },
  { id: 'u-maj-e', label: '+1 Endurance (max +1)', category: 'major' },
  { id: 'u-maj-a', label: '+1 Attaque (max +1)', category: 'major' },
  { id: 'u-maj-skill', label: 'Compétence au choix (bien entraîné, vétéran, tenace, mur de bouclier)', category: 'major' },
]

export const CHARACTER_MINOR_IMPROVEMENTS: Improvement[] = [
  { id: 'c-min-init', label: '+1 Initiative', category: 'minor' },
  { id: 'c-min-cc', label: '+1 CC', category: 'minor' },
  { id: 'c-min-ct', label: '+1 CT', category: 'minor' },
  { id: 'c-min-mouv', label: '+1 Mouvement (unique)', category: 'minor' },
  { id: 'c-min-cd', label: '+1 Commandement', category: 'minor' },
]

export const CHARACTER_MAJOR_IMPROVEMENTS: Improvement[] = [
  { id: 'c-maj-f', label: '+1 Force', category: 'major' },
  { id: 'c-maj-e', label: '+1 Endurance', category: 'major' },
  { id: 'c-maj-pv', label: '+1 PV (max 2x)', category: 'major' },
  { id: 'c-maj-a', label: '+1 Attaque', category: 'major' },
  { id: 'c-maj-mag', label: '+1 Niveau de magie (sorcier, max 4)', category: 'major' },
  { id: 'c-maj-2min', label: '2 améliorations mineures', category: 'major' },
]

// ---------------------------------------------------------------------------
// Unit thresholds (in ascending XP order)
// Includes Honneurs de bataille (3, 9) AND visual tiers (10, 25, 50, 80)
// Each threshold uses its own improvement array instances with unique IDs
// to satisfy the uniqueness invariant across all threshold entries.
// ---------------------------------------------------------------------------

export const UNIT_THRESHOLDS: ThresholdEntry[] = [
  {
    xp: 3,
    tierLabel: 'Honneur de bataille',
    majorImprovements: [],
    minorImprovements: [
      { id: 'u-hon1-champ', label: 'Champion gratuit', category: 'honour' },
      { id: 'u-hon1-ban', label: 'Bannière gratuite', category: 'honour' },
      { id: 'u-hon1-mus', label: 'Musicien gratuit', category: 'honour' },
      { id: 'u-hon1-na', label: 'Non applicable', category: 'honour' },
    ],
    majorCount: 0,
    minorCount: 1,
  },
  {
    xp: 9,
    tierLabel: 'Honneur de bataille',
    majorImprovements: [],
    minorImprovements: [
      { id: 'u-hon2-champ', label: 'Champion gratuit', category: 'honour' },
      { id: 'u-hon2-ban', label: 'Bannière gratuite', category: 'honour' },
      { id: 'u-hon2-mus', label: 'Musicien gratuit', category: 'honour' },
      { id: 'u-hon2-na', label: 'Non applicable', category: 'honour' },
    ],
    majorCount: 0,
    minorCount: 1,
  },
  {
    xp: 12,
    tierLabel: 'Honneur de bataille',
    majorImprovements: [],
    minorImprovements: [
      { id: 'u-hon3-champ', label: 'Champion gratuit', category: 'honour' },
      { id: 'u-hon3-ban', label: 'Bannière gratuite', category: 'honour' },
      { id: 'u-hon3-mus', label: 'Musicien gratuit', category: 'honour' },
      { id: 'u-hon3-na', label: 'Non applicable', category: 'honour' },
    ],
    majorCount: 0,
    minorCount: 1,
  },
  {
    xp: 10,
    tierLabel: 'Aguerri',
    majorImprovements: [],
    minorImprovements: [
      { id: 'u-t10-min-init', label: '+1 Initiative', category: 'minor' },
      { id: 'u-t10-min-cc', label: '+1 CC', category: 'minor' },
      { id: 'u-t10-min-mouv', label: '+1 Mouvement (unique)', category: 'minor' },
      { id: 'u-t10-min-cd', label: '+1 Commandement', category: 'minor' },
      { id: 'u-t10-min-skill', label: "1 compétence de la fiche d'unité", category: 'minor' },
    ],
    majorCount: 0,
    minorCount: 1,
  },
  {
    xp: 25,
    tierLabel: 'Expérimenté',
    majorImprovements: [
      { id: 'u-maj-ct', label: '+1 CT', category: 'major' },
      { id: 'u-maj-f', label: '+1 Force', category: 'major' },
      { id: 'u-maj-e', label: '+1 Endurance (max +1)', category: 'major' },
      { id: 'u-maj-a', label: '+1 Attaque (max +1)', category: 'major' },
      { id: 'u-maj-skill', label: 'Compétence au choix (bien entraîné, vétéran, tenace, mur de bouclier)', category: 'major' },
    ],
    minorImprovements: [],
    majorCount: 1,
    minorCount: 0,
  },
  {
    xp: 50,
    tierLabel: 'Vétéran',
    majorImprovements: [],
    minorImprovements: [
      { id: 'u-t50-min-init', label: '+1 Initiative', category: 'minor' },
      { id: 'u-t50-min-cc', label: '+1 CC', category: 'minor' },
      { id: 'u-t50-min-mouv', label: '+1 Mouvement (unique)', category: 'minor' },
      { id: 'u-t50-min-cd', label: '+1 Commandement', category: 'minor' },
      { id: 'u-t50-min-skill', label: "1 compétence de la fiche d'unité", category: 'minor' },
    ],
    majorCount: 0,
    minorCount: 2,
  },
  {
    xp: 80,
    tierLabel: 'Légendaire',
    majorImprovements: [
      { id: 'u-t80-maj-ct', label: '+1 CT', category: 'major' },
      { id: 'u-t80-maj-f', label: '+1 Force', category: 'major' },
      { id: 'u-t80-maj-e', label: '+1 Endurance (max +1)', category: 'major' },
      { id: 'u-t80-maj-a', label: '+1 Attaque (max +1)', category: 'major' },
      { id: 'u-t80-maj-skill', label: 'Compétence au choix (bien entraîné, vétéran, tenace, mur de bouclier)', category: 'major' },
    ],
    minorImprovements: [
      { id: 'u-t80-min-init', label: '+1 Initiative', category: 'minor' },
      { id: 'u-t80-min-cc', label: '+1 CC', category: 'minor' },
      { id: 'u-t80-min-mouv', label: '+1 Mouvement (unique)', category: 'minor' },
      { id: 'u-t80-min-cd', label: '+1 Commandement', category: 'minor' },
      { id: 'u-t80-min-skill', label: "1 compétence de la fiche d'unité", category: 'minor' },
    ],
    majorCount: 2,
    minorCount: 1,
  },
]

// ---------------------------------------------------------------------------
// Character thresholds (in ascending XP order)
// No Honneurs de bataille for characters.
// Each threshold uses its own improvement array instances with unique IDs.
// ---------------------------------------------------------------------------

export const CHARACTER_THRESHOLDS: ThresholdEntry[] = [
  {
    xp: 6,
    tierLabel: 'Aguerri',
    majorImprovements: [],
    minorImprovements: [
      { id: 'c-t6-min-init', label: '+1 Initiative', category: 'minor' },
      { id: 'c-t6-min-cc', label: '+1 CC', category: 'minor' },
      { id: 'c-t6-min-ct', label: '+1 CT', category: 'minor' },
      { id: 'c-t6-min-mouv', label: '+1 Mouvement (unique)', category: 'minor' },
      { id: 'c-t6-min-cd', label: '+1 Commandement', category: 'minor' },
    ],
    majorCount: 0,
    minorCount: 1,
  },
  {
    xp: 20,
    tierLabel: 'Expérimenté',
    majorImprovements: [
      { id: 'c-maj-f', label: '+1 Force', category: 'major' },
      // Endurance excluded at 20 XP — not available as first major improvement
      { id: 'c-maj-pv', label: '+1 PV (max 2x)', category: 'major' },
      { id: 'c-maj-a', label: '+1 Attaque', category: 'major' },
      { id: 'c-maj-mag', label: '+1 Niveau de magie (sorcier, max 4)', category: 'major' },
      { id: 'c-maj-2min', label: '2 améliorations mineures', category: 'major' },
    ],
    minorImprovements: [],
    majorCount: 1,
    minorCount: 0,
  },
  {
    xp: 40,
    tierLabel: 'Vétéran',
    majorImprovements: [
      { id: 'c-t40-maj-f', label: '+1 Force', category: 'major' },
      // Endurance excluded at 40 XP — only available from Héroïque (70 XP)
      { id: 'c-t40-maj-pv', label: '+1 PV (max 2x)', category: 'major' },
      { id: 'c-t40-maj-a', label: '+1 Attaque', category: 'major' },
      { id: 'c-t40-maj-mag', label: '+1 Niveau de magie (sorcier, max 4)', category: 'major' },
      { id: 'c-t40-maj-2min', label: '2 améliorations mineures', category: 'major' },
    ],
    minorImprovements: [
      { id: 'c-t40-min-init', label: '+1 Initiative', category: 'minor' },
      { id: 'c-t40-min-cc', label: '+1 CC', category: 'minor' },
      { id: 'c-t40-min-ct', label: '+1 CT', category: 'minor' },
      { id: 'c-t40-min-mouv', label: '+1 Mouvement (unique)', category: 'minor' },
      { id: 'c-t40-min-cd', label: '+1 Commandement', category: 'minor' },
    ],
    majorCount: 1,
    minorCount: 2,
  },
  {
    xp: 70,
    tierLabel: 'Héroïque',
    majorImprovements: [
      { id: 'c-t70-maj-f', label: '+1 Force', category: 'major' },
      { id: 'c-t70-maj-e', label: '+1 Endurance', category: 'major' },
      { id: 'c-t70-maj-pv', label: '+1 PV (max 2x)', category: 'major' },
      { id: 'c-t70-maj-a', label: '+1 Attaque', category: 'major' },
      { id: 'c-t70-maj-mag', label: '+1 Niveau de magie (sorcier, max 4)', category: 'major' },
      { id: 'c-t70-maj-2min', label: '2 améliorations mineures', category: 'major' },
    ],
    minorImprovements: [
      { id: 'c-t70-min-init', label: '+1 Initiative', category: 'minor' },
      { id: 'c-t70-min-cc', label: '+1 CC', category: 'minor' },
      { id: 'c-t70-min-ct', label: '+1 CT', category: 'minor' },
      { id: 'c-t70-min-mouv', label: '+1 Mouvement (unique)', category: 'minor' },
      { id: 'c-t70-min-cd', label: '+1 Commandement', category: 'minor' },
    ],
    majorCount: 2,
    minorCount: 2,
  },
]
