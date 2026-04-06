#!/bin/bash
set -euo pipefail

# ============================================================
# Setup Campaign TOW sur le VPS
# Usage : ssh ubuntu@51.77.244.211 'bash -s' < scripts/vps-setup.sh
# ============================================================

REPO_DIR="/opt/campaign_tow"

echo "=== 1. Vérification du repo ==="
if [ ! -d "$REPO_DIR" ]; then
  echo "ERREUR : $REPO_DIR n'existe pas."
  echo "Clone manuellement d'abord :"
  echo "  GIT_SSH_COMMAND=\"ssh -i ~/.ssh/github_deploy\" sudo -E git clone git@github.com:BnLds/campaign_tow.git $REPO_DIR"
  echo "  sudo chown -R \$USER:\$USER $REPO_DIR"
  exit 1
else
  echo "Repo trouvé dans $REPO_DIR"
fi

echo "=== 2. Création du fichier .env ==="
ENV_FILE="$REPO_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
  SESSION_SECRET=$(openssl rand -hex 32)
  cat > "$ENV_FILE" <<EOF
# ── Database ──
POSTGRES_USER=campaign_tow
POSTGRES_PASSWORD=$(openssl rand -hex 24)
POSTGRES_DB=campaign_tow

# ── App ──
SESSION_SECRET=$SESSION_SECRET
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=\$2a\$12\$CHANGE_ME_WITH_REAL_HASH

# Générer le hash : node -e "import('bcryptjs').then(b=>b.hash('motdepasse',12).then(console.log))"
EOF
  chmod 600 "$ENV_FILE"
  echo "Fichier .env créé dans $ENV_FILE"
  echo "IMPORTANT : édite $ENV_FILE pour renseigner ADMIN_PASSWORD_HASH"
else
  echo "Fichier .env existe déjà."
fi

echo ""
echo "============================================"
echo "  Setup terminé !"
echo "  Prochaines étapes :"
echo "  1. Éditer $REPO_DIR/.env"
echo "  2. Migrer la DB Railway : ./scripts/migrate-from-railway.sh"
echo "  3. cd $REPO_DIR && docker compose -f docker-compose.prod.yml up -d"
echo "============================================"
