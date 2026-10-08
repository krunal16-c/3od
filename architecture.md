# 3oD by Zester Product Studio Architecture

## Product boundary

3oD by Zester Product Studio is a two-sided marketplace. 3oD is the product name; Zester Product Studio is the studio attribution used in the public brand lockup, metadata, and workspace footers:

- Buyers describe a part, upload a design, and request quotes.
- Printer owners discover matching RFQs, provide price and lead time, and fulfil accepted work.
- 3oD coordinates identity, file access, quote state, notifications, payments, and audit history.

CNC machining, laser cutting, and fabrication are future capabilities. The public site positions 3oD as a broader digital manufacturing marketplace, but the live RFQ workflow and current D1 schema remain centered on 3D printing and printer-owner capabilities. Future process-specific fields should be added behind the shared manufacturing-request model rather than by duplicating buyer or partner identity flows.

The public `/blog` hub is a statically generated content surface for buyer education and organic discovery. Each guide has a canonical URL, Open Graph metadata, Article JSON-LD, and a sitemap entry. Blog content must remain people-first and accurately describe which processes are live versus planned.

## Runtime components

```text
                        +----------------------+
                        |      Next.js Web      |
                        | landing + dashboards |
                        +----------+-----------+
                                   |
                         HTTPS JSON + cookies
                                   |
                        +----------v-----------+
                        | Existing NestJS API  |
                        | PostgreSQL migration |
                        +----+------------+----+
                             |            |
                   PostgreSQL|            |presigned URL
                             |            |
                    +--------v---+   +---v--------+
                    | Prisma DB  |   | Cloudflare |
                    | users/RFQs |   | R2 files   |
                    | quotes     |   +------------+
                    +------------+
                             |
                    +--------v--------+
                    | Redis + Worker  |
                    | scans, emails,  |
                    | expiry, events  |
                    +-----------------+
```

The target Cloudflare-only shape adds a parallel API Worker during migration:

```text
Browser -> Cloudflare Next.js Worker -> Cloudflare API Worker
                                      |-> D1 marketplace database
                                      |-> R2 FILES binding
                                      |-> Queues/KV or Durable Object later
```

The existing API remains available until the Worker route, upload, data-import, and browser end-to-end checks pass. This staged boundary makes rollback possible without changing the frontend contract.

## Monorepo boundaries

### `apps/web`

Next.js frontend. It owns pages, marketing content, authentication forms, RFQ forms, and buyer/printer-owner dashboards. It communicates with the API through `apps/web/src/lib/api-client.ts` and never receives database or R2 credentials.

### `apps/api`

NestJS running on Fastify. It owns:

- Authentication and session cookies
- CORS, security headers, rate limits, request IDs, and error formatting
- Input validation through shared Zod contracts
- Buyer/printer-owner authorization
- RFQ and quote orchestration
- R2 presigned upload URL generation
- Prisma-backed persistence in production

### `apps/api-worker`

Cloudflare Workers API migration. It owns the Worker-native versions of authentication, sessions, marketplace authorization, vendor storefronts, printers/MOQ, contacts, RFQs, and quotes. `D1MarketplaceRepository` maps domain objects to the SQLite-compatible D1 schema in `apps/api-worker/migrations`. Passwords created in this Worker use PBKDF2-SHA256 because the Worker runtime cannot transparently verify the existing Node scrypt hashes; existing users require a deliberate password-reset or rehash migration before cutover.

### `packages/contracts`

Shared Zod schemas for signup, login, RFQs, quotes, pagination, and API errors. The API validates untrusted input at the boundary; the web app uses the same shapes conceptually for consistent error handling.

### `packages/domain`

Marketplace types, Prisma schema, migrations, repository abstractions, and explicit RFQ/quote state transitions. State transitions should remain centralized here so HTTP controllers and background workers cannot invent conflicting lifecycle rules.

### `apps/worker`

Worker boundary for asynchronous processing. It is currently a foundation and should later consume Redis/BullMQ jobs for file validation, malware scanning, notifications, expiry processing, and event-driven integrations.

## Main request flow

### Signup/login

1. The browser submits credentials to the active API (NestJS during fallback or the Cloudflare API Worker after cutover).
2. The API validates the request with Zod.
3. Passwords are stored as salted hashes.
4. The API creates a random opaque session token.
5. Only the token hash is stored in PostgreSQL.
6. The raw token is returned only as an HttpOnly cookie.
7. Every protected request resolves the session and user role server-side.

