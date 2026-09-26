# Engineering instructions for 3oD

## Clean, readable code

- Follow clean-code practices in every change.
- Prefer clear names, focused functions, simple control flow, and consistent formatting.
- Keep components and modules small enough to understand without excessive scrolling.
- Avoid duplicated logic, unexplained magic values, premature abstraction, and dead code.
- Add comments only when they explain a non-obvious decision or important domain constraint.
- Preserve existing behavior unless the requested change requires otherwise.

## Tests are required

- Write or update tests for every new behavior and bug fix.
- Follow test-driven development where practical: create a failing test, implement the change, then verify it passes.
- Cover successful behavior, validation failures, authorization boundaries, and important edge cases.
- Run the relevant tests and type checks before reporting work as complete.
- Do not claim a feature is complete when its tests are missing, failing, or not run; clearly report any blocked verification.

## Commit hygiene

- Keep commits focused on one coherent change or outcome.
- Use clear, imperative commit messages with a consistent conventional format, such as `feat: add vendor storefront` or `fix: allow local dev CORS ports`.
- Do not mix unrelated refactors, formatting churn, generated artifacts, or personal environment changes into a feature commit.
- Review `git diff` and `git status` before committing.
- Run the relevant tests, type checks, and formatting checks before committing.
- Never commit secrets, database URLs, `.env` files, credentials, private keys, or large generated build output.
- Make commits easy to review, revert, and cherry-pick; explain important migration or compatibility concerns in the commit body when needed.
