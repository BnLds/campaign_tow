---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
workflowStatus: complete
completedDate: '2026-03-06'
inputDocuments:
  - '_bmad-output/planning-artifacts/product-brief-campaign_tow-2026-03-05.md'
  - 'docs/campaign_rules.md'
  - 'docs/army_example.txt'
workflowType: 'prd'
classification:
  projectType: web_app
  domain: general
  complexity: low
  projectContext: greenfield
---

# Product Requirements Document - campaign_tow

**Author:** Ben
**Date:** 2026-03-06

## Executive Summary

Campaign TOW est une application web responsive de suivi de campagne pour un groupe fermé de ~15 joueurs Warhammer: The Old World. Elle résout un problème de mémoire collective : les deltas par partie (XP, améliorations, blessures permanentes) se perdent dans des notes papier et messages Discord, l'historique des armées disparaît, et l'état des forces adverses reste opaque avant chaque affrontement.

L'app s'intègre sans friction dans le rituel existant — le calcul papier à table reste intact. Elle mémorise ce que les joueurs ont décidé, le rend visible à tous, et transforme la saisie post-match en moment de récompense plutôt qu'en corvée. Elle attend le joueur : aucune synchronisation forcée, aucune obligation.

**Project Type:** Web App (SPA responsive, mobile-first) — domaine général, complexité faible, projet greenfield.

### What Makes This Special

La vue centrale n'est pas un tableur — c'est une **timeline narrative scrollable** : l'armée dans son état actuel en haut, puis le dernier match avec ses évolutions, puis le précédent. Après 3-4 parties, un joueur scrolle et voit l'histoire complète de sa campagne d'un seul regard. Ce moment "aha" différé est le différenciateur central.

Le **flow post-match satisfaisant** transforme la saisie XP en expérience désirable : franchir un palier et choisir une amélioration devient le moment de récompense naturel après une partie.

La **visibilité croisée** complète le tableau : toutes les armées — forces actuelles, historique, paliers franchis — sont consultables par tous les joueurs.

## Success Criteria

### User Success

- Un joueur complète son premier flow post-match sans aide externe
- Franchir un palier d'XP et choisir une amélioration est vécu comme un moment de récompense, pas une corvée
- Après 3-4 parties, un joueur lit l'histoire complète de sa campagne sur sa timeline en moins de 2 minutes
- Accès à ses propres fiches d'unité en 2 taps maximum depuis l'accueil; fiches adverses accessibles en 3-4 taps

### Business Success

| Objectif | Cible | Horizon |
|---|---|---|
| Disponibilité en production | Avant la 3e partie officielle | Avant lancement |
| Adoption joueurs | ≥ 70% des joueurs actifs ont effectué au moins un flow post-match | 1 mois après lancement |
| Couverture des parties | ≥ 60% des parties jouées enregistrées | En continu |
| Signal de réplicabilité | ≥ 1 demande spontanée pour réutiliser l'app | Fin de campagne |

**Critère binaire :** Adoption tout-ou-rien — le momentum s'installe si la majorité adopte rapidement, sinon l'adoption est compromise. Pas de succès partiel stable.

### Measurable Outcomes

**Go/no-go (primaires) :**
- % joueurs ayant effectué ≥ 1 flow post-match → cible : ≥ 70%
- % parties jouées enregistrées → cible : ≥ 60%
- Date de mise en production vs date de la 1re partie officielle → cible : avant

**Valeur perçue :** Demandes spontanées de réutilisation → cible : ≥ 1

**Ce que le succès n'est PAS :**
- Données parfaitement à jour sur toutes les armées — l'app est une aide, pas une contrainte
- Adoption 100% — le joueur occasionnel peut ignorer l'app sans constituer un échec

## User Journeys

### Journey 1 — Thomas, le Joueur : Le Flow Post-Match

Thomas joue Orques & Gobelins. La partie vient de se terminer — victoire serrée. À table, les joueurs calculent les XP sur papier. Thomas sait déjà combien d'XP chaque unité a gagné.

Deux heures plus tard, dans le bus, il ouvre Campaign TOW. Il voit une entrée "Partie vs. Julien — résultat à saisir". Il tape "Victoire".

