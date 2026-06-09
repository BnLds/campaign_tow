---
stepsCompleted: ['step-01-discovery', 'step-02-prd-analysis', 'step-03-epic-coverage', 'step-04-ux-alignment', 'step-05-epic-quality', 'step-06-final-assessment']
workflowStatus: complete
documentsUsed:
  prd: _bmad-output/planning-artifacts/prd.md
  architecture: _bmad-output/planning-artifacts/architecture-territory/
  epics: _bmad-output/planning-artifacts/epics/
  ux: _bmad-output/planning-artifacts/ux-design-specification-territory.md
---

# Implementation Readiness Assessment Report

**Date:** 2026-04-15
**Project:** campaign_tow

## PRD Analysis

### Functional Requirements

**Faction Data & Detection**
- FR1: Canonical list of all factions (colonization rules, buildings, special structures)
- FR2: Detect player faction from army data
- FR3: OWB import script identifies/assigns faction

**Tile Management**
- FR4: Add tile by selecting terrain type
- FR5: Remove a tile
- FR6: Display base income per terrain
- FR7: Toggle river plain adjacency flag (+20 CO bonus)
- FR8: View tiles in collapsible accordion list

**Colony Management**
- FR9: Build village (faction-permitted tiles)
- FR10: Upgrade village to city (faction-permitted)
- FR11: Enforce faction colonization constraints
- FR12: Faction-specific alternative structures (Chaos Portals, Ogre Tyrant Hall)
- FR13: Upgrade faction-specific structures (Portal → Major Portal)
- FR14: Deduct correct CO cost on colony build/upgrade
- FR15: Track building slots per colony (1 village, 3 city, faction-specific)

**Building Construction**
- FR16: Construct building when slots available
- FR17: Show only buildings available to faction + tile/colony type
- FR18: Enforce build constraints (slot limits, 1 upgraded military per colony, terrain restrictions)
- FR19: Deduct correct CO cost on building construction
- FR20: View building rules/effects (informational)
- FR21: Apply automatic bonuses (free farm/menagerie/mine on specific colony types)

**CO Economy — Income Generation**
- FR22: Trigger weekly income generation once per week
- FR23: Track week applied (prevent duplicate generation)
- FR24: Calculate total income (tiles + buildings + faction bonuses)
- FR25: Credit calculated income to balance

**CO Economy — Manual Entries**
- FR26: Add manual expense entry (label + amount)
- FR27: Add manual income entry (label + amount)
- FR28: Manual entries reflected immediately in balance

**CO Economy — Balance & History**
- FR29: View current CO balance from territory tab at all times
- FR30: View estimated weekly income
- FR31: Chronological transaction history of all CO movements

**Territory Dashboard & Export**
- FR32: View complete territory overview (balance, income, tiles, colonies, buildings)
- FR33: Export territory overview as markdown (Discord-shareable)

**Initial Territory Setup**
- FR34: Enter current CO balance during setup
- FR35: Add existing tiles + terrain types during setup
- FR36: Declare existing colonies and buildings during setup
- FR37: Review and confirm complete territory state before finalizing

**Chaos Faction — God Consecration**
- FR38: WoC/Marauders must assign god/cult when founding village
- FR39: Second village dedicated to same god requires villages for all other gods first
- FR40: Track unit/character slots per god (2/village, 3/city)

**Error Correction**
- FR41: Cancel most recent transaction (LIFO undo, multiple consecutive supported)

**Total FRs: 41**

### Non-Functional Requirements

**Performance**
- NFR1: Territory dashboard load < 2s on 4G mobile
- NFR2: Weekly income calculation (server) < 2s
- NFR3: Building/colony operations < 500ms
- NFR4: Accordion expand/collapse < 100ms client-side
- NFR5: Transaction history loads < 1s for ≤200 entries

**Security**
- NFR6: Player can only modify own territory (server-side authz)
- NFR7: CO mutations server-authoritative — no client manipulation
- NFR8: UNDO validates transaction is player's most recent (race-safe)

**Reliability**
- NFR9: Weekly income generation idempotent (no double-credit)
- NFR10: Transaction history append-only — reversals logged, not deleted
- NFR11: Initial setup interruptible/resumable without data loss

