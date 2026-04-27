#!/bin/sh
# Runs once at container startup (via /docker-entrypoint.d/40-render-config.sh).
# Renders *.conf.template into /etc/nginx/conf.d/*.conf using env vars.
# If a cert exists for $PRIMARY_DOMAIN — enables the full app config.
# Otherwise serves only the bootstrap config (HTTP + ACME challenge path).

set -eu

: "${PRIMARY_DOMAIN:?PRIMARY_DOMAIN is required}"
: "${API_DOMAIN:?API_DOMAIN is required}"
: "${ADMIN_DOMAIN:?ADMIN_DOMAIN is required}"

CERT_PATH="/etc/letsencrypt/live/${PRIMARY_DOMAIN}/fullchain.pem"

cd /etc/nginx/conf.d
rm -f 00-bootstrap.conf 10-app.conf

if [ -f "$CERT_PATH" ]; then
    echo "[nginx-init] cert found for ${PRIMARY_DOMAIN} — enabling 10-app.conf"
    envsubst '${PRIMARY_DOMAIN} ${API_DOMAIN} ${ADMIN_DOMAIN}' \
        < 10-app.conf.template > 10-app.conf
else
    echo "[nginx-init] no cert yet — bootstrap (HTTP only). Run scripts/init-letsencrypt.sh."
    envsubst '${PRIMARY_DOMAIN} ${API_DOMAIN} ${ADMIN_DOMAIN}' \
        < 00-bootstrap.conf.template > 00-bootstrap.conf
fi
