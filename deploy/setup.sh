#!/usr/bin/env bash
# One-shot deploy for 灵一守玄坛 (jft) on a fresh Ubuntu/Debian server.
# Run as root, from inside the project directory (the checked-out repo).
#
#   git clone <your-repo-url> jft && cd jft
#   git checkout claude/pwa-prayer-register-layout-ng2m9f
#   sudo bash deploy/setup.sh
#
# Safe to re-run: it only installs what's missing and always restarts the app.

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

echo "== jft deploy starting in $APP_DIR =="

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run as root (sudo bash deploy/setup.sh)" >&2
  exit 1
fi

if ! command -v apt-get >/dev/null 2>&1; then
  echo "This script only supports Debian/Ubuntu (apt-get not found)." >&2
  echo "Install Node.js >= 22.5, nginx, and pm2 manually, then run:" >&2
  echo "  npm install --omit=dev && pm2 start ecosystem.config.js && pm2 save" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

# ---- Node.js >= 22.5 (needed for the built-in node:sqlite module) ----
NEED_NODE=1
if command -v node >/dev/null 2>&1; then
  NODE_MAJOR=$(node -e "console.log(process.versions.node.split('.')[0])")
  NODE_MINOR=$(node -e "console.log(process.versions.node.split('.')[1])")
  if [ "$NODE_MAJOR" -gt 22 ] || { [ "$NODE_MAJOR" -eq 22 ] && [ "$NODE_MINOR" -ge 5 ]; }; then
    NEED_NODE=0
  fi
fi
if [ "$NEED_NODE" -eq 1 ]; then
  echo "-- installing Node.js 22.x --"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
node -v

# ---- nginx ----
if ! command -v nginx >/dev/null 2>&1; then
  echo "-- installing nginx --"
  apt-get update -qq
  apt-get install -y nginx
fi

# ---- pm2 ----
if ! command -v pm2 >/dev/null 2>&1; then
  echo "-- installing pm2 --"
  npm install -g pm2
fi

# ---- app dependencies ----
echo "-- installing app dependencies --"
npm install --omit=dev

# ---- .env (random JWT secret on first run) ----
if [ ! -f .env ]; then
  echo "-- generating .env with a random JWT secret --"
  JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
  cat > .env <<EOF
PORT=8765
JWT_SECRET=$JWT_SECRET
EOF
fi

mkdir -p data

# ---- nginx site ----
if [ -f /etc/nginx/sites-available/jft ] && grep -q "ssl_certificate" /etc/nginx/sites-available/jft; then
  echo "-- nginx site already has SSL configured (certbot) — leaving it as-is --"
  echo "   (run deploy/enable-ssl.sh again yourself if you need to change the domain)"
else
  echo "-- configuring nginx reverse proxy on :80 -> :8765 --"
  cp deploy/nginx-jft.conf /etc/nginx/sites-available/jft
fi
ln -sf /etc/nginx/sites-available/jft /etc/nginx/sites-enabled/jft
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl reload nginx || systemctl restart nginx

# ---- firewall (best-effort, only if ufw is active) ----
if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: active"; then
  ufw allow 80/tcp || true
  ufw allow 443/tcp || true
fi

# ---- start/restart the app under pm2 ----
echo "-- starting app with pm2 --"
set -a; source ./.env; set +a
pm2 delete jft >/dev/null 2>&1 || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root | tail -1 | bash || true

SERVER_IP=$(curl -4 -fsS ifconfig.me 2>/dev/null || echo "<this-server-ip>")
echo ""
echo "== done =="
echo "App running at http://$SERVER_IP/"
echo "(If this IP isn't in deploy/nginx-jft.conf's server_name yet, add it and re-run this script,"
echo " or just visit by IP anyway -- nginx serves it as the default site.)"
echo "pm2 status: pm2 status"
echo "pm2 logs:   pm2 logs jft"