**Integration**
- NFR12: OWB import correctly identifies faction for all ~15 factions
- NFR13: Faction data as structured config (no hardcoded logic)

**Total NFRs: 13**

### Additional Requirements / Constraints
- All ~15 factions must be supported at MVP (no partial faction support)
- Module lives in existing "Territoires" tab — no new routes
- Mobile-first responsive (< 768px priority), tap zones ≥ 44px
- Browser matrix unchanged from existing app (Chrome, Safari iOS, Firefox)
- Server-side income calculation (server-authoritative balance)
- Faction detection from existing player → army → faction data model
- Append-only transaction log (immutable entries)
- Phase 1 (MVP) = manual weekly trigger; Phase 2 = cron automation; Phase 3 = 2D map

### PRD Completeness Assessment
PRD est complet et bien structuré : 41 FRs couvrant les 4 user journeys, 13 NFRs traitant performance/sécurité/fiabilité/intégration, scoping clair MVP/Growth/Vision, contraintes et risques explicités. Les FRs sont numérotés et atomiques. Quelques zones à valider lors de la traçabilité avec les epics : FR33 (export markdown) et FR38–40 (god consecration Chaos) sont des cas spécifiques qu'il faudra confirmer comme couverts.

## Epic Coverage Validation

### Coverage Matrix

| FR | Domaine | Epic / Story | Statut |
|---|---|---|---|
| FR1 | Faction canonical list | Epic 1 (Story 1.1, 1.2) | ✓ Covered |
| FR2 | Faction detection from army data | Epic 1 (Story 1.2, 1.3) | ✓ Covered |
| FR3 | OWB import faction assignment | Epic 1 (Story 1.3) | ✓ Covered |
| FR4 | Add tile with terrain | Epic 2 (Story 2.2, 2.4) | ✓ Covered |
| FR5 | Remove tile | Epic 2 (Story 2.2, 2.5) | ✓ Covered |
| FR6 | Display base income per terrain | Epic 2 (Story 2.3, 2.4) | ✓ Covered |
| FR7 | River plain adjacency toggle | Epic 2 (Story 2.2, 2.5) | ✓ Covered |
| FR8 | Tile list view (accordion/grid) | Epic 2 (Story 2.3) | ✓ Covered |
| FR9 | Build village (faction-allowed) | Epic 3 (Story 3.3) | ✓ Covered |
| FR10 | Upgrade village → city | Epic 3 (Story 3.4) | ✓ Covered |
| FR11 | Faction colonization constraints | Epic 3 (Story 3.2, 3.3) | ✓ Covered |
| FR12 | Alternative faction structures | Epic 3 (Story 3.5) | ✓ Covered |
| FR13 | Upgrade faction structures | Epic 3 (Story 3.5) | ✓ Covered |
| FR14 | CO deduction colony | Epic 3 (Story 3.2, 3.3, 3.4) | ✓ Covered |
| FR15 | Building slots per colony | Epic 3 (Story 3.1, 3.4) | ✓ Covered |
| FR16 | Construct building (slots) | Epic 4 (Story 4.2, 4.3) | ✓ Covered |
| FR17 | Faction + tile filtered building list | Epic 4 (Story 4.2, 4.3) | ✓ Covered |
| FR18 | Building constraints | Epic 4 (Story 4.1, 4.2) | ✓ Covered |
| FR19 | CO deduction building | Epic 4 (Story 4.2) | ✓ Covered |
| FR20 | Display building rules/effects | Epic 4 (Story 4.3) | ✓ Covered |
| FR21 | Automatic free buildings | Epic 4 (Story 4.4) | ✓ Covered |
| FR22 | Trigger weekly income generation | Epic 5 (Story 5.3) | ✓ Covered |
| FR23 | Week tracking idempotency | Epic 5 (Story 5.1, 5.3) | ✓ Covered |
| FR24 | Income calculation | Epic 5 (Story 5.2, 5.3) | ✓ Covered |
| FR25 | Credit income to balance | Epic 5 (Story 5.3) | ✓ Covered |
| FR26 | Manual expense entry | Epic 5 (Story 5.5) | ✓ Covered |
| FR27 | Manual income entry | Epic 5 (Story 5.5) | ✓ Covered |
| FR28 | Manual entries reflected immediately | Epic 5 (Story 5.5) | ✓ Covered |
| FR29 | View CO balance | Epic 1 (Story 1.5) shell + Epic 5 (Story 5.4) | ✓ Covered |
| FR30 | View estimated weekly income | Epic 5 (Story 5.4) | ✓ Covered |
| FR31 | Chronological transaction history | Epic 6 (Story 6.1) | ✓ Covered |
| FR32 | Territory overview dashboard | Epic 1 (Story 1.5) shell + Epic 2/3/4 fill | ✓ Covered |
| FR33 | Markdown Discord export | Epic 6 (Story 6.3) | ✓ Covered |
| FR34 | Setup — current CO balance | Epic 7 (Story 7.1) | ✓ Covered |
| FR35 | Setup — existing tiles | Epic 7 (Story 7.1) | ✓ Covered |
| FR36 | Setup — existing colonies & buildings | Epic 7 (Story 7.1) | ✓ Covered |
| FR37 | Setup — review & confirm | Epic 7 (Story 7.1, 7.2) | ✓ Covered |
| FR38 | Chaos god/cult assignment | Epic 3 (Story 3.6) | ✓ Covered |
| FR39 | God diversity rule | Epic 3 (Story 3.6) | ✓ Covered |
| FR40 | Slots tracking per god | Epic 3 (Story 3.6) | ✓ Covered |
| FR41 | LIFO transaction cancellation | Epic 6 (Story 6.2) | ✓ Covered |

