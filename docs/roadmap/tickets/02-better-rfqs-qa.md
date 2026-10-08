# Ticket 02 QA strategy: Better RFQs

## Scope

This strategy covers the richer RFQ lifecycle described in [02-better-rfqs.md](./02-better-rfqs.md): process-aware requirements, drafts and submission, files, expiry, messaging, quote comparison, authorization, and mobile behavior.

The current repository has an isolated Cloudflare Worker route suite in `apps/api-worker/src/routes/marketplace.test.ts` and a small frontend API-client suite in `apps/web/src/lib/api-client.test.ts`. The existing end-to-end suite in `apps/web/e2e/rfq-auth.spec.ts` currently exercises the basic buyer signup → upload → RFQ submission journey.

## Coverage added in this workstream

The Worker route tests now cover:

- An unrelated buyer cannot upload a file to another buyer's RFQ.
- Unsupported design file extensions are rejected before R2 storage is called.
- An unrelated buyer cannot read another buyer's quote list.
- Existing coverage continues to verify idempotent RFQ creation, buyer/vendor role boundaries, successful authorized uploads, quote creation, and quote acceptance.

These tests are isolated against an in-memory SQLite-backed D1 test double and an R2 spy; they do not require a deployed database, bucket, or network service.

## Acceptance test matrix

| Area | Test case | Expected result | Current status |
| --- | --- | --- | --- |
| Drafts | Save an incomplete RFQ, reload it, then submit after completing required fields | Draft persists without appearing in vendor inbox; submission changes state exactly once | Blocked: no draft API/state flow |
| Process fields | Submit 3D printing, CNC, laser, and fabrication RFQs with process-specific required fields | Valid process fields persist; missing required fields return field-level validation errors | Blocked: schema has no process model |
| Files | Upload multiple design files and optional reference images | Each file is linked to the RFQ; unsupported, oversized, and unauthorized uploads are rejected before storage | Partial: one private design-file upload is supported; no multi-file/reference-image contract |
| File privacy | Owner can access own file metadata/content; unrelated buyer/vendor cannot | Unauthorized access returns 403/404 without revealing storage keys | Partial: upload ownership is covered; no file retrieval endpoint exists |
| Duplicate submit | Retry the same RFQ with the same idempotency key, including concurrent requests | One RFQ is created and both responses identify it | Covered sequentially; concurrency test still needed against the production D1 binding |
| Expiry | Submit a request with an expiry/deadline, advance time, and run reminder/expiry handling | Expired RFQs leave the vendor inbox and produce the expected reminder state | Blocked: no expiry job/reminder state |
| Vendor visibility | Buyer, vendor, and unauthenticated callers request inbox/detail data | Only authenticated vendors see open RFQs; buyers see only owned RFQs and their quotes | Partial: role boundaries and quote-list ownership are covered; vendor capability filtering is not implemented |
| Messaging | Buyer and vendor exchange messages tied to an RFQ; unrelated users attempt access | Authorized participants can read/write; unrelated users are denied; messages retain order | Blocked: no messaging data model or route |
| Quote comparison | Buyer compares multiple quotes by price, lead time, process, MOQ, delivery, and assumptions | Responsive comparison identifies the selected quote and remains usable at 375px | Blocked: current quote model/view lacks process, MOQ, and assumptions |
| Quote lifecycle | Vendor submits valid/invalid quotes; buyer accepts one; retries acceptance | Validation is consistent, one quote is selected, and repeated acceptance is safe | Partial: basic submit/accept is covered; process-specific quote validation and duplicate acceptance coverage remain |
| Mobile RFQ form | Complete and submit the RFQ flow at 375×812 with keyboard and validation errors | No horizontal overflow; controls remain reachable; errors are visible and associated with fields | Not automated yet: requires browser/e2e implementation |

## Exact implementation-ready test cases

1. `POST /rfqs` with `process=CNC_MILLING` and no material/tolerance: return `400 VALIDATION_ERROR` with field details.
2. `POST /rfqs` with an invalid process value: return `400 VALIDATION_ERROR`.
3. `POST /rfqs/drafts` as a buyer with only a title: return a persisted `DRAFT`; `GET /rfqs/mine` includes it, while `GET /rfqs/inbox` excludes it.
4. Submit the same draft twice: the first changes it to `OPEN_FOR_QUOTES`; the second is idempotent and does not duplicate notifications.
5. Upload two allowed design files and one reference image: return three file records with private keys; a second buyer receives `403` for each retrieval.
6. Vendor A with matching CNC capability sees a CNC RFQ; Vendor B without that capability does not see it.
7. Create two quotes with different price/lead-time/MOQ values and verify the buyer-facing comparison sorts and labels each value correctly on desktop and mobile.
8. Send an RFQ message as the buyer and vendor; attempt the same read/write as an unrelated buyer and expect `403` without message content.
9. Set an RFQ expiry in the past or advance a fake clock beyond it; verify it is excluded from the inbox and marked `EXPIRED`.
10. Re-submit a quote and accept the same quote twice; verify the second request is a safe conflict/no-op and cannot change another quote to `ACCEPTED`.

## Verification commands

```bash
pnpm --filter @3od/api-worker test -- src/routes/marketplace.test.ts
pnpm --filter @3od/api-worker typecheck
pnpm --filter @3od/web test
pnpm --filter @3od/web typecheck
```

## Current blockers

- The ticket depends on a process capability model, but the current schema and contracts are printer/material oriented.
- There is no RFQ draft route or persistence behavior.
- R2 upload exists, but there is no authorized file metadata/download endpoint to test end-to-end.
- There is no messaging model, reminder worker, or RFQ expiry job.
- Quote comparison cannot satisfy the acceptance criteria until quote fields include process, MOQ, delivery, and assumptions.
- Production concurrency, mobile browser flow, and real R2 authorization still require environment-backed tests after those features land.
