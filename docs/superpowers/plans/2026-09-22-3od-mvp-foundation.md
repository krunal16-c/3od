# 3oD MVP Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first runnable 3oD vertical slice: a polished public marketplace landing page, buyer/supplier entry points, secure RFQ creation, and private Cloudflare R2 file upload foundations.

**Architecture:** Use a pnpm/Turborepo monorepo with a Next.js web app, NestJS API, and Node worker. Keep the backend as a modular monolith with explicit module boundaries. Store metadata in PostgreSQL, design files in private Cloudflare R2 buckets, and use Redis/BullMQ boundaries for asynchronous scanning and processing.

**Tech Stack:** Next.js, TypeScript, Tailwind CSS, shadcn/ui, React Hook Form, Zod, NestJS, Fastify, Prisma, PostgreSQL, Redis, BullMQ, Cloudflare R2 S3 API, Vitest, Playwright, Docker, and GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-22-3od-marketplace-design.md`

## Global Constraints

- Product name is `3oD`; public descriptor is `India's 3D Printing Marketplace`.
- Primary buyer CTA is `Get quotes for my design`; primary supplier CTA is `Earn from my 3D printer`.
- Suppliers are self-attested; the first release must not require 3oD KYC documents.
- Design files are private by default and must never be exposed through public object URLs.
- Only STL, 3MF, and OBJ are accepted in this milestone.
- Maximum file size is 100 MB per file and 500 MB per RFQ.
- Every server-side object access must perform ownership or role authorization.
- Cloudflare R2 is accessed through a storage adapter so the provider can be replaced later.
- No payment capture, payout, CNC workflow, or instant pricing is included in this milestone.
- Use test-driven development for domain and API behavior and end-to-end tests for the main buyer flow.

---

### Task 1: Scaffold the monorepo and developer tooling

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/worker/package.json`
- Create: `packages/config/package.json`
- Create: `packages/contracts/package.json`
- Create: `packages/domain/package.json`
- Create: `packages/ui/package.json`
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Produces workspace scripts: `dev`, `build`, `lint`, `test`, `test:e2e`, and `typecheck`.
- Produces shared package imports under `@3od/config`, `@3od/contracts`, `@3od/domain`, and `@3od/ui`.

- [ ] **Step 1: Write the workspace manifest and package boundaries.**
- [ ] **Step 2: Add TypeScript, ESLint, Prettier, Vitest, and Playwright configuration.**
- [ ] **Step 3: Add environment-variable validation with separate server and browser-safe schemas.**
- [ ] **Step 4: Add a CI workflow that installs with a frozen lockfile and runs lint, typecheck, unit tests, and build.**
- [ ] **Step 5: Run `pnpm lint && pnpm typecheck && pnpm test`.**
- [ ] **Step 6: Commit `chore: scaffold 3od monorepo`.**

### Task 2: Build the public 3oD homepage

**Files:**
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/app/page.tsx`
- Create: `apps/web/app/globals.css`
- Create: `apps/web/app/for-buyers/page.tsx`
- Create: `apps/web/app/for-printer-owners/page.tsx`
- Create: `apps/web/app/how-it-works/page.tsx`
- Create: `apps/web/app/content/site-copy.ts`
- Create: `apps/web/components/marketing/hero.tsx`
- Create: `apps/web/components/marketing/how-it-works.tsx`
- Create: `apps/web/components/marketing/audience-cards.tsx`
- Create: `apps/web/components/marketing/footer.tsx`
- Create: `apps/web/components/ui/button.tsx`
- Create: `apps/web/components/ui/card.tsx`
- Test: `apps/web/e2e/marketing.spec.ts`

**Interfaces:**
- Buyer CTA links to `/request-quote`.
- Supplier CTA links to `/join-as-supplier`.
- Public content has title, description, canonical URL, Open Graph metadata, and crawlable headings.

- [ ] **Step 1: Write Playwright assertions for headline, both CTAs, audience sections, and mobile navigation.**
- [ ] **Step 2: Implement the responsive landing page using the approved 3oD copy and a restrained maker/engineering visual language.**
- [ ] **Step 3: Add buyer, supplier, and how-it-works pages with unique metadata and internal links.**
- [ ] **Step 4: Add accessible focus states, semantic headings, keyboard navigation, and reduced-motion handling.**
- [ ] **Step 5: Run `pnpm test:e2e --project=chromium`.**
- [ ] **Step 6: Commit `feat: add 3od public marketplace pages`.**

