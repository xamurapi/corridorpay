#!/usr/bin/env bash
# Run ONCE on the server. Generates a dedicated SSH ed25519 deploy key for
# this repo, configures ssh to use it for github.com, and prints the public
# key — paste it into:
#
#   https://github.com/xamurapi/corridorpay/settings/keys/new
#
# Title:        prod-server (or hostname)
# Allow write:  leave OFF (deploy key, read-only is enough for git pull)

set -euo pipefail

KEY_PATH="$HOME/.ssh/corridorpay_deploy_ed25519"
SSH_CONFIG="$HOME/.ssh/config"
HOST_ALIAS="github-corridorpay"
REPO_SSH="git@${HOST_ALIAS}:xamurapi/corridorpay.git"

mkdir -p "$HOME/.ssh"
chmod 700 "$HOME/.ssh"

if [ -f "$KEY_PATH" ]; then
    echo "[deploy-key] key already exists at $KEY_PATH — reusing"
else
    ssh-keygen -t ed25519 -N "" -C "corridorpay-deploy@$(hostname)" -f "$KEY_PATH"
fi
chmod 600 "$KEY_PATH"
chmod 644 "${KEY_PATH}.pub"

# SSH host alias so we never touch the user's main github.com ssh config
if ! grep -q "Host ${HOST_ALIAS}" "$SSH_CONFIG" 2>/dev/null; then
    cat >> "$SSH_CONFIG" <<EOF

# CorridorPay deploy key (auto-added by setup-deploy-key.sh)
Host ${HOST_ALIAS}
    HostName github.com
    User git
    IdentityFile ${KEY_PATH}
    IdentitiesOnly yes
    StrictHostKeyChecking accept-new
EOF
    echo "[deploy-key] added Host alias '${HOST_ALIAS}' to $SSH_CONFIG"
fi
chmod 600 "$SSH_CONFIG"

# Trust GitHub's host key the first time
ssh-keyscan -t rsa,ecdsa,ed25519 github.com >> "$HOME/.ssh/known_hosts" 2>/dev/null || true
sort -u "$HOME/.ssh/known_hosts" -o "$HOME/.ssh/known_hosts"
chmod 644 "$HOME/.ssh/known_hosts"

echo
echo "================== PUBLIC KEY (copy everything below) =================="
cat "${KEY_PATH}.pub"
echo "========================================================================"
echo
echo "1. Open: https://github.com/xamurapi/corridorpay/settings/keys/new"
echo "2. Title: prod-$(hostname)"
echo "3. Paste the key above. Leave 'Allow write access' UNCHECKED."
echo "4. Click 'Add key'."
echo
read -rp "Press ENTER once you've added the key on GitHub..."

echo "[deploy-key] Testing SSH connection…"
if ssh -T -o BatchMode=yes "${HOST_ALIAS}" 2>&1 | grep -q "successfully authenticated"; then
    echo "[deploy-key] OK — SSH auth works."
else
    echo "[deploy-key] WARNING — could not confirm SSH auth. Check manually:"
    echo "             ssh -T ${HOST_ALIAS}"
fi

echo
echo "[deploy-key] Clone the repo with:"
echo "             git clone ${REPO_SSH} /opt/corridorpay"
echo
echo "[deploy-key] If you already cloned via HTTPS, switch the remote:"
echo "             git -C /opt/corridorpay remote set-url origin ${REPO_SSH}"
