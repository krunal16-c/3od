# Ticket 01: Trust and safety test strategy

This strategy is based on the current repository as of 2026-10-08. It separates
regression coverage that can run now from acceptance tests that must wait for the
order, moderation, and policy features in the ticket.

## Current implementation coverage

The repository currently contains:

- Buyer and printer-owner authentication with session cookies.
- Role guards for RFQs, quotes, vendor pages, and vendor contacts.
- RFQ and quote state transitions.
- Private RFQ file ownership checks in the Cloudflare Worker.
- D1 audit-event persistence and entity-scoped lookup.
- No order, report, block, review, dispute, refund, moderation, or policy-page model.

The focused regression tests added for this workstream cover the existing audit
repository boundary only. They do not imply that reporting or moderation is live.

## Test layers

### Unit and repository tests

Run with:

```bash
pnpm --filter @3od/api-worker test
```

Current coverage relevant to this ticket:

- `D1MarketplaceRepository` round-trips an audit event with actor, entity, action,
  and metadata.
- Audit lookup is scoped to the requested entity and does not return another
  entity's events.
- Existing RFQ and quote state tests reject invalid transitions.
- Existing Worker route tests cover role boundaries, RFQ/file ownership, and
  authenticated vendor/buyer access.

### API authorization regression tests

Keep these tests in the Worker route suite once trust endpoints exist:

| Case | Expected result |
| --- | --- |
| Anonymous user reports a vendor/listing | `401 UNAUTHENTICATED` |
| Buyer reports a vendor/listing | `201` with non-guessable confirmation reference |
| Buyer reports a vendor owned by another account | `201`; vendor owner identity is not exposed |
| Vendor reports an RFQ | `201` when the RFQ is visible in the vendor inbox |
| Vendor reports a private/non-visible RFQ | `403` or `404`, according to the final resource-disclosure policy |
| Buyer attempts to list moderation reports | `403` |
| Vendor attempts to list moderation reports | `403` |
| Admin lists moderation reports | `200`; report details and status are visible |
| Same reporter submits the same report twice | One report, idempotent response or explicit duplicate error |
| Different reporters submit the same report | Two distinct reports linked to one target |
| A report references a missing target | `404` without creating an orphan report |
| Report payload contains an unknown/oversized reason or message | `400`; no row created |

### Review eligibility tests

These require a completed order model and must not be implemented against RFQs or
quotes alone:

| Case | Expected result |
| --- | --- |
| Buyer reviews the vendor from their completed order | `201` |
| Vendor reviews the buyer from their completed order | `201` |
| Buyer reviews before delivery/completion | `403` or `409`; no review created |
| Unrelated buyer reviews the vendor | `403`; no review created |
| Vendor reviews a buyer from a different order | `403`; no review created |
| Participant submits a second review for the same order/side | `409` or idempotent response |
| Review includes an out-of-range rating or oversized text | `400`; no review created |
| Cancelled/disputed order review eligibility | Defined explicitly before implementation; default should be blocked |
| Public vendor page displays a review | Only published, moderated reviews are shown |

### Audit and moderation visibility tests

Every mutation below should create an immutable audit event containing actor,
target, action, timestamp, and safe metadata:

- Report created, triaged, resolved, dismissed, and escalated.
- Vendor/listing hidden, restored, blocked, and unblocked.
- RFQ rejected, cancelled for policy reasons, or reopened by an admin.
- Review created, hidden, restored, and removed for policy reasons.
- Dispute opened, evidence added, resolved, and refunded.

Authorization checks:

- Actors can read only audit events for resources they are allowed to inspect.
- Admin audit access is explicit and role-protected.
- Public endpoints never return private report messages, reporter contact data,
  moderation notes, or internal metadata.
- Audit metadata is JSON-safe and excludes passwords, session tokens, file URLs,
  and payment secrets.
- Audit records remain after the actor account is deleted; actor identity becomes
  null rather than deleting the history.

## End-to-end acceptance checks

After the dependent features are implemented, run these journeys against a test
database and isolated R2 bucket:

1. Create buyer, vendor, and admin accounts.
2. Publish a vendor page and create a visible listing.
3. Report the vendor as the buyer; verify a confirmation reference and one audit event.
4. Repeat the exact report; verify duplicate handling and no second report.
5. Report an abusive RFQ as the vendor; verify role and visibility rules.
6. View the moderation queue as admin; verify the queue excludes private secrets.
7. Resolve the report; verify state transition, audit event, and vendor visibility.
8. Create an order from an accepted quote and mark it completed.
9. Submit one buyer review and one vendor review; verify both are visible only when published.
10. Attempt reviews from a non-participant, before completion, and twice for the same order.
11. Open a dispute, add evidence, resolve it, and verify the final audit timeline.
12. Check policy links from signup, RFQ submission, vendor page, and checkout/order confirmation.

## Security and abuse cases

- Rate-limit report creation, review creation, moderation reads, and admin mutations.
- Enforce CSRF protection for cookie-authenticated mutations before launch.
- Use object-level authorization on every report, review, dispute, file, and order.
- Normalize and validate target IDs; never construct SQL from user-provided identifiers.
- Do not reveal whether a report target exists when the target is private unless the
  caller is authorized to know that fact.
- Prevent HTML/script injection in report text, reviews, vendor bios, and moderation notes.
- Ensure blocked vendors cannot quote, contact buyers, or publish new listings.
- Ensure suspended buyers cannot create RFQs, contact vendors, or submit reviews.

## Current blockers

The following ticket acceptance criteria are blocked by missing implementation
dependencies rather than test infrastructure:

- No report or block endpoint, table, repository method, or UI exists.
- No admin access model or moderation queue exists.
- No order/completed-order state exists, so review eligibility cannot be proven.
- No review, dispute, refund, or support-state model exists.
- No policy pages or policy acknowledgement records exist.
- Existing `AuditEntityType` covers `USER`, `SESSION`, `RFQ`, `RFQ_FILE`, and `QUOTE`,
  but not vendors, listings, reports, reviews, orders, disputes, or refunds.
- Notifications are not available for report receipt, moderation decisions, or disputes.

Until those dependencies land, the two repository tests added here are the only
safe new executable coverage for this ticket. The exact endpoint and journey cases
above should be added alongside each corresponding implementation, before the
feature is called complete.
