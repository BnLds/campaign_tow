# User Journey Flows

## J2 — Army Consultation at the Table

**Own army — 2 taps (primary path)**

```mermaid
flowchart TD
    A([Opens app]) --> B["Vue Campagne — home"]
    B --> C["Tap tab 'Armées'"]
    C --> D["Liste armées — son armée surlignée en tête"]
    D --> E(["Tap sur son armée\n→ Vue détail armée\nstats + deltas color-codés"])
```

**Opponent army — 2 taps**

```mermaid
flowchart TD
    A(["Vue Campagne — home"]) --> B["Tap tab 'Armées'"]
    B --> C["Liste de toutes les armées"]
    C --> D(["Tap sur l'armée adverse\n→ Vue détail armée\nstats + deltas color-codés"])
```

## J1 — Post-Match Flow

```mermaid
flowchart TD
    A(["Tap chip 'Rapport de bataille — vs X'\ndans le strip d'action chips"]) --> B["Enter result V/D/E\n+ confirm match"]
    B --> C[Next unit]
    C --> D{Character?}

    D -- no --> E["Enter XP\nnative numeric keyboard"]
    D -- yes --> F[Enter character XP]
    F --> G{Put out of action?}
    G -- yes --> H["Permanent wound\nor narrative bonus"]
    H --> I{Tier reached?}
    G -- no --> I
    E --> I

    I -- yes --> J["TIER REACHED\nStrong visual moment"]
    J --> K["Choose upgrade\nfrom available options"]
    K --> L{Another unit?}
    I -- no --> L

    L -- yes --> C
    L -- no --> M[Summary of changes]
    M --> N(["Timeline updated\nArmy history grows"])
```

## J_invite — Match Creation

```mermaid
flowchart TD
    A(["Tap FAB '+'\nbas-droite, toutes vues"]) --> B["Select opponent\ndropdown list of players"]
    B --> C[Enter date]
    C --> D[Match created and confirmed]

    D --> E["In your timeline:\nmatch visible, post-match available"]
    D --> F["In opponent's timeline:\nmatch visible immediately"]

    E --> G{Need to change?}
    G -- yes --> H[Edit match\nopponent or date]
    G -- cancel --> I[Delete match]
    H --> E
    I --> J(["Match removed from both timelines"])
```

## Journey Patterns

- **Two-tap access**: own army always reachable in 2 taps — tab "Armées" → tap own army (highlighted gold)
- **Single entry for opponents**: tab "Armées" → tap opponent army — one consistent path
- **FAB action**: match creation always available via FAB, never confused with navigation
- **Non-blocking pending state**: incomplete post-matchs surface as action chips, never block other actions

## Flow Optimization Principles

- No result entry at match creation — entered at post-match start when context is clearest
- No opponent confirmation step — match is confirmed on creation, visible in both timelines immediately
- Army view is the terminal screen for consultation — no drill-down to individual unit sheet needed
- Post-match flow is sequential unit by unit — one decision at a time, no form to fill

---
