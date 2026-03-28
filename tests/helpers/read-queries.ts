import { readFileSync, readdirSync } from 'node:fs'
import { basename, resolve } from 'node:path'

const root = resolve(__dirname, '../..')

export function readAllQueries(): string {
  const dir = resolve(root, 'src/db/queries')
  return readdirSync(dir, { recursive: true })
    .map((f) => (typeof f === 'string' ? f : f.toString()))
    .filter((f) => f.endsWith('.ts') && basename(f) !== 'index.ts')
    .sort()
    .map((f) => readFileSync(resolve(dir, f), 'utf-8'))
    .join('\n')
}

export function readMatchesQueries(): string {
  const dir = resolve(root, 'src/db/queries/matches')
  return readdirSync(dir, { recursive: true })
    .map((f) => (typeof f === 'string' ? f : f.toString()))
    .filter((f) => f.endsWith('.ts') && basename(f) !== 'index.ts')
    .sort()
    .map((f) => readFileSync(resolve(dir, f), 'utf-8'))
    .join('\n')
}
