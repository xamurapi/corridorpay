#!/usr/bin/env bash
# Generate .env.production from .env.production.example with strong random secrets.
# Idempotent: refuses to overwrite if .env.production already exists.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

TARGET=".env.production"

if [ -f "$TARGET" ]; then
    echo "ERROR: $TARGET already exists. Remove it first if you really want to regenerate." >&2
    exit 1
fi

if [ ! -f ".env.production.example" ]; then
    echo "ERROR: .env.production.example missing." >&2
    exit 1
fi

JWT_SECRET=$(openssl rand -hex 32)
DB_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-24)

cp .env.production.example "$TARGET"

# Replace placeholders. macOS sed -> use a portable form.
python3 - "$TARGET" "$JWT_SECRET" "$DB_PASSWORD" <<'PY'
import sys, re
path, jwt, dbp = sys.argv[1], sys.argv[2], sys.argv[3]
with open(path, 'r', encoding='utf-8') as f:
    s = f.read()
s = re.sub(r'^JWT_SECRET=.*$', f'JWT_SECRET={jwt}', s, flags=re.M)
s = re.sub(r'^POSTGRES_PASSWORD=.*$', f'POSTGRES_PASSWORD={dbp}', s, flags=re.M)
# Sync DATABASE_URL with the new password
s = re.sub(
    r'^DATABASE_URL=postgresql\+asyncpg://corridorpay:[^@]*@',
    f'DATABASE_URL=postgresql+asyncpg://corridorpay:{dbp}@',
    s, flags=re.M,
)
with open(path, 'w', encoding='utf-8') as f:
    f.write(s)
PY

chmod 600 "$TARGET"

echo "[init-env] Wrote $TARGET (mode 600)."
echo "[init-env] Now edit it and fill: PRIMARY_DOMAIN, API_DOMAIN, ADMIN_DOMAIN, LETSENCRYPT_EMAIL."
