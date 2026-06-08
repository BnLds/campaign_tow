FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .

ARG VITE_SENTRY_DSN
ARG SENTRY_AUTH_TOKEN
ARG SENTRY_RELEASE=unknown

RUN pnpm build

FROM base AS runner
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/.output ./.output
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/src/db ./src/db
COPY --from=build /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=build /app/package.json ./package.json

EXPOSE 3000
CMD ["pnpm", "start"]