### Missing Requirements
**None.** All 41 FRs from the PRD are explicitly mapped to at least one epic via the `requirements-inventory.md#fr-coverage-map` section, and each mapping resolves to a concrete story in the relevant epic file.

### Coverage Statistics
- Total PRD FRs: **41**
- FRs covered in epics: **41**
- Coverage percentage: **100%**
- FRs in epics but absent from PRD: **0**
- The `requirements-inventory.md` also catalogs **13 NFRs** and **41 UX-DRs** to track during downstream validation.

## UX Alignment Assessment

### UX Document Status
**Found.** `ux-design-specification-territory.md` (650 lignes, 12 sections) + 2 mockups HTML de référence (`ux-mockup-territory-A.html`, `ux-mockup-territory-B.html`). Workflow UX marqué `complete` (étapes 1-14).

### UX ↔ PRD Alignment
- Vision UX cohérente avec PRD : couche stratégique, mobile-first, intégration tab existant.
- Les 4 user journeys du PRD sont reflétées dans la section "User Journey Flows" du spec UX.
- Les contraintes UX du PRD (mobile-first <768px, tap zones ≥44px, tab "Territoires", browser matrix inchangée) sont reprises dans le spec.
- 41 UX-DRs additionnels extraits dans `requirements-inventory.md` — ils enrichissent le PRD sans le contredire (composants concrets : `CoBanner`, `TileCard`, `BuildingSlot`, `BuildingOption`, `TransactionEntry`, `IncomeBreakdown`, `TerritorySetupWizard`).

