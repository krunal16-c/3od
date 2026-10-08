# Ticket 05: Build vendor capacity and quoting tools

**Priority:** P1 — supply quality  
**Outcome:** Vendors can present real capabilities and quote work quickly and accurately.

## Scope

- Add process-specific machine capability profiles.
- Add availability calendar and blackout dates.
- Add material inventory and optional low-stock indicators.
- Add quote templates and reusable cost assumptions.
- Add machine utilization, response time, win rate, earnings, and order reports.
- Support costing attachments or exported costing notes from Bambu Studio and equivalent tools.

## Acceptance criteria

- A vendor can list capabilities without exposing private credentials.
- A vendor can mark a machine unavailable for a date range.
- Quote templates cannot bypass required price and lead-time fields.
- Buyer-facing capability summaries match vendor settings.
- Reports are calculated from real records only; no synthetic dashboard data.
- Tests cover vendor ownership, availability conflicts, and report authorization.

## Dependencies

Better RFQs, order lifecycle, process capability model.

## Implemented slice

- Printer capabilities now persist supported processes, MOQ, and typical lead time.
- Public vendor pages expose those capability fields without private account identifiers.
- Vendor owners can create and list printer blackout ranges; overlapping ranges and cross-vendor access are rejected.
- `/vendor/reports/summary` calculates owner-scoped counts and earnings from stored records only.
- D1 and Prisma migrations are included in `0006_vendor_tools.sql` and `20261008170000_vendor_tools`.

Remaining scope includes material inventory, quote templates/cost assumptions, costing attachments, and richer utilization/response-time analytics.
