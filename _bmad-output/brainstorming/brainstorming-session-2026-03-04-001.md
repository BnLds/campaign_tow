---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: ['campaign_rules.md']
session_topic: 'Application de suivi de campagne Warhammer The Old World'
session_goals: 'Définir les fonctionnalités clés d'une app de suivi de campagne: expérience des unités/personnages, bonus/malus, historique des parties, territoires'
selected_approach: 'ai-recommended'
techniques_used: ['Question Storming', 'SCAMPER Method']
ideas_generated: [15]
session_active: false
workflow_completed: true
context_file: '/home/ben/dev/campaign_tow/campaign_rules.md'
---

# Brainstorming Session Results

**Facilitator:** Ben
**Date:** 2026-03-04

## Session Overview

**Topic:** Application de suivi de campagne Warhammer The Old World (Campaign Tow)
**Goals:** Concevoir les fonctionnalités, l'architecture et l'expérience utilisateur d'une application permettant de suivre l'évolution d'une campagne de jeu de figurines — armées, expérience, bonus/malus des unités, historique des parties et territoires.

### Context Guidance

*Règles de campagne chargées. Points clés :*
- *Système d'expérience à deux niveaux : personnages (paliers 6/12/20/30 XP) et unités (paliers 3/6/9/12/20 XP)*
- *Améliorations mineures et majeures avec contraintes spécifiques par unité*
- *Système de territoires avec bâtiments et revenus (CO) complexes*
- *Blessures permanentes et destruction d'unités avec jets de dés*
- *3 phases de campagne : Expansion, Transition, Guerre totale*
- *Import potentiel depuis Old World Builder (export texte)*

### Session Setup

*Session initialisée avec contexte de campagne complet. Idées initiales de Ben : suivi armée, XP unités/personnages, bonus/malus, historique des parties, territoires gagnés/perdus.*

## Technique 1 : Question Storming — Résultats

### Décisions architecturales clés

