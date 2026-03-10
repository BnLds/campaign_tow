# Campaign TOW — Mémoire de projet

## Fichiers clés
- PRD : `_bmad-output/planning-artifacts/prd.md`
- Brief : `_bmad-output/planning-artifacts/product-brief-campaign_tow-2026-03-05.md`
- Règles campagne : `docs/campaign_rules.md`
- Exemple armée OWB : `docs/army_example.txt`
- Config BMAD : `_bmad/bmm/config.yaml` (user: Ben, lang: French, output: English)

## UX Design — État du workflow

**Fichier spec UX :** `_bmad-output/planning-artifacts/ux-design-specification.md`
**Fichier HTML mockup (source de vérité) :** `_bmad-output/planning-artifacts/ux-mockup.html`

**Étapes complétées :** [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
**Spec révisée le :** 2026-03-06 (d'après ux-mockup.html v4.0 de Ben)
**Étapes complétées :** [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] — WORKFLOW COMPLET

## Navigation — Architecture finale (validée v4.0)

### 4 vues
1. **Vue Campagne** — tab "Campagne" (📜) actif
2. **Liste des armées** — tab "Armées" (🛡) actif
3. **Vue armée** — tab "Armées" (🛡) actif, header avec ‹ + nom armée
4. **Références** — tab "Références" (📖) actif

### Tab bar — 3 tabs FIXES
- "Campagne" (📜) | "Armées" (🛡) | "Références" (📖)
- Pas de tab contextuel. Pas de tab action.
- Tab actif : fond bleu doux `#dfe8f4`, indicateur navy en haut

### FAB
- Circulaire navy `#334155`, bas-droite, `bottom: 62px`
- Lance la création d'une partie — présent sur toutes les vues

### Vue Campagne — structure
- Header : nom armée du joueur + faction + bilan
- Strip d'**action chips** horizontal scrollable (items à traiter : invites + post-matchs)
- Section "Historique" : cartes de parties terminées uniquement

### Accès armée propre (2 taps)
- Tab "Armées" → armée surlignée en doré en tête de liste → tap

## Palette (validée v4.0)
- Fond : #f1eade | Surface : #fffbf5 | Séparateurs : #e0d5c8
- Texte primaire : #171310 | Secondaire : #6b5f52 (WCAG AA ~4.7:1)
- Brand/accent UI : #334155 (navy) | Brand foncé : #1e293b
- Or/paliers/highlights : #d4a843
- Bonus : #2d7a3a | Fond bonus : #edf8ef
- Malus : #b82c2c | Fond malus : #fdf0f0
- Bronze : #cd7f32 | Argent : #9aa0a6 | Neutre : #9ca3af
- Info/invitations : #2a5ab8 (bleu)

## Typographie
- Titres / noms d'unité : Cinzel 600-700
- Corps / stats / nav : Inter 400-700

## Carte d'unité (UnitCard — validée)
- Stats en barre horizontale compacte (flex row, 9 cellules, bordures internes)
- Fond stats : #f3ebdf | Valeur modifiée : .mod vert / .pen rouge
- Delta row en bas : chips colorées
- Cadre palier XP (neutre 1px → bronze → argent → or 2px + glow #fffcf3)
- Nom d'unité en premier (Cinzel), tier pill inline à côté
- Tier pills : ✦ Vétéran (or) / ◆ Expérimenté (argent) / ◈ Aguerri (bronze)
- Sous-profils séparés avec label uppercase

## Composants custom (liste finale v4.0)
| Composant | Rôle |
|---|---|
| `UnitCard` | Stats barre 9 col, sous-profils, deltas, cadre palier XP |
| `TimelineEntry` | Entrée match terminé — un seul style (pas de variant pending) |
| `ActionChip` | Chip item à traiter (invite / post-match) — fond bleu, prop `type` |
| `ArmyListItem` | Item joueur liste armées — variant `current` (doré) |
| `TabBar` | Nav 3 tabs fixes via route courante |
| `CreateMatchFab` | FAB circulaire navy bas-droite |
| `RefTable` | Table référence 2 colonnes (2D6 + résultat) |
| `TierUpScreen` | MVP: Sheet sobre — V2: animation fond doré pulsant |

## Piège CSS — Tailwind v4 + fichier tokens séparé (validé 2026-03-07)

**Problème rencontré en story 1.1 :** Le scaffold TanStack génère `src/styles.css` comme unique point d'entrée CSS (importé dans `__root.tsx`). Si les tokens palette Campaign TOW sont dans un fichier séparé (`src/styles/globals.css`), ils ne sont **jamais chargés** sauf si ce fichier est explicitement importé.

**Règle à retenir :** Avec Tailwind v4 + plugin Vite, il n'y a qu'un seul point d'entrée CSS (`src/styles.css`). Les tokens custom doivent y être intégrés directement **ou** via `@import './styles/globals.css'` depuis `styles.css`. Ne jamais créer un second fichier CSS sans vérifier qu'il est bien importé dans la chaîne.

**Correction appliquée :** `src/styles.css` contient maintenant `@import './styles/globals.css'`, et le `@import "tailwindcss"` a été retiré de `globals.css` (déjà importé par `styles.css`).

**Vérification à faire lors de chaque code review CSS :** Tracer le chemin depuis `__root.tsx` jusqu'aux tokens — si la chaîne est cassée, les tokens n'existent pas à l'exécution même si le fichier CSS est parfaitement rédigé.

## TanStack CLI — Commande create et add-ons (validé 2026-03-07)

**Commande d'initialisation (story 1.1) :**
```bash
npx @tanstack/cli create campaign_tow --add-ons drizzle,shadcn,tanstack-query,form,eslint,railway --package-manager pnpm
```

**Add-ons auto-configurés :** drizzle, shadcn (Tailwind v4), tanstack-query, `form` (@tanstack/react-form + zod v4), `eslint` (ESLint+Prettier + scripts lint/format/check), `railway` (nixpacks.toml + start script)

**Comportement réel du CLI (vérifié story 1.1 — CLI v0.62.3) :**
- Génère `vite.config.ts` (PAS `app.config.ts` comme l'ancienne doc RC indiquait)
- **Vitest est déjà inclus** dans le scaffold (`vitest` + `@vitejs/plugin-react` + `@testing-library/react` + `jsdom`) — pas besoin d'install manuelle
- Script `typecheck` NON inclus → ajouter manuellement : `"typecheck": "tsc --noEmit"`
- `nixpacks.toml` généré utilise `npm` → corriger en `pnpm` manuellement
- shadcn install peut échouer silencieusement → relancer `pnpm dlx shadcn@latest add --yes button select input textarea slider switch label` manuellement
- `drizzle.config.ts` a une erreur TS (`url: string | undefined`) → corriger avec un guard explicite (voir pattern ci-dessous), pas `!`
- `.output/` (build artifacts) est linté par défaut → ajouter aux ignores eslint
- `src/components/ui/` (shadcn) déclenche `import/consistent-type-specifier-style` → ajouter rule override

**Non disponibles comme add-on :** Playwright → installation manuelle (`pnpm add -D @playwright/test && npx playwright install`)

**Zod v4 + adapters :**
- `drizzle-zod` 0.8.3 : compatible zod v4 (`^3.25.0 || ^4.0.0`) ✅
- `@tanstack/zod-form-adapter` : **NE PAS UTILISER** — package obsolète, non maintenu
- **TanStack Form supporte Zod v4 nativement via Standard Schema** ✅ — passer le schema directement :
  ```ts
  const form = useForm({ validators: { onSubmit: myZodSchema } })
  ```
  Pas besoin d'adaptateur. Confirmé dans TanStack/form issue #1529 (fermé comme résolu).

**vitest.config.ts recommandé (inclure tests/ ET src/) :**
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'tests/**/*.test.ts'],
  },
})
```

**eslint.config.js — ajouts nécessaires après scaffold :**
```js
{ files: ['src/components/ui/**'], rules: { 'import/consistent-type-specifier-style': 'off' } },
{ ignores: ['eslint.config.js', 'prettier.config.js', '.output/**', 'node_modules/**'] },
```

**nixpacks.toml corrigé pour pnpm :**
```toml
[phases.install]
cmds = ["npm install -g pnpm", "pnpm install"]
[phases.build]
cmds = ["pnpm build"]
[start]
cmd = "pnpm start"
```

**Scaffold dans repo existant :** utiliser `--target-dir <path> --no-git --force`

**Pattern env var guard (à utiliser systématiquement — pas de `!`) :**
```typescript
// drizzle.config.ts et src/db/index.ts
if (!process.env.DATABASE_URL) {
  throw new Error('[DB] DATABASE_URL environment variable is required')
}
// Après le guard, TypeScript infère string (plus undefined)
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
```
Fail explicite avec message clair > erreur cryptique pg plus tard.

**Commandes doc TanStack CLI (à utiliser par le dev agent) :**
- `npx @tanstack/cli search-docs "<query>" --library start --framework react`
- `npx @tanstack/cli doc start framework/react/guide/<path>`
- `npx @tanstack/cli ecosystem --category <category>`
- `npx @tanstack/cli create --list-add-ons`

**Sources mises à jour :** `architecture/starter-template-evaluation.md`, `architecture/implementation-patterns-consistency-rules.md`, `implementation-artifacts/1-1-project-scaffolding-deployment-pipeline.md`

## E2E — Patterns Playwright (voir `e2e-patterns.md` pour détails)
- React SSR : attendre hydration via `__reactFiber` keys (pas `networkidle` — HMR WebSocket bloque)
- TanStack Form errors : objet `{ message: string }` pas string — voir e2e-patterns.md
- Auth fixtures : `e2e/global-setup.ts` + `e2e/helpers/db.ts` + storageState `.auth/`
- Server fn URL : `/_serverFn/<base64>` (pas `/_server`)

## Tests — Règle assertions couplées (OBLIGATOIRE)

**Principe :** Chaque assertion doit tester exactement une chose. Si un test vérifie qu'un élément A est lié à un élément B (même déclaration, même import, même ligne), les deux doivent être couplés dans une seule assertion.

**Question à se poser avant d'écrire deux `toContain` sur le même fichier :**
> "Ce test passerait-il si A et B existent dans le fichier mais sur des constructions différentes ?"
> Si oui → c'est une fausse sécurité → coupler en regex ou chaîne combinée.

```typescript
// ❌ MAL — passe même si authMiddleware et createMiddleware ne sont pas liés
expect(code).toContain('export const authMiddleware')
expect(code).toContain('createMiddleware')

