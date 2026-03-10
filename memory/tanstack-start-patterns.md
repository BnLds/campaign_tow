# TanStack Start — Patterns et pièges (validés en production)

## Import-Protection — authMiddleware centralisé dans middleware.ts (validé story 1.3)

**Problème :** `auth.ts` importe `@tanstack/react-start/server` (server-only). Si `authMiddleware` est référencé au niveau module (ex: `.middleware([authMiddleware])`), `auth.ts` ne peut PAS être tree-shaké → import-protection error au build.

**Solution finale (story 1.3 code review) — `src/lib/middleware.ts` centralisé :**
```typescript
// src/lib/middleware.ts — import-protected, safe pour import dans routes
import { createMiddleware } from '@tanstack/react-start'

export const authMiddleware = createMiddleware({ type: 'function' }).server(async ({ next }) => {
  const { getSession } = await import('./auth')  // dynamic import → pruned by compiler
  const session = await getSession()
  if (!session) throw new Error('UNAUTHORIZED')
  return next({ context: { session } })
})

export const armyOwnerMiddleware = createMiddleware({ type: 'function' })
  .middleware([authMiddleware])
  .server(async ({ next, context }) => { ... })
```

**Usage dans les routes :**
```typescript
import { authMiddleware } from '../lib/middleware'  // ✅ safe static import
```

**Règle :** `auth.ts` ne doit PLUS exporter `authMiddleware`. Tous les middlewares vivent dans `middleware.ts`.

**Imports OK dans les fichiers de route :**
- `import type { SessionData } from '../lib/auth'` — type imports effacés à la compilation ✅
- `import { authMiddleware } from '../lib/middleware'` — middleware.ts n'importe pas de server-only ✅

**Ce qui NE fonctionne PAS :**
- `import { authMiddleware } from '../lib/auth'` → build failure si auth.ts importe server-only
- Définir authMiddleware localement dans chaque route → duplication, ne scale pas

**Référence officielle :** https://tanstack.com/start/latest/docs/framework/react/guide/import-protection

## Architecture Boundary — DB access dans les routes

**Règle :** Les routes ne doivent PAS importer `drizzle-orm`, `db`, ni les tables de `db/schema.ts` directement.

**Pattern correct :**
- Opérations nommées/réutilisables → `src/db/queries.ts`
- Routes importent depuis `../db/queries`

```typescript
// src/db/queries.ts
export async function markPlayerWelcomeSeen(playerId: string): Promise<void> { ... }
export async function updatePlayerDisplayName(playerId: string, displayName: string): Promise<void> { ... }

// src/routes/index.tsx
import { markPlayerWelcomeSeen, updatePlayerDisplayName } from '../db/queries'
```

**Tests INT à vérifier :** quand les middlewares bougent de `auth.ts` vers `middleware.ts`, les tests d'intégration qui lisent `auth.ts` doivent être mis à jour pour lire `middleware.ts`.

## useRouteContext — union type quand beforeLoad retourne undefined pour /login

**Problème :** `beforeLoad` dans `__root.tsx` retourne soit `undefined` (route `/login`) soit `{ session }`. TypeScript infère un union type. Accéder à `.session` directement échoue.

**Solution :**
```typescript
const context = useRouteContext({ from: '__root__' })
const session: SessionData | null = 'session' in context ? context.session : null
```

## shadcn Dialog — non installé par défaut dans scaffold story 1.1

Installer manuellement si nécessaire :
```bash
pnpm dlx shadcn@latest add dialog
```

## Tests INT — pattern import-protection (middleware centralisé)

Vérifier que les routes importent depuis `middleware.ts` et non pas localement ou depuis `auth.ts` :
```typescript
// ✅ Route importe depuis middleware.ts
expect(indexRoute).toMatch(/import\s*\{[^}]*authMiddleware[^}]*\}\s*from\s*['"]\.\.\/lib\/middleware['"]/)
// ✅ Pas de définition locale
expect(indexRoute).not.toMatch(/authMiddleware\s*=\s*createMiddleware/)
// ✅ middleware.ts utilise dynamic import de getSession
expect(middleware).toMatch(/export const authMiddleware\s*=\s*createMiddleware/)
expect(middleware).toMatch(/import\(['"]\.\/auth['"]\)/)
```
