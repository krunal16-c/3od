# Task 2: Build the public 3oD homepage

This is the second implementation task for 3oD. Work directly in `/Users/krunal/Documents/Codex/2026-09-22/i-want-to-build-a-3d-2` on top of the existing monorepo scaffold.

Build a polished, mobile-first public marketing surface for 3oD — India's 3D Printing Marketplace. Use Next.js app routes and keep all marketing copy in `apps/web/src/app/content/site-copy.ts`.

Required files:

- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/page.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/src/app/for-buyers/page.tsx`
- `apps/web/src/app/for-printer-owners/page.tsx`
- `apps/web/src/app/how-it-works/page.tsx`
- `apps/web/src/app/content/site-copy.ts`
- `apps/web/src/components/marketing/hero.tsx`
- `apps/web/src/components/marketing/how-it-works.tsx`
- `apps/web/src/components/marketing/audience-cards.tsx`
- `apps/web/src/components/marketing/footer.tsx`
- `apps/web/src/components/ui/button.tsx`
- `apps/web/src/components/ui/card.tsx`
- `apps/web/e2e/marketing.spec.ts`

Use the approved copy direction:

- Brand: `3oD`
- Descriptor: `India's 3D Printing Marketplace`
- Homepage headline: `Your design. Real quotes. Made in India.`
- Buyer CTA: `Get quotes for my design`, linking to `/request-quote`.
- Supplier CTA: `Earn from my 3D printer`, linking to `/join-as-supplier`.
- Supplier promise: `Turn your idle printer into income.`
- Buyer promise: `Upload your design. Compare quotes. Get it made.`

Include sections for buyers, printer owners, how it works, use cases, trust/expectations, and a final CTA. Include links to `/for-buyers`, `/for-printer-owners`, and `/how-it-works`.

Accessibility requirements: semantic headings, keyboard-visible focus, alt text or decorative treatment for visuals, no essential hover-only behavior, mobile layout, and reduced-motion support.

SEO requirements: unique title and description per public route, canonical metadata, one clear H1 per page, descriptive H2s, and internal linking. Do not use fake testimonials, invented statistics, or unsupported certifications.

Write Playwright assertions for the homepage headline, both primary CTAs, audience cards, internal links, mobile navigation, and page titles. Run `pnpm test:e2e --project=chromium` if dependencies are available; otherwise run static checks and report the blocker.

Write a report to `.superpowers/sdd/3od-mvp-foundation/task-2-report.md`. Do not spawn agents. Do not modify API, worker, Prisma, storage, or shared-domain files.
