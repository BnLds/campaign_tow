# Operations

This folder contains the operations documentation and configuration for Campaign TOW.

The production Compose configuration is described by `ops/docker-compose.prod.yml`.

## Production Architecture

Traefik must not mount `/var/run/docker.sock` directly. Docker discovery goes through `docker-socket-proxy`, which is accessible only on the internal Compose network `socket`:

```text
traefik -> docker-socket-proxy -> /var/run/docker.sock
```

The proxy only allows the Docker endpoints Traefik needs for container discovery:

```yaml
CONTAINERS: 1
EVENTS: 1
INFO: 1
NETWORKS: 1
POST: 0
```

## Compose Validation

Before deploying a Compose change, validate the rendered configuration:

```bash
docker compose -f ops/docker-compose.prod.yml config --quiet
```

From the production server, if the shell is already in the repository folder:

```bash
docker compose -f ops/docker-compose.prod.yml config --quiet
```

## Targeted Traefik Deployment

To restart only Traefik and the socket proxy, without rebuilding the application or restarting the database:

```bash
docker compose -f ops/docker-compose.prod.yml up -d docker-socket-proxy
docker compose -f ops/docker-compose.prod.yml up -d --force-recreate traefik
```

## Post-Deployment Checks

```bash
curl -I https://old-world-campaign.ben-lds.com
docker inspect campaign_tow-traefik-1
```

`campaign_tow-traefik-1` must not have `/var/run/docker.sock` mounted. Only `docker-socket-proxy` should mount the Docker socket.

## Environment Variables

Production secrets and values must never be committed.

Variables expected by `ops/docker-compose.prod.yml`:

- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `SESSION_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_HASH`
- `SENTRY_DSN`
- `VITE_SENTRY_DSN`
- `SENTRY_AUTH_TOKEN`
- `SENTRY_RELEASE`

Use `.env.example` as the reference for documenting variables without sensitive values.

## Sentry Notes

`VITE_SENTRY_DSN` is embedded in the browser bundle at build time. Changing this DSN therefore requires rebuilding the image.

`SENTRY_RELEASE` must match the deployed commit so sourcemaps and events are attached to the same release.
