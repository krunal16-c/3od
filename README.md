# 3oD by Zester Product Studio

3oD by Zester Product Studio is an India-wide digital manufacturing marketplace, starting with custom 3D printing. Buyers upload a CAD design and request quotes; manufacturing partners discover suitable requests, submit pricing and lead times, and fulfil accepted work. CNC machining, laser cutting, and fabrication are the next planned categories.

The repository is a pnpm monorepo containing the Next.js web app, the existing NestJS API, the Cloudflare Worker API migration, shared contracts/domain packages, and a worker boundary for asynchronous jobs.

## Requirements

- Node.js 20.9 or newer
- pnpm 9.15.0
- PostgreSQL for persistent development or production data
- Cloudflare R2 credentials for real browser uploads
- Wrangler access to a Cloudflare account for the Worker API migration

Check versions:

```bash
node --version
pnpm --version
```

## Install

From the repository root:

```bash
corepack enable
pnpm install
```

## Run locally

Open two terminal windows.

The API development command automatically loads the root `.env` file. Copy `.env.example` to `.env` once and put your local or hosted PostgreSQL connection string in `DATABASE_URL`.

Terminal 1 — API:

```bash
pnpm --filter @3od/api dev
```

The API runs at `http://localhost:4000`.

Terminal 2 — web app:

```bash
NEXT_PUBLIC_API_MODE=api \
NEXT_PUBLIC_API_URL=http://localhost:4000 \
pnpm --filter @3od/web dev
```

The web app runs at `http://localhost:3000`. To use port 3002 instead:

```bash
NEXT_PUBLIC_API_MODE=api \
NEXT_PUBLIC_API_URL=http://localhost:4000 \
pnpm --filter @3od/web exec next dev --hostname 127.0.0.1 --port 3002
```

The development API allowlist includes ports 3000, 3001, and 3002. Restart the API after changing ports or environment variables so CORS settings are reloaded.

## Deploy the web app to Cloudflare Workers

The frontend is configured for Cloudflare Workers through the OpenNext adapter. Keep the repository root as the Cloudflare build root so the pnpm workspace and lockfile are available.

From `apps/web`, authenticate Wrangler once:

```bash
cd apps/web
pnpm exec wrangler login
```

Set the public build-time variables in the Cloudflare deployment settings. These are not secrets:

```text
NEXT_PUBLIC_API_MODE=api
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_APP_URL=https://app.example.com
```

Build and preview the Worker locally:

```bash
pnpm preview:cloudflare
```

Deploy from the repository root after authentication:

```bash
pnpm --filter @3od/web deploy:cloudflare
```

For a connected Cloudflare Workers build, use the repository root as the working directory and:

```text
Build command: pnpm install --frozen-lockfile && pnpm --filter @3od/web deploy:cloudflare
```

The Worker serves the Next.js frontend and calls the separately deployed API over HTTPS. Keep `DATABASE_URL`, `SESSION_SECRET`, R2 access keys, and other private values on the API service; never add them to the frontend build. After choosing a production frontend domain, add it to the API `APP_ORIGIN` and `WEB_ORIGINS` values and restart the API so browser requests pass CORS checks.

## Cloudflare-only API migration

The Cloudflare API foundation lives in `apps/api-worker`. It uses Hono, D1 for relational marketplace data, and an R2 binding for design files. The current Worker route checkpoint covers:

- PBKDF2-SHA256 Worker-native signup, login, logout, and `/auth/me`
- HttpOnly session cookies and explicit-origin CORS
- Vendor profiles, public storefronts, printers, MOQ, and buyer contacts
- Buyer RFQs with idempotency keys
- Vendor quotes and buyer quote acceptance
- Vendor RFQ review with price, lead-time, and notes submission
- Account-existence guidance and optional email verification through Resend

Create the D1 database and R2 bucket in Cloudflare, then replace the placeholder D1 `database_id` in `apps/api-worker/wrangler.jsonc`. Configure the production-only secrets through Wrangler or the Cloudflare dashboard:

```bash
cd apps/api-worker
pnpm exec wrangler secret put SESSION_SECRET
pnpm exec wrangler d1 migrations apply 3od-production --remote
pnpm exec wrangler deploy
```

For email verification, add `RESEND_API_KEY` as a Worker secret and set `MAIL_FROM` to a verified sender address. When both are configured, new accounts must verify their email before login; without them, local/development signup remains usable without email delivery.

For local Worker development, use a local D1/R2 binding through Wrangler and set the local `APP_ORIGIN` to the frontend origin. Do not put database credentials, session secrets, or R2 access keys in the frontend environment. The Cloudflare Worker is the production API path; it stores marketplace records in D1 and design files in R2.