The web quote page performs an `/auth/me` check before rendering the RFQ form. If the session is missing or expired, the browser is sent to login with a validated relative `next` path, then returned to the requested quote flow after authentication. The session remains an HttpOnly cookie and is never copied into browser storage.

Buyer and printer-owner dashboard routes use the same session check and enforce the required marketplace role before rendering. Dashboard summaries do not invent counts, earnings, jobs, printers, or RFQs: empty states are shown until the API returns records owned by the signed-in account.

Login returns `ACCOUNT_NOT_FOUND` for an unknown email so the web client can send the visitor to account creation. Email verification uses signed, expiring links delivered through Resend when `RESEND_API_KEY` and `MAIL_FROM` are configured. Verification is stored in `users.email_verified_at`; delivery configuration remains server-side.

### RFQ and file upload

1. A buyer submits RFQ metadata with an `Idempotency-Key`.
2. PostgreSQL or D1 enforces one RFQ per buyer/idempotency key.
3. The browser sends the selected design as multipart form data to the authenticated API Worker.
4. The Worker validates ownership, extension, content type, and the 25 MB size limit, then writes the object through its private R2 binding.
5. The API records the R2 object key and file metadata in D1 or PostgreSQL.
6. Printer owners receive the RFQ through their authorized inbox.
7. Printer owners can review an open RFQ in the dashboard and submit a quote with INR amount, lead time, and notes.

R2 credentials and bucket bindings never reach the browser. The Worker is the upload boundary so object keys and storage permissions remain server-controlled.

### Quote lifecycle

```text
RFQ: OPEN_FOR_QUOTES -> QUOTES_RECEIVED -> QUOTE_SELECTED
Quote: VISIBLE_TO_BUYER -> ACCEPTED
```

The buyer can accept only a visible quote belonging to their RFQ. The API updates the quote and RFQ states server-side. Payment readiness is represented in `packages/domain/src/payment-state.ts`: only an API-confirmed `CAPTURED` payment can unlock a payment-required production order. The shared settlement calculator keeps INR amounts in paise and exposes gross amount, platform fee, GST on the platform fee, and vendor payout without connecting a live provider.

### Order and production lifecycle

Accepting a visible quote creates exactly one order linked to the buyer, vendor, RFQ, and quote. The Cloudflare Worker stores pickup/shipping details and enforces this status path server-side:

```text
ACCEPTED -> AWAITING_PAYMENT -> IN_PRODUCTION -> QUALITY_CHECK -> SHIPPED -> DELIVERED
```

Cancellation is allowed before shipment, and either participant can enter a dispute from an active or delivered order. Only the vendor can move production statuses; only the buyer can confirm delivery. `/orders/mine` and `/orders/:id` are participant-scoped. Every order creation, status change, and delivery confirmation writes an order audit event and creates in-app notification records for both participants. Email delivery remains an asynchronous notification concern and is not performed inside the request transaction.

### Vendor storefront and contact flow

1. An authenticated printer owner publishes one vendor profile with a unique page handle.
2. The owner adds one or more active printers, including technologies, materials, and a minimum order quantity.
3. The public page exposes only workshop and machine information, never the owner's account identifier or credentials.
4. An authenticated buyer can send a message and optional phone number from the public page.
5. The API stores the contact as `NEW`; the owner can read it from the vendor contact inbox endpoint.

The first release intentionally keeps vendor contact as a platform message record. Direct phone/email exposure, payments, reviews, and vendor verification can be added as separate, auditable milestones.

### Growth and SEO slice

The web app keeps public acquisition content in `apps/web/src/app/content`. Manufacturing landing pages are catalog-driven so an unsupported process cannot accidentally receive an “available” quote CTA. The `/manufacturing` directory labels future capabilities as coming next or planned; only live capabilities are linked to the authenticated RFQ flow.

Each indexable manufacturing page owns its title, description, canonical URL, and FAQ content. The page emits Service, BreadcrumbList, and FAQPage JSON-LD, and the sitemap includes only the catalog pages. RFQ links carry a non-sensitive `source` value so the funnel can distinguish which public page started a request. The client emits aggregate view/submission events to an optional `dataLayer` and a browser event; event payloads deliberately exclude identities, file names, session tokens, and RFQ contents.

