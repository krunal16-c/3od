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