There is no demo-data seed command. Development and production dashboards intentionally show empty states until real users create vendor profiles, printers, RFQs, quotes, and orders.

The public site includes a `/blog` guide hub covering CAD preparation, 3D printing, CNC machining, and quote comparison. The current live RFQ workflow remains focused on 3D printing; future processes are clearly labelled as upcoming rather than presented as available services.

Open `/login`, `/signup`, `/request-quote`, `/dashboard/buyer`, or `/dashboard/owner`.

The quote flow is protected by the API session cookie. Opening `/request-quote` checks the current session; unauthenticated visitors are sent to `/login?next=/request-quote` and returned to the quote form after a successful login.

Printer owners can open `/vendor` to publish their workshop page and add printers. Each printer has a customer-visible minimum order quantity (MOQ). A published page is available at `/vendors/<page-handle>`; signed-in buyers can contact the vendor from that page.

Without `DATABASE_URL`, local development falls back to the in-memory store. Data will be lost when the API restarts. Set `MARKETPLACE_STORE=prisma` and `DATABASE_URL` to use PostgreSQL.

## PostgreSQL setup

Set the database connection string in your shell or local environment:

```bash
export DATABASE_URL="postgresql://user:password@host:5432/3od?sslmode=require"
export MARKETPLACE_STORE=prisma
```

Generate the Prisma client and apply migrations:

```bash
pnpm exec prisma generate --schema packages/domain/prisma/schema.prisma
pnpm exec prisma migrate deploy --schema packages/domain/prisma/schema.prisma
```

Never commit database credentials. Use `.env.example` as a reference and keep real secrets in your hosting provider’s environment settings.

## Cloudflare R2 setup

The existing PostgreSQL API generates short-lived presigned upload URLs. The Cloudflare API Worker will use the `FILES` R2 binding instead, so no R2 access key is needed by the Worker. Configure the bucket binding in `apps/api-worker/wrangler.jsonc` and keep any legacy S3-compatible credentials server-side only:

```bash
export R2_ENDPOINT="https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com"
export R2_BUCKET="3od-production"
export R2_ACCESS_KEY_ID="..."
export R2_SECRET_ACCESS_KEY="..."
```

Keep R2 credentials server-side. Configure the bucket CORS policy for the web origin before testing browser uploads.

## Quality checks

Run the full checks from the repository root:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Run API tests only:

```bash
pnpm --filter @3od/api test
```

Run web end-to-end tests:

```bash
pnpm --filter @3od/web test
```

## Inspect the code from your terminal

```bash
# Show the current branch and changed files
git status --short --branch

# Show recent commits
git log --oneline --decorate --max-count=10

# Search code quickly
rg "createRfq|MarketplaceStore|R2_ENDPOINT" apps packages

# List source files
rg --files apps packages docs

# Read a file
sed -n '1,240p' apps/api/src/marketplace.controller.ts

# Review uncommitted changes
git diff
```

## Repository layout

```text
apps/api        NestJS/Fastify API
apps/web        Next.js frontend and dashboards
apps/worker      asynchronous job worker boundary
packages/config shared environment configuration
packages/contracts Zod request/response validation
packages/domain  Prisma schema and marketplace state/repository domain
packages/ui      shared UI package
docs/            product and engineering plans/specifications
architecture.md  system architecture and runtime flows
```

## Current scope

Implemented foundation:

- Buyer and printer-owner authentication
- HttpOnly session cookies
- Role-based API authorization
- Idempotent RFQ creation
- Quote creation and acceptance state transitions
- Prisma-backed production store
- Cloudflare R2 presigned uploads in the existing API; Worker-native R2 upload intents are the next migration checkpoint
- Vendor storefronts, printer listings, configurable MOQ, and buyer-to-vendor contact requests
- CORS, Helmet, rate limits, validation, and structured errors

Still required before a public launch:

- Live PostgreSQL smoke test and backup policy
- Redis/BullMQ worker processing
- Razorpay payment and payout flow
- Order fulfilment and dispute workflows
- Admin moderation tools
- CSRF protection and malware scanning for uploaded files
- Production monitoring and deployment configuration
- Cloudflare API upload intents, D1 import/export verification, and end-to-end cutover

The frontend deployment configuration is now included for Cloudflare Workers. A public launch still needs the production API, database, R2 CORS policy, domain, secrets, backups, monitoring, and the operational items above.

See [architecture.md](architecture.md) for system boundaries and runtime flows.