### Vendor capacity slice

Printer records carry supported manufacturing processes, minimum order quantity, and a typical lead time. These fields are returned in the public storefront capability summary and are validated server-side. Vendor owners can add non-overlapping printer blackout date ranges through the authenticated availability routes; another vendor cannot read or modify those records. Vendor reports are calculated from persisted printer, RFQ, quote, and order records and are owner-scoped, with no synthetic dashboard values.

Manufacturing authorization is tenant-scoped in both the Worker and Nest API paths. An RFQ is shown in a vendor inbox only when an active printer owned by that vendor lists the enabled process; quote submission repeats that check at the write boundary. Buyers see all quotes for their own RFQ, while vendors can only read their own quote, preventing competitor pricing disclosure. Public storefront responses omit internal vendor ownership identifiers.

## Persistence

The current production path uses PostgreSQL through Prisma. The Cloudflare migration path uses D1 with the same primary entities:

- `User`
- `Session`
- `Rfq`
- `RfqFile`
- `Quote`
- `AuditEvent`
- `VendorProfile`
- `Printer`
- `PrinterBlackout`
- `VendorContact`
- `Order`
- `Notification`

The existing API selects the Prisma store when `DATABASE_URL` is configured. The Worker selects D1 through its `DB` binding. Worker tests use a SQLite-backed D1 adapter, so they do not require a live Cloudflare account.

Schema changes belong in `packages/domain/prisma/migrations`. Apply existing production migrations with:

```bash
pnpm exec prisma migrate deploy --schema packages/domain/prisma/schema.prisma
```

## Security principles

- Credentials and storage secrets are server-only.
- Session tokens are opaque, random, HttpOnly, and Secure in production.
- CORS allows explicit web origins; production must not use `*`.
- Helmet adds baseline HTTP security headers.
- Rate limits protect the API from unauthenticated and abusive traffic.
- Zod validation rejects malformed and oversized inputs.
- RFQ, quote, file, and dashboard reads are authorization-checked by role and ownership.
- Uploads use authenticated Worker-to-R2 writes and strict file size/type checks.
- Idempotency prevents duplicate RFQs during retries.
- Database state transitions prevent invalid marketplace lifecycle changes.
- Order participant checks, lifecycle transition guards, audit events, and notification records protect the production workflow.
- Payment state transitions prevent browser-controlled success claims; provider webhooks and payment credentials remain API-only.
- Platform fees are configured as bounded basis points and settlement calculations use integer paise to avoid floating-point currency errors.

Before public launch, add CSRF protection for cookie-authenticated mutations, malware scanning, audit event writes, centralized error monitoring, and a tested backup/restore process.

## Deployment shape

- Deploy `apps/web` to Cloudflare Workers using the OpenNext adapter. The generated Worker entrypoint is `.open-next/worker.js` and static assets are served from the `.open-next/assets` binding.
- Deploy `apps/api` as a long-running fallback API service until Cloudflare cutover is verified.
- Deploy `apps/api-worker` as the target Cloudflare API Worker.
- Deploy `apps/worker` as a separate background worker.
- Use managed PostgreSQL for the Prisma database.
- Use Cloudflare R2 for design files.
- Use managed Redis for queues and rate-limit/event infrastructure.

The frontend Worker and API Worker are separate services. Browser requests travel from the Worker-hosted Next.js application to the API Worker after cutover. D1 and R2 are accessed through Worker bindings. Only `NEXT_PUBLIC_*` values belong in the frontend deployment. Database URLs, session secrets, R2 credentials, and service credentials must remain on API/Worker environments.

The frontend deployment is configured in `apps/web/wrangler.jsonc` and `apps/web/open-next.config.ts`. The Cloudflare build generates the Worker output, and the deployment command publishes that output through Wrangler. The production API must allow the final frontend origin through its CORS configuration.

See [README.md](README.md) for setup and terminal commands.

## Cloudflare migration status

- Worker foundation, explicit CORS, security headers, D1 schema, repository mapping, and route tests are implemented.
- Auth and marketplace route tests currently cover 29 passing Worker tests.
- Remaining migration work: R2 upload intents, PostgreSQL-to-D1 export/import verification, production bindings/secrets, browser end-to-end checks, and cutover/rollback runbook.
