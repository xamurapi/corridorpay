#!/usr/bin/env bash
# One-shot deploy: build images, run migrations, start the stack.
# Run on the server, in the project root, with .env.production already filled.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f .env.production ]; then
    echo "ERROR: .env.production missing. Run scripts/init-env.sh first." >&2
    exit 1
fi

COMPOSE="docker compose --env-file .env.production -f docker-compose.prod.yml"

echo "[deploy] 1/4  Building images…"
$COMPOSE build

echo "[deploy] 2/4  Starting database…"
$COMPOSE up -d postgres

echo "[deploy] 3/4  Applying migrations…"
$COMPOSE --profile init run --rm migrate
# Demo seed creates a well-known superadmin (admin@corridorpay.ru / admin12345).
# NEVER seed automatically in production. Opt in explicitly for staging demos:
#   SEED_DEMO=1 scripts/deploy.sh
if [ "${SEED_DEMO:-0}" = "1" ]; then
    echo "[deploy]      SEED_DEMO=1 — seeding demo users (change their passwords immediately!)"
    $COMPOSE --profile init run --rm seed
else
    echo "[deploy]      Skipping demo seed (set SEED_DEMO=1 to enable)."
fi

echo "[deploy] 4/4  Starting api + web + nginx + cert renewer…"
$COMPOSE up -d api web nginx certbot-renew

echo
echo "[deploy] Done. Services:"
$COMPOSE ps
echo
echo "[deploy] If this is the first deploy, run scripts/init-letsencrypt.sh to obtain TLS certs."
