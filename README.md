# MailFlow

AI-powered, multi-account email outreach & automation SaaS.

Connect many Gmail/SMTP mailboxes, upload leads, launch campaigns, and let the
platform autonomously send, track replies, classify intent with AI, run
follow-up workflows, and surface everything in a unified inbox + analytics
dashboard.

## Architecture

A pnpm + Turborepo monorepo. The Next.js app and the BullMQ worker fleet scale
independently and share typed packages.

```
mailflow/
├── apps/
│   ├── web/        # Next.js 15 (App Router) — UI + API routes (BFF)
│   └── worker/     # Standalone Node process — BullMQ workers + schedulers
└── packages/
    ├── shared/     # env loader, constants, zod schemas, shared types
    ├── db/         # Mongoose connection, models, token crypto
    ├── ai/         # OpenRouter client + prompt templates + model router
    ├── email/      # gmail/smtp/sendgrid adapters, sender rotation, parser
    ├── queue/      # BullMQ queues, job types, token-bucket rate limiter
    ├── workflows/  # trigger → condition → action engine + DSL
    └── ui/         # shared shadcn/ui components
```

### Tech stack

| Layer            | Choice                                                        |
| ---------------- | ------------------------------------------------------------- |
| Framework        | Next.js 15 (App Router) + React 19 + TypeScript               |
| UI               | TailwindCSS + shadcn/ui + Radix + lucide-react                |
| Auth             | Auth.js v5 — Credentials + Google OAuth (also Gmail consent)  |
| DB               | MongoDB (Atlas) via Mongoose                                  |
| Cache + Queue    | Redis (Upstash) + BullMQ                                       |
| AI               | OpenRouter (Claude / GPT / Gemini, routed per task)           |
| Background jobs  | BullMQ workers (separate Node process)                        |
| Validation       | Zod (shared schemas in `packages/shared`)                     |

## Prerequisites

- Node.js >= 22
- pnpm >= 10 (`corepack enable`)
- A MongoDB Atlas cluster (free M0 works for dev)
- An Upstash Redis database (TCP `rediss://` connection)
- An OpenRouter API key (for the AI phase)
- A Google Cloud OAuth client (for Google login + Gmail connection)

> This project is configured to use **cloud infrastructure** (Atlas + Upstash)
> rather than local Docker. Provide connection strings in `.env`.

## Getting started

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env
#   then fill in MONGODB_URI, REDIS_URL, AUTH_SECRET, ENCRYPTION_KEY, etc.
#   generate secrets:  openssl rand -base64 32

# 3. Run the web app (and worker, once it exists)
pnpm dev:web
pnpm dev:worker
```

## Environment variables

See [`.env.example`](./.env.example) for the full, documented list. Both apps
read from the single root `.env`.

## Scripts

| Command              | Description                              |
| -------------------- | ---------------------------------------- |
| `pnpm dev`           | Run all apps in dev mode (Turborepo)     |
| `pnpm dev:web`       | Run only the Next.js web app             |
| `pnpm dev:worker`    | Run only the BullMQ worker               |
| `pnpm build`         | Build all packages and apps              |
| `pnpm lint`          | Lint the whole repo                      |
| `pnpm typecheck`     | Type-check the whole repo                |
| `pnpm test`          | Run unit tests                           |
| `pnpm test:integration` | Integration tests (ephemeral MongoDB; Redis-gated) |
| `pnpm format`        | Prettier-format the repo                 |

## Implementation status

Built incrementally, phase by phase (see the architecture plan PDF):

- [x] **Phase 0** — Monorepo bootstrap (workspace, tooling, env)
- [x] **Phase 1** — Auth.js v5 (Credentials + Google) + Org + RBAC + middleware
- [x] **Phase 2** — Connect email accounts (Gmail OAuth + SMTP, encrypted tokens, test-send)
- [x] **Phase 3** — Contacts & Templates (CSV import + dedupe, unsubscribe, merge-tag templates)
- [x] **Phase 4** — Send a campaign (BullMQ worker, sender rotation, rate limiting, tracking, wizard)
- [x] **Phase 5** — Inbound + unified inbox (Gmail watch/webhook, reconciliation, threads, reply)
- [x] **Phase 6** — AI layer (OpenRouter intent classification + suggested reply, inbox AI panel)
- [x] **Phase 7** — Workflow engine (trigger→condition→action, event bus, builder UI)
- [x] **Phase 8** — Rewards / lifetime premium (HMAC-signed grant webhook + admin UI)
- [x] **Phase 9** — Analytics (funnel, AI intent breakdown, sender health — Recharts)
- [x] **Phase 10** — Polish & launch (healthchecks, API keys + public `/api/v1`, audit log, queue health, DKIM/SPF/DMARC guidance, `no_reply_after` scheduler, Sentry, unit + e2e tests, CI + deploy config)

**All 10 phases complete.** Unit: `pnpm test` (Vitest, 19 tests). Smoke e2e: `pnpm --filter @mailflow/web e2e` (Playwright — run `e2e:install` once for the browser).

## Public API (`/api/v1`)

Authenticate with a workspace API key (create one in **Settings → API keys**):

```bash
curl https://<your-domain>/api/v1/me \
  -H "Authorization: Bearer mf_<prefix>_<secret>"

# List / create contacts (scopes: contacts:read / contacts:write, or *)
curl https://<your-domain>/api/v1/contacts -H "Authorization: Bearer <key>"
curl -X POST https://<your-domain>/api/v1/contacts \
  -H "Authorization: Bearer <key>" -H "Content-Type: application/json" \
  -d '{"email":"lead@acme.com","firstName":"Lead"}'
```

Health probes: `GET /api/health` (web) and `GET :8080/health` (worker).

## Deployment

- **Web → Vercel.** `vercel.json` builds `@mailflow/web` from the monorepo. Set
  the project env vars (see `.env.example`). Node runtime for API routes.
- **Worker → Railway / Render / Docker.** Long-running process:
  `docker build -f apps/worker/Dockerfile -t mailflow-worker .` or use the
  `Procfile` (`pnpm --filter @mailflow/worker start`). Exposes `/health` on
  `HEALTH_PORT` (default 8080).
- **CI** — `.github/workflows/ci.yml` runs tests + worker typecheck + web build
  on every push/PR.
- Both connect to the same MongoDB Atlas + Redis (Upstash) instances.
