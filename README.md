# 3oD Marketplace

3oD is an India-wide two-sided marketplace for custom 3D printing. Buyers upload a design and request quotes; printer owners discover suitable requests, submit pricing and lead times, and fulfil accepted work.

The repository is a pnpm monorepo containing the Next.js web app, NestJS API, shared contracts/domain packages, and a worker boundary for asynchronous jobs.

## Requirements

- Node.js 20.9 or newer
- pnpm 9.15.0
- PostgreSQL for persistent development or production data
- Cloudflare R2 credentials for real browser uploads

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

## Seed demo marketplace data

To create synthetic buyer/vendor accounts, a published demo workshop, three printers with MOQ values, three open RFQs, demo quotes, and one demo contact:

```bash
NODE_ENV=development \
MARKETPLACE_STORE=prisma \
DATABASE_URL="your-database-url" \
pnpm seed:demo
```

The command is idempotent for the demo records and refuses to run with `NODE_ENV=production`. It prints the demo credentials when complete. Never use these credentials in production.

Open `/login`, `/signup`, `/request-quote`, `/dashboard/buyer`, or `/dashboard/owner`.

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

The API generates short-lived presigned upload URLs. Configure:

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
- Cloudflare R2 presigned uploads
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

See [architecture.md](architecture.md) for system boundaries and runtime flows.
