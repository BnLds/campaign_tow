// Canonical faction list — source of truth is docs/factions.md
// IDs are kebab-case English; name = English canonical; displayName = French label

export const CANONICAL_FACTIONS = [
  { id: 'beastmen-brayherds',      name: 'Beastmen Brayherds',      displayName: 'Braillehardes Hommes-bêtes' },
  { id: 'chaos-dwarfs',            name: 'Chaos Dwarfs',            displayName: 'Nains du Chaos' },
  { id: 'daemons-of-chaos',        name: 'Daemons of Chaos',        displayName: 'Démons du Chaos' },
  { id: 'dark-elves',              name: 'Dark Elves',              displayName: 'Elfes Noirs' },
  { id: 'dwarfen-mountain-holds',  name: 'Dwarfen Mountain Holds',  displayName: 'Forteresses Naines' },
  { id: 'empire-of-man',           name: 'Empire of Man',           displayName: "Empire de l'Homme" },
  { id: 'grand-cathay',            name: 'Grand Cathay',            displayName: 'Grand Cathay' },
  { id: 'high-elf-realms',         name: 'High Elf Realms',         displayName: 'Royaumes Hauts Elfes' },
  { id: 'kingdom-of-bretonnia',    name: 'Kingdom of Bretonnia',    displayName: 'Royaume de Bretonnie' },
  { id: 'lizardmen',               name: 'Lizardmen',               displayName: 'Hommes-Lézards' },
  { id: 'ogre-kingdoms',           name: 'Ogre Kingdoms',           displayName: 'Royaumes Ogres' },
  { id: 'orc-and-goblin-tribes',   name: 'Orc & Goblin Tribes',     displayName: 'Tribus des Orques & Gobelins' },
  { id: 'renegade-crowns',         name: 'Renegade Crowns',         displayName: 'Couronnes Renégates' },
  { id: 'skaven',                  name: 'Skaven',                  displayName: 'Skavens' },
  { id: 'tomb-kings-of-khemri',    name: 'Tomb Kings of Khemri',    displayName: 'Rois des Tombes de Khemri' },
  { id: 'vampire-counts',          name: 'Vampire Counts',          displayName: 'Comtes Vampires' },
  { id: 'warriors-of-chaos',       name: 'Warriors of Chaos',       displayName: 'Guerriers du Chaos' },
  { id: 'wood-elf-realms',         name: 'Wood Elf Realms',         displayName: 'Royaumes Elfes Sylvains' },
] as const satisfies ReadonlyArray<{ id: string; name: string; displayName: string }>

export type CanonicalFactionId = typeof CANONICAL_FACTIONS[number]['id']