// ✅ BIEN — couplés sur la même déclaration
expect(code).toMatch(/export const authMiddleware\s*=\s*createMiddleware/)

// ❌ MAL — cascade pourrait être sur une autre table
expect(schema).toContain("references(() => players.id")
expect(schema).toContain("onDelete: 'cascade'")

// ✅ BIEN — FK et cascade sur la même expression
expect(schema).toContain(".references(() => players.id, { onDelete: 'cascade' })")

// ❌ MAL — compare pourrait venir d'un autre module
expect(code).toContain('compare')
expect(code).toContain('bcryptjs')

// ✅ BIEN — vérifie l'import complet
expect(code).toMatch(/import\s*\{[^}]*compare[^}]*\}\s*from\s*['"]bcryptjs['"]/)
```

**Cas où deux `toContain` séparés sont OK :** quand les deux assertions sont réellement indépendantes et testent des propriétés distinctes sans relation de couplage (ex: vérifier qu'un fichier contient `export const A` ET `export const B` — deux exports distincts).

**Voir aussi :** `tanstack-start-patterns.md` — patterns import-protection, authMiddleware local, useRouteContext union type

## Préférences Ben
- Communication : Français
- Documents output : Anglais
- Pas d'overscope MVP
- Illustrations unités : V2 (pas MVP)
- Fond sombre : écarté (lisibilité)
- Style : sobre et épuré, Warhammer Battle 90s-2000s
