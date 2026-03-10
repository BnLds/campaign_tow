# E2E Patterns — Campaign TOW

## Stack E2E
- Playwright + Chromium (Mobile Chrome, Pixel 5)
- Config : `playwright.config.ts` — dotenv.config('.env.local') + globalSetup + webServer
- Auth states : `.auth/first-login.json`, `.auth/returning.json` (gitignored)
- Global setup : `e2e/global-setup.ts`
- DB helper : `e2e/helpers/db.ts` (pool indépendant, sans effets de bord de src/db/index.ts)

## Pattern fixture auth (story 1.3)

```
globalSetup → upsert 2 joueurs E2E en DB → login UI → saveAuthState
Spec → test.use({ storageState }) + beforeEach resetFirstLoginUser()
```

### Joueurs de test
- `e2e_first_login` — `hasSeenWelcome: false` → AC1/AC2/AC3/AC4
- `e2e_returning` — `hasSeenWelcome: true` → AC5

### Isolation entre tests
- `beforeEach` appelle `resetFirstLoginUser()` (remet `hasSeenWelcome: false` + displayName initial)
- `afterAll` appelle `closeTestDb()` pour fermer le pool pg

## Piège React SSR — hydration avant interaction (CRITIQUE)

**Symptôme :** Le click sur submit ne fait aucun appel réseau, URL devient `/login?`, pas de cookie.

**Cause :** Playwright interagit avec le DOM avant que React soit hydraté (SSR). Les `onChange` handlers ne sont pas encore attachés. Le click déclenche la soumission native du `<form>` (GET vers `/login?`).

**Mauvaise solution :** `page.waitForLoadState('networkidle')` — timeout car Vite HMR WebSocket reste ouvert.

**Solution correcte :** Attendre les React fiber internals sur un élément :
```typescript
await page.waitForFunction(
  () => {
    const btn = document.querySelector('[data-testid="login-submit-button"]')
    if (!btn) return false
    return Object.keys(btn).some(
      (k) => k.startsWith('__reactFiber') || k.startsWith('__reactInternals'),
    )
  },
  undefined,
  { timeout: 15000 },
)
```
Les `__reactFiber*` keys ne sont présentes sur un élément DOM qu'après que React a hydraté ce composant.

## TanStack Form + Zod v4 — format des erreurs

`field.state.meta.errors[0]` est un objet `{ message: string, path: [...] }` (Standard Schema issue), PAS une string.

**Mauvais :** `String(field.state.meta.errors[0])` → `"[object Object]"`
**Mauvais :** `field.state.meta.errors[0]?.message` si TypeScript infère string

**Correct :**
```tsx
typeof field.state.meta.errors[0] === 'string'
  ? field.state.meta.errors[0]
  : (field.state.meta.errors[0] as { message: string } | undefined)?.message
```

## TanStack Start — URL server functions
Les server functions sont exposées à `/_serverFn/<base64>` (pas `/_server`).
Pour intercepter avec Playwright :
```typescript
page.waitForResponse(
  (res) => res.url().includes('/_serverFn') && res.request().method() === 'POST',
)
```

## webServer config (playwright.config.ts)
```typescript
webServer: {
  command: 'pnpm dev',
  url: 'http://localhost:3000',
  reuseExistingServer: true,  // Ne redémarre pas si déjà en cours
  stdout: 'ignore',
  stderr: 'pipe',
}
```
`dotenv.config({ path: '.env.local' })` doit être dans `playwright.config.ts` (avant tout) pour que DATABASE_URL soit disponible dans global-setup et les helpers DB.
