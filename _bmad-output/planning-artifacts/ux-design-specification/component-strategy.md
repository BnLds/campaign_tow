# Component Strategy

## Design System Components

Base: **shadcn/ui** (Radix UI + Tailwind CSS). Used as-is or with minimal theming.

| Component | Usage |
|---|---|
| `Button` | Secondary actions (delete, confirm, cancel) |
| `Input` | XP entry in post-match flow — numeric keyboard trigger |
| `Select` | Opponent selection when creating a match |
| `Dialog` | Welcome modal on first login |
| `Sheet` | Upgrade choice screen when tier is reached (MVP) |
| `ScrollArea` | Timeline, army view, armies list, references |
| `Skeleton` | Loading state for timeline |

## Custom Components

Components not covered by shadcn/ui — built using design system tokens.

| Component | Purpose |
|---|---|
| `UnitCard` | Tableau compact : colonne "Profil" à gauche + 9 col stats. Tous les profils empilés en lignes. Montures en dernier avec bordure gauche bleue (#2a5ab8) + annotation légende sous le tableau. Delta chips en bas. Cadre palier XP (border + glow). |
| `TimelineEntry` | Entrée match terminé dans l'historique — un seul style (pas de variant pending) |
| `ActionChip` | Chip item à traiter — fond bleu `#eef4ff`, bordure `#d7e1ef`. Prop `type`: `invite` ou `postmatch` |
| `ArmyListItem` | Item joueur liste armées — avatar initiale, nom armée, faction, bilan V/D. Variant `current` (doré) |
| `TabBar` | 3 tabs fixes : Campagne / Armées / Références — tab actif via route courante |
| `CreateMatchFab` | FAB circulaire navy, `position: absolute`, bas-droite, au-dessus tabbar |
| `RefTable` | Table référence 2 colonnes (dice roll + résultat) |
| `TierUpScreen` | MVP : Sheet sobre — V2 : animation fond doré pulsant (post-MVP) |

## Component Implementation Strategy

- `UnitCard` est le seul composant entièrement custom avec layout interne complexe
- Les autres composants custom sont de fines compositions de primitives shadcn/ui
- Tier frame sur `UnitCard` : CSS `border` + `box-shadow` uniquement — pas d'asset image
- `TabBar` : state = route courante uniquement, aucune logique contextuelle
- `TimelineEntry` : un seul variant — les items pending ne sont plus dans le fil historique
- `ActionChip` : même composant pour invitations et post-match, différenciés par prop `type`
  et label contextuel ("Voir la partie — vs X" / "Rapport de bataille — vs X")
- `ArmyListItem` variant `current` : `border-color: #ead69b`, fond `#fff9ec`,
  shadow dorée — identifiable immédiatement en tête de liste
- `CreateMatchFab` : z-index au-dessus du contenu scrollable, sous les Dialogs et Sheets

## Implementation Roadmap

**Phase 1 — Core (MVP blockers):**
- `UnitCard` — required for army view
- `TimelineEntry` + `ActionChip` — required for home screen
- `TabBar` + `CreateMatchFab` — required for navigation and match creation
- `ArmyListItem` (avec variant `current`) — required for army access

**Phase 2 — Supporting:**
- `RefTable` + references view
- `TierUpScreen` (Sheet variant)

**Phase 3 — Enhancement (post-MVP):**
- `TierUpScreen` animation variant (gold pulse)
- Unit illustrations on `UnitCard`

---
