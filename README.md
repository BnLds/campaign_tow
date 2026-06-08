# Campaign TOW

Application de gestion de campagne Warhammer: The Old World.

Le projet est une application TanStack Start avec React, TanStack Router, TanStack Query, Drizzle et PostgreSQL.

## Demarrage

Prérequis:

- Node.js 20+
- pnpm 10+
- Docker, pour la base PostgreSQL locale

Installer les dependances:

```bash
pnpm install
```

Demarrer la base locale:

```bash
docker compose up -d db
```

Creer un fichier `.env` a partir de `.env.example`, puis lancer l'application:

```bash
pnpm dev
```

L'application demarre sur `http://localhost:3000`.

## Scripts

```bash
pnpm dev        # serveur de developpement
pnpm build      # build production
pnpm test       # tests Vitest
pnpm lint       # lint ESLint
pnpm typecheck  # verification TypeScript
pnpm format     # verification Prettier
pnpm check      # format + lint auto-fix
```

## Base De Donnees

Les migrations Drizzle sont versionnees dans `drizzle/`.

Commandes utiles:

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:push
pnpm db:studio
```

## Structure

- `src/routes/`: routes TanStack Router et pages.
- `src/server-fns/`: fonctions serveur appelees par l'UI.
- `src/db/`: schema Drizzle et requetes SQL.
- `src/lib/`: logique metier, validateurs, helpers et types partages.
- `src/components/`: composants React.
- `docs/`: regles et exemples utiles au domaine metier.
- `_bmad-output/`: artefacts de conception, architecture, UX et test conserves volontairement.
- `ops/`: documentation et configuration d'exploitation.

## Contribution

Le depot est prive. Les contributions se font par invitation et via pull request.

Avant d'ouvrir une PR, lancez si possible:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

Voir `CONTRIBUTING.md` pour le workflow complet.

## Production

La documentation de production est dans `ops/README.md`.
