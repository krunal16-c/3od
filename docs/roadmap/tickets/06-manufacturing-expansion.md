# Ticket 06: Expand beyond 3D printing

**Priority:** P1 — supply and demand expansion  
**Outcome:** 3oD can support additional production methods without duplicating marketplace flows.

## Scope

Launch in stages:

1. CNC milling
2. CNC turning
3. Laser cutting and engraving
4. Sheet-metal fabrication
5. Waterjet cutting
6. Vacuum forming and injection molding

Model shared manufacturing concepts first: process, material, tolerance, finish, machine envelope, minimum order quantity, lead time, and location. Add process-specific fields only where they improve quoting.

## Acceptance criteria

- A buyer can select an available process without seeing planned processes as live.
- A vendor can list capabilities for at least one enabled process.
- RFQs and quotes retain the selected process across dashboards and order records.
- Process-specific validation prevents incomplete engineering requests.
- SEO and UI copy distinguish available, coming-next, and planned categories.
- Tests cover process authorization, capability matching, and backward compatibility with 3D-printing RFQs.

## Dependencies

Better RFQs, vendor tools, production workflow, category-specific partner research.