### Task 3: Add shared RFQ contracts and domain rules

**Files:**
- Create: `packages/contracts/src/rfq.ts`
- Create: `packages/contracts/src/files.ts`
- Create: `packages/contracts/src/index.ts`
- Create: `packages/domain/src/rfq/rfq.ts`
- Create: `packages/domain/src/rfq/rfq.test.ts`
- Create: `packages/domain/src/files/file-policy.ts`
- Create: `packages/domain/src/files/file-policy.test.ts`
- Create: `packages/domain/src/index.ts`

**Interfaces:**
- `createRfqInputSchema` validates title, description, quantity, material preference, delivery city, deadline, and confidentiality.
- `uploadFileInputSchema` validates file name, content type, byte size, and extension.
- `validateUploadPolicy(input): { ok: true } | { ok: false; code: string; message: string }` enforces STL/3MF/OBJ and the size limits.
- `RfqStatus` is `DRAFT | SUBMITTED | FILE_VALIDATION | OPEN_FOR_QUOTES | REJECTED | CANCELLED`.

- [ ] **Step 1: Write failing unit tests for valid RFQs, invalid quantities, invalid dates, unsupported formats, oversized files, and suspicious filenames.**
- [ ] **Step 2: Implement Zod schemas and pure domain validation functions.**
- [ ] **Step 3: Export contracts and domain functions for web, API, and worker packages.**
- [ ] **Step 4: Run `pnpm --filter @3od/domain test`.**
- [ ] **Step 5: Commit `feat: add rfq and file domain contracts`.**

### Task 4: Create the PostgreSQL schema and Prisma data access

