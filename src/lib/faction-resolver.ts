// Source of truth for variants: drizzle/0005_chemical_goliath.sql (UPDATE armies ... v.variant).
// Any change here MUST be mirrored in the SQL migration OR a follow-up migration.

import type { CanonicalFactionId } from '@/db/seeds/factions'

function normalize(raw: string): string {
  return raw
    .replace(/’|‘/g, "'") // step 1: curly apostrophes (U+2019, U+2018) -> ASCII
    .replace(/ /g, ' ')        // step 2: NBSP -> regular space
    .replace(/\s+/g, ' ')           // step 3: collapse whitespace runs
    .trim()                         // step 4: trim
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // step 5: strip diacritics (combining chars U+0300-U+036F)
    .toLowerCase()                   // step 6: lowercase (locale-independent)
}

export const FACTION_VARIANTS: ReadonlyArray<readonly [variant: string, canonicalId: CanonicalFactionId]> = [
  ['beastmen brayherds',            'beastmen-brayherds'],
  ['beastmen-brayherds',            'beastmen-brayherds'],
  ['braillehardes hommes-betes',    'beastmen-brayherds'],
  ['braillehardes hommes betes',    'beastmen-brayherds'],
  ['chaos dwarfs',                  'chaos-dwarfs'],
  ['chaos-dwarfs',                  'chaos-dwarfs'],
  ['nains du chaos',                'chaos-dwarfs'],
  ['daemons of chaos',              'daemons-of-chaos'],
  ['daemons-of-chaos',              'daemons-of-chaos'],
  ['demons of chaos',               'daemons-of-chaos'],
  ['demons du chaos',               'daemons-of-chaos'],
  ['daemons du chaos',              'daemons-of-chaos'],
  ['dark elves',                    'dark-elves'],
  ['dark-elves',                    'dark-elves'],
  ['elfes noirs',                   'dark-elves'],
  ['dwarfen mountain holds',        'dwarfen-mountain-holds'],
  ['dwarfen-mountain-holds',        'dwarfen-mountain-holds'],
  ['forteresses naines',            'dwarfen-mountain-holds'],
  ['empire of man',                 'empire-of-man'],
  ['empire-of-man',                 'empire-of-man'],
  ["empire de l'homme",             'empire-of-man'],
  ['empire de l homme',             'empire-of-man'],
  ['grand cathay',                  'grand-cathay'],
  ['grand-cathay',                  'grand-cathay'],
  ['high elf realms',               'high-elf-realms'],
  ['high-elf-realms',               'high-elf-realms'],
  ['high elves',                    'high-elf-realms'],
  ['royaumes hauts elfes',          'high-elf-realms'],
  ['kingdom of bretonnia',          'kingdom-of-bretonnia'],
  ['kingdom-of-bretonnia',          'kingdom-of-bretonnia'],
  ['royaume de bretonnie',          'kingdom-of-bretonnia'],
  ['lizardmen',                     'lizardmen'],
  ['hommes-lezards',                'lizardmen'],
  ['hommes lezards',                'lizardmen'],
  ['ogre kingdoms',                 'ogre-kingdoms'],
  ['ogre-kingdoms',                 'ogre-kingdoms'],
  ['royaumes ogres',                'ogre-kingdoms'],
  ['orc & goblin tribes',           'orc-and-goblin-tribes'],
  ['orc and goblin tribes',         'orc-and-goblin-tribes'],
  ['orc-and-goblin-tribes',         'orc-and-goblin-tribes'],
  ['tribus des orques & gobelins',  'orc-and-goblin-tribes'],
  ['tribus des orques et gobelins', 'orc-and-goblin-tribes'],
  ['orcs and goblins',              'orc-and-goblin-tribes'],
  ['orcs & goblins',                'orc-and-goblin-tribes'],
  ['renegade crowns',               'renegade-crowns'],
  ['renegade-crowns',               'renegade-crowns'],
  ['couronnes renegates',           'renegade-crowns'],
  ['skaven',                        'skaven'],
  ['skavens',                       'skaven'],
  ['skaven clans',                  'skaven'],
  ['tomb kings of khemri',          'tomb-kings-of-khemri'],
  ['tomb-kings-of-khemri',          'tomb-kings-of-khemri'],
  ['rois des tombes de khemri',     'tomb-kings-of-khemri'],
  ['vampire counts',                'vampire-counts'],
  ['vampire-counts',                'vampire-counts'],
  ['comtes vampires',               'vampire-counts'],
  ['warriors of chaos',             'warriors-of-chaos'],
  ['warriors-of-chaos',             'warriors-of-chaos'],
  ['guerriers du chaos',            'warriors-of-chaos'],
  ['wood elf realms',               'wood-elf-realms'],
  ['wood-elf-realms',               'wood-elf-realms'],
  ['wood elves',                    'wood-elf-realms'],
  ['royaumes elfes sylvains',       'wood-elf-realms'],
]

const LOOKUP = new Map<string, CanonicalFactionId>(FACTION_VARIANTS)

export function resolveCanonicalFactionId(rawFaction: string): CanonicalFactionId | null {
  const key = normalize(rawFaction)
  if (!key) return null
  return LOOKUP.get(key) ?? null
}
