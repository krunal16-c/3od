# Ticket 01: Build marketplace trust and safety

**Priority:** P0 — launch readiness  
**Outcome:** Buyers and manufacturing partners can transact with clear expectations, reporting tools, and auditable support paths.

## Scope

- Add privacy policy, terms, cancellation, file ownership, and acceptable-use pages.
- Add vendor report/block actions and an internal moderation queue.
- Add optional vendor verification status without requiring KYC at this stage.
- Add ratings and reviews after completed orders only.
- Add dispute, refund-request, and support states.
- Record security-sensitive actions in an audit trail.

## Acceptance criteria

- A buyer can report a vendor or listing and receive a confirmation reference.
- A vendor can report abusive, fraudulent, or impossible RFQs.
- Reviews are available only to participants in a completed order.
- Admin actions and state changes are auditable.
- Policies are linked from signup, RFQ submission, vendor pages, and checkout.
- Tests cover authorization, duplicate reports, review eligibility, and moderation visibility.

## Dependencies

Completed order model, admin access model, notification system.
