#!/usr/bin/env bash
# Enable HTTPS for 灵一守玄坛 (jft) with a free Let's Encrypt certificate.
#
# PWA installability (service worker registration, "Add to Home Screen" on
# most browsers) requires a secure context — plain http:// on a bare IP
# doesn't qualify. This script points a free domain at the server and gets
# a real TLS cert for it, so the phone can install the app properly.
#
# Usage (run as root, on the server, from inside the project directory):
#
#   sudo bash deploy/enable-ssl.sh                      # uses the default sslip.io domain
#   sudo bash deploy/enable-ssl.sh mydomain.example.com  # or your own domain
#
# sslip.io is a free wildcard-DNS service: any subdomain that encodes an IP
# (e.g. 103-253-24-144.sslip.io) resolves straight to that IP, no signup or
# DNS setup needed. If you'd rather use a real domain, point its A record at
# 103.253.24.144 first, then pass it as the argument.
#
# Safe to re-run (e.g. to switch domains or renew manually).

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run as root (sudo bash deploy/enable-ssl.sh [domain])" >&2
  exit 1
fi

DOMAIN="${1:-103-253-24-144.sslip.io}"
echo "== Enabling HTTPS for $DOMAIN =="

# ---- sanity check: domain must actually resolve to this server ----
RESOLVED_IP=$(getent hosts "$DOMAIN" | awk '{print $1}' | head -1 || true)
PUBLIC_IP=$(curl -4 -fsS ifconfig.me || true)
if [ -n "$RESOLVED_IP" ] && [ -n "$PUBLIC_IP" ] && [ "$RESOLVED_IP" != "$PUBLIC_IP" ]; then
  echo "WARNING: $DOMAIN resolves to $RESOLVED_IP but this server's public IP is $PUBLIC_IP." >&2
  echo "Let's Encrypt will likely fail its HTTP-01 challenge. Fix DNS first." >&2
fi

# ---- certbot ----
if ! command -v certbot >/dev/null 2>&1; then
  echo "-- installing certbot --"
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y certbot python3-certbot-nginx
fi

# ---- make sure nginx knows this server_name before certbot looks for it ----
if ! grep -q "$DOMAIN" /etc/nginx/sites-available/jft 2>/dev/null; then
  echo "-- adding $DOMAIN to the nginx server_name --"
  sed -i "s/server_name .*/server_name 103.253.24.144 $DOMAIN;/" /etc/nginx/sites-available/jft
  nginx -t
  systemctl reload nginx
fi

# ---- firewall ----
if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: active"; then
  ufw allow 443/tcp || true
fi

# ---- get the certificate + auto-configure nginx (redirects http -> https) ----
certbot --nginx -d "$DOMAIN" --redirect --agree-tos --register-unsafely-without-email --non-interactive

echo ""
echo "== done =="
echo "Visit: https://$DOMAIN/"
echo "Certbot auto-renewal is installed as a systemd timer (check: systemctl list-timers | grep certbot)"
