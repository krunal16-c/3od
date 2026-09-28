# Cloudflare-only marketplace migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the 3oD API and marketplace persistence from Render/NestJS/PostgreSQL to Cloudflare Workers/Hono/D1 while keeping the existing frontend API contract and marketplace behavior.

**Architecture:** Keep the Next.js frontend on the existing OpenNext Worker. Add a separate Hono API Worker with D1 and R2 bindings. Reuse `packages/contracts` and `packages/domain` for validation and state transitions, and keep the PostgreSQL API deployable until the D1 API has passed cutover checks.

**Tech Stack:** Cloudflare Workers, Hono, D1 SQLite, R2 Worker binding, Wrangler, Vitest, pnpm workspace, existing Next.js frontend.

**Spec:** `docs/cloudflare-only-migration.md`

## Global Constraints

- Preserve the browser routes currently used by `apps/web/src/lib/api-client.ts`.
- Do not commit database URLs, session secrets, R2 keys, exported user data, or `.env` files.
- Keep production CORS explicit and limited to the deployed frontend origin.
- Keep tests for successful behavior, validation failures, authorization boundaries, and migration edge cases.
- Update `README.md` and `architecture.md` with every new deployment, binding, persistence, or security behavior.
- Do not delete the working PostgreSQL API until the Cloudflare API passes the cutover criteria.

## Review Focus

- Cookie auth across separate frontend/API Worker origins — test login, `/auth/me`, logout, expiry, and unauthorized access.
- Duplicate RFQs and concurrent retries — test D1 unique idempotency behavior.
- Role and ownership boundaries — test buyer/vendor access to RFQs, quotes, printers, contacts, and vendor pages.
- SQLite representation of dates, booleans, arrays, enums, and JSON metadata — test round-trip conversion.
- Upload abuse and stale intents — test MIME/size validation, one-time upload tokens, and R2 object-key ownership.

### Task 1: Cloudflare API Worker foundation

**Files:**
- Create: `apps/api-worker/package.json`
- Create: `apps/api-worker/src/index.ts`
- Create: `apps/api-worker/src/env.ts`
- Create: `apps/api-worker/src/http.ts`
- Create: `apps/api-worker/wrangler.jsonc`
- Modify: `pnpm-workspace.yaml`
- Test: `apps/api-worker/src/http.test.ts`

**Interfaces:**
- Consumes: D1 binding `DB`, R2 binding `FILES`, `packages/contracts`, and `packages/domain`.
- Produces: a Worker fetch handler, `/` health response, JSON error format, explicit CORS, request IDs, and route composition for later tasks.

- [ ] Write a failing health/CORS/error test for `GET /`, an allowed origin, a disallowed origin, and malformed JSON.
- [ ] Run `pnpm --filter @3od/api-worker test` and verify the new tests fail because the Worker package does not exist.
- [ ] Add Hono, Wrangler types, Worker env validation, CORS, security headers, and a consistent error response.
- [ ] Run the focused tests and verify the Worker returns the expected health and security behavior.
- [ ] Run the Worker typecheck and `wrangler deploy --dry-run` with local bindings.
- [ ] Commit: `feat: add cloudflare api worker foundation`.

### Task 2: D1 schema and typed repository

**Files:**
- Create: `apps/api-worker/migrations/0001_marketplace.sql`
- Create: `apps/api-worker/src/db/types.ts`
- Create: `apps/api-worker/src/db/marketplace-repository.ts`
- Create: `apps/api-worker/src/db/codec.ts`
- Test: `apps/api-worker/src/db/codec.test.ts`
- Test: `apps/api-worker/src/db/marketplace-repository.test.ts`

**Interfaces:**
- Consumes: D1 `D1Database` and the existing domain entity/state types.
- Produces: repository methods matching the current `MarketplaceStore` contract, including users, sessions, RFQs, quotes, files, vendors, printers, and contacts.

- [ ] Write failing codec tests for dates, booleans, string arrays, JSON metadata, and enum values.
- [ ] Write failing repository tests for user lookup, session expiry, idempotent RFQ creation, quote updates, and vendor printer/contact reads.
- [ ] Add SQLite-compatible D1 tables, indexes, unique constraints, and foreign keys.
- [ ] Implement parameterized D1 queries and conversion functions without string interpolation of user input.
- [ ] Run repository tests against an in-memory D1 test binding and verify all conversion/constraint cases pass.
- [ ] Commit: `feat: add d1 marketplace repository`.

### Task 3: Worker authentication and marketplace routes

**Files:**
- Create: `apps/api-worker/src/auth/password.ts`
- Create: `apps/api-worker/src/auth/session.ts`
- Create: `apps/api-worker/src/routes/auth.ts`
- Create: `apps/api-worker/src/routes/marketplace.ts`
- Modify: `apps/api-worker/src/index.ts`
- Test: `apps/api-worker/src/routes/auth.test.ts`
- Test: `apps/api-worker/src/routes/marketplace.test.ts`