Il lance le flow post-match. L'app passe ses unités en revue une par une. Pour son Troupeau de Squigs, il entre 3 XP. **Palier "Aguerri" atteint** — il choisit +1 Initiative.

Pour le Chef de Guerre mis hors combat, l'app lui propose : ajouter une blessure permanente, ou ajouter un bonus. Thomas saisit la blessure notée sur papier.

Trois minutes plus tard, il scrolle sa timeline. Son armée a une histoire.

**Capabilities :** flow post-match séquentiel, saisie XP libre, détection de palier, choix d'amélioration, saisie blessure/bonus personnage, timeline scrollable.

---

### Journey 2 — Thomas, le Joueur : Référence Pendant la Partie

Mi-partie, Thomas veut savoir si l'unité d'élite adverse a des malus. Depuis l'accueil, il navigue vers l'armée de Julien et trouve la fiche de l'unité. Deltas de campagne visibles en rouge et vert. Vingt secondes.

Julien demande la table des destructions d'unité. Section Références — disponible immédiatement.

**Capabilities :** navigation cross-armée, fiche d'unité avec deltas, section Références.

---

### Journey 2b — Marc, le Joueur qui rejoint en cours

Marc rejoint la campagne à la 3e partie. Son armée a déjà 2 parties dans les jambes — des XP, une amélioration, une blessure permanente sur un personnage. Ben lui crée un compte et importe sa liste OWB.

Marc a deux chemins :

**Chemin A — Retracer l'historique :** Il crée les deux parties passées et saisit les évolutions via le flow post-match. Sa timeline reflète l'histoire complète.

**Chemin B — État initial direct :** Il ouvre ses fiches d'unité et édite directement : +1 Initiative sur les Squigs, blessure permanente (-1 Endurance) sur le Chef de Guerre. Il repart de l'état actuel sans historique.

L'app accepte les deux. Aucune contrainte.

**Capabilities :** édition directe des fiches d'unité (bonus/malus/blessures sans flow post-match), saisie rétroactive via parties.

---

### Journey 3 — Ben, l'Admin-Joueur : Setup Initial

Ben importe les 10 armées depuis les exports OWB fournis sur Discord. Il crée les comptes et assigne chaque armée à son joueur. Les joueurs reçoivent leurs identifiants et trouvent leur armée déjà chargée.

Ben redevient joueur ordinaire. Son usage admin est terminé. L'import reste centralisé chez Ben pour le MVP — import self-service post-MVP.

**Capabilities :** import OWB, création de comptes, assignation armée/joueur.

---

### Journey 4 — Thomas : Armée Non Mise à Jour

Thomas a raté la saisie après la 2e partie. L'app ne le bloque pas. Sa timeline affiche l'entrée "évolutions à compléter". Quand il trouve le temps, il saisit rétrospectivement — ou édite directement les fiches si la rétroactivité complète ne l'intéresse pas.

**Capabilities :** tolérance aux données incomplètes, édition directe des fiches, saisie rétroactive.

---

### Journey Requirements Summary

| Capability | Journeys |
|---|---|
| Timeline scrollable avec entrées par partie | 1, 4 |
| Flow post-match séquentiel unité par unité | 1 |
| Détection de palier et choix d'amélioration | 1 |
| Saisie blessure/bonus personnage (sans rappel de jet) | 1 |
| Accès propre armée en 2 taps; armées adverses en 3-4 taps | 2 |
| Fiche d'unité avec deltas de campagne | 2 |
| Section Références (tables statiques) | 2 |
| Édition directe des fiches (MVP) | 2b, 4 |
| Saisie rétroactive via parties | 2b, 4 |
| Import OWB (admin) | 3 |
| Gestion comptes et assignation armées | 3 |
| Tolérance aux données incomplètes | 4 |

## Web App Requirements

Application web monopage (SPA) responsive, déployée derrière authentification, usage principalement mobile en contexte de jeu de table. Pas de SSR nécessaire — pas de SEO, pas de performance critique au premier octet. Pas de synchronisation temps réel entre clients.

### Browser Matrix

