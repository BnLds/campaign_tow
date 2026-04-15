// tests/integration/settings.test.ts
// Settings page — password change + username edit
// Verifies: AC7 (password change), AC10 (settings link for non-guests)

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '../..')

describe('[AC7][AC10][P0] Settings route — src/routes/settings.tsx', () => {
  it('[settings-INT-001] src/routes/settings.tsx exists', () => {
    expect(existsSync(resolve(root, 'src/routes/settings.tsx'))).toBe(true)
  })

  it('[settings-INT-002] settings route exports Route via createFileRoute("/settings")', () => {
    const route = readFileSync(resolve(root, 'src/routes/settings.tsx'), 'utf-8')
    expect(route).toMatch(/createFileRoute\(['"]\/settings['"]/)
  })

  it('[settings-INT-003] changePasswordFn uses .middleware([authMiddleware]) (coupled declaration)', () => {
    const route = readFileSync(resolve(root, 'src/routes/settings.tsx'), 'utf-8')
    expect(route).toMatch(/changePasswordFn\s*=\s*createServerFn[\s\S]{0,400}\.middleware\(\[authMiddleware\]\)/)
  })

  it('[settings-INT-004] changePasswordFn does NOT require current password (session auth is sufficient)', () => {
    const route = readFileSync(resolve(root, 'src/routes/settings.tsx'), 'utf-8')
    expect(route).not.toMatch(/INVALID_CURRENT_PASSWORD/)
    expect(route).not.toMatch(/currentPassword/)
  })

  it('[settings-INT-005] changePasswordFn hashes new password with bcryptjs 12 rounds (coupled)', () => {
    const route = readFileSync(resolve(root, 'src/routes/settings.tsx'), 'utf-8')
    expect(route).toMatch(/changePasswordFn[\s\S]{0,2000}bcryptjs[\s\S]{0,300}hash[\s\S]{0,100}12/)
  })

  it('[settings-INT-006] settings route uses changePasswordSchema for validation', () => {
    const route = readFileSync(resolve(root, 'src/routes/settings.tsx'), 'utf-8')
    expect(route).toMatch(/changePasswordSchema/)
  })

  it('[settings-INT-007] settings route uses updateUsernameSchema for username form', () => {
    const route = readFileSync(resolve(root, 'src/routes/settings.tsx'), 'utf-8')
    expect(route).toContain('updateUsernameSchema')
  })

  it('[settings-INT-008] updateUsernameFn uses .middleware([authMiddleware]) (coupled)', () => {
    const route = readFileSync(resolve(root, 'src/routes/settings.tsx'), 'utf-8')
    expect(route).toMatch(/updateUsernameFn\s*=\s*createServerFn[\s\S]{0,400}\.middleware\(\[authMiddleware\]\)/)
  })

  it('[settings-INT-009] updateUsernameFn imports and uses isUniqueViolation from db-errors', () => {
    const route = readFileSync(resolve(root, 'src/routes/settings.tsx'), 'utf-8')
    expect(route).toMatch(/isUniqueViolation[\s\S]{0,200}db-errors/)
  })

  it('[settings-INT-010] updateUsernameFn calls checkUsernameExists for uniqueness check', () => {
    const route = readFileSync(resolve(root, 'src/routes/settings.tsx'), 'utf-8')
    expect(route).toMatch(/updateUsernameFn[\s\S]{0,1500}checkUsernameExists/)
  })

  it('[settings-INT-011] updateUsernameFn does NOT call updatePlayerUsername when username is unchanged (short-circuit)', () => {
    const route = readFileSync(resolve(root, 'src/routes/settings.tsx'), 'utf-8')
    // short-circuit: return before calling updatePlayerUsername when username matches session
    expect(route).toMatch(/data\.username === context\.session\.username[\s\S]{0,200}return/)
  })

  it('[settings-INT-014] SettingsPage component does NOT use useState for success/error messages', () => {
    const route = readFileSync(resolve(root, 'src/routes/settings.tsx'), 'utf-8')
    const componentBodyMatch = route.match(/function SettingsPage[\s\S]*/)
    const componentBody = componentBodyMatch ? componentBodyMatch[0] : ''
    expect(componentBody).not.toMatch(/useState/)
  })

  it('[settings-INT-015] SettingsPage uses passwordMutation via useMutation (coupled declaration)', () => {
    const route = readFileSync(resolve(root, 'src/routes/settings.tsx'), 'utf-8')
    expect(route).toMatch(/passwordMutation\s*=\s*useMutation/)
  })

  it('[settings-INT-016] SettingsPage uses usernameMutation via useMutation (coupled declaration)', () => {
    const route = readFileSync(resolve(root, 'src/routes/settings.tsx'), 'utf-8')
    expect(route).toMatch(/usernameMutation\s*=\s*useMutation/)
  })
})

describe('[AC10][P0] AppHeader — Paramètres link', () => {
  it('[settings-INT-012] app-header.tsx contains Paramètres navigation link', () => {
    const appHeader = readFileSync(resolve(root, 'src/components/app-header.tsx'), 'utf-8')
    expect(appHeader).toContain('Paramètres')
  })

  it('[settings-INT-013] app-header.tsx navigates to /settings (coupled with Paramètres)', () => {
    const appHeader = readFileSync(resolve(root, 'src/components/app-header.tsx'), 'utf-8')
    expect(appHeader).toMatch(/Paramètres[\s\S]{0,600}\/settings|\/settings[\s\S]{0,600}Paramètres/)
  })
})
