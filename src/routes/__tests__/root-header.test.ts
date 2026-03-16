// src/routes/__tests__/root-header.test.ts
// Campaign Header — Army Info Integration
// Structural file-contract tests for the redesigned AppHeader in __root.tsx.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '../../..')

function getRootTsx() {
  return readFileSync(resolve(root, 'src/routes/__root.tsx'), 'utf-8')
}

describe('[AC1][AC8] Root — getPlayerArmyInfoFn server function', () => {
  it('defines getPlayerArmyInfoFn as a createServerFn', () => {
    const code = getRootTsx()
    expect(code).toMatch(/const getPlayerArmyInfoFn\s*=\s*createServerFn/)
  })
})

describe('[AC1][AC8] Root — beforeLoad returns army and record', () => {
  it('beforeLoad returns army alongside session', () => {
    const code = getRootTsx()
    expect(code).toMatch(/return\s*\{[^}]*session[^}]*army[^}]*record/)
  })

  it('beforeLoad catches army loading errors gracefully', () => {
    const code = getRootTsx()
    // The try/catch pattern wraps getPlayerArmyInfoFn — both must appear in beforeLoad
    expect(code).toMatch(/try\s*\{[\s\S]*getPlayerArmyInfoFn[\s\S]*\}\s*catch/)
  })
})

describe('[AC1][AC7] AppHeader — army name with Cinzel font', () => {
  it('AppHeader uses --font-display for army name', () => {
    const code = getRootTsx()
    expect(code).toContain('--font-display')
  })
})

describe('[AC1][AC7] AppHeader — faction + record subtitle', () => {
  it('AppHeader renders faction text', () => {
    const code = getRootTsx()
    expect(code).toMatch(/army\.faction/)
  })

  it('AppHeader renders record with French format (V/N/D)', () => {
    const code = getRootTsx()
    expect(code).toMatch(/record\.wins/)
    expect(code).toContain('}V</span>')
    expect(code).toContain('}N</span>')
    expect(code).toContain('}D</span>')
  })
})

describe('[AC1] AppHeader — "Voir le détail" link to army', () => {
  it('AppHeader contains Link to /armies/$armyId', () => {
    const code = getRootTsx()
    expect(code).toMatch(/Link[\s\S]{0,200}\/armies\/\$armyId/)
  })

  it('AppHeader shows "Voir le détail" text', () => {
    const code = getRootTsx()
    expect(code).toContain('Voir le détail')
  })
})

describe('[AC2][AC3] AppHeader — account info and auth buttons preserved', () => {
  it('AppHeader renders logout button with data-testid', () => {
    const code = getRootTsx()
    expect(code).toContain('data-testid="logout-button"')
  })

  it('AppHeader renders login button for guests with data-testid', () => {
    const code = getRootTsx()
    expect(code).toContain('data-testid="login-button"')
  })
})

describe('[AC5] AppHeader — admin link preserved', () => {
  it('AppHeader renders admin link with data-testid', () => {
    const code = getRootTsx()
    expect(code).toContain('data-testid="admin-link"')
  })
})

describe('[AC7] AppHeader — uses --color-header-bg token', () => {
  it('AppHeader background uses --color-header-bg', () => {
    const code = getRootTsx()
    expect(code).toContain('--color-header-bg')
  })
})

describe('[AC6] CampaignView — no duplicate army header in body', () => {
  it('index.tsx does NOT contain army name heading', () => {
    const indexCode = readFileSync(resolve(root, 'src/routes/index.tsx'), 'utf-8')
    expect(indexCode).not.toMatch(/army\.name[\s\S]{0,50}<\/h1>/)
  })

  it('index.tsx does NOT contain "Voir le détail" link', () => {
    const indexCode = readFileSync(resolve(root, 'src/routes/index.tsx'), 'utf-8')
    expect(indexCode).not.toContain('Voir le détail')
  })
})
