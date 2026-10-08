# Ticket 03: Add the production and order lifecycle

**Priority:** P0 — fulfilment foundation  
**Outcome:** An accepted quote becomes a trackable production job from acceptance through delivery.

## Scope

- Create an order when a buyer accepts a quote.
- Add states for accepted, awaiting payment, in production, quality check, shipped, delivered, cancelled, and disputed.
- Add buyer and vendor timelines with timestamped updates.
- Add pickup and shipping details.
- Add delivery confirmation and post-delivery review eligibility.
- Send email and in-app notifications for state changes.

## Acceptance criteria

- Every order has one buyer, one vendor, one RFQ, and one accepted quote.
- Only authorized participants can view or update an order.
- Invalid state transitions are rejected server-side.
- Both dashboards show the same current order state.
- Delivery confirmation creates an auditable event.
- Tests cover lifecycle transitions, cancellation, dispute entry, and notification triggers.

## Dependencies

Better RFQs, trust and safety, Resend notification foundation.
