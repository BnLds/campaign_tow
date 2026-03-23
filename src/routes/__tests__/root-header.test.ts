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

describe('[AC1][AC8] Root — getPlayerArmyInfoFn server function (moved to session-queries.ts)', () => {
  it('defines getPlayerArmyInfoFn as a createServerFn in session-queries.ts', () => {
    const code = readFileSync(resolve(root, 'src/lib/session-queries.ts'), 'utf-8')
    expect(code).toMatch(/const getPlayerArmyInfoFn\s*=\s*createServerFn/)
  })
})

describe('[AC1][AC8] Root — beforeLoad returns army and record', () => {
  it('beforeLoad returns army alongside session', () => {
    const code = getRootTsx()
    expect(code).toMatch(/return\s*\{[^}]*session[^}]*army[^}]*record/)
  })

  it('beforeLoad loads army info via ensureQueryData(armyInfoQueryOptions)', () => {
    const code = getRootTsx()
    // Error handling is now delegated to TanStack Query (retry + error boundaries)
    expect(code).toMatch(/ensureQueryData\(armyInfoQueryOptions\(/)
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

describe('[AC-HM] AppHeader — hamburger menu', () => {
  it('renders hamburger button with data-testid', () => {
    const code = getRootTsx()
    expect(code).toContain('data-testid="hamburger-button"')
  })

  it('imports Menu icon from lucide-react', () => {
    const code = getRootTsx()
    expect(code).toMatch(/import\s*\{[^}]*Menu[^}]*\}\s*from\s*['"]lucide-react['"]/)
  })

  it('renders "Voir mon armee" as a menuitem with data-testid', () => {
    const code = getRootTsx()
    expect(code).toMatch(/role="menuitem"[\s\S]{0,80}data-testid="my-army-link"/)
    expect(code).toContain('Voir mon armee')
  })

  it('hamburger button has aria-expanded and aria-haspopup', () => {
    const code = getRootTsx()
    expect(code).toMatch(/data-testid="hamburger-button"[\s\S]{0,100}aria-expanded/)
    expect(code).toContain('aria-haspopup="true"')
  })

  it('imports Dialog from shadcn ui for Options modal', () => {
    const code = getRootTsx()
    expect(code).toMatch(/import\s*\{[^}]*Dialog[^}]*\}\s*from\s*['"]\.\.\/components\/ui\/dialog['"]/)
  })

  it('Options modal contains logout button with --color-malus', () => {
    const code = getRootTsx()
    expect(code).toMatch(/DialogTitle[\s\S]{0,300}Options[\s\S]{0,500}data-testid="logout-button"[\s\S]{0,300}color-malus/)
  })

  it('dropdown has role="menu"', () => {
    const code = getRootTsx()
    expect(code).toContain('role="menu"')
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

})
