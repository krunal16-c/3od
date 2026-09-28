# Cloudflare-only migration specification

## Goal

Run the 3oD marketplace without Render by hosting the frontend and API on Cloudflare Workers, persisting relational marketplace data in Cloudflare D1, storing design files in R2, and keeping the existing browser API contract stable.

## Target architecture

```text
Browser
  ├── Cloudflare Worker: Next.js frontend
  └── Cloudflare Worker: API (Hono)
          ├── D1: users, sessions, vendors, printers, RFQs, quotes, contacts
          ├── R2 binding: design files
          ├── KV or Durable Object: rate-limit coordination where needed
          └── Queues: asynchronous scanning/notifications later
```

The API Worker must preserve the current routes used by `apps/web/src/lib/api-client.ts`, including cookie authentication, role checks, idempotent RFQs, quote transitions, vendor storefronts, and upload intents. The current PostgreSQL/Prisma API remains available until the Worker API passes contract and end-to-end checks.

## Data migration policy

- D1 is the source of truth after cutover.
- The initial D1 schema mirrors the marketplace entities but uses SQLite-compatible types: ISO timestamp text, integer booleans, JSON text for arrays/metadata, and text enum values.
- Existing PostgreSQL data is exported to newline-delimited JSON and imported with an idempotent Worker/CLI migration script.
- Existing scrypt password hashes cannot be verified by the Worker runtime without a compatibility decision. Demo accounts can be reseeded; real accounts need a password-reset migration before cutover. No account is silently assigned a new password.
- The migration must validate row counts, unique keys, foreign keys, and representative RFQ/quote/vendor records before cutover.

## Security policy

- Session tokens remain opaque, random, hashed before storage, and sent only in HttpOnly, Secure, SameSite cookies.
- Production CORS allows only the configured frontend origin; no wildcard origin is permitted.
- Request bodies, file names, MIME types, file sizes, and IDs are validated at the Worker boundary.
- R2 credentials are replaced by a Worker R2 binding; no R2 secret is sent to the browser.
- Rate limits are applied to auth, RFQ, quote, contact, and upload-intent mutations.
- Uploads are stored under server-generated keys and have an explicit scanning/quarantine follow-up before public launch.

## Cutover criteria

- The Cloudflare API passes the existing contract and vertical-slice tests.
- Buyer signup/login/logout/session checks pass with cookies across the Cloudflare frontend and API origins.
- Vendor profile, printer/MOQ, storefront contact, RFQ, quote, and quote-acceptance flows pass against D1.
- Upload intent and the R2 upload path pass with a test object.
- D1 import verification passes and a rollback export is retained.
- README and architecture documentation contain Cloudflare setup, bindings, migration, local development, and rollback instructions.
