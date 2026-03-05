---
stepsCompleted: [1, 2, 3, 4, 5]
inputDocuments:
  - '_bmad-output/brainstorming/brainstorming-session-2026-03-04-001.md'
  - 'docs/campaign_rules.md'
date: 2026-03-05
author: Ben
---

# Product Brief: campaign_tow

## Executive Summary

Campaign TOW est une application web de suivi de campagne pour un groupe de joueurs
Warhammer: The Old World. Elle s'intègre dans le rituel existant sans le remplacer :
le calcul papier en fin de partie reste intact, l'app l'enregistre et le rend visible
à tous. Elle couvre deux moments distincts — référence instantanée à table pendant la
partie (état courant des unités, tables de règles), et carnet de campagne vivant après
la partie (saisie guidée des évolutions, historique chronologique). L'app attend le
joueur : elle n'impose rien, elle accueille ce qu'il y dépose, quand il le souhaite.

---

## Core Vision

### Problem Statement

Suivre l'évolution d'une armée sur plusieurs parties d'une campagne Warhammer TOW est
fastidieux. Les règles introduisent de nombreux deltas par partie : XP gagné,
améliorations débloquées, malus subis, blessures permanentes. Sans outil dédié, les
joueurs calculent sur papier en fin de partie, puis doivent retrouver leurs notes chez
eux pour mettre à jour leur liste manuellement. L'historique se perd, les armées
adverses restent opaques, et la richesse narrative de la campagne disparaît dans des
messages Discord épars.

### Problem Impact

Les joueurs perdent le fil de leur propre armée. Personne ne connaît l'état réel des
forces adverses avant un affrontement. L'histoire de la campagne — les hauts faits des
unités, les blessures encaissées, les paliers franchis — ne survit pas au-delà de bouts
de papier perdus. Le moment satisfaisant de choisir une amélioration après avoir franchi
un palier d'XP n'a pas d'endroit où exister durablement.

### Why Existing Solutions Fall Short

- **Discord** : non structuré, pas d'historique lié aux parties, impossible de
  consulter l'évolution chronologique d'une armée ou l'état courant des adversaires
- **Papier + notes** : données perdues après la partie, non partageables, aucune
  vue d'ensemble de la campagne
- **Tableurs** : état courant uniquement, pas d'historique par partie, aucune
  expérience adaptée au contexte mobile à table

### Proposed Solution

Une application web responsive, accessible sur mobile, organisée autour de deux modes
d'usage complémentaires :