**[Données #1] : Armée Persistante**
*Concept :* L'armée ne change pas de partie en partie — elle évolue. Les unités détruites ne disparaissent pas, elles reviennent avec des malus. L'identité des unités est stable.
*Novelty :* Simplifie radicalement la gestion d'état — pas de reconstruction, juste un delta continu.

**[Données #2] : Modèle Delta**
*Concept :* L'app ne stocke pas les stats complètes des unités, seulement les modifications de campagne (bonus, malus, champion, bannière, équipements Forge). La fiche affiche l'état de base OWB + les deltas en couleur (vert/rouge).
*Novelty :* Élimine le besoin d'une base de données de stats, supprime les problèmes de profils multiples et de stats non-numériques.

**[Données #3] : Import OWB Unique**
*Concept :* Import unique au démarrage depuis Old World Builder (format texte stable). OWB inclut toujours tous les profils (y compris champion). Pas de ré-import nécessaire sauf changement majeur d'armée.
*Novelty :* Import riche : nom, modèles, équipement, stats, règles spéciales, profils multiples — tout est déjà dans l'export.

**[Données #4] : Partie comme Batch de Changelog**
*Concept :* Une "partie" est une unité de contexte regroupant toutes les évolutions d'une session de jeu. Contient : date, Joueur A vs Joueur B, évolutions armée A, évolutions armée B, lore personnel de chaque joueur.
*Novelty :* Pas de résultat de match enregistré — juste les conséquences. L'historique est narratif, pas compétitif.

**[Données #5] : Lore Asymétrique**
*Concept :* Chaque joueur écrit son propre récit d'une partie — son histoire personnelle, son point de vue. Deux récits du même affrontement coexistent dans l'app.
*Novelty :* Dimension RPG/narrative unique. L'app devient un carnet de campagne vivant, pas juste un tableur.

**[Données #6] : XP par Paliers**
*Concept :* L'XP s'accumule (jamais dépensé). Les paliers débloquent des slots d'amélioration. Les joueurs saisissent manuellement l'XP gagné après chaque partie, puis choisissent leurs améliorations dans l'app.
*Novelty :* Sépare la saisie (mécanique) de la décision (stratégique).

**[Données #7] : Personnages Distincts des Unités**
*Concept :* Les personnages ont leur propre système d'XP et de paliers, distinct des unités. Traités comme des entités séparées dans l'app.
*Novelty :* Deux arbres d'évolution parallèles avec des règles différentes.

### Décisions de périmètre MVP

**[Scope #1] : Fonctionnalités core MVP**
*Concept :* (1) Suivi XP unités + personnages, (2) Ajout bonus/malus unités + personnages, (3) Historique des parties liant les évolutions à un contexte de match.
*Novelty :* Volontairement minimaliste — pas de carte/territoires, pas d'aide de jeu en v1.

**[Scope #2] : Hors périmètre v1**
*Concept :* Gestion des territoires et carte, calcul automatique de l'XP, aide de jeu (tables de dés), gestion des bâtiments et CO.
*Novelty :* Décision explicite de ne pas surcharger le MVP.

### Décisions techniques

**[Tech #1] : Web Responsive**
*Concept :* Application web accessible depuis mobile (pas de native). Accessible à table de jeu sans installation.
*Novelty :* Choix pragmatique pour un club de ~15 joueurs.

**[Tech #2] : Stack**
*Concept :* TanStack + PostgreSQL + shadcn/ui. Auth username/password. Import centralisé par l'admin (Ben).
*Novelty :* Stack moderne, un seul admin gère les imports initiaux.

**[Tech #3] : Modèle de droits**
*Concept :* Tous les joueurs voient toutes les armées. Chaque joueur ne peut modifier que sa propre armée. Un joueur crée la partie pour les deux.
*Novelty :* Simple, sans workflow de validation croisée.

## Technique 2 : SCAMPER — Résultats

**[UX #1] : Carte d'Unité Style Magic**
*Concept :* Design des fiches d'unité inspiré des cartes Magic The Gathering — hiérarchie visuelle forte, lisible en un coup d'œil à table sur mobile. Contenu : nom de l'unité + nom de lore, XP actuel + palier, deltas de campagne (vert/rouge), équipements ajoutés. Pas de stats brutes, pas de coût en points, pas de catégorie.
*Novelty :* Langage visuel immédiatement familier pour tout joueur de hobby. Orienté campagne, pas liste d'armée.

**[UX #2] : Timeline par Unité**
*Concept :* Sur la carte d'unité, possibilité de dérouler la timeline chronologique de ses évolutions : Partie vs X → +2XP, +1CC | Partie vs Y → Moral Brisé -1Cd. L'histoire de l'unité racontée directement sur sa carte.
*Novelty :* Fusionne état courant et historique en une seule vue cohérente, sans navigation séparée.

**[UX #3] : Page Armée = Channel Discord Structuré**
*Concept :* Chaque joueur a une page armée publique consultable par tous — remplace/complète le channel Discord informel existant. Structure les échanges actuels avec des données réelles.
*Novelty :* S'appuie sur un comportement existant plutôt que d'en inventer un nouveau. (V2)

**[Workflow #1] : Session Partagée Post-Partie**
*Concept :* Joueur A crée la partie, un code/lien est généré. Joueur B rejoint. Chacun saisit ses évolutions et son lore de son côté. Les deux contributions se retrouvent sous la même partie.
*Novelty :* Condition nécessaire au lore asymétrique. Architecture fondamentale de la saisie post-partie. (V2)

**[Workflow #2] : Principe "Complément Papier/Crayon"**
*Concept :* L'app ne remplace pas le rituel convivial de calcul à table — elle l'enregistre. Saisie manuelle intentionnelle, pas d'automatisation du calcul d'XP. La convivialité est une feature.
*Novelty :* Contrainte de design explicite qui guide toutes les décisions UX.

**[Admin #1] : Comptes Créés Manuellement par Ben**
*Concept :* Pas d'inscription publique. Ben crée tous les comptes au départ (il importe aussi les armées). Les joueurs reçoivent login/mot de passe. Zéro friction d'onboarding.
*Novelty :* Adapté à un club fermé de ~15 joueurs. Simplifie radicalement l'auth.

---

## Organisation et Priorisation

### Thèmes identifiés

**Thème 1 : Modèle de données**
Armée persistante, modèle delta, import OWB unique, personnages distincts, XP par paliers.
*Pattern :* Tout repose sur une logique de "snapshot initial + deltas immuables". Simple, robuste, extensible.

**Thème 2 : UX / Design**
Carte style Magic, timeline par unité, code couleur vert/rouge, contenu orienté campagne (pas liste d'armée).
*Pattern :* L'interface doit parler le langage du hobby, pas d'un logiciel de gestion.

**Thème 3 : Workflow post-partie**
Session partagée, saisie manuelle intentionnelle, deux joueurs / une partie, lore asymétrique.
*Pattern :* La partie est l'unité sociale et narrative centrale de l'app.

**Thème 4 : Périmètre**
MVP focalisé, livraison rapide, V2 claire et bien définie.
*Pattern :* Décisions d'élimination aussi importantes que les décisions d'inclusion.

---

### MVP Final — Fonctionnalités v1

| Feature | Description |
|---|---|
| Import armée | Admin importe export OWB (texte) pour chaque joueur |
| Affichage armées | Toutes les armées visibles par tous les joueurs |
| Carte d'unité | Style Magic, état de base + deltas colorés |
| Suivi XP unités | Saisie manuelle XP, paliers affichés (3/6/9/12/20) |
| Suivi XP personnages | Saisie manuelle XP, paliers affichés (6/12/20/30) |
| Ajout bonus/malus | Liste d'améliorations et malus à cocher selon les règles |
| Historique des parties | Date + adversaire + liste des évolutions liées |
| Auth | Username/password, droits en écriture sur sa propre armée uniquement |

### Backlog V2

| Feature | Pourquoi en V2 |
|---|---|
| Lore par partie | Dépend de la session partagée |
| Session partagée | Architecture plus complexe (temps réel ou async) |
| Page armée / lore global | Valeur ajoutée mais pas bloquante |
| Victoires/défaites par unité | Intéressant mais non essentiel |
| Tables de dés (aide de jeu) | Feature secondaire |
| Gestion territoires + carte | Complexité élevée, pas urgent |
| Gestion bâtiments + CO | Idem |

---

### Prochaines étapes recommandées

1. **Créer un Product Brief** — formaliser les décisions de cette session en document de référence pour l'équipe
2. **Créer l'architecture** — modèle de données PostgreSQL, structure TanStack Start, routes principales
3. **Parser l'export OWB** — valider que le format texte est parsable de manière fiable (prototype rapide)
4. **Concevoir la carte d'unité** — wireframe ou maquette de la carte style Magic avant de coder
5. **Définir les epics et stories** — découper le MVP en stories implémentables

---

## Résumé de Session

**Session :** Brainstorming — App de suivi de campagne Warhammer The Old World
**Durée :** ~1h30 de dialogue collaboratif
**Techniques :** Question Storming + SCAMPER (Six Thinking Hats remplacé par convergence naturelle)
**Idées générées :** 15 insights structurants

**Percées créatives :**
- Le modèle delta élimine le problème de la base de données de stats
- La carte style Magic comme langage visuel natif du hobby
- La "partie" comme unité narrative (pas compétitive) — changelog groupé
- Le principe "complément papier/crayon" comme contrainte de design fondamentale

**Décision la plus importante :** Shipper un MVP focalisé (XP + bonus/malus + historique) avant d'ajouter le lore, les territoires et les features sociales. Réduire le scope a été le vrai travail de cette session.