### UX ↔ Architecture Alignment
- **Composants UX → architecture frontend :** chaque composant custom mappé à un fichier dans `project-structure-boundaries.md`. `TerritorySetupWizard` réutilise le pattern reducer + phases du `post-match-wizard/` existant.
- **Forms UX-DR29 (TanStack Form + Zod Standard Schema) :** explicitement validé dans architecture (pas d'adaptateur, validation Zod partagée client/serveur).
- **Performance UX (UX-DR21 spinner localisé) :** supporté par TanStack Query `isFetching` — décision architecturale `['territory', playerId]` 30s stale.
- **Pattern URL state UX-DR17/18 (`?tile=`, `?view=`) :** explicitement décidé via Zod `validateSearch` dans `routes/territories.tsx`.
- **NFR4 (accordion <100ms) + UX-DR17 (scrollIntoView) :** documenté dans implementation-patterns.
- **NFR11 (setup interruptible) vs UX-DR16 (centered Dialog, atomic) :** un compromis a été acté côté architecture — atomic setup à la fin via `setupTerritoryFn`. Si le joueur ferme à mi-parcours, il recommence. **À noter** : l'architecture documente clairement ce trade-off comme acceptable, mais c'est une légère divergence avec la lecture stricte de NFR11 ("interruptible et resumable sans perte de données"). Le PRD requirement initial est plus fort que ce qui sera implémenté.

### Alignment Issues
1. **NFR11 reformulé en cours de route (mineur)** — La spec NFR11 dit "interrupted and resumed without data loss", mais l'architecture transforme ça en "all-or-nothing atomic" (état perdu si fermeture mi-parcours, recommencer le wizard). C'est documenté et justifié dans `architecture-validation-results.md` comme acceptable trade-off, mais devrait être validé explicitement par Ben pour confirmer que ce n'est pas une régression du contrat PRD.

### Warnings
- Aucun gap critique. UX et architecture sont fortement couplés et cohérents, le seul écart est NFR11 ↔ atomic setup, déjà identifié et tranché côté architecture.

## Epic Quality Review

### Inventaire
- **7 epics**, **33 stories** au total
- Tous les epics ont un goal user-facing clair (gestion empire, économie CO, historique, setup)
- ACs systématiquement formatées en Given/When/Then, riches et testables
- Chaque table DB est créée dans la story où elle est d'abord nécessaire (✅ pas d'epic "DB upfront")
- Documents référencés par les stories vérifiés présents : `docs/factions.md`, `docs/faction_rule.md`, `docs/territory_rule.md` ✅

### Best Practices Compliance — Vue d'ensemble

