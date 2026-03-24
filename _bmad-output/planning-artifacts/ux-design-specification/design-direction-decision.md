# Design Direction Decision

## Design Directions Explored

Several directions were explored through HTML prototypes, progressively refined
through collaborative iteration. Directions ranged from dashboard-first layouts
to card-grid approaches, then timeline-first with contextual tabs, before
converging on the current stable-navigation + FAB model.

Reference mockup: `_bmad-output/planning-artifacts/ux-mockup.html` (source of truth).

## Chosen Direction

**Direction finale — Navigation stable + FAB action**

- **Navigation** : 3 tabs **fixes** — Campagne (📜) | Armées (🛡) | Références (📖).
  Aucun tab ne change de signification selon le contexte. Tab actif : fond bleu doux
  `#dfe8f4`, indicateur navy en haut.
- **Action primaire** : FAB circulaire navy (`#334155`) en bas à droite, au-dessus de
  la tabbar (`bottom: 62px`). Affiche un "+". Lance la création d'une partie.
- **Vue Campagne (home)** : header contextuel (nom de l'armée du joueur connecté +
  faction + bilan), puis strip d'action chips horizontal scrollable pour les items à
  traiter, puis section "Historique" avec les cartes de parties terminées.
- **Action chips** : items à traiter au-dessus de l'historique (invitations à confirmer,
  post-matchs à remplir). Style bleu doux `#eef4ff`, bordure `#d7e1ef`. Scrollable
  horizontalement. Chaque chip = un item pending avec label contextuel.
- **Vue Armées** : liste de toutes les armées. L'armée du joueur connecté apparaît en
  premier, surlignée en doré (`border-color: #ead69b`, fond `#fff9ec`). Les armées
  sans partie sont légèrement atténuées (opacity 0.62).
- **Vue Armée detail** : header avec bouton retour `‹`, nom de l'armée, faction + nb
  d'unités. Catégories : Personnages / Unités de base / Unités rares… Pas d'entrée
  si aucune donnée.
- **Historique** : cartes de parties terminées uniquement — pas d'items pending dans
  le fil. Les items pending sont dans le strip de chips.

**Army view — unit cards**

- Stats en barre horizontale compacte (flex row, 9 cellules avec `border-right` entre
  chaque, fond `#f3ebdf`)
- Sous-profils séparés avec label uppercase
- Valeur modifiée : `.mod` vert `#2d7a3a` / `.pen` rouge `#b82c2c`
- Delta row en bas : chips colorées (`+1 CC`, `–1 Endurance`)
- **Card frame = XP tier** :
  - Neutre : bordure `#e0d5c8` 1px, flat
  - Bronze : bordure `rgba(205,127,50,.55)` 1px
  - Argent : bordure `rgba(154,160,166,.7)` 1px
  - Or (Vétéran) : bordure `rgba(212,168,67,.85)` 2px + shadow dorée + fond légèrement
    chaud `#fffcf3`
- Nom d'unité en premier, tier pill inline à côté (jamais au-dessus)
- Tier pills : `✦ Vétéran` (or) / `◆ Expérimenté` (argent) / `◈ Aguerri` (bronze)

## Design Rationale

La navigation fixe élimine toute ambiguïté : chaque tab a toujours le même sens.
Le FAB sépare clairement l'action primaire (créer) de la navigation, évitant la
confusion entre "aller quelque part" et "faire quelque chose".

Les action chips en haut de la vue Campagne distinguent visuellement les items à
traiter de l'historique — deux niveaux d'urgence clairement séparés sans multiplier
les couleurs d'état dans le fil.

L'armée du joueur est accessible en 2 taps : tab "Armées" → tap sur son armée
surlignée en tête de liste. La mise en évidence dorée garantit une identification
immédiate même dans une liste de 15 joueurs.

## Implementation Approach

- `shadcn/ui` Card component as base, with tier-specific border and shadow overrides
- FAB : `position: absolute; right: 16px; bottom: 62px` — z-index au-dessus du
  contenu, sous les modals
- `TabBar` : tab actif = route courante (`/campagne`, `/armees`, `/territories`) —
  logique simple, pas de state contextuel
- Action chips : `ScrollArea` horizontal, `scroll-snap-type: x proximity`,
  un chip = un item pending (invite ou post-match), même composant avec prop `type`
- Armée courante dans la liste : prop `isCurrent` → border + fond dorés via classes CSS
- Stats unité : flex row avec `border-right` entre cellules — pas de grille
- Gold card glow : `box-shadow` + `background` gradient — CSS only, no image

---
