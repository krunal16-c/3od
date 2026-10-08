# Ticket 04: Add India-ready payments and monetization

**Priority:** P1 — revenue enablement  
**Outcome:** Buyers can pay safely and vendors can receive transparent payouts.

## Scope

- Select and integrate an India-supported payment provider, initially evaluate Razorpay for INR collection.
- Add payment intent and webhook handling on the API only.
- Add platform commission configuration and vendor payout records.
- Add GST-ready invoice data and downloadable receipts.
- Add refund, partial refund, and payment-failure states.
- Keep payment credentials and webhook secrets server-side.

## Acceptance criteria

- A payment cannot be marked successful from the browser alone.
- Webhooks are signature-verified and idempotent.
- An order cannot enter production until payment policy is satisfied.
- Buyers see receipts and payment status.
- Vendors see gross amount, platform fee, taxes, and expected payout.
- Tests cover duplicate webhooks, failed payments, refunds, and authorization boundaries.

## Dependencies

Production order lifecycle, legal/tax review, verified business payment account.
