// Source of truth: docs/faction_rule.md + docs/territory_rule.md + docs/factions.md. See Epic 1 Story 1.2.
// Known gap (Epic 3): per-faction POSITIVE city-terrain exceptions (Bretonnie sur plaine_agricole,
// Empire/Hauts Elfes/Cathay sur plaine_fluviale, Dark Elves sur marais) ne sont pas encodées —
// cityTerrainWhitelist est un whitelist NEGATIF (restrictif). Les factions qui dérogent au
// défaut `Ville: Non` sur un terrain spécifique nécessitent un champ override dédié. Voir deferred-work.md.

import { CANONICAL_FACTIONS } from '@/db/seeds/factions'
import type { CanonicalFactionId } from '@/db/seeds/factions'

export type TerrainType = 'port' | 'plaines' | 'plaine_agricole' | 'lisiere_forestiere'
  | 'montagnes' | 'foret' | 'plaine_fluviale' | 'marais'
export type ColonyType = 'village' | 'city'
export type BuildingId = 'caserne' | 'caserne_upgraded' | 'ecuries' | 'ecuries_upgraded'
  | 'menagerie' | 'menagerie_upgraded' | 'atelier' | 'atelier_upgraded'
  | 'tour_sorcier' | 'grande_tour' | 'tour_arcanes'
  | 'barbier' | 'forge' | 'ferme' | 'scierie' | 'mine'
  | 'comptoir' | 'comptoir_renforce' | 'grand_comptoir'
  | 'camp_entrainement'

export interface FactionConfig {
  id: string
  displayName: string
  colonization: {
    canBuildVillage: boolean
    canBuildCity: boolean
    alternativeStructure?: {
      name: string
      baseCost: number
      upgradeCost?: number
      baseIncome: number
      upgradeIncome?: number
      baseArmyPoints: number
      upgradeArmyPoints?: number
      baseSlots: number
      upgradeSlots?: number
    }
  }
  /** Empty = villages may be founded on any terrain (subject to default territory rules). Non-empty = villages may ONLY be founded on listed terrains. */
  villageTerrainWhitelist: TerrainType[]
  /** Empty = cities follow default territory rules. Non-empty = cities may ONLY be founded on listed terrains. Per-faction city exceptions (Bretonnie/Empire/HE/Cathay/DE) are tracked as deferred work, not encoded here. */
  cityTerrainWhitelist: TerrainType[]
  availableBuildings: BuildingId[]
  automaticBuildings: Array<{
    terrain: TerrainType
    building: BuildingId
    colonyType: ColonyType
  }>
  godConsecration?: {
    gods: string[]
    unitsPerVillage: number
    unitsPerCity: number
  }
}

function dn(id: CanonicalFactionId): string {
  const faction = CANONICAL_FACTIONS.find(f => f.id === id)
  if (!faction) throw new Error(`Unknown faction id: ${id}`)
  return faction.displayName
}

const STANDARD_BUILDINGS: BuildingId[] = [
  'caserne', 'caserne_upgraded', 'ecuries', 'ecuries_upgraded',
  'menagerie', 'menagerie_upgraded', 'atelier', 'atelier_upgraded',
  'tour_sorcier', 'grande_tour', 'tour_arcanes',
  'barbier', 'forge', 'ferme', 'scierie', 'mine',
  'comptoir', 'comptoir_renforce', 'grand_comptoir',
  'camp_entrainement',
]

const GENERIC_AUTO_BUILDINGS: FactionConfig['automaticBuildings'] = [
  { terrain: 'plaine_agricole', building: 'ferme', colonyType: 'village' },
  { terrain: 'marais', building: 'menagerie', colonyType: 'village' },
]

