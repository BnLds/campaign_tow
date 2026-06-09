import { describe, it, expect } from 'vitest'
import { resolveCanonicalFactionId, FACTION_VARIANTS } from '../faction-resolver'
import { CANONICAL_FACTIONS } from '@/db/seeds/factions'
import type { CanonicalFactionId } from '@/db/seeds/factions'

// Type-level guard: build fails if return type regresses to string | null
const _: CanonicalFactionId | null = resolveCanonicalFactionId('anything')
void _

// ---------------------------------------------------------------------------
// Canonical coverage — 3 variants per faction (EN name, FR displayName, id)
// ---------------------------------------------------------------------------

describe.each(CANONICAL_FACTIONS)('[$id] canonical variants', ({ id, name, displayName }) => {
  it(`EN name "${name}" resolves to "${id}"`, () => {
    expect(resolveCanonicalFactionId(name)).toBe(id)
  })
  it(`FR displayName "${displayName}" resolves to "${id}"`, () => {
    expect(resolveCanonicalFactionId(displayName)).toBe(id)
  })
  it(`kebab id "${id}" resolves to "${id}"`, () => {
    expect(resolveCanonicalFactionId(id)).toBe(id)
  })
})

// ---------------------------------------------------------------------------
// Variant count — at least 2 per faction (Grand Cathay EN=FR, so only 2 unique)
// For all other factions: EN name, FR displayName, and kebab id are 3 distinct
// normalized forms, so >= 3 entries exist in FACTION_VARIANTS.
// ---------------------------------------------------------------------------

describe.each(CANONICAL_FACTIONS)('[$id] has at least 2 variants in FACTION_VARIANTS', ({ id }) => {
  it('has >= 2 mapped variants', () => {
    const count = FACTION_VARIANTS.filter(([, cid]) => cid === id).length
    expect(count).toBeGreaterThanOrEqual(2)
  })
})

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  it.each([
    ['kingdom of bretonnia',           'kingdom-of-bretonnia'],
    ['  Royaume de Bretonnie  ',        'kingdom-of-bretonnia'],
    ['Démons du Chaos',                 'daemons-of-chaos'],
    ['Demons du Chaos',                 'daemons-of-chaos'],
    ["Empire de l’Homme",          'empire-of-man'],   // curly right apostrophe
    ['Tribus des Orques & Gobelins',    'orc-and-goblin-tribes'],
    ['Tribus des Orques et Gobelins',   'orc-and-goblin-tribes'],
    ['High Elves',                      'high-elf-realms'],
    ['Wood Elves',                      'wood-elf-realms'],
    ['Skaven Clans',                    'skaven'],
    ['Orcs & Goblins',                  'orc-and-goblin-tribes'],
    ['DARK ELVES',                      'dark-elves'],
    [' \t dark-elves \n',               'dark-elves'],
    ["empire de l’homme",          'empire-of-man'],   // curly apostrophe post-lowercase
    ['skaven clans',                    'skaven'],
  ])('"%s" → "%s"', (raw, expected) => {
    expect(resolveCanonicalFactionId(raw)).toBe(expected)
  })
})

// ---------------------------------------------------------------------------
// Unknown input returns null
// ---------------------------------------------------------------------------

describe('unknown input', () => {
  it.each([
    ['Not A Faction'],
    [''],
    ['   '],
    ['Warhammer: The Old World'],
    ['null'],
  ])('"%s" returns null', (raw) => {
    expect(resolveCanonicalFactionId(raw)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Canonical coverage — every canonical id appears in FACTION_VARIANTS
// ---------------------------------------------------------------------------

describe('canonical coverage', () => {
  it('every canonical id has at least one variant', () => {
    for (const { id } of CANONICAL_FACTIONS) {
      expect(FACTION_VARIANTS.filter(([, cid]) => cid === id).length).toBeGreaterThan(0)
    }
  })
})

// ---------------------------------------------------------------------------
// FACTION_VARIANTS integrity — no duplicate variant key mapped to different ids
// ---------------------------------------------------------------------------

describe('FACTION_VARIANTS integrity', () => {
  it('no variant key maps to more than one canonical id', () => {
    const byKey = new Map<string, CanonicalFactionId[]>()
    for (const [variant, canonicalId] of FACTION_VARIANTS) {
      const existing = byKey.get(variant) ?? []
      existing.push(canonicalId)
      byKey.set(variant, existing)
    }
    const duplicateConflicts = [...byKey.entries()]
      .filter(([, ids]) => new Set(ids).size > 1)
      .map(([variant]) => variant)
    expect(duplicateConflicts).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// SQL parity — every variant in FACTION_VARIANTS round-trips
// ---------------------------------------------------------------------------

describe('SQL parity', () => {
  it('every variant in FACTION_VARIANTS round-trips through the resolver', () => {
    for (const [variant, canonicalId] of FACTION_VARIANTS) {
      expect(resolveCanonicalFactionId(variant)).toBe(canonicalId)
    }
  })
})
