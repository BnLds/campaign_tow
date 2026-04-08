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

  it('unit prop includes effectivePoints: number | null', () => {
    const code = getUnitCard()
    expect(code).toMatch(/unit:\s*\{[^}]*effectivePoints:\s*number \| null/)
  })
})

describe('[AC1] UnitCard — renders points when non-null', () => {
  it('renders pts label conditionally when points !== null', () => {
    const code = getUnitCard()
    expect(code).toMatch(/unit\.points !== null/)
  })

  it('displays effectivePoints value with "pts" suffix', () => {
    const code = getUnitCard()
    expect(code).toMatch(/unit\.effectivePoints\}?\s*pts/)
  })

  it('uses cw-brand color class for normal points', () => {
    const code = getUnitCard()
    expect(code).toContain('text-cw-brand')
  })
})

describe('[AC3] UnitCard — hides points when null', () => {
  it('effectivePoints display is inside unit.points !== null guard', () => {
    const code = getUnitCard()
    expect(code).toMatch(/unit\.points !== null[\s\S]{0,800}unit\.effectivePoints/)
  })
})

describe('UnitCard — pertes_catastrophiques points display', () => {
  it('uses effectivePoints !== unit.points to detect halved points', () => {
    const code = getUnitCard()
    expect(code).toMatch(/unit\.effectivePoints !== unit\.points/)
  })

  it('uses text-cw-malus when effectivePoints differs from points', () => {
    const code = getUnitCard()
    // text-cw-malus must appear in the same conditional branch as effectivePoints !== unit.points
    expect(code).toMatch(/unit\.effectivePoints !== unit\.points[\s\S]{0,300}text-cw-malus/)
  })

  it('shows ÷2 indicator when effectivePoints differs from points', () => {
    const code = getUnitCard()
    expect(code).toMatch(/unit\.effectivePoints !== unit\.points[\s\S]{0,300}÷2/)
  })

  it('does not compute Math.floor in the component (precomputed server-side)', () => {
    const code = getUnitCard()
    expect(code).not.toMatch(/Math\.floor\(unit\.points/)
  })

  it('does not use gains.some for pertes_catastrophiques detection (precomputed server-side)', () => {
    const code = getUnitCard()
    expect(code).not.toMatch(/gains\.some\(.*pertes_catastrophiques/)
  })
})
