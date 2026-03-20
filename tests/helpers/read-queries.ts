import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '../..')

export function readAllQueries(): string {
  const dir = resolve(root, 'src/db/queries')
  return readdirSync(dir)
    .filter((f) => f.endsWith('.ts') && f !== 'index.ts')
    .sort()
    .map((f) => readFileSync(resolve(dir, f), 'utf-8'))
    .join('\n')
}
