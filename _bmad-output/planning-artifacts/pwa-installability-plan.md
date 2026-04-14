# Plan — PWA installable (homescreen only)

**Date :** 2026-04-14
**Objectif :** Rendre Campaign TOW installable sur homescreen (iOS + Android + desktop) en mode standalone.
**Non-objectifs :** offline, cache, push, background sync, bandeau offline.
**Estimation :** 30-45 min.

## Décisions tranchées (recherche web 2026-04-14)

- **Aucun Service Worker.** iOS Safari 17.4+ honore `display: standalone` depuis un manifest valide sans SW (source WebKit blog + MDN). SW requis uniquement pour Web Push — hors scope.
- **Aucune dépendance npm ajoutée.** Pas de `vite-plugin-pwa`, pas de Workbox.
- **Content-Type `.webmanifest` OK** : Nitro-nightly sert `application/manifest+json` out-of-the-box (vérifié dans `node_modules/nitro-nightly/.../common.mjs`).

## État actuel du repo

- `public/manifest.json` : boilerplate TanStack scaffold (name "Create TanStack App Sample") — à **remplacer**.
- `public/logo192.png`, `public/logo512.png` : assets boilerplate non utilisés — à **supprimer**.
- `public/icons/` contient déjà les assets générés :
  - `apple-touch-icon.png`
  - `favicon.ico`
  - `favicon.svg`
  - `favicon-96x96.png`
  - `web-app-manifest-192x192.png`
  - `web-app-manifest-512x512.png`
- `src/routes/__root.tsx` `head()` : ne contient ni `<link rel="manifest">` ni meta PWA.

## Tâches

### 1. Créer `public/manifest.webmanifest`

Remplace `public/manifest.json`. Nouveau nom `.webmanifest` pour Content-Type correct + convention W3C.

```json
{
  "name": "Old World Campaign",
  "short_name": "OWC",
  "description": "Suivi de campagne The Old World - Launa'Gamers",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#852e3b",
  "background_color": "#ffffff",
  "lang": "fr",
  "icons": [
    {
      "src": "/icons/web-app-manifest-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/web-app-manifest-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/web-app-manifest-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

**Note maskable :** si l'icône 512 n'est pas "safe zone" maskable-ready, l'icône sera rognée sur Android. À vérifier visuellement après déploiement. Si problème → régénérer une icône maskable dédiée.

### 2. Supprimer les fichiers boilerplate

- `public/manifest.json`
- `public/logo192.png`
- `public/logo512.png`

### 3. Mettre à jour `src/routes/__root.tsx`

Dans la fonction `head()` (actuellement ligne 26-33), ajouter les tags PWA.

**Avant :**
```ts
head: () => ({
  meta: [
    { charSet: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { title: "Campagne TOW 2026 - Launa'Gamers" },
  ],
  links: [{ rel: 'stylesheet', href: appCss }],
}),
```

**Après :**
```ts
head: () => ({
  meta: [
    { charSet: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
    { title: "Campagne TOW 2026 - Launa'Gamers" },
    { name: 'description', content: 'Suivi de campagne The Old World' },
    { name: 'theme-color', content: '#334155' },
    { name: 'mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-title', content: 'Campagne TOW' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
  ],
  links: [
    { rel: 'stylesheet', href: appCss },
    { rel: 'manifest', href: '/manifest.webmanifest' },
    { rel: 'icon', type: 'image/svg+xml', href: '/icons/favicon.svg' },
    { rel: 'icon', type: 'image/png', sizes: '96x96', href: '/icons/favicon-96x96.png' },
    { rel: 'shortcut icon', href: '/icons/favicon.ico' },
    { rel: 'apple-touch-icon', sizes: '180x180', href: '/icons/apple-touch-icon.png' },
  ],
}),
```

**Notes :**
- `viewport-fit=cover` pour iOS notch (mode standalone bord à bord).
- `apple-mobile-web-app-capable` reste utile comme fallback < iOS 16.4.
- `apple-mobile-web-app-title` force le nom court sur iOS (ignore le `short_name` du manifest historiquement).
- `status-bar-style: default` (clair) cohérent avec `background_color: #f1eade`. Si souci visuel, passer à `black-translucent`.

### 4. Vérification manuelle après déploiement

- **Desktop Chrome** : DevTools → Application → Manifest → vérifier qu'il charge sans erreur, icônes visibles, pas de warning.
- **Android Chrome** : ouvrir le site, menu → "Installer l'application" doit apparaître. Installer, vérifier icône + mode standalone.
- **iOS Safari** (17.4+) : Partager → "Sur l'écran d'accueil". Vérifier icône (doit être `apple-touch-icon.png`), lancer, vérifier mode standalone (pas de barre Safari).
- **Content-Type** : `curl -I https://<domain>/manifest.webmanifest` → attendre `Content-Type: application/manifest+json`.
- **Lighthouse** (optionnel) : audit PWA → score "Installable" doit être vert.

## Risques / points de vigilance

1. **Icône maskable** : si les assets actuels ne respectent pas la safe zone (80% centrale), l'icône sera rognée sur Android. Vérifier visuellement, régénérer si besoin via [maskable.app](https://maskable.app).
2. **iOS cache agressif** : si l'install apparaît correct mais les changements de manifest ne prennent pas, purger Safari (Réglages → Safari → Effacer historique).
3. **Breaking change visuel** : le `theme-color: #334155` va colorer la barre d'URL sur Chrome Android. Vérifier que c'est OK esthétiquement.
4. **Aucun impact attendu** sur le build Nitro, le SSR, ou Sentry. Zéro dépendance ajoutée.

## Rollback

Tout est contenu en 2 fichiers (`public/manifest.webmanifest` + `src/routes/__root.tsx`). `git revert` du commit suffit.