**Files:**
- Create: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/seed.ts`
- Create: `apps/api/src/database/prisma.service.ts`
- Create: `apps/api/src/database/database.module.ts`
- Create: `apps/api/src/database/repositories/rfq.repository.ts`
- Create: `apps/api/src/database/repositories/file.repository.ts`
- Test: `apps/api/src/database/repositories/rfq.repository.int.test.ts`

**Interfaces:**
- Tables/models: `User`, `BuyerProfile`, `SupplierProfile`, `Rfq`, `RfqFile`, `RfqEvent`, and `AuditLog`.
- `RfqRepository.createDraft(ownerId, input)` returns a draft RFQ.
- `RfqRepository.findOwnedById(ownerId, rfqId)` returns only records owned by the caller.
- `FileRepository.createPendingUpload(record)` creates a file record with `QUARANTINED` status.

- [ ] **Step 1: Write integration tests for owner isolation and RFQ/file relationships.**
- [ ] **Step 2: Define Prisma models, enums, indexes, timestamps, and ownership relations.**
- [ ] **Step 3: Generate the first migration and database client.**
- [ ] **Step 4: Implement repository methods with explicit owner filters.**
- [ ] **Step 5: Run integration tests against a disposable PostgreSQL container.**
- [ ] **Step 6: Commit `feat: add rfq persistence schema`.**

### Task 5: Add API authentication and authorization foundations

**Files:**
- Create: `apps/api/src/auth/auth.module.ts`
- Create: `apps/api/src/auth/auth.service.ts`
- Create: `apps/api/src/auth/guards/auth.guard.ts`
- Create: `apps/api/src/auth/guards/roles.guard.ts`
- Create: `apps/api/src/auth/decorators/current-user.decorator.ts`
- Create: `apps/api/src/auth/roles.ts`
- Create: `apps/api/src/common/http-exception.filter.ts`
- Create: `apps/api/src/common/request-id.middleware.ts`
- Test: `apps/api/src/auth/guards/authorization.int.test.ts`

**Interfaces:**
- `CurrentUser` contains `id`, `role`, and `status`.
- `AuthGuard` rejects missing or invalid sessions.
- `RolesGuard` enforces `buyer`, `supplier`, `support_agent`, `operations_admin`, `finance_admin`, and `super_admin`.

- [ ] **Step 1: Write failing tests for unauthenticated access, role mismatch, and owner mismatch.**
- [ ] **Step 2: Integrate the selected managed authentication provider behind `AuthService`.**
- [ ] **Step 3: Implement role and ownership guards without trusting client-supplied IDs.**
- [ ] **Step 4: Add request IDs and safe error responses that do not leak internal details.**
- [ ] **Step 5: Run authorization integration tests.**
- [ ] **Step 6: Commit `feat: add api authorization foundations`.**

### Task 6: Implement the R2 storage adapter and upload pipeline

**Files:**
- Create: `apps/api/src/storage/storage.port.ts`
- Create: `apps/api/src/storage/r2-storage.adapter.ts`
- Create: `apps/api/src/storage/storage.module.ts`
- Create: `apps/api/src/files/files.service.ts`
- Create: `apps/api/src/files/files.controller.ts`
- Create: `apps/worker/src/scanning/file-scan.worker.ts`
- Create: `apps/worker/src/scanning/file-scanner.ts`
- Create: `apps/worker/src/queue/queue.module.ts`
- Create: `apps/api/src/files/files.int.test.ts`
- Create: `apps/worker/src/scanning/file-scanner.test.ts`

**Interfaces:**
- `StoragePort.createPresignedUpload(input): Promise<{ objectKey: string; uploadUrl: string; expiresAt: Date }>`.
- `StoragePort.createPresignedDownload(input): Promise<{ downloadUrl: string; expiresAt: Date }>`.
- `StoragePort.deleteObject(objectKey): Promise<void>`.
- `FilesService.requestUpload(userId, rfqId, input)` returns a presigned upload and creates a quarantined file record.
- `FilesService.getDownloadUrl(userId, fileId)` checks ownership/order access before signing.

- [ ] **Step 1: Write failing tests for extension allowlists, content-type mismatch, size rejection, private URL generation, and cross-user access denial.**
- [ ] **Step 2: Implement the provider-agnostic storage port.**
- [ ] **Step 3: Implement the Cloudflare R2 adapter with the AWS S3 client and environment validation.**
- [ ] **Step 4: Implement the upload endpoint with rate limiting and ownership checks.**
- [ ] **Step 5: Queue a scan job after upload completion and keep files quarantined until approval.**
- [ ] **Step 6: Implement a scanner boundary that initially returns a deterministic test result and can be backed by ClamAV in the worker container.**
- [ ] **Step 7: Run API and worker tests with a mocked R2 client.**
- [ ] **Step 8: Commit `feat: add private r2 upload pipeline`.**

### Task 7: Build the buyer RFQ flow

**Files:**
- Create: `apps/api/src/rfqs/rfqs.module.ts`
- Create: `apps/api/src/rfqs/rfqs.service.ts`
- Create: `apps/api/src/rfqs/rfqs.controller.ts`
- Create: `apps/api/src/rfqs/rfqs.dto.ts`
- Create: `apps/web/app/request-quote/page.tsx`
- Create: `apps/web/app/request-quote/success/page.tsx`
- Create: `apps/web/components/rfq/rfq-form.tsx`
- Create: `apps/web/components/rfq/file-upload.tsx`
- Create: `apps/web/components/rfq/material-select.tsx`
- Test: `apps/api/src/rfqs/rfqs.int.test.ts`
- Test: `apps/web/e2e/rfq.spec.ts`

**Interfaces:**
- `POST /rfqs` creates an authenticated buyer draft.
- `POST /rfqs/:rfqId/files/upload-url` creates a private upload URL.
- `POST /rfqs/:rfqId/submit` validates requirements and transitions to `FILE_VALIDATION`.
- `GET /rfqs/:rfqId` returns only the owning buyer's RFQ summary.

- [ ] **Step 1: Write API tests for draft creation, invalid payloads, file attachment ownership, and submit transition.**
- [ ] **Step 2: Implement service methods with explicit state-transition checks.**
- [ ] **Step 3: Build the mobile-first RFQ form with clear progress and upload status.**
- [ ] **Step 4: Add buyer-friendly validation and error messaging without leaking security details.**
- [ ] **Step 5: Add end-to-end coverage from landing-page CTA through RFQ submission.**
- [ ] **Step 6: Run API and browser tests.**
- [ ] **Step 7: Commit `feat: add buyer rfq submission flow`.**

### Task 8: Add supplier self-attested onboarding shell

**Files:**
- Create: `apps/api/src/suppliers/suppliers.module.ts`
- Create: `apps/api/src/suppliers/suppliers.service.ts`
- Create: `apps/api/src/suppliers/suppliers.controller.ts`
- Create: `apps/api/src/suppliers/suppliers.dto.ts`
- Create: `apps/web/app/join-as-supplier/page.tsx`
- Create: `apps/web/app/supplier/dashboard/page.tsx`
- Create: `apps/web/components/supplier/supplier-profile-form.tsx`
- Test: `apps/api/src/suppliers/suppliers.int.test.ts`
- Test: `apps/web/e2e/supplier-onboarding.spec.ts`

**Interfaces:**
- `POST /suppliers/profile` creates or updates a self-attested supplier profile.
- `GET /suppliers/me` returns the current supplier profile.
- `PATCH /suppliers/me/capabilities` updates printer, material, location, availability, and service-radius fields.

- [ ] **Step 1: Write tests that confirm no KYC document is required and supplier-owned profile isolation.**
- [ ] **Step 2: Implement supplier profile persistence and responsibility acknowledgement timestamp.**
- [ ] **Step 3: Build the supplier onboarding form with clear self-attestation copy.**
- [ ] **Step 4: Build a dashboard shell showing profile completeness and future RFQ areas.**
- [ ] **Step 5: Run API and browser tests.**
- [ ] **Step 6: Commit `feat: add self-attested supplier onboarding`.**

### Task 9: Add security controls and observability baseline

**Files:**
- Create: `apps/api/src/security/security.module.ts`
- Create: `apps/api/src/security/rate-limit.guard.ts`
- Create: `apps/api/src/security/cors.config.ts`
- Create: `apps/api/src/security/security-headers.ts`
- Create: `apps/api/src/audit/audit.service.ts`
- Create: `apps/api/src/health/health.controller.ts`
- Create: `apps/api/src/telemetry/logger.ts`
- Create: `infra/docker/api.Dockerfile`
- Create: `infra/docker/worker.Dockerfile`
- Create: `infra/docker/clamav.Dockerfile`
- Test: `apps/api/src/security/security.int.test.ts`

**Interfaces:**
- `RateLimitGuard` supports endpoint-specific limits and returns `Retry-After`.
- `AuditService.record(event)` persists actor, action, target, timestamp, and request ID.
- `GET /health/live` and `GET /health/ready` provide liveness and readiness checks.

- [ ] **Step 1: Write tests for rate-limit responses, allowed CORS origins, security headers, audit events, and health checks.**
- [ ] **Step 2: Add Redis-backed rate limiting with safe defaults.**
- [ ] **Step 3: Add exact-origin CORS configuration and security headers.**
- [ ] **Step 4: Add structured logs, request IDs, audit events, and health checks.**
- [ ] **Step 5: Add Docker images for API, worker, and ClamAV scanner.**
- [ ] **Step 6: Run security tests and container builds.**
- [ ] **Step 7: Commit `feat: add security and observability baseline`.**

### Task 10: Verify the vertical slice and document local setup

**Files:**
- Create: `docker-compose.yml`
- Create: `README.md`
- Create: `docs/runbooks/local-development.md`
- Create: `docs/runbooks/r2-setup.md`
- Create: `apps/web/e2e/vertical-slice.spec.ts`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- A new developer can start PostgreSQL, Redis, and the app using the documented commands.
- The full happy path covers landing page → buyer RFQ → R2 upload URL → submission.
- The failure path covers unsupported file, oversized file, and unauthorized file access.

- [ ] **Step 1: Write the full vertical-slice Playwright test.**
- [ ] **Step 2: Add local PostgreSQL and Redis services with non-production credentials.**
- [ ] **Step 3: Document R2 bucket setup, CORS rules, lifecycle rules, and environment variables.**
- [ ] **Step 4: Run the complete suite with `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e`.**
- [ ] **Step 5: Fix failures and repeat the complete suite.**
- [ ] **Step 6: Commit `test: verify 3od mvp vertical slice`.**

## Execution notes

- Do not add payment capture, supplier payouts, CNC flows, or automatic pricing until this vertical slice is working end-to-end.
- Use mocked R2 and payment boundaries in tests; never place real production credentials in local or CI environments.
- Keep public marketing copy in `apps/web/app/content/site-copy.ts` so it can be iterated without touching feature logic.
- Use feature flags for any admin-only or unfinished marketplace behavior.
