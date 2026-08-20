# 灵一守玄坛

Installable PWA for temple event registration (法会报名) and prayer document
services (疏文办理), with member accounts and persistent orders.

## Stack

- **Frontend**: vanilla HTML/CSS/JS PWA (`public/`), hash-routed SPA, installable
  with a manifest + service worker.
- **Backend**: Node.js + Express (`server/`), REST API under `/api`.
- **Database**: SQLite via Node's built-in `node:sqlite` module — no native
  dependencies, no external DB service required. Data lives in `data/app.db`
  (created automatically, git-ignored).
- **Auth**: member registration/login with bcrypt-hashed passwords and JWT
  bearer tokens.

Requires **Node.js ≥ 22.5** (for `node:sqlite`).

## Running

```bash
npm install
npm start          # http://localhost:8765
# or, for auto-restart on file changes:
npm run dev
```

Optionally set `JWT_SECRET` (and `PORT`) via environment variables or a
`.env`-style setup — see `.env.example`. In production, always set a real
`JWT_SECRET`.

The server serves the PWA and the API from the same origin, so no separate
frontend build or CORS config is needed.

## Data model

- `users` — member accounts (name, email, phone, password hash)
- `events` / `event_items` — 法会 catalog, seeded on first run
- `prayer_categories` / `prayer_types` — 疏文 catalog, seeded on first run
- `orders` / `order_items` / `order_members` — a member's paid registrations,
  each tied to `user_id`

Event/prayer catalog content is currently seed data (`server/seed.js`) rather
than admin-editable; extend `seed.js` or add write endpoints if you need to
manage it without redeploying.

## Payments

Checkout is a **mock payment flow**: choosing a method (FPX / GrabPay / TnG)
and confirming immediately marks the order `paid` — no real money moves and
no gateway credentials are required. `server/routes/orders.js` is the place
to wire in a real payment gateway later (create a pending order, redirect to
the gateway, mark paid via webhook/callback instead of synchronously).

## Deploying to a server

`deploy/setup.sh` is a one-shot, idempotent script for a fresh Ubuntu/Debian
VPS. It installs Node.js 22.x, nginx and pm2 if missing, installs app deps,
generates a `.env` with a random `JWT_SECRET` on first run, sets up an nginx
reverse proxy (`deploy/nginx-jft.conf`, listening on :80 and forwarding to
the app on :8765), and starts the app under pm2 (auto-restart on crash and
on reboot via `pm2 startup`).

Run this **on the target server itself** (this repo's automation has no
network path to arbitrary external hosts, so someone with real access to the
box has to run it):

```bash
git clone <this-repo-url> jft && cd jft
git checkout claude/pwa-prayer-register-layout-ng2m9f
sudo bash deploy/setup.sh
```

Redeploying after a code update:

```bash
cd jft && git pull
npm install --omit=dev
pm2 restart jft
```

Useful commands on the server: `pm2 status`, `pm2 logs jft`, `pm2 restart jft`.

`deploy/nginx-jft.conf` is written for IP-only access (`server_name
103.253.24.144`). If you point a domain at the server later, update
`server_name` and add TLS with `certbot --nginx`.

## API summary

| Method | Path                      | Auth | Description                        |
|--------|---------------------------|------|-------------------------------------|
| POST   | /api/auth/register        | –    | Create a member account             |
| POST   | /api/auth/login           | –    | Login, returns JWT                  |
| GET    | /api/auth/me              | ✓    | Current member profile              |
| GET    | /api/events               | –    | List 法会 with items                 |
| GET    | /api/events/:id           | –    | Single 法会                          |
| GET    | /api/prayers/categories   | –    | 疏文 categories with types           |
| GET    | /api/prayers/types/:id    | –    | Single 疏文 type                     |
| POST   | /api/orders               | ✓    | Create + pay an order (mock)        |
| GET    | /api/orders               | ✓    | List the member's orders            |
| GET    | /api/orders/:orderNo      | ✓    | Single order detail                 |
