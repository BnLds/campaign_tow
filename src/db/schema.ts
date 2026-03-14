// Campaign TOW — Database Schema
// This is the single source of all Drizzle table definitions.

import { pgTable, text, boolean, timestamp, integer } from 'drizzle-orm/pg-core'

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
})
