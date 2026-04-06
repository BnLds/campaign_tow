#!/bin/bash
set -euo pipefail

# ============================================================
# Migration des données de Railway vers le VPS
#
# Prérequis :
#   - Railway CLI installé : npm i -g @railway/cli
#   - Être loggé : railway login
#   - Le VPS doit être setup et la DB docker lancée
#
# Usage :
#   ./scripts/migrate-from-railway.sh
# ============================================================

DUMP_FILE="/tmp/campaign_tow_railway_dump.sql"
VPS_HOST="${VPS_HOST:-51.77.244.211}"

echo "=== Étape 1 : Export depuis Railway ==="
echo "Récupération de DATABASE_URL depuis Railway..."

# Option A : via Railway CLI
if command -v railway &>/dev/null; then
  RAILWAY_DB_URL=$(railway variables --json | python3 -c "import sys,json; print(json.load(sys.stdin)['DATABASE_URL'])" 2>/dev/null || true)
fi

if [ -z "${RAILWAY_DB_URL:-}" ]; then
  echo "⚠ Impossible de récupérer DATABASE_URL automatiquement."
  echo "Copie l'URL depuis le dashboard Railway (Database → Connect → Connection URL)"
  read -rp "DATABASE_URL Railway : " RAILWAY_DB_URL
fi

echo "Export de la base de données..."
pg_dump "$RAILWAY_DB_URL" --no-owner --no-privileges --clean --if-exists > "$DUMP_FILE"
echo "✔ Dump créé : $DUMP_FILE ($(du -h "$DUMP_FILE" | cut -f1))"

echo ""
echo "=== Étape 2 : Import sur le VPS ==="
echo "Copie du dump vers le VPS..."
scp "$DUMP_FILE" "ubuntu@${VPS_HOST}:/tmp/"

echo "Import dans le container Postgres..."
ssh "ubuntu@${VPS_HOST}" bash -c "'
  cd /opt/campaign_tow
  source .env
  sudo docker compose -f docker-compose.prod.yml exec -T db \
    psql -U \$POSTGRES_USER -d \$POSTGRES_DB < /tmp/campaign_tow_railway_dump.sql
  rm /tmp/campaign_tow_railway_dump.sql
  echo \"✔ Import terminé !\"
'"

echo ""
echo "=== Étape 3 : Vérification ==="
ssh "ubuntu@${VPS_HOST}" bash -c "'
  cd /opt/campaign_tow
  source .env
  sudo docker compose -f docker-compose.prod.yml exec -T db \
    psql -U \$POSTGRES_USER -d \$POSTGRES_DB -c \"\\dt\"
'"

rm -f "$DUMP_FILE"
echo ""
echo "✔ Migration terminée ! Vérifie les tables ci-dessus."
