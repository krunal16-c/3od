# Ticket 02: Make RFQs richer and easier to compare

**Priority:** P0 — marketplace liquidity  
**Outcome:** Buyers provide enough production context for useful quotes, and vendors can respond consistently.

## Scope

- Add manufacturing process selection: 3D printing, CNC, laser cutting, and fabrication.
- Support multiple design files and optional reference images.
- Add material, finish, tolerance, quantity, deadline, location, and shipping preferences.
- Add RFQ expiry and reminder states.
- Add buyer/vendor messaging tied to an RFQ.
- Improve the quote comparison view with price, lead time, process, MOQ, delivery, and assumptions.

## Acceptance criteria

- A buyer can save a valid RFQ draft and submit it later.
- A submitted RFQ validates process-specific required fields.
- Vendors see only RFQs allowed by role and marketplace state.
- Quote comparison works on mobile and clearly identifies the selected quote.
- Files remain private and authorized throughout the RFQ lifecycle.
- Tests cover validation, duplicate submission, file ownership, and unauthorized access.

## Dependencies

Trust policies, process capability model, notification system.
