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
pnpm lint
pnpm typecheck
pnpm test
```

Si une commande n'est pas applicable localement, indiquez-le dans la pull request avec la raison.

## Documentation Et Artefacts

`docs/` contient la documentation directement utile aux contributeurs et aux utilisateurs du projet.

`_bmad-output/` contient des artefacts de conception, d'architecture, d'UX et de test. Ce dossier est versionne volontairement pour conserver le contexte projet.

Ne modifiez `_bmad-output/` que si la pull request concerne explicitement la documentation de conception, les artefacts de test, ou une decision projet documentee. Pour un changement applicatif courant, evitez de toucher ce dossier.

## Secrets

Ne committez jamais de secrets, fichiers `.env`, tokens, cles SSH, dumps de base de donnees ou credentials de production.

Utilisez `.env.example` pour documenter les variables d'environnement attendues sans valeur sensible.
