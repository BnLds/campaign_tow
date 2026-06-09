# Contribution Guide

Ce depot est prive. Les contributions se font par invitation et via pull request.

## Workflow

1. Creez une branche depuis `main`.
2. Faites un changement cible et limite au besoin traite.
3. Lancez les verifications utiles avant d'ouvrir la pull request.
4. Ouvrez une pull request vers `main` avec une description claire.
5. Attendez la review et l'approbation du mainteneur avant merge.

## Verifications

Commandes recommandees avant PR:

```bash
pnpm secrets:scan
pnpm lint
pnpm typecheck
pnpm test
```

Si une commande n'est pas applicable localement, indiquez-le dans la pull request avec la raison.

## Conventions De Code

Quelques principes structurent presque chaque changement dans ce dépôt. Les revues s'appuient dessus — lisez-les avant votre première pull request.

- **Type-safe de bout en bout, pas de couche REST.** La logique serveur s'écrit en server functions TanStack Start, co-localisées avec les routes. Il n'y a pas d'API séparée à maintenir.
- **Un seul schéma, partagé client ↔ serveur.** Les tables Drizzle génèrent des schémas Zod (`drizzle-zod`) réutilisés par TanStack Form. Le serveur revalide toujours — le client n'est jamais de confiance.
- **La logique métier est pure et vit dans `src/lib/`.** Les calculs d'XP, de paliers et de deltas (`xp-calculator`, `delta-composer`, `owb-parser`) sont des fonctions pures, testées unitairement. Ne les dupliquez jamais dans les composants ou les routes — importez-les.
- **Les stats de base sont immuables.** Les données importées depuis OWB ne sont jamais modifiées. Les changements de campagne sont stockés sous forme de deltas composables (`stat_modifiers`, `unit_gains`) et recomposés à la lecture.
- **Accès BDD uniquement via `src/db/queries/`.** Les routes et les server functions n'importent jamais `db`, `drizzle-orm` ou les tables du schéma directement — elles appellent des fonctions de requête nommées.
- **Le middleware d'auth vient de `src/lib/middleware.ts`.** Ne le définissez jamais localement dans une route (l'import-protection garde le code serveur hors du bundle client). La propriété d'une armée est vérifiée côté serveur à chaque écriture.
- **Résultats typés pour les mutations.** Les mutations renvoient une union discriminée `ServerResult<T>` (les erreurs métier sont des valeurs, pas des exceptions) ; les loaders renvoient les données directement et lèvent vers l'error boundary.
- **Pas de store global.** TanStack Query gère l'état serveur ; React `useState` gère l'état d'UI local.

Nommage : `snake_case` en BDD, `camelCase` dans le code, `PascalCase` pour les composants et types, `kebab-case` pour les fichiers.

### Documentation D'architecture

Le détail complet et l'ensemble des règles vivent dans :

- [`core-architectural-decisions.md`](./_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md)
- [`implementation-patterns-consistency-rules.md`](./_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md)

> Ces documents de planification sont antérieurs au passage de Railway au déploiement Docker/VPS actuel et à certains choix de test. En cas de divergence, le `README.md` (sections Deployment et Testing) fait foi.

## Documentation Et Artefacts

`docs/` contient la documentation directement utile aux contributeurs et aux utilisateurs du projet.

`_bmad-output/` contient des artefacts de conception, d'architecture, d'UX et de test. Ce dossier est versionne volontairement pour conserver le contexte projet.

Ne modifiez `_bmad-output/` que si la pull request concerne explicitement la documentation de conception, les artefacts de test, ou une decision projet documentee. Pour un changement applicatif courant, evitez de toucher ce dossier.

## Secrets

Ne committez jamais de secrets, fichiers `.env`, tokens, cles SSH, dumps de base de donnees ou credentials de production.

Utilisez `.env.example` pour documenter les variables d'environnement attendues sans valeur sensible.
