// src/components/__tests__/unit-card-points.test.tsx
// Tech-spec: Unit Points Display & Edit
//
// Static file-contract tests for UnitCard points display.
// Follows the pattern established in src/components/__tests__/army-list-item.test.tsx.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '../../..')

function getUnitCard() {
  return readFileSync(resolve(root, 'src/components/unit-card.tsx'), 'utf-8')
}

describe('[AC1][AC3] UnitCard — points prop', () => {
  it('unit prop includes points: number | null', () => {
    const code = getUnitCard()
    expect(code).toMatch(/unit:\s*\{[^}]*points:\s*number \| null/)
  })
})

describe('[AC1] UnitCard — renders points when non-null', () => {
  it('renders pts label conditionally when points !== null', () => {
    const code = getUnitCard()
    expect(code).toMatch(/unit\.points !== null/)
  })

  it('displays points value with "pts" suffix', () => {
    const code = getUnitCard()
    expect(code).toMatch(/\{unit\.points\}\s*pts/)
  })

  it('uses --color-brand for points color', () => {
    const code = getUnitCard()
    expect(code).toContain('var(--color-brand)')
  })
})

describe('[AC3] UnitCard — hides points when null', () => {
  it('points span is inside unit.points !== null guard', () => {
    const code = getUnitCard()
    expect(code).toMatch(/unit\.points !== null[\s\S]{0,500}unit\.points\}/)
  })
})
