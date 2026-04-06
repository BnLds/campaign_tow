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

CMD ["sh", "-c", "pnpm db:migrate && node .output/server/index.mjs"]