**Interfaces:**
- Consumes: repository from Task 2, existing Zod contracts, and domain transition functions.
- Produces: compatible auth, vendor, RFQ, quote, and contact endpoints with HttpOnly cookie sessions.

- [ ] Write failing route tests for signup, duplicate signup, login, invalid password, `/auth/me`, logout, buyer/vendor role checks, and RFQ idempotency.
- [ ] Decide and test the Worker-compatible password format. Do not silently accept PostgreSQL scrypt hashes; require password reset or explicitly support a tested compatibility path.
- [ ] Implement session hashing, expiry checks, cookie flags, role authorization, validation, and route responses matching the current client types.
- [ ] Implement all existing API paths: auth, vendor profile/printers/contacts, storefront, RFQs, quotes, quote acceptance, and upload intent placeholder.
- [ ] Run focused tests, then the full workspace test suite.
- [ ] Commit: `feat: port marketplace api to cloudflare worker`.

### Task 4: R2 upload path and abuse controls

**Files:**
- Create: `apps/api-worker/src/uploads/upload-intents.ts`
- Create: `apps/api-worker/src/uploads/r2.ts`
- Modify: `apps/api-worker/src/routes/marketplace.ts`
- Modify: `apps/web/src/lib/api-client.ts`
- Test: `apps/api-worker/src/uploads/upload-intents.test.ts`
- Test: `apps/web/src/lib/api-client.test.ts`

**Interfaces:**
- Consumes: authenticated RFQ ownership, D1, and the R2 `FILES` binding.
- Produces: a compatible upload-intent response and a one-time authenticated upload URL that writes only to a server-generated R2 key.

- [ ] Write failing tests for invalid MIME, oversized files, wrong RFQ owner, expired intent, replayed intent, and successful R2 write.
- [ ] Implement D1-backed one-time upload intents and a Worker `PUT` endpoint that streams validated bodies to R2.
- [ ] Update the browser upload helper only if the response contract requires it; preserve the existing RFQ form behavior.
- [ ] Run upload tests with an R2 mock binding and verify the stored key cannot be selected by the browser.
- [ ] Commit: `feat: add cloudflare r2 upload flow`.

### Task 5: D1 export/import and verification

**Files:**
- Create: `apps/api-worker/scripts/export-postgres.ts`
- Create: `apps/api-worker/scripts/import-d1.ts`
- Create: `apps/api-worker/scripts/verify-migration.ts`
- Create: `apps/api-worker/migrations/0002_indexes.sql`
- Test: `apps/api-worker/scripts/migration-verification.test.ts`

**Interfaces:**
- Consumes: a PostgreSQL export source and D1 migration files.
- Produces: redacted-safe operational scripts that import users, sessions, vendors, printers, contacts, RFQs, files, quotes, and audit events idempotently and report mismatches.

- [ ] Write failing verification tests for missing foreign keys, duplicate unique keys, row-count mismatch, and valid imported fixtures.
- [ ] Implement export/import in batches with explicit column lists and conflict handling.
- [ ] Implement verification that checks counts, required relations, representative state transitions, and no plaintext passwords/secrets in export logs.
- [ ] Run the scripts against synthetic demo fixtures and retain only non-sensitive test output.
- [ ] Commit: `feat: add d1 migration tooling`.

### Task 6: Cloudflare deployment, cutover, and documentation

**Files:**
- Modify: `apps/api-worker/wrangler.jsonc`
- Modify: `apps/web/wrangler.jsonc`
- Modify: `README.md`
- Modify: `architecture.md`
- Modify: `.gitignore`
- Test: `apps/api-worker/src/deployment-config.test.ts`

**Interfaces:**
- Consumes: completed Worker API, D1 migration, R2 binding, and frontend public URL.
- Produces: reproducible local preview, Cloudflare deployment commands, secrets/bindings checklist, cutover/rollback runbook, and a clean production build.

- [ ] Write failing configuration tests for required bindings, explicit production origins, and missing secret rejection.
- [ ] Add D1/R2 bindings, production variables, compatibility flags, observability, and API deployment scripts.
- [ ] Update README and architecture with `wrangler d1`, `wrangler r2`, Worker API URL, frontend API URL, data import, rollback, and cookie/CORS setup.
- [ ] Run typecheck, lint, tests, frontend OpenNext build, API Worker dry-run, and local Worker previews.
- [ ] Review `git diff`, `git status`, generated-file ignores, and secret scanning results.
- [ ] Commit: `feat: deploy marketplace entirely on cloudflare`.

## Rollback

Before cutover, keep the Render API and PostgreSQL database available. If Cloudflare API checks fail, point `NEXT_PUBLIC_API_URL` back to the Render API, restore the previous frontend Worker deployment, and investigate D1/import logs without deleting the source database.
