# Task 1: Scaffold the monorepo and developer tooling

This is the first implementation task for 3oD. Work directly in the writable project folder `/Users/krunal/Documents/Codex/2026-09-22/i-want-to-build-a-3d-2`.

Create a pnpm/Turborepo monorepo for a Next.js web app, NestJS API, and Node worker with shared config, contracts, domain, and UI packages. Add TypeScript, ESLint, Prettier, Vitest, and Playwright configuration. Add environment-variable validation with separate server and browser-safe schemas. Add a CI workflow that installs with a frozen lockfile and runs lint, typecheck, unit tests, and build.

Required files:

- `package.json`
- `pnpm-workspace.yaml`
- `turbo.json`
- `.gitignore`
- `.env.example`
- `apps/web/package.json`
- `apps/web/tsconfig.json`
- `apps/api/package.json`
- `apps/api/tsconfig.json`
- `apps/worker/package.json`
- `packages/config/package.json`
- `packages/contracts/package.json`
- `packages/domain/package.json`
- `packages/ui/package.json`
- `.github/workflows/ci.yml`

Workspace scripts must include: `dev`, `build`, `lint`, `test`, `test:e2e`, and `typecheck`.

Shared imports must be named `@3od/config`, `@3od/contracts`, `@3od/domain`, and `@3od/ui`.

Use current stable package versions compatible with Node.js LTS. Avoid adding feature code beyond minimal placeholder entrypoints required for build/test tooling. Do not add payment, R2, or database implementation in this task.

Testing: run `pnpm lint && pnpm typecheck && pnpm test`. If dependency installation is unavailable, still create correct manifests and report the exact limitation.

Write a report to `.superpowers/sdd/3od-mvp-foundation/task-1-report.md` containing changed files, commands run, results, and concerns. Do not spawn other agents. Do not alter files outside this task's scope.