**Mode référence (pendant la partie)** — accès rapide aux fiches d'unité (2 taps
maximum) affichant l'état courant : bonus, malus, blessures permanentes. Section
"Références" avec toutes les tables de campagne (conditions d'XP, blessures
personnages, destructions d'unités, améliorations disponibles). Toutes les armées
sont visibles par tous les joueurs du club.

**Mode enregistrement (après la partie)** — flow post-match séquentiel unité par
unité : saisie de l'XP gagné avec la table de conditions visible en contexte, puis
blessures éventuelles des personnages. Si un palier d'XP est franchi, l'app l'indique
et propose la liste des améliorations à choisir directement sur la fiche. La vue
centrale est une timeline scrollable : l'armée dans son état actuel en haut, puis le
dernier match avec ses évolutions, puis le précédent — toute l'histoire de l'armée
lisible d'un coup d'œil.

### Key Differentiators

- **L'app attend le joueur** : saisie manuelle intentionnelle de l'XP. Le calcul
  papier convivial à table reste intact — l'app mémorise ce qui a été décidé.
- **Timeline narrative visuelle** : l'interface centrale est une chronologie vivante
  de l'évolution de l'armée, pas un tableur de stats.
- **Visibilité croisée** : chaque joueur consulte l'armée de ses adversaires — leurs
  forces actuelles, leur historique de campagne, leurs paliers franchis.
- **Flow post-match satisfaisant** : franchir un palier d'XP et choisir une
  amélioration dans l'app devient le moment de récompense naturel après une partie.
- **Conçu pour un club fermé** : simple, sans friction d'onboarding, administré
  centralement pour ~15 joueurs.

---

## Target Users

### Primary Users

**Le Joueur de Campagne** *(~10-12 joueurs)*

Passionné de Warhammer TOW, il participe à la campagne avec une armée qu'il fait
évoluer partie après partie. Stratège ou amateur de lore, tous partagent la même
réalité : la campagne est un événement narratif auquel ils sont engagés.

- **Frustration actuelle** : notes papier perdues, mise à jour manuelle de la liste
  OWB chez soi, aucun historique partagé des parties.
- **Valeur clé** : timeline visuelle de l'évolution de son armée, flow post-match
  guidé pour choisir ses améliorations, consultation des armées adverses.
- **Moment "aha"** : après 3-4 parties, il scrolle sa timeline et voit l'histoire
  complète de sa campagne.
- **Contrainte** : l'app est une aide, pas une obligation. Une armée non mise à jour
  est acceptable — aucun mécanisme de synchronisation forcée.

**Ben — L'Admin-Joueur** *(1 utilisateur)*

Organisateur principal et joueur. Seul détenteur de l'accès admin (import OWB,
gestion des comptes). Son usage est double : administration au démarrage, puis
joueur ordinaire pour le suivi de campagne.

- **Valeur clé** : source de vérité centralisée sur l'état de chaque armée —
  moins de coordination par Discord.

### Secondary Users

*(Hors scope MVP : co-organisateur sans accès app, spectateurs non considérés)*

### User Journey

**Démarrage de la campagne (one-time)**
Ben importe chaque armée depuis OWB → crée les comptes → les joueurs reçoivent
leurs identifiants et trouvent leur armée déjà chargée.

**Pendant une partie**
Connexion → page d'accueil = son armée directement → fiche d'unité adverse en
2 taps → consultation de la section Références (tables de règles).

**Après une partie**
Flow post-match séquentiel unité par unité → saisie XP (table de conditions
visible) → blessures personnages si applicable → choix des améliorations si
palier franchi.

**Entre les parties**
Consultation des armées adverses pour préparer un affrontement → scroll de sa
propre timeline pour revivre l'évolution de sa campagne.

### Auth Model

Username + mot de passe. Chaque joueur ne peut modifier que sa propre armée.
Adapté à un club fermé de ~15 personnes qui se connaissent — pas de 2FA nécessaire.

---

## Success Metrics

### Definition of Success

Campaign TOW est un projet interne à but non commercial. Le succès se mesure en
adoption réelle et en impact sur l'expérience de la campagne — pas en revenus ou
en croissance d'utilisateurs.

**Critère binaire d'adoption :** L'app fonctionne en mode "tout ou rien". Soit
elle crée un momentum et la majorité des joueurs l'adoptent, soit elle floppe.
Il n'y a pas de succès partiel stable.

### Business Objectives

| Objectif | Cible | Horizon |
|---|---|---|
| Livraison avant le momentum critique | Disponible dès les premières parties de la campagne | Avant la 3e partie jouée |
| Adoption joueurs | ≥ 70% des joueurs actifs utilisent l'app | 1 mois après lancement |
| Couverture des parties | Majorité des parties jouées enregistrées dans l'app | En continu |
| Réplicabilité | Des joueurs demandent à réutiliser l'app pour d'autres campagnes | Fin de campagne |

### Key Performance Indicators

**Indicateurs primaires (go/no-go)**
- % de joueurs ayant effectué au moins un flow post-match → cible : ≥ 70%
- % des parties jouées enregistrées dans l'app → cible : ≥ 60%
- Date de mise en production vs. date de la 1re partie officielle → cible : avant

