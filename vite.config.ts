import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { sentryTanstackStart } from "@sentry/tanstackstart-react/vite";
import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const config = defineConfig({
  // Sourcemaps pour tous les builds Vite (client + SSR) — nécessaire pour que
  // les traces d'erreurs remontent au code source original dans Sentry.
  build: {
    sourcemap: true,
  },
  plugins: [
    devtools(),
    // sourcemap: true → émet aussi les sourcemaps du bundle serveur final
    // (.output/server). Sans ça, seules les erreurs *client* ont des traces
    // lisibles dans Sentry ; les erreurs serveur (routes API, server fns)
    // restent minifiées (build Nitro de prod : sourcemap désactivée par défaut).
    nitro({
      sourcemap: true,
      rollupConfig: { external: [/^@sentry\//] },
    }),
    tsconfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    sentryTanstackStart({
      org: "benjamin-landes",
      project: "javascript-tanstackstart-react",
      authToken: process.env.SENTRY_AUTH_TOKEN,
      // Release = SHA du commit, passé en build-arg (cf. Dockerfile + deploy.yml).
      // Le .git étant exclu du contexte Docker, l'auto-détection git ne peut pas
      // fonctionner — sans ça le plugin envoie `--release undefined` et l'upload échoue.
      release: { name: process.env.SENTRY_RELEASE },
    }),
  ],
})

export default config
