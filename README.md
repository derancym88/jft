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

- `announcements` — home-screen banners / promotions (公告 / 优惠), admin-editable
- `notifications` — per-member notification feed (welcome message, order
  confirmations, and anything else `server/notify.js` triggers)

Event/prayer catalog and announcements are seeded on first run
(`server/seed.js`) but are fully editable afterwards through the admin
backoffice — see below.

## Admin backoffice

A separate admin UI lives at **`/admin`** (`public/admin/`), served by the
same Node process. It's for temple staff, not members — different login,
different look (desktop dashboard, not the mobile PWA).

- Manage 法会 (events + their reg items), 疏文 (categories + types), and
  公告/优惠 (announcements/promotions) — full create/edit/delete.
- Read-only views of all 订单 (orders) and 会员 (members).
- A dashboard tab with member/event/revenue counts and recent orders.

A default admin account is created automatically on first run — the email
and a random password are printed **once** to the server console/log:

```
 Created default admin account:
   email:    admin@lyszt.local
   password: <random>
```

Set `ADMIN_EMAIL` / `ADMIN_PASSWORD` env vars before first run to control
these instead of using the generated password. Log in at `/admin` and treat
that account like any other credential — rotate it if the console output
was ever exposed.

Admin auth reuses the same JWT/bcrypt mechanism as members, gated by a
`role` column on `users` (`'member'` vs `'admin'`) and an `adminMiddleware`
on every `/api/admin/*` route.

## Notifications & promotions

- **Promotions** (`announcements` table): shown as banner cards on the
  member home screen, right under the hero — managed entirely from
  `/admin` → 公告. Each has a badge (公告/优惠), title, body, and an
  optional link to an event.
- **Notifications** (`notifications` table): a personal feed per member,
  reached via the bell icon on the home screen (red dot = unread) or
  我的 → 消息通知. Auto-created on registration (welcome message) and on
  every paid order (order confirmation) via `server/notify.js`; tapping one
  marks it read and jumps to the linked event/order.

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

### HTTPS (required for the PWA to install properly on a phone)

Plain `http://<ip>/` works fine in a mobile browser for just *viewing* the
site, but "Add to Home Screen" / service worker registration needs a secure
context — bare-IP HTTP doesn't qualify on most browsers. `deploy/enable-ssl.sh`
gets a free Let's Encrypt certificate and switches nginx to HTTPS (with an
http → https redirect):

```bash
cd ~/jft && git pull
sudo bash deploy/enable-ssl.sh
```

By default it uses `103-253-24-144.sslip.io` — a free wildcard-DNS service
where any subdomain encoding an IP resolves straight to that IP, no signup
or DNS record needed. Then visit `https://103-253-24-144.sslip.io/` on the
phone and "Add to Home Screen" should work normally.

To use a real domain instead: point its `A` record at `103.253.24.144`
first, then run `sudo bash deploy/enable-ssl.sh yourdomain.com`.

Note: this only fixes the *HTTPS-for-installability* requirement. If the
site is unreachable from outside at all (times out from a phone even over
plain `http://`), that's a separate networking issue — see the
troubleshooting note below.

### If the app is unreachable from outside (times out, but works via
`curl localhost` on the server)

`ufw` allowing port 80/443 only controls the OS firewall. Most cloud
providers (DigitalOcean, AWS, Vultr, Alibaba Cloud, etc.) also have a
**separate network-level firewall / security group** in front of the VM —
if that doesn't also allow inbound TCP 80/443, external traffic is silently
dropped even though everything looks fine from inside the box. Run
`curl -s ipinfo.io` on the server to identify the provider, then check that
provider's dashboard for a "Firewall" / "Security Group" / "Network
Security" section.

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
| GET    | /api/announcements        | –    | Active promotions/announcements     |
| GET    | /api/notifications        | ✓    | The member's notifications + unread count |
| POST   | /api/notifications/:id/read | ✓  | Mark one notification read          |
| POST   | /api/notifications/read-all | ✓  | Mark all notifications read         |
| *      | /api/admin/*              | ✓ admin | Events/prayers/announcements CRUD, orders/members read — see `server/routes/admin.js` |
