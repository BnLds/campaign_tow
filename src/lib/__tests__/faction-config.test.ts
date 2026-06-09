import { describe, it, expect } from 'vitest'
import { FACTION_CONFIGS } from '../faction-config'
import type { FactionConfig } from '../faction-config'
import { CANONICAL_FACTIONS } from '@/db/seeds/factions'
import type { CanonicalFactionId } from '@/db/seeds/factions'

// Type-level assertion: TypeScript fails the build if FACTION_CONFIGS is missing a canonical ID or has extras.
const _: Record<CanonicalFactionId, FactionConfig> = FACTION_CONFIGS
void _

describe('FACTION_CONFIGS', () => {
  it('[FC-PAR-001] covers exactly the 18 canonical factions — no missing, no extra', () => {
    expect(Object.keys(FACTION_CONFIGS).sort()).toEqual(CANONICAL_FACTIONS.map(f => f.id).sort())
  })

  describe.each(CANONICAL_FACTIONS)('[$id] required fields', ({ id }) => {
    it('has an entry with valid booleans and arrays', () => {
      const config = FACTION_CONFIGS[id]
      expect(config).toBeDefined()
      expect(typeof config.colonization.canBuildVillage).toBe('boolean')
      expect(typeof config.colonization.canBuildCity).toBe('boolean')
      expect(Array.isArray(config.villageTerrainWhitelist)).toBe(true)
      expect(Array.isArray(config.cityTerrainWhitelist)).toBe(true)

      const canColonize = config.colonization.canBuildVillage || config.colonization.canBuildCity
      if (canColonize) {
        expect(config.availableBuildings.length).toBeGreaterThan(0)
      } else {
        // Daemons-of-chaos: cannot colonize but still has military buildings
        expect(Array.isArray(config.availableBuildings)).toBe(true)
      }
      expect(Array.isArray(config.automaticBuildings)).toBe(true)
    })
  })

  it('[FC-ALT-001] daemons-of-chaos: no colonization, has alternativeStructure', () => {
    expect(FACTION_CONFIGS['daemons-of-chaos']).toMatchObject({
      colonization: {
        canBuildVillage: false,
        canBuildCity: false,
        alternativeStructure: { name: 'Portail du Chaos' },
      },
    })
  })

  it('[FC-ALT-002] ogre-kingdoms: can build village but not city, has alternativeStructure', () => {
    expect(FACTION_CONFIGS['ogre-kingdoms']).toMatchObject({
      colonization: {
        canBuildVillage: true,
        canBuildCity: false,
        alternativeStructure: { name: 'Hall du Tyran' },
      },
    })
  })

  it('[FC-GOD-001] warriors-of-chaos: godConsecration with correct gods and counts', () => {
    const { godConsecration } = FACTION_CONFIGS['warriors-of-chaos']
    expect(godConsecration).toBeDefined()
    if (!godConsecration) throw new Error('unreachable: toBeDefined() already failed')
    expect({
      gods: [...godConsecration.gods].sort(),
      unitsPerVillage: godConsecration.unitsPerVillage,
      unitsPerCity: godConsecration.unitsPerCity,
    }).toEqual({
      gods: ['khorne', 'nurgle', 'slaanesh', 'tzeentch', 'undivided'],
      unitsPerVillage: 2,
      unitsPerCity: 3,
    })
    expect(godConsecration.gods).toHaveLength(5)
  })

  it('[FC-EXC-001] dark-elves: availableBuildings excludes barbier', () => {
    expect(FACTION_CONFIGS['dark-elves'].availableBuildings).not.toContain('barbier')
  })

  it('[FC-DAE-001] daemons-of-chaos: alternativeStructure has correct Portail du Chaos values', () => {
    expect(FACTION_CONFIGS['daemons-of-chaos'].colonization.alternativeStructure).toEqual({
      name: 'Portail du Chaos',
      baseCost: 0,
      upgradeCost: 300,
      baseIncome: 40,
      upgradeIncome: 80,
      baseArmyPoints: 50,
      upgradeArmyPoints: 100,
      baseSlots: 1,
      upgradeSlots: 3,
    })
  })

  it('[FC-OGR-001] ogre-kingdoms: alternativeStructure has correct Hall du Tyran values', () => {
    expect(FACTION_CONFIGS['ogre-kingdoms'].colonization.alternativeStructure).toEqual({
      name: 'Hall du Tyran',
      baseCost: 300,
      baseIncome: 50,
      baseArmyPoints: 300,
      baseSlots: 5,
    })
  })

  it('[FC-DWF-001] dwarfen-mountain-holds: cityTerrainWhitelist = [montagnes], villages unrestricted', () => {
    const config = FACTION_CONFIGS['dwarfen-mountain-holds']
    expect({ village: config.villageTerrainWhitelist, city: config.cityTerrainWhitelist })
      .toEqual({ village: [], city: ['montagnes'] })
  })

  it('[FC-ORC-001] orc-and-goblin-tribes: cityTerrainWhitelist = [montagnes], villages unrestricted', () => {
    const config = FACTION_CONFIGS['orc-and-goblin-tribes']
    expect({ village: config.villageTerrainWhitelist, city: config.cityTerrainWhitelist })
      .toEqual({ village: [], city: ['montagnes'] })
  })

  it('[FC-WEF-001] wood-elf-realms: village and city whitelisted to foret only', () => {
    const config = FACTION_CONFIGS['wood-elf-realms']
    expect({ village: config.villageTerrainWhitelist, city: config.cityTerrainWhitelist })
      .toEqual({ village: ['foret'], city: ['foret'] })
  })

  it('[FC-BST-001] beastmen-brayherds: village and city whitelisted to foret only', () => {
    const config = FACTION_CONFIGS['beastmen-brayherds']
    expect({ village: config.villageTerrainWhitelist, city: config.cityTerrainWhitelist })
      .toEqual({ village: ['foret'], city: ['foret'] })
  })

  it('[FC-DEL-001] dark-elves: automaticBuildings includes menagerie_upgraded on marais (not standard menagerie)', () => {
    const auto = FACTION_CONFIGS['dark-elves'].automaticBuildings
    expect(auto).toContainEqual({ terrain: 'marais', building: 'menagerie_upgraded', colonyType: 'village' })
    expect(auto).not.toContainEqual({ terrain: 'marais', building: 'menagerie', colonyType: 'village' })
  })

  it('[FC-DWF-002] dwarfen-mountain-holds: automaticBuildings includes mine on montagnes', () => {
    expect(FACTION_CONFIGS['dwarfen-mountain-holds'].automaticBuildings).toContainEqual({
      terrain: 'montagnes',
      building: 'mine',
      colonyType: 'village',
    })
  })
})
