# 3oD by Zester Product Studio Architecture

## Product boundary

3oD by Zester Product Studio is a two-sided marketplace. 3oD is the product name; Zester Product Studio is the studio attribution used in the public brand lockup, metadata, and workspace footers:

- Buyers describe a part, upload a design, and request quotes.
- Printer owners discover matching RFQs, provide price and lead time, and fulfil accepted work.
- 3oD coordinates identity, file access, quote state, notifications, payments, and audit history.

CNC machining is a future capability. The initial domain is designed around manufacturing requests so CNC-specific processes can be added without changing the buyer/printer-owner identity model.

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
                        |    NestJS/Fastify    |
                        | auth, RFQs, quotes,  |
                        | authorization, APIs |
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

### `packages/contracts`

Shared Zod schemas for signup, login, RFQs, quotes, pagination, and API errors. The API validates untrusted input at the boundary; the web app uses the same shapes conceptually for consistent error handling.

### `packages/domain`

Marketplace types, Prisma schema, migrations, repository abstractions, and explicit RFQ/quote state transitions. State transitions should remain centralized here so HTTP controllers and background workers cannot invent conflicting lifecycle rules.

### `apps/worker`

Worker boundary for asynchronous processing. It is currently a foundation and should later consume Redis/BullMQ jobs for file validation, malware scanning, notifications, expiry processing, and event-driven integrations.

## Main request flow

### Signup/login

1. The browser submits credentials to the API.
2. The API validates the request with Zod.
3. Passwords are stored as salted hashes.
4. The API creates a random opaque session token.
5. Only the token hash is stored in PostgreSQL.
6. The raw token is returned only as an HttpOnly cookie.
7. Every protected request resolves the session and user role server-side.

The web quote page performs an `/auth/me` check before rendering the RFQ form. If the session is missing or expired, the browser is sent to login with a validated relative `next` path, then returned to the requested quote flow after authentication. The session remains an HttpOnly cookie and is never copied into browser storage.

### RFQ and file upload

1. A buyer submits RFQ metadata with an `Idempotency-Key`.
2. PostgreSQL enforces one RFQ per buyer/idempotency key.
3. The API creates a short-lived presigned R2 upload URL.
4. The browser uploads the design directly to R2.
5. The API records the R2 object key as an RFQ file in PostgreSQL.
6. Printer owners receive the RFQ through their authorized inbox.

The API never proxies large design files through the application server and never exposes R2 credentials to the browser.

### Quote lifecycle

```text
RFQ: OPEN_FOR_QUOTES -> QUOTES_RECEIVED -> QUOTE_SELECTED
Quote: VISIBLE_TO_BUYER -> ACCEPTED
```

The buyer can accept only a visible quote belonging to their RFQ. The API updates the quote and RFQ states server-side. Payment, order creation, and payouts should be attached to the `QUOTE_SELECTED` transition in a later milestone.

### Vendor storefront and contact flow

1. An authenticated printer owner publishes one vendor profile with a unique page handle.
2. The owner adds one or more active printers, including technologies, materials, and a minimum order quantity.
3. The public page exposes only workshop and machine information, never the owner's account identifier or credentials.
4. An authenticated buyer can send a message and optional phone number from the public page.
5. The API stores the contact as `NEW`; the owner can read it from the vendor contact inbox endpoint.

The first release intentionally keeps vendor contact as a platform message record. Direct phone/email exposure, payments, reviews, and vendor verification can be added as separate, auditable milestones.

## Persistence

Production uses PostgreSQL through Prisma. The primary models are:

- `User`
- `Session`
- `Rfq`
- `RfqFile`
- `Quote`
- `AuditEvent`
- `VendorProfile`
- `Printer`
- `VendorContact`

The API selects the Prisma store when `DATABASE_URL` is configured. Tests use `InMemoryMarketplaceStore` to avoid requiring a live database. Local development without `DATABASE_URL` also falls back to memory, so local data is intentionally disposable.

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
- Uploads use short-lived presigned URLs and strict file size/type checks.
- Idempotency prevents duplicate RFQs during retries.
- Database state transitions prevent invalid marketplace lifecycle changes.

Before public launch, add CSRF protection for cookie-authenticated mutations, malware scanning, audit event writes, centralized error monitoring, and a tested backup/restore process.

## Deployment shape

- Deploy `apps/web` as a Next.js service.
- Deploy `apps/api` as a long-running API service.
- Deploy `apps/worker` as a separate background worker.
- Use managed PostgreSQL for the Prisma database.
- Use Cloudflare R2 for design files.
- Use managed Redis for queues and rate-limit/event infrastructure.

See [README.md](README.md) for setup and terminal commands.
