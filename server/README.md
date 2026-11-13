# Lume engine

The back end of the CIMB Niaga Social Hub. It turns the console into a shared, multi-user system that actually publishes, listens, replies and keeps the OJK record:

| Part | What it does |
|---|---|
| **Sign-in and sessions** | User ID + password with lockout (pilot), server-side sessions in an `httpOnly` cookie, team taken from the account (only admins can switch teams). Ready to swap for CIMB Niaga SSO. |
| **Shared workspace** | Every post, task, message, ticket, rule and points line is stored in PostgreSQL and versioned. Browsers send field-level changes; everyone else sees them within a second over Server-Sent Events. |
| **Permission and compliance gate** | Every change is re-checked on the server: team ownership of accounts, Compliance-only approvals and rules, append-only logs and ticket timelines, and the same six compliance checks the console runs (guaranteed returns, disclosure, risk wording, product facts, personal data, tone). A tampered browser can't bypass them. |
| **Publisher** | Scheduled posts go out when they are due; *Publish now* goes out at once. The platform link and post ID are saved; failures retry with back-off and raise a notification. |
| **Care desk** | Incoming comments, mentions and DMs arrive by webhook (Meta) or polling (X), are de-duplicated, masked (card, account, phone, e-mail, OTP), classified and queued live. Replies are checked, then delivered through the platform and marked *sent*. Hide/report goes to the platform too. |
| **Complaint tickets** | Ticket numbers are issued by the server (no clashes between desks), registered in CIMB Niaga's complaint system (CMS), and watched by the POJK 22/2023 clock: at-risk and overdue tickets alert the owner team. Unanswered urgent messages past their first-reply target alert the desk. |
| **Scam-wave detection** | Three fraud mentions within 60 minutes (configurable) raise a notification and alert the fraud team. |
| **Advocates** | Task notifications by WhatsApp template, a mobile advocate page opened from a personal link (`/advocate`), caption check on submission, link verification and points. |
| **Claude** | Caption and reply drafts through `/api/v1/ai/write`; personal data is masked before it leaves Lume and every draft is checked again before it can be posted. Without a key, the approved template library is used. |
| **Audit** | Every change, rejection, delivery and sign-in is written to a hash-chained audit log (`/api/v1/audit/verify` proves nothing was altered), and every outbound call is recorded in `deliveries`. |
| **Reports** | Complaint register as CSV for the SEOJK half-year report (`/api/v1/reports/complaints.csv`). |

The rules themselves (classifier, masking, compliance check, OJK working-day clock and the sample data) are the console's own code in `web/src`, loaded on the server in an isolated VM context. One fix to a rule applies to both the browser and the server.

## Run it locally

You need Node.js 22, PostgreSQL 14+ and Redis 6+ (or Docker).

```bash
# with Docker (from the repository root)
cp server/.env.example .env      # set DATA_KEY and PILOT_PASSWORD, or set NODE_ENV=development for a quick try
docker compose up -d --build
open http://localhost:8080

# without Docker
cd web && python3 build.py --edition cimb && cd ..
cd server && npm ci && npm run build
DATABASE_URL=postgres://lume:lume@localhost:5432/lume REDIS_URL=redis://localhost:6379 node dist/index.js all
```

The first start creates the tables, the pilot accounts (password `lume2026` in development) and the sample workspace. Sign in at `http://localhost:8080` with any pilot account; `whale.admin` can switch teams and reset the demo data.

Processes: `node dist/index.js api` (web + API), `worker` (jobs and schedules), `all` (both, for one machine), `migrate`, `seed [--force]`.

## Tests

```bash
cd server && npm test                          # 14 API tests against a running engine (LUME_URL, default http://localhost:8080)
node web/test/server-mode.js                   # browser test: care desk and brand team signed in at once
```

## Connecting real accounts

1. Set `CONNECTOR_MODE=live` and the platform settings in `.env` (see `.env.example`).
2. Register the webhook URLs in the platform consoles: `https://<host>/webhooks/meta` (verify token = `META_VERIFY_TOKEN`) and, with the X Account Activity API, `https://<host>/webhooks/x`. Without it, X mentions are polled every 2 minutes.
3. Store each account's token (encrypted with `DATA_KEY`):

```bash
curl -X POST https://<host>/api/v1/accounts/ig_main/credentials \
  -H 'content-type: application/json' -H 'x-lume-csrf: 1' -b 'lume_sid=<admin session>' \
  -d '{"externalId":"<instagram business account id>","token":"<long-lived page token>"}'
```

Instagram and TikTok publish only with media: a post needs `mediaUrls` (public HTTPS links to the image or video). See `docs/INFRASTRUCTURE.md` for what each platform requires.

## API

| Method | Path | Who |
|---|---|---|
| GET | `/api/v1/health` | anyone (load balancer) |
| POST | `/api/v1/auth/login`, `/auth/logout` · GET `/auth/me` | staff |
| GET | `/api/v1/workspace` | staff |
| POST | `/api/v1/sync` | staff (changes, role-checked) |
| GET | `/api/v1/events` | staff (live updates, SSE) |
| POST | `/api/v1/ai/write` | staff |
| GET | `/api/v1/audit`, `/audit/verify` | Compliance, admin |
| GET | `/api/v1/deliveries` | Compliance, Brand, Care, admin |
| GET | `/api/v1/reports/complaints.csv` | Compliance, Brand, Care, admin |
| POST | `/api/v1/accounts/:id/credentials` | admin |
| POST | `/api/v1/admin/reset`, `/sandbox/incoming` | admin / staff, demo mode only |
| POST | `/api/v1/advocate/links` | Brand, HR, KejarMimpi, admin |
| GET | `/api/v1/advocate/me` · POST `/advocate/tasks/:id/submit` | advocates (personal link) |
| GET/POST | `/webhooks/meta`, `/webhooks/x` | the platforms (signature checked) |

Every `POST` under `/api/` needs the header `x-lume-csrf: 1`; browsers can't send it cross-site.
