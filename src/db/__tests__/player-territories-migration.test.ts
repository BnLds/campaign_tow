import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '../../..')
const file = readdirSync(resolve(root, 'drizzle')).find(f => /^0007_.*\.sql$/.test(f))
if (!file) throw new Error('migration 0007 not generated yet — run pnpm db:generate')
const sql = readFileSync(resolve(root, 'drizzle', file), 'utf-8')

describe('[Story 1.4] player_territories migration — static SQL assertions', () => {
  it('[1.4-MIG-001][P0] FK to players.id with ON DELETE cascade', () => {
    expect(sql).toMatch(/FOREIGN KEY \("player_id"\) REFERENCES "public"\."players"\("id"\) ON DELETE cascade/)
  })

  it('[1.4-MIG-002][P0] unique index on player_id', () => {
    expect(sql).toMatch(/CREATE UNIQUE INDEX "player_territories_player_id_unique" ON "player_territories"[^;]*\("player_id"\)/)
  })

  it('[1.4-MIG-003][P1] co_balance integer column with default 0', () => {
    expect(sql).toMatch(/"co_balance" integer DEFAULT 0 NOT NULL/)
  })

  it('[1.4-MIG-004][P1] last_income_week integer column with default 0', () => {
    expect(sql).toMatch(/"last_income_week" integer DEFAULT 0 NOT NULL/)
  })

  it('[1.4-MIG-005][P1] setup_completed_at nullable timestamp (no NOT NULL)', () => {
    expect(sql).toMatch(/"setup_completed_at" timestamp(?! NOT NULL)/)
  })

  it('[1.4-MIG-006][P0] no INSERT INTO player_territories (no seed data)', () => {
    expect(sql).not.toMatch(/INSERT INTO[^;]*player_territories/i)
  })
})