| Navigateur | Support |
|---|---|
| Chrome/Chromium (mobile + desktop) | ✅ Cible principale |
| Safari iOS | ✅ Requis |
| Firefox (desktop) | ✅ Support moderne |
| Samsung Internet | ✅ Best-effort |
| IE / Edge Legacy / anciens navigateurs | ❌ Hors scope |

### Responsive Design

- Mobile-first — usage principal à table sur téléphone
- Breakpoints : mobile (< 768px) prioritaire, desktop secondaire
- Zones de tap ≥ 44px, pas de hover-only interactions
- **Accès à sa propre armée et ses fiches d'unité : 2 taps maximum depuis l'accueil**
- Accès aux fiches d'unité adverses : 3-4 taps acceptables

### Implementation Constraints

- Pas de PWA ni mode offline pour le MVP
- **Post-MVP :** PWA (installable sur écran d'accueil) + offline lecture seule via Service Worker
- Authentification session standard — pas de 2FA

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**Approche :** Experience MVP — le minimum qui fait ressentir la valeur centrale : timeline narrative + flow post-match satisfaisant. Test de succès : un joueur préfère-t-il ouvrir l'app plutôt que retrouver ses notes papier ?

**Contexte de déploiement :** L'app sera vraisemblablement disponible après 3-4 parties déjà jouées. La saisie rétroactive (Journey 2b) permet à tous les joueurs de rejoindre l'app dans n'importe quel état de campagne.

**Stack technique :** TanStack Start + shadcn/ui + PostgreSQL. Modèle de données relationnel : armées → unités → parties → évolutions. Parser OWB isolé en module indépendant.

### MVP Feature Set (Phase 1)

- Import armées depuis export texte OWB (admin) — fallback saisie manuelle si parsing échoue
- Gestion des comptes joueurs (création, assignation armée)
- Fiches d'unité : XP actuel, palier atteint, deltas de campagne (bonus/malus/blessures)
- Édition directe des fiches (sans passer par flow post-match)
- Timeline scrollable : état actuel + historique chronologique par partie
- Parties partagées : création, adversaire, résultat (V/D/É) par les deux joueurs
- Flow post-match séquentiel : saisie XP, blessures/bonus personnages, choix améliorations si palier
- Section Références : tables statiques (XP, blessures 2D6, destructions 2D6, améliorations)
- Auth username + mot de passe, droits par armée
- Visibilité croisée : toutes les armées consultables par tous

### Phase 2 — Growth (Post-MVP)

- Wizard de calcul XP guidé (cases à cocher en fin de partie)
- Lore narratif par partie
- Page armée / lore global
- Indicateur visuel "évolutions à compléter" sur les parties sans saisie
- PWA (installable sur écran d'accueil)
- Offline lecture seule (Service Worker)
- Import self-service OWB pour les joueurs

### Phase 3 — Expansion (Vision)

- Réutilisation pour d'autres campagnes / autres clubs
- Gestion CO, territoires, bâtiments
- Accès spectateur sans compte
- Statistiques avancées

### Risk Mitigation

**Import OWB :** Format texte informel susceptible d'évoluer. Parser isolé en module indépendant ; saisie manuelle disponible comme fallback.

**Délai :** App disponible après les premières parties. Mitigation : saisie rétroactive et édition directe des fiches.

**Adoption :** Timeline vide sans données initiales. Mitigation : Ben en tant qu'admin-joueur sert d'ambassadeur actif.

## Functional Requirements

### Authentification & Gestion des Comptes

- **FR1 :** Un joueur peut se connecter avec un nom d'utilisateur et un mot de passe
- **FR2 :** Un joueur peut mettre à jour son nom d'affichage
- **FR3 :** À sa première connexion, un joueur voit une modale de bienvenue dismissible expliquant l'app, l'invitation à mettre à jour son nom, et le contact admin
- **FR4 :** L'admin peut créer un compte joueur
- **FR5 :** L'admin peut assigner une armée à un compte joueur
- **FR6 :** Un joueur ne peut modifier que les données de sa propre armée
- **FR7 :** Le résultat d'une partie est modifiable par les deux joueurs impliqués

### Import & Setup des Armées

- **FR8 :** L'admin peut importer une armée depuis un export texte Old World Builder
- **FR9 :** L'admin peut saisir manuellement les unités d'une armée (fallback si parsing OWB échoue)
- **FR10 :** L'admin peut corriger les données d'une unité après import

### Fiches d'Unité

- **FR11 :** Un joueur peut consulter la fiche d'une unité de son armée (XP actuel, palier atteint, deltas de campagne)
- **FR12 :** Un joueur peut consulter les fiches d'unité de n'importe quelle armée
- **FR13 :** Un joueur peut éditer directement les bonus, malus et blessures d'une unité de sa propre armée sans passer par le flow post-match
- **FR14 :** Un joueur peut éditer directement les bonus, malus et blessures d'un personnage de sa propre armée sans passer par le flow post-match

### Timeline & Parties

- **FR15 :** Un joueur peut consulter la timeline scrollable de son armée (état actuel en haut, puis parties précédentes avec leurs évolutions en ordre chronologique inverse)
- **FR16 :** Un joueur peut consulter la timeline d'une armée adverse
- **FR17 :** Un joueur peut créer une partie en sélectionnant un adversaire parmi les joueurs de la campagne
- **FR18 :** Un joueur peut voir les parties en attente impliquant son armée (parties créées par un adversaire où ses évolutions ne sont pas encore saisies)
- **FR19 :** Les deux joueurs d'une partie peuvent saisir ou modifier le résultat (Victoire / Défaite / Égalité)
- **FR20 :** Les évolutions liées à une partie sont visibles sur la timeline des deux joueurs concernés

### Flow Post-Match

- **FR21 :** Un joueur peut lancer un flow post-match séquentiel pour une partie jouée
- **FR22 :** Dans le flow post-match, un joueur peut saisir l'XP gagné pour chaque unité de son armée
- **FR23 :** Dans le flow post-match, un joueur peut saisir l'XP gagné pour chaque personnage de son armée
- **FR24 :** L'app détecte automatiquement quand une unité franchit un palier d'XP lors de la saisie
- **FR25 :** L'app détecte automatiquement quand un personnage franchit un palier d'XP lors de la saisie
- **FR26 :** Un joueur peut choisir une amélioration disponible parmi les options du palier franchi pour une unité
- **FR27 :** Un joueur peut choisir une amélioration disponible parmi les options du palier franchi pour un personnage
- **FR28 :** Dans le flow post-match, un joueur peut saisir une blessure permanente ou un bonus pour un personnage mis hors combat
- **FR29 :** Un joueur peut saisir les évolutions d'une partie de manière rétroactive

### Section Références

- **FR30 :** Tout joueur connecté peut consulter les tables de gain d'XP pour les unités
- **FR31 :** Tout joueur connecté peut consulter les tables de gain d'XP pour les personnages
- **FR32 :** Tout joueur connecté peut consulter la table des blessures permanentes des personnages (2D6)
- **FR33 :** Tout joueur connecté peut consulter la table de destruction des unités (2D6)
- **FR34 :** Tout joueur connecté peut consulter la liste des améliorations disponibles par palier (unités et personnages)

## Non-Functional Requirements

### Performance

- **NFR1 :** Chargement initial de la timeline < 2 secondes sur réseau mobile 4G
- **NFR2 :** Navigation entre écrans (SPA) < 500ms
- **NFR3 :** Interactions dans le flow post-match < 300ms

### Security

- **NFR4 :** Mots de passe stockés hashés (bcrypt ou équivalent) — jamais en clair
- **NFR5 :** Toutes les communications chiffrées via HTTPS
- **NFR6 :** Routes et mutations protégées côté serveur — un joueur ne peut pas modifier les données d'une armée qui ne lui appartient pas, même par manipulation de requêtes

### Accessibility

- **NFR7 :** Zones de tap sur mobile ≥ 44x44px
- **NFR8 :** Contrastes texte/fond suffisants pour lecture en conditions de jeu (éclairage variable)

### Integration

- **NFR9 :** Parser OWB isolé en module indépendant — remplaçable sans impacter le reste de l'application
- **NFR10 :** Parser OWB traite un export complet en moins de 5 secondes

### Reliability

- **NFR11 :** App disponible pendant les créneaux de jeu (best-effort — pas de SLA formel)
