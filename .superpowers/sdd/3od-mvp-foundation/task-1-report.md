# Task 1 report

## Status

Scaffold created and reviewer fix round applied. Dependency installation remains blocked by unavailable package-registry metadata, so the requested checks could not execute against installed dependencies.

## Changed files

- `.env.example`
- `.gitignore`
- `.github/workflows/ci.yml`
- `eslint.config.mjs`
- `package.json`
- `playwright.config.ts`
- `pnpm-workspace.yaml`
- `prettier.config.mjs`
- `tsconfig.json`
- `turbo.json`
- `vitest.config.ts`
- `apps/web/package.json`
- `apps/web/tsconfig.json`
- `apps/web/next-env.d.ts`
- `apps/web/next.config.ts`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/page.tsx`
- `apps/api/package.json`
- `apps/api/tsconfig.json`
- `apps/api/src/main.ts`
- `apps/worker/package.json`
- `apps/worker/tsconfig.json`
- `apps/worker/src/index.ts`
- `packages/config/package.json`
- `packages/config/tsconfig.json`
- `packages/config/src/index.ts`
- `packages/config/src/env/server.ts`
- `packages/config/src/env/client.ts`
- `packages/contracts/package.json`
- `packages/contracts/tsconfig.json`
- `packages/contracts/src/index.ts`
- `packages/domain/package.json`
- `packages/domain/tsconfig.json`
- `packages/domain/src/index.ts`
- `packages/ui/package.json`
- `packages/ui/tsconfig.json`
- `packages/ui/src/index.tsx`

## Commands and results

- `pnpm view <package> version --json`: blocked/timed out while reaching the npm registry.
- `pnpm install --lockfile-only --offline`: failed with `ERR_PNPM_NO_OFFLINE_META`; required package metadata was not present in the local pnpm cache.
- `pnpm lint`: not run; failed before execution because `turbo` was unavailable (`node_modules` is absent).
- `pnpm typecheck`: not run; failed before execution because `turbo` was unavailable (`node_modules` is absent).
- `pnpm test`: not run; failed before execution because `turbo` was unavailable (`node_modules` is absent).

## Reviewer fix round

- Added `@eslint/js` and `typescript-eslint` to match `eslint.config.mjs` imports.
- Set `jsx: "preserve"` in the web TypeScript configuration.
- Declared the worker and shared packages as ESM, matching `import.meta` and emitted module artifacts.
- Changed the root `test:e2e` script to invoke the root Playwright configuration directly.
- Updated shared package `main`, `types`, `exports`, and `files` metadata to point at `dist`, and enabled declaration output for package builds.
- Kept `@3od/config` root exports browser-safe; server validation is available only through `@3od/config/env/server`.
- Changed `DATABASE_URL` in `.env.example` to a valid PostgreSQL URL.

Additional available checks:

- Static configuration assertions: passed.
- `node --check eslint.config.mjs`: passed.
- `node --check prettier.config.mjs`: passed.
- Reran `pnpm lint`, `pnpm typecheck`, and `pnpm test`: each remains blocked before task execution by missing `turbo` because dependencies are not installed.

## Reviewer fix round 2

- Converted `@3od/api` to ESM with `type: "module"`, `module: "NodeNext"`, and `moduleResolution: "NodeNext"`, matching the shared package outputs.
- Added deterministic `tsc --watch` dev scripts to all shared packages so their `dist` JavaScript and declaration artifacts stay current.
- Updated the Turbo `dev` task to build dependency packages first and start dependency dev watchers with consumers through `with: ["^dev"]`.

Additional available checks:

- API ESM/NodeNext, Turbo dev graph, shared dev scripts, and dist-export assertions: passed.
- `node --check eslint.config.mjs`: passed.
- `node --check prettier.config.mjs`: passed.

## Concerns

- `pnpm-lock.yaml` could not be generated because dependency resolution was blocked. CI is configured to use `pnpm install --frozen-lockfile` as required, but a lockfile must be generated in an environment with registry access before CI can pass.
- The package versions are pinned to conservative Node.js 20+/22-compatible ranges because live registry verification was unavailable.
- Full TypeScript/build execution remains unavailable until dependencies can be installed; no install process was started during this fix round.

## Final fix round

- Pointed the root Playwright configuration at `apps/web/e2e`, matching the implementation plan.
- Made root `test:e2e` run `pnpm build` before the root Playwright command so shared `dist` exports exist in a clean checkout.
- Added `^build` dependencies to Turbo `test` and `typecheck` tasks while preserving their workspace task dependencies.

Available checks:

- Playwright discovery, E2E prebuild, and Turbo consumer-build dependency assertions: passed.
- `node --check eslint.config.mjs`: passed.
- `node --check prettier.config.mjs`: passed.
