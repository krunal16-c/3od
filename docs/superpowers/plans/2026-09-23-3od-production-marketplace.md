# 3oD Production Marketplace Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) to implement this plan task-by-task.

**Goal:** Replace the current demo-only marketplace behavior with a secure, persistent RFQ-to-quote foundation that supports both buyer and printer-owner workflows.

**Architecture:** Next.js remains the web app and calls a NestJS API over same-site HTTP in production. The API owns authorization, validation, rate limiting, RFQ/quote state transitions, and signed upload URLs. PostgreSQL/Prisma are the source of truth; Cloudflare R2 stores design files; the worker handles asynchronous file inspection and notifications.

**Tech Stack:** NestJS + Fastify, Zod contracts, PostgreSQL + Prisma, signed HttpOnly session cookies, Cloudflare R2 S3-compatible API, Redis/BullMQ-compatible worker boundary, Vitest, and Playwright.

**Spec:** `docs/superpowers/specs/2026-09-22-3od-marketplace-design.md`

## Global Constraints

- India-wide marketplace; prices and dates are displayed in Indian context.
- Buyers can request quotes without KYC documents in this MVP; providers are responsible for reporting inaccurate information.
- Never expose R2 credentials to the browser; uploads use short-lived presigned URLs.
- Every write endpoint validates input, authenticates the actor, authorizes the resource, and is rate limited.
- RFQ and quote state transitions are explicit and auditable.
- Demo UI remains usable when external credentials are absent, but production code must fail closed rather than silently accepting insecure configuration.

## Review Focus

- Unauthenticated or cross-role access to RFQs and quotes must return a generic 401/403 response.
- Duplicate submissions and retries must not create duplicate RFQs.
- Oversized, unsupported, or unavailable design files must not enter the quote workflow.
- A quote cannot be accepted after expiry, cancellation, or a competing quote has already been accepted.
- Production startup must reject missing signing secrets and unsafe CORS configuration.

### Task 1: API security foundation and shared contracts

Create shared Zod contracts for auth, RFQs, quotes, pagination, and API errors. Convert the API to Fastify, add Helmet, strict CORS from an allowlist, request IDs, structured error responses, and route-level rate-limit defaults. Add environment validation for signing secrets, database, R2, and frontend origins. Test the security behavior with Nest testing utilities.

### Task 2: Persistent marketplace domain

Add Prisma schema and repositories for users, sessions, RFQs, RFQ files, quotes, and audit events. Model explicit RFQ and quote states, unique idempotency keys, ownership indexes, and timestamps. Add migrations and repository tests using a test database adapter or deterministic repository doubles.

### Task 3: Auth and RFQ API vertical slice

Implement signup/login/logout/me with Argon2 password hashing and HttpOnly SameSite cookies. Implement buyer RFQ creation, presigned R2 upload initiation, RFQ listing, and printer-owner RFQ inbox with ownership checks. Add idempotency and file metadata validation. Wire the existing forms to the API with useful loading/error states.

### Task 4: Quotes, order handoff, and dashboards

Implement printer-owner quote creation, buyer quote comparison, quote acceptance, and the RFQ/order state transition audit trail. Replace dashboard sample data with API queries while keeping loading, empty, and error states accessible.

### Task 5: Worker, observability, and production hardening

Add asynchronous file inspection and notification job boundaries, health/readiness probes, audit logging, redacted structured logs, security headers, dependency checks, and end-to-end tests for the complete buyer/printer-owner journey.

## NOT in scope for this milestone

- Razorpay capture, refunds, and marketplace payouts: requires verified business/payment credentials and follows the quote/order slice.
- KYC document collection: intentionally deferred per product decision.
- CNC machining workflows: future capability after 3D-printing demand is validated.
- Production deployment and DNS: requires a hosting account, secrets, and domain choice.
