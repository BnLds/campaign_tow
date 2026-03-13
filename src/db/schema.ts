// Campaign TOW — Database Schema
// This is the single source of all Drizzle table definitions.

import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core'

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
