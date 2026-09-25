# Task 2 fix round

Read `.superpowers/sdd/3od-mvp-foundation/task-2-brief.md` and the review findings in the current conversation. Work in the current project folder.

Fix only the public web slice:

1. Add the approved buyer promise exactly: `Upload your design. Compare quotes. Get it made.` and a trust/expectations section without invented statistics or testimonials.
2. Add a real mobile navigation replacement for the hidden desktop nav. It may be a small client component with a disclosure menu; preserve keyboard access and `aria-expanded`.
3. Fix text contrast for body, eyebrow, button, and orange-card combinations. Prefer darker orange/ink variants while preserving the visual language.
4. Add route-specific canonical metadata to `/for-buyers`, `/for-printer-owners`, and `/how-it-works`.
5. Move meaningful repeated marketing copy into `apps/web/src/app/content/site-copy.ts`; components and pages should consume it.
6. Improve E2E coverage for mobile navigation, audience cards, how-it-works link, and exact page titles. Keep tests under `apps/web/e2e/marketing.spec.ts`.
7. Reformat dense one-line JSX into readable components.

Do not modify API, worker, Prisma, storage, or shared-domain files. Do not spawn agents. Update `.superpowers/sdd/3od-mvp-foundation/task-2-report.md` with the fix round and test results. If dependencies are available, run the web lint/typecheck and Playwright tests; otherwise report the exact blocker.