| Critère | Statut |
|---|---|
| Epics délivrent valeur utilisateur | ✅ 7/7 |
| Epics indépendants (Epic N n'exige pas Epic N+1) | ✅ |
| Stories correctement dimensionnées | ✅ atomique |
| Pas de forward dependencies entre stories | ⚠️ 1 cas mineur (Story 5.1 → 5.3) |
| Tables DB créées au moment opportun | ✅ |
| ACs claires (Given/When/Then) | ✅ |
| Traçabilité aux FRs maintenue | ✅ via `requirements-inventory.md` |

### 🔴 Critical Violations
**Aucune violation critique** au sens de "epic technique sans valeur utilisateur" ou "dépendance circulaire".

### 🟠 Major Issues — INCOHÉRENCES CONTRACTUELLES ENTRE EPICS

Plusieurs incohérences techniques entre epics qui causeront des frictions d'implémentation. Elles sont documentées comme **majeures** car elles touchent au schéma DB et à la signature d'API partagée :

#### M1 — Schéma `co_transactions` : `metadata` JSONB inexistant mais utilisé par Epics 5/6/7
**Story 3.1** définit explicitement les colonnes de `co_transactions` : `id, player_territory_id, type, amount, label, related_entity_type, related_entity_id, week_number, reversed_transaction_id, created_at`. **Aucune colonne `metadata`** n'est prévue.

Or :
- Story 5.3 utilise `(metadata->>'week')::int = $2` et `metadata: { week, lines }` dans son insert
- Story 5.5 stocke `metadata: { reason }` pour les saisies manuelles
- Story 6.1 expose `metadata` dans son DTO (`label` calculé "from `type` + `metadata`")
- Story 6.2 utilise `metadata.buildingId`, `metadata.replacedBuilding`, `metadata.colonyId`
- Story 7.2 stocke `metadata: { reason: 'Setup campagne — ...' }`

**Impact :** soit Story 3.1 doit ajouter une colonne `metadata jsonb` (et supprimer/refactor `label`, `related_entity_type`, `related_entity_id`, `week_number`), soit Epics 5/6/7 doivent réécrire leurs ACs pour utiliser les colonnes discrètes existantes. **À trancher avant le démarrage de l'Epic 3.**

**Recommandation :** ajouter `metadata jsonb NOT NULL DEFAULT '{}'` dans Story 3.1 ET conserver `week_number`, `related_entity_id` comme colonnes typées pour les requêtes performantes ; le reste passe par `metadata`.

#### M2 — Signature `withCoTransaction` divergente entre Story 3.2 et Epics 5/7
**Story 3.2** fixe la signature positionnelle :
```ts
withCoTransaction(tx, playerTerritoryId, type, amount, label, relatedEntity?, weekNumber?)
```

**Story 5.3 / 5.5 / 7.2** appellent un style objet :
```ts
withCoTransaction(tx, { playerId, type, amount, metadata })
```

Trois divergences : positionnel vs objet, `playerTerritoryId` vs `playerId`, présence/absence de `metadata`. **À aligner avant Story 3.2.**

**Recommandation :** adopter la signature objet (plus extensible) dès Story 3.2, et harmoniser le nom (`playerTerritoryId`).

#### M3 — Naming de colonne UNDO : `reversed_transaction_id` vs `reversed_by_transaction_id`
- Story 3.1 crée `reversed_transaction_id` (text, FK self-reference)
- Story 6.2 dit "the table gains a nullable `reversed_by_transaction_id`" — laissant penser que la colonne n'existe pas encore, alors qu'elle a déjà été créée sous un autre nom (et avec une sémantique différente : Story 3.1 = "ce reversal annule la tx X" ; Story 6.2 = "cette tx X a été annulée par tx Y")

**Impact :** ce sont en fait deux colonnes distinctes sémantiquement (`reversed_transaction_id` côté reversal, `reversed_by_transaction_id` côté tx originale). Le besoin légitime existe — il faut juste créer **les deux** dans Story 3.1 plutôt qu'une seule.

**Recommandation :** corriger Story 3.1 pour créer `reversed_transaction_id` (sur reversal) ET `reversed_by_transaction_id` (sur tx originale). Mettre à jour Story 6.2 pour ne plus prétendre "ajouter" la colonne.

#### M4 — Enum colonie : `village/city` (anglais) vs `village/ville` (français mixte)
- Story 3.1 / 3.3 / 3.4 / 4.x : `colony.type IN ('village', 'city', 'chaos_portal', ...)` (anglais)
- Story 7.1 wizard : `'village' | 'ville'` (mix anglais/français)
- Story 7.2 schema : `z.enum(['village', 'ville'])` (mix)

**Impact :** code et tests vont diverger sur `'city'` vs `'ville'`.
**Recommandation :** standardiser sur `'city'` (anglais) côté DB/code, et localiser uniquement à l'affichage. Corriger Story 7.1/7.2.

#### M5 — Forward dependency Story 5.1 → 5.3
Story 5.1 dit explicitement :
> the endpoint invokes `generateWeeklyIncomeFn` (Story 5.3) for every player […] inside the same response

Cela rend Story 5.1 incomplétable sans Story 5.3. C'est un forward reference qui viole le principe "chaque story indépendamment livrable".

**Impact :** mineur car les deux stories sont dans le même epic et peuvent être groupées, mais la story devrait être restructurée.
**Recommandation :** Story 5.1 livre uniquement le squelette `POST /api/cron/advance-week` qui incrémente `campaign_settings.campaign_week`. La boucle d'invocation `generateWeeklyIncomeFn` est déplacée dans Story 5.3 (qui consomme l'endpoint via un appel séparé) OU dans une nouvelle Story 5.3.5.

#### M6 — Référence faction config : 18 factions vs ~15
- PRD : "tous les ~15 factions"
- Architecture / Stories Epic 1 : "18 factions"
- Story 1.1 : "exactly 18 rows" — `docs/factions.md` est censé contenir la liste canonique

**Impact :** divergence numérique entre PRD et stories. Probablement le PRD a vieilli (15 → 18). À confirmer avec `docs/factions.md` lors de Story 1.1.
**Recommandation :** mineur ; vérifier que `docs/factions.md` contient bien 18 entrées et accepter le décalage avec le PRD.

### 🟡 Minor Concerns

#### m1 — Stories "developer" plutôt que "user"
Stories 1.1, 1.2, 2.1, 3.1, 3.2, 4.1 sont écrites comme "As a developer". Stories 5.1/5.2/5.3/7.2 comme "As a campaign operator / the server / the CO economy engine". Strictement, ces stories ne sont pas des user stories.

