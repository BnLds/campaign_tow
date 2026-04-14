// Service worker no-op : présent uniquement pour satisfaire le critère
// d'installabilité PWA des navigateurs Chromium (déclenche `beforeinstallprompt`).
// Aucune logique de cache : toutes les requêtes passent au réseau.
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', () => {
  // no-op : laisse le navigateur gérer la requête nativement
})
