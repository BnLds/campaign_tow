# Core User Experience

## Defining Experience

L'action centrale de Campaign TOW est la **consultation à table de sa propre armée** :
un joueur en pleine partie ouvre l'app pour répondre à une question précise sur une
unité. Il ne browse pas — il cherche et confirme. L'app doit lui donner la réponse
en moins de 3 secondes depuis l'ouverture.

Priorité des actions par fréquence et criticité :
1. **Consultation à table — sa propre armée** (action principale)
2. **Flow post-match** — saisie XP, blessures, choix d'améliorations
3. **Consultation armée adverse** — référence croisée en cours de partie

## Platform Strategy

- **Web SPA responsive, mobile-first** (TanStack Start + shadcn/ui)
- Usage primaire : mobile, tenu en main ou posé sur la table
- Touch-based — aucune interaction hover-only
- Zones de tap ≥ 44px sur toutes les actions fréquentes
- Contrastes élevés pour lisibilité en éclairage variable
- Pas d'offline MVP ; résilience réseau non critique (consultation différable)
- Cibles navigateurs : Chrome mobile, Safari iOS en priorité

## Effortless Interactions

**Accueil = sa propre armée, directement**
Aucun menu intermédiaire. La liste des unités du joueur connecté est la première
chose visible après login. Pas de dashboard, pas de page d'accueil générique.

**Un tap → fiche d'unité complète**
La fiche affiche immédiatement :
- Stats actuelles avec deltas intégrés (valeur finale proéminente, +/-N en vert/rouge)
- Sous-profils multiples sur la même fiche (ex : Berger + Cave Squig)
- Améliorations de campagne choisies
- Règles spéciales pertinentes

Les infos de campagne long terme (XP, palier, historique) sont accessibles mais
non prioritaires sur la fiche en mode consultation.

**Identification des unités sans ambiguïté**
Nom custom de l'armée en header. Unités listées par nom OWB ou nom custom attribué.
Le joueur reconnaît ses unités à la première lettre — le nom doit être lisible
immédiatement, pas tronqué.

**Saisie XP naturelle**
Dans le flow post-match, champ numérique avec déclenchement automatique du clavier
numérique natif. Aucune navigation complexe entre champs.

## Critical Success Moments

**Moment 1 — Premier accès à table (2 taps)**
Le joueur ouvre l'app, voit ses unités immédiatement, tape sur une et voit ses
stats avec deltas. Si ce moment prend plus de 5 secondes ou génère un doute, le
joueur revient à ses notes papier et ne reviendra pas.

**Moment 2 — Le palier XP franchi**
Dans le flow post-match, après saisie de l'XP, l'app détecte le franchissement
de palier et le signale visuellement comme un événement — pas une notification
discrète. Le joueur choisit son amélioration dans ce même contexte. C'est le
moment de récompense promis.

**Moment 3 — La timeline après 3-4 parties**
Le joueur scrolle sa propre timeline et voit l'histoire complète de son armée.
Ce moment "aha" différé est le différenciateur central — il ne peut pas être
raté ou rendu anodin.

## Experience Principles

1. **L'app attend le joueur** — zéro obligation, zéro blocage sur données
   incomplètes, zéro synchronisation forcée. Une armée non mise à jour est un
   état acceptable, pas une erreur.

2. **Vitesse d'accès > richesse d'information** — à table, une réponse rapide
   et lisible prime sur l'exhaustivité. La fiche d'unité est scannée, pas lue.

3. **Le palier XP est un événement, pas une case cochée** — le franchissement
   d'un seuil doit être une expérience visuelle marquée, pas une simple
   notification ou un badge.

4. **La timeline raconte, elle n'affiche pas** — l'histoire de l'armée est
   narrative et chronologique, pas tabulaire. On scrolle et on revit la campagne.

5. **Complexité des données, simplicité de l'interface** — les sous-profils,
   les deltas, les règles spéciales existent dans les données. L'interface les
   présente de façon limpide sans les cacher ni les surcharger.

---