export const FACTION_CONFIGS: Record<CanonicalFactionId, FactionConfig> = {
  'beastmen-brayherds': {
    id: 'beastmen-brayherds',
    displayName: dn('beastmen-brayherds'),
    colonization: {
      canBuildVillage: true,
      canBuildCity: true,
    },
    villageTerrainWhitelist: ['foret'],
    cityTerrainWhitelist: ['foret'],
    availableBuildings: STANDARD_BUILDINGS,
    // TODO Epic 4 Story 4.5 — Pierre des Hardes (faction-specific free building in foret) not yet in BuildingId
    automaticBuildings: [],
  },

  'chaos-dwarfs': {
    id: 'chaos-dwarfs',
    displayName: dn('chaos-dwarfs'),
    colonization: {
      canBuildVillage: true,
      canBuildCity: true,
    },
    villageTerrainWhitelist: [],
    cityTerrainWhitelist: [],
    availableBuildings: STANDARD_BUILDINGS,
    automaticBuildings: GENERIC_AUTO_BUILDINGS,
  },

  'daemons-of-chaos': {
    id: 'daemons-of-chaos',
    displayName: dn('daemons-of-chaos'),
    colonization: {
      canBuildVillage: false,
      canBuildCity: false,
      alternativeStructure: {
        name: 'Portail du Chaos',
        baseCost: 0,
        upgradeCost: 300,
        baseIncome: 40,
        upgradeIncome: 80,
        baseArmyPoints: 50,
        upgradeArmyPoints: 100,
        baseSlots: 1,
        upgradeSlots: 3,
      },
    },
    villageTerrainWhitelist: [],
    cityTerrainWhitelist: [],
    availableBuildings: [
      'caserne', 'caserne_upgraded', 'ecuries', 'ecuries_upgraded',
      'menagerie', 'menagerie_upgraded',
      'tour_sorcier', 'grande_tour', 'tour_arcanes',
    ],
    automaticBuildings: [],
  },

  'dark-elves': {
    id: 'dark-elves',
    displayName: dn('dark-elves'),
    colonization: {
      canBuildVillage: true,
      canBuildCity: true,
    },
    villageTerrainWhitelist: [],
    cityTerrainWhitelist: [],
    availableBuildings: STANDARD_BUILDINGS.filter(b => b !== 'barbier'),
    automaticBuildings: [
      // Règle faction : ménagerie niv. 2 gratuite sur marais (écrase la règle générique niv. 1). Voir docs/faction_rule.md § Elfes Noirs.
      { terrain: 'marais', building: 'menagerie_upgraded', colonyType: 'village' },
      { terrain: 'plaine_agricole', building: 'ferme', colonyType: 'village' },
    ],
  },

  'dwarfen-mountain-holds': {
    id: 'dwarfen-mountain-holds',
    displayName: dn('dwarfen-mountain-holds'),
    colonization: {
      canBuildVillage: true,
      canBuildCity: true,
    },
    villageTerrainWhitelist: [],
    cityTerrainWhitelist: ['montagnes'],
    // Wizard tower chain semantically replaced by Runic equivalents — BuildingId keys preserved;
    // cost table defers to Epic 4
    availableBuildings: STANDARD_BUILDINGS,
    automaticBuildings: [
      { terrain: 'montagnes', building: 'mine', colonyType: 'village' },
      { terrain: 'plaine_agricole', building: 'ferme', colonyType: 'village' },
      { terrain: 'marais', building: 'menagerie', colonyType: 'village' },
    ],
  },

  'empire-of-man': {
    id: 'empire-of-man',
    displayName: dn('empire-of-man'),
    colonization: {
      canBuildVillage: true,
      canBuildCity: true,
    },
    villageTerrainWhitelist: [],
    cityTerrainWhitelist: [],
    availableBuildings: STANDARD_BUILDINGS,
    automaticBuildings: GENERIC_AUTO_BUILDINGS,
  },

  'grand-cathay': {
    id: 'grand-cathay',
    displayName: dn('grand-cathay'),
    colonization: {
      canBuildVillage: true,
      canBuildCity: true,
    },
    villageTerrainWhitelist: [],
    cityTerrainWhitelist: [],
    availableBuildings: STANDARD_BUILDINGS,
    automaticBuildings: GENERIC_AUTO_BUILDINGS,
  },

  'high-elf-realms': {
    id: 'high-elf-realms',
    displayName: dn('high-elf-realms'),
    colonization: {
      canBuildVillage: true,
      canBuildCity: true,
    },
    villageTerrainWhitelist: [],
    cityTerrainWhitelist: [],
    availableBuildings: STANDARD_BUILDINGS,
    automaticBuildings: GENERIC_AUTO_BUILDINGS,
  },

  'kingdom-of-bretonnia': {
    id: 'kingdom-of-bretonnia',
    displayName: dn('kingdom-of-bretonnia'),
    colonization: {
      canBuildVillage: true,
      canBuildCity: true,
    },
    villageTerrainWhitelist: [],
    cityTerrainWhitelist: [],
    availableBuildings: STANDARD_BUILDINGS,
    automaticBuildings: [
      { terrain: 'plaine_agricole', building: 'ferme', colonyType: 'village' },
      { terrain: 'marais', building: 'menagerie', colonyType: 'village' },
    ],
  },

  'lizardmen': {
    id: 'lizardmen',
    displayName: dn('lizardmen'),
    colonization: {
      canBuildVillage: true,
      canBuildCity: true,
    },
    villageTerrainWhitelist: [],
    cityTerrainWhitelist: [],
    availableBuildings: STANDARD_BUILDINGS,
    automaticBuildings: GENERIC_AUTO_BUILDINGS,
  },

  'ogre-kingdoms': {
    id: 'ogre-kingdoms',
    displayName: dn('ogre-kingdoms'),
    colonization: {
      canBuildVillage: true,
      canBuildCity: false,
      alternativeStructure: {
        // Hall du Tyran valeurs finales (AC #3). Grand Hall du Tyran (upgrade) : règles à venir → pas d'upgradeCost/upgradeIncome encodé, voir Epic 4.
        name: 'Hall du Tyran',
        baseCost: 300,
        baseIncome: 50,
        baseArmyPoints: 300,
        baseSlots: 5,
      },
    },
    villageTerrainWhitelist: [],
    cityTerrainWhitelist: [],
    availableBuildings: STANDARD_BUILDINGS,
    automaticBuildings: GENERIC_AUTO_BUILDINGS,
  },

  'orc-and-goblin-tribes': {
    id: 'orc-and-goblin-tribes',
    displayName: dn('orc-and-goblin-tribes'),
    colonization: {
      canBuildVillage: true,
      canBuildCity: true,
    },
    villageTerrainWhitelist: [],
    cityTerrainWhitelist: ['montagnes'],
    availableBuildings: STANDARD_BUILDINGS,
    automaticBuildings: GENERIC_AUTO_BUILDINGS,
  },

  'renegade-crowns': {
    id: 'renegade-crowns',
    displayName: dn('renegade-crowns'),
    colonization: {
      canBuildVillage: true,
      canBuildCity: true,
    },
    villageTerrainWhitelist: [],
    cityTerrainWhitelist: [],
    availableBuildings: STANDARD_BUILDINGS,
    automaticBuildings: GENERIC_AUTO_BUILDINGS,
  },

  'skaven': {
    id: 'skaven',
    displayName: dn('skaven'),
    colonization: {
      canBuildVillage: true,
      canBuildCity: true,
    },
    villageTerrainWhitelist: [],
    cityTerrainWhitelist: [],
    availableBuildings: STANDARD_BUILDINGS,
    automaticBuildings: GENERIC_AUTO_BUILDINGS,
  },

  'tomb-kings-of-khemri': {
    id: 'tomb-kings-of-khemri',
    displayName: dn('tomb-kings-of-khemri'),
    colonization: {
      canBuildVillage: true,
      canBuildCity: true,
    },
    villageTerrainWhitelist: [],
    cityTerrainWhitelist: [],
    availableBuildings: STANDARD_BUILDINGS,
    automaticBuildings: GENERIC_AUTO_BUILDINGS,
  },

  'vampire-counts': {
    id: 'vampire-counts',
    displayName: dn('vampire-counts'),
    colonization: {
      canBuildVillage: true,
      canBuildCity: true,
    },
    villageTerrainWhitelist: [],
    cityTerrainWhitelist: [],
    availableBuildings: STANDARD_BUILDINGS,
    automaticBuildings: GENERIC_AUTO_BUILDINGS,
  },

  'warriors-of-chaos': {
    id: 'warriors-of-chaos',
    displayName: dn('warriors-of-chaos'),
    colonization: {
      canBuildVillage: true,
      canBuildCity: true,
    },
    villageTerrainWhitelist: [],
    cityTerrainWhitelist: [],
    availableBuildings: STANDARD_BUILDINGS,
    automaticBuildings: GENERIC_AUTO_BUILDINGS,
    godConsecration: {
      gods: ['khorne', 'tzeentch', 'nurgle', 'slaanesh', 'undivided'],
      unitsPerVillage: 2,
      unitsPerCity: 3,
    },
  },

  'wood-elf-realms': {
    id: 'wood-elf-realms',
    displayName: dn('wood-elf-realms'),
    colonization: {
      canBuildVillage: true,
      canBuildCity: true,
    },
    villageTerrainWhitelist: ['foret'],
    cityTerrainWhitelist: ['foret'],
    availableBuildings: STANDARD_BUILDINGS,
    automaticBuildings: GENERIC_AUTO_BUILDINGS,
  },
}