**Indicateur de valeur perçue**
- Demandes spontanées de réutilisation pour d'autres campagnes → cible : ≥ 1

**Indicateur de risque projet**
- Délai de livraison : si l'app n'est pas disponible avant la 3e partie jouée,
  l'adoption est compromise et le projet est en échec partiel.

### What Success Is NOT

- Des données parfaitement à jour sur toutes les armées — l'app est une aide,
  pas une contrainte. Des données partielles ou obsolètes sont acceptables.
- Un outil utilisé par 100% des joueurs — le joueur occasionnel peut ignorer
  l'app sans que cela constitue un échec.

---

## MVP Scope

### Core Features

**Import & Setup (Admin)**
- Import unique de chaque armée depuis l'export texte Old World Builder (OWB)
- Création manuelle des comptes joueurs par Ben
- Un seul admin (Ben) avec accès complet

**Fiches d'unité**
- Carte style Magic : nom, XP actuel, palier atteint, deltas de campagne
  (bonus en vert, malus en rouge)
- Personnages traités comme entités séparées (système XP distinct)
- Toutes les armées visibles par tous les joueurs en lecture

**Timeline scrollable**
- Page d'accueil = armée du joueur connecté (accès direct, 2 taps max)
- Vue chronologique : état actuel en haut, puis parties précédentes avec
  leurs évolutions en descendant
- Indicateur visuel "évolutions à compléter" sur les parties sans saisie

**Parties partagées**
- Joueur A crée la partie, sélectionne Joueur B dans une liste déroulante
- Joueur B reçoit une notification in-app
- Le résultat (V/D/É) est saisissable par l'un ou l'autre des joueurs
  (confiance mutuelle — club fermé)
- Chaque joueur saisit les évolutions de sa propre armée librement,
  au moment qu'il souhaite, sans validation croisée requise
- Les deux timelines affichent la même partie avec les évolutions
  de chaque armée

**Flow post-match**
- Flow séquentiel unité par unité (3-6 unités par armée)
- Saisie manuelle de l'XP gagné avec table de conditions visible en contexte
- Saisie des blessures permanentes des personnages mis hors combat
- Détection automatique du palier franchi → liste des améliorations
  disponibles à choisir (confiance joueur pour la légalité des options)

**Historique des parties**
- Chaque partie : date, adversaire, résultat (V/D/É), évolutions liées
  (XP, améliorations, malus) — visible sur la timeline des deux joueurs

**Section Références**
- Tables statiques : conditions d'XP unités et personnages, blessures
  personnages (2D6), destruction d'unités (2D6), améliorations disponibles

**Auth & Droits**
- Username + mot de passe
- Chaque joueur modifie uniquement sa propre armée
- Résultat de partie modifiable par les deux joueurs impliqués
- Toutes les armées consultables par tous

### Out of Scope for MVP

| Feature | Raison |
|---|---|
| Wizard calcul XP automatisé (cases à cocher) | V2 |
| Lore narratif par partie | V2 |
| Gestion CO, territoires, bâtiments | Hors scope — produit différent |
| Page armée / lore global | V2 |
| Statistiques V/D par unité | Inutile — résultat = résultat de l'armée |
| Accès spectateur sans compte | Hors scope MVP |
| Améliorations Forge | Même principe confiance joueur — reporté |

### MVP Success Criteria

L'app est un succès MVP si, avant la 3e partie officielle de la campagne :
- Elle est en production et accessible
- ≥ 70% des joueurs l'ont utilisée au moins une fois
- La majorité des parties jouées sont enregistrées

Signal de validation long terme : demandes spontanées pour d'autres campagnes.

### Future Vision

L'app est conçue spécifiquement pour cette campagne. Elle n'est pas pensée
comme un produit réutilisable ou généralisable. Les évolutions potentielles
(lore, session partagée enrichie, territoires) s'inscrivent dans le contexte
de cette campagne uniquement, si le temps et l'adoption le justifient.