**Justification acceptable :** projet brownfield avec extension d'architecture mature ; ces stories sont des building blocks atomiques qui supportent les stories user-facing du même epic. Le pattern est cohérent et leurs ACs sont rigoureuses.
**Recommandation :** acceptable en l'état, mais à mentionner explicitement dans le retrospective post-MVP.

#### m2 — Story 1.4 mélange "As a player" + corps purement technique
La story est tagguée user mais 90% du contenu concerne la migration et la lazy bootstrap. Les ACs côté player visible sont en Story 1.5.
**Impact :** négligeable.

#### m3 — Story 6.2 retrofit de `buildBuildingFn` pour `metadata.replacedBuilding`
Story 6.2 modifie rétroactivement Stories 4.2 et 4.5 pour persister `metadata.replacedBuilding`. C'est un retrofit acceptable, mais devrait être anticipé dans 4.5 plutôt que reporté à 6.2. Lien direct avec M1 (cela suppose que la colonne `metadata` existe).

#### m4 — UX-DR19 exception explicite dans Story 3.6
Story 3.6 (Chaos god consecration) déroge à UX-DR19 ("hide don't grey") en affichant les dieux interdits désactivés avec tooltip. L'exception est documentée et justifiée — bien fait, mais devrait être ajoutée comme amendement à UX-DR19 dans `requirements-inventory.md` pour garder la traçabilité.

#### m5 — Exclusion explicite de scope dans Story 6.2
Story 6.2 documente explicitement qu'undoer un tile-add cascadant à la suppression du portal automatique est **hors scope MVP**. Bien — la limitation est consciente.

### Dépendances inter-epics (chaîne validée)

```
Epic 1 (foundation)
  → Epic 2 (tiles, autonome)
  → Epic 3 (colonies, exige Epic 2 + faction-config d'Epic 1)
    → Epic 4 (buildings, exige colonies/tiles + withCoTransaction)
      → Epic 5 (CO economy, exige co_transactions de 3.1 + tous les calculs revenus)
        → Epic 6 (history/UNDO, exige co_transactions et patterns 4.x)
          → Epic 7 (setup wizard, exige tous les patterns CRUD précédents)
```

Aucun cycle. Chaque epic peut démarrer après que son prédécesseur est complet. ✅

### Recommandation par ordre de priorité

1. **AVANT Epic 3** : trancher M1 (colonne `metadata`) et M2 (signature `withCoTransaction`). Mettre à jour Story 3.1 et 3.2 en conséquence — tout le reste en dépend.
2. **AVANT Epic 3** : corriger M3 (deux colonnes UNDO) et M4 (enum `city` partout).
3. **AVANT Epic 5** : restructurer Story 5.1 pour éliminer le forward reference vers Story 5.3 (M5).
4. **AVANT Epic 1** : confirmer le compte exact de factions (M6) en lisant `docs/factions.md`.
5. **Optionnel** : amender `requirements-inventory.md` UX-DR19 pour documenter l'exception Chaos (m4).

## Summary and Recommendations

### Overall Readiness Status

**🟠 NEEDS WORK — corrections ciblées avant Epic 3**

La planification du module Territoire est globalement excellente : couverture FR 100%, architecture validée, UX cohérente, 7 epics et 33 stories rigoureusement cadrés. Les fondations PRD/Architecture/UX sont prêtes pour l'implémentation. **Mais** 4 incohérences techniques majeures entre Epic 3 (qui pose le socle DB et l'utilitaire `withCoTransaction`) et Epics 5/6/7 (qui le consomment) doivent être tranchées avant de démarrer Epic 3 — sinon Epic 3 livrera un schéma et une API incompatibles avec ce que les epics suivants attendent.

Aucune violation critique au sens "epic technique sans valeur" ou "dépendance circulaire". Aucun FR manquant. Aucun gap de couverture. Les corrections demandées sont des ajustements de schéma et de signature, pas une refonte.

### Critical Issues Requiring Immediate Action

