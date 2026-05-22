# ── Stage 1: Install dependencies ──
FROM node:22-slim AS deps
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ── Stage 2: Build ──
FROM node:22-slim AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Build-time args : variables Vite (préfixe VITE_) inlinées dans le bundle client.
# Doivent être passées via --build-arg ou docker-compose `build.args`.
# SENTRY_AUTH_TOKEN sert au plugin Sentry Vite pour uploader les sourcemaps.
# SENTRY_RELEASE (SHA du commit) nomme la release sous laquelle elles sont uploadées.
ARG VITE_SENTRY_DSN
ARG SENTRY_AUTH_TOKEN
ARG SENTRY_RELEASE
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN
ENV SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN
ENV SENTRY_RELEASE=$SENTRY_RELEASE
# TEMPORAIRE : logs debug de l'upload sourcemaps Sentry.
# À retirer une fois l'upload confirmé OK dans les logs de déploiement.
ENV SENTRY_LOG_LEVEL=debug

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm build

# ── Stage 3: Production image ──
FROM node:22-slim AS production
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/.output ./.output
COPY --from=build /app/drizzle ./drizzle
COPY package.json pnpm-lock.yaml drizzle.config.ts ./

EXPOSE 3000

CMD ["sh", "-c", "pnpm db:migrate && node --import ./.output/server/instrument.server.mjs .output/server/index.mjs"] 
