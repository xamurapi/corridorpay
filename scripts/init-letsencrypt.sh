#!/usr/bin/env bash
# Obtain initial Let's Encrypt certificate for PRIMARY/API/ADMIN domains via webroot.
# Run ONCE on the server after DNS is pointed at it and after `docker compose up -d nginx`
# has the bootstrap config running on port 80.
#
# Re-running is safe — certbot will skip if the cert is fresh enough.

set -euo pipefail

# shellcheck disable=SC1091
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f .env.production ]; then
    echo "ERROR: .env.production not found. Copy .env.production.example and fill values first." >&2
    exit 1
fi

COMPOSE="docker compose --env-file .env.production -f docker-compose.prod.yml"

# Load only the domain/email names we need. Deliberately do NOT re-export
# LETSENCRYPT_STAGING here so a value passed on the command line
# (LETSENCRYPT_STAGING=1 scripts/init-letsencrypt.sh) is not clobbered.
# shellcheck disable=SC2046
export $(grep -E '^(PRIMARY_DOMAIN|API_DOMAIN|ADMIN_DOMAIN|LETSENCRYPT_EMAIL)=' .env.production | xargs)

# Fall back to the file's staging value only if it was not already set in the env.
if [ -z "${LETSENCRYPT_STAGING:-}" ]; then
    LETSENCRYPT_STAGING="$(grep -E '^LETSENCRYPT_STAGING=' .env.production | tail -1 | cut -d= -f2)"
fi

: "${PRIMARY_DOMAIN:?missing in .env.production}"
: "${API_DOMAIN:?missing in .env.production}"
: "${ADMIN_DOMAIN:?missing in .env.production}"
: "${LETSENCRYPT_EMAIL:?missing in .env.production}"

STAGING_FLAG=""
if [ "${LETSENCRYPT_STAGING:-0}" = "1" ]; then
    STAGING_FLAG="--staging"
    echo "[init-le] Using Let's Encrypt STAGING (test certs, not browser-trusted)."
fi

echo "[init-le] Domains: $PRIMARY_DOMAIN, $API_DOMAIN, $ADMIN_DOMAIN"
echo "[init-le] Email:   $LETSENCRYPT_EMAIL"
echo

# 1. Ensure nginx is running with the bootstrap config (port 80, ACME challenge path).
$COMPOSE up -d nginx

# 2. Run certbot one-shot inside its container, sharing the certbot-www volume.
$COMPOSE run --rm certbot \
    certonly --webroot -w /var/www/certbot \
    --email "$LETSENCRYPT_EMAIL" \
    --agree-tos --no-eff-email --keep-until-expiring \
    $STAGING_FLAG \
    -d "$PRIMARY_DOMAIN" \
    -d "$API_DOMAIN" \
    -d "$ADMIN_DOMAIN"

# 3. Reload nginx — the entrypoint will see the cert and switch to 10-app.conf.
$COMPOSE restart nginx

echo
echo "[init-le] Done. Visit https://$PRIMARY_DOMAIN to verify."