Aucun issue **critique** au sens BMAD strict. Mais 4 issues **majeures** doivent impérativement être résolues avant le lancement de l'implémentation :

1. **M1 — Colonne `metadata` JSONB manquante dans `co_transactions`** : Story 3.1 doit être amendée pour inclure `metadata jsonb` avant que les Epics 5/6/7 (qui en dépendent fortement) puissent démarrer.

2. **M2 — Signature `withCoTransaction` divergente** : Story 3.2 utilise une signature positionnelle ; Epics 5/7 appellent une signature objet. Choisir l'objet (plus extensible) et harmoniser le naming `playerTerritoryId`.

3. **M3 — UNDO : deux colonnes nécessaires** (`reversed_transaction_id` ET `reversed_by_transaction_id`). Story 3.1 n'en crée qu'une, Story 6.2 prétend ajouter l'autre. Créer les deux dès Story 3.1.

4. **M4 — Enum colonie incohérent** : standardiser sur `'city'` (anglais) côté DB/code dans toutes les stories Epic 3 et 7.

### Issues Mineures (acceptables, à noter)

- M5 — Forward dep Story 5.1 → 5.3 (restructurer 5.1 pour ne pas appeler `generateWeeklyIncomeFn`)
- M6 — Compte de factions PRD (~15) vs stories (18) — confirmer via `docs/factions.md`
- m1 — Plusieurs stories en "As a developer" (acceptable pour brownfield)
- m4 — UX-DR19 a une exception légitime dans Story 3.6 (à documenter dans le requirements-inventory)
- m5 — Story 6.2 documente clairement une limitation MVP (cascading tile undo) — bien fait

### Recommended Next Steps

1. **Amender Story 3.1** pour ajouter `metadata jsonb NOT NULL DEFAULT '{}'` et `reversed_by_transaction_id` (M1, M3).
2. **Amender Story 3.2** pour adopter la signature objet de `withCoTransaction` (M2).
3. **Grep & remplacer** `'ville'` → `'city'` dans Stories 7.1 et 7.2 (M4).
4. **Restructurer Story 5.1** pour livrer uniquement le squelette cron + increment week (sans la boucle d'invocation) ; déplacer la boucle dans une nouvelle Story 5.3.5 ou directement dans 5.3 (M5).
5. **Lire `docs/factions.md`** et confirmer le compte (15 ou 18) — mettre à jour PRD ou stories selon la vérité du fichier (M6).
6. **Optionnel — amender `requirements-inventory.md`** : ajouter une note d'exception UX-DR19 pour le cas Chaos god consecration (m4).
7. **Une fois ces corrections appliquées**, lancer `bmad-create-story` pour la Story 1.1 et démarrer l'implémentation séquentielle.

### Coverage Statistics — Récapitulatif

| Métrique | Valeur |
|---|---|
| FRs PRD couverts par les epics | 41/41 (100%) |
| NFRs adressés par l'architecture | 13/13 (100%) |
| UX-DRs cataloguées | 41 |
| Epics planifiés | 7 |
| Stories planifiées | 33 |
| Forward dependencies détectées | 1 (M5) |
| Incohérences techniques majeures | 4 (M1–M4) |
| Issues critiques bloquantes | 0 |
| Issues mineures | 6 |

### Final Note

Cette évaluation a identifié **10 issues** réparties sur **3 catégories** (cohérence schéma DB, cohérence API entre epics, alignement enum). **Aucune n'est bloquante structurellement** — toutes peuvent être corrigées par des amendements ciblés à 4 stories (3.1, 3.2, 5.1, 7.1/7.2) sans toucher au PRD, à l'architecture, ou à l'UX. La planification est de très bonne qualité — c'est la couture entre Epic 3 (le socle) et les epics suivants qui doit être resserrée.

Une fois M1–M4 résolus, le module Territoire est **prêt pour l'implémentation séquentielle Epic par Epic**.

---

**Assesseur :** Claude (BMAD bmad-check-implementation-readiness)
**Date :** 2026-04-15
**Documents évalués :** prd.md, architecture-territory/, epics/ (7 epics, 33 stories), ux-design-specification-territory.md
