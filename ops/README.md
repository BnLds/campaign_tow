# Operations

Ce dossier contient la documentation et la configuration d'exploitation de Campaign TOW.

La configuration Compose de production est decrite par `ops/docker-compose.prod.yml`.

## Architecture Production

Traefik ne doit pas monter `/var/run/docker.sock` directement. La decouverte Docker passe par `docker-socket-proxy`, accessible uniquement sur le reseau Compose interne `socket`:

```text
traefik -> docker-socket-proxy -> /var/run/docker.sock
```

Le proxy autorise uniquement les endpoints Docker necessaires a Traefik pour la decouverte des containers:

```yaml
CONTAINERS: 1
EVENTS: 1
INFO: 1
NETWORKS: 1
POST: 0
```

## Validation Compose

Avant de deployer un changement Compose, valider la configuration rendue:

```bash
docker compose -f ops/docker-compose.prod.yml config --quiet
```

Depuis le serveur de production, si le shell est deja dans le dossier du repo:

```bash
docker compose -f ops/docker-compose.prod.yml config --quiet
```

## Deploiement Cible Traefik

Pour relancer uniquement Traefik et le socket proxy, sans reconstruire l'application ni redemarrer la base:

```bash
docker compose -f ops/docker-compose.prod.yml up -d docker-socket-proxy
docker compose -f ops/docker-compose.prod.yml up -d --force-recreate traefik
```

## Checks Post-Deploiement

```bash
curl -I https://old-world-campaign.ben-lds.com
docker inspect campaign_tow-traefik-1
```

`campaign_tow-traefik-1` ne doit pas avoir `/var/run/docker.sock` monte. Seul `docker-socket-proxy` doit monter le socket Docker.

## Variables D'Environnement

Les secrets et valeurs de production ne doivent jamais etre committees.

Variables attendues par `ops/docker-compose.prod.yml`:

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

Utiliser `.env.example` comme reference pour documenter les variables sans valeur sensible.

## Notes Sentry

`VITE_SENTRY_DSN` est integre dans le bundle browser au build. Changer ce DSN necessite donc un rebuild de l'image.

`SENTRY_RELEASE` doit correspondre au commit deploye pour que les sourcemaps et les events soient rattaches a la meme release.
