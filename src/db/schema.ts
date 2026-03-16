// Campaign TOW — Database Schema
// This is the single source of all Drizzle table definitions.

import { pgTable, text, boolean, timestamp, integer, pgEnum, uniqueIndex, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Story 3.1 — Enum for match result (enforces valid values at DB level)
export const matchResultEnum = pgEnum('match_result', ['victory', 'defeat', 'draw'])

export const players = pgTable('players', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name').notNull(),
  isAdmin: boolean('is_admin').notNull().default(false),
  isGuest: boolean('is_guest').notNull().default(false),
  hasSeenWelcome: boolean('has_seen_welcome').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  playerId: text('player_id')
    .notNull()
    .references(() => players.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Story 2.1 — Army import & player assignment

export const armies = pgTable('armies', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  faction: text('faction').notNull(),
  playerId: text('player_id').references(() => players.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const units = pgTable('units', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  armyId: text('army_id')
    .notNull()
    .references(() => armies.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type').notNull(),
  xp: integer('xp').notNull().default(0),
  points: integer('points'),
  modelCount: integer('model_count'),
  specialRules: text('special_rules'),
  options: text('options'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const subProfiles = pgTable('sub_profiles', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  unitId: text('unit_id')
    .notNull()
    .references(() => units.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').notNull().default(0),
  label: text('label').notNull(),
  m: text('m'),
  cc: text('cc'),
  ct: text('ct'),
  f: text('f'),
  e: text('e'),
  pv: text('pv'),
  i: text('i'),
  a: text('a'),
  cd: text('cd'),
  isMount: boolean('is_mount').notNull().default(false),
})

// Story 2.3 — Campaign deltas: stat modifiers and unit gains
// Story 2-3: Run `pnpm db:generate && pnpm db:push` before first deploy.
// Migration file: drizzle/0003_smiling_patriot.sql

export const statModifiers = pgTable('stat_modifiers', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  unitId: text('unit_id').notNull().references(() => units.id, { onDelete: 'cascade' }),
  stat: text('stat').notNull(),
  delta: integer('delta').notNull(),
  source: text('source').notNull(),
  temporary: boolean('temporary').notNull().default(false),
})

export const unitGains = pgTable('unit_gains', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  unitId: text('unit_id').notNull().references(() => units.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
})

// Story 3.1 — Campaign timeline: matches and participants

export const matches = pgTable('matches', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  date: timestamp('date').notNull(),
  createdByPlayerId: text('created_by_player_id').references(() => players.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('idx_matches_date').on(table.date),
])

export const matchParticipants = pgTable('match_participants', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  matchId: text('match_id').notNull().references(() => matches.id, { onDelete: 'cascade' }),
  armyId: text('army_id').notNull().references(() => armies.id, { onDelete: 'cascade' }),
  result: matchResultEnum('result'), // 'victory' | 'defeat' | 'draw' | null (pending)
  // evolutionsEnteredAt: null means evolutions not yet entered (post-match flow in epic 4)
  // nullable timestamp — set when the post-match evolution flow is completed
  evolutionsEnteredAt: timestamp('evolutions_entered_at'),
  // createdAt tracks when the participant record was inserted (not the match date)
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('mp_match_army_unique').on(table.matchId, table.armyId),
  index('idx_mp_army_id').on(table.armyId),
  index('idx_mp_match_id').on(table.matchId),
])

// Drizzle relations — matches and matchParticipants

export const matchesRelations = relations(matches, ({ many }) => ({
  participants: many(matchParticipants),
}))

export const matchParticipantsRelations = relations(matchParticipants, ({ one }) => ({
  match: one(matches, {
    fields: [matchParticipants.matchId],
    references: [matches.id],
  }),
  army: one(armies, {
    fields: [matchParticipants.armyId],
    references: [armies.id],
  }),
}))
