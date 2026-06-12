# Testing

## Test surfaces

| Tool | Where | Purpose |
|---|---|---|
| Vitest | `src/**/*.test.ts`, `src/**/*.test.tsx`, `supabase/functions/_shared/*_test.ts` | Unit + component tests, shared edge-function modules. |
| Playwright | `e2e/*.spec.ts` + `playwright-fixture.ts` + `playwright.config.ts` | End-to-end browser flows. |
| Selenium | `selenium/*.test.ts` + `selenium/config.ts` | Cross-browser smoke tests. |
| Mocha | `.mocharc.json` (test target via `npm run test:integration`) | Integration tests for shared scripts. |

## Commands

```bash
npm run test              # vitest watch
npm run test:ci           # vitest run with coverage
npm run test:coverage     # alias for the above
npm run test:watch        # vitest watch (explicit)
npm run test:e2e          # Playwright
npm run test:e2e:ui       # Playwright UI mode
npm run test:integration  # Mocha
npm run lint              # ESLint
```

## What to run when

| Change touches… | Minimum |
|---|---|
| Pure helper / util / pure hook | `npm run test:ci` |
| UI component | vitest for any tests it has + manual preview check |
| New shadcn-style component | vitest (a11y / interaction) |
| Hook with Supabase | vitest with mocked client |
| Edge function (shared module) | vitest on `_shared/*_test.ts` |
| Edge function (handler) | targeted invoke via Supabase tooling on the Test project |
| Auth, RLS, credits, billing | vitest + Playwright e2e |
| Carousel or full generation flow | Playwright `carousel-*.spec.ts` + `carousel-full-generation.spec.ts` |
| Cross-browser smoke | Selenium |
| Anything affecting routing or layout | manual preview check + Playwright smoke |

Always run `npm run lint` before declaring a change done.

## TDD loop

1. Write or adjust a failing test.
2. Confirm it fails for the right reason.
3. Implement the minimum to pass.
4. Re-run the test.
5. Run related tests in the same module.
6. Refactor without changing behavior.
7. Run lint and the final test set.

Do not modify snapshots, fixtures or seeds just to hide a bug. If a snapshot is intentionally out of date, regenerate it explicitly and document why in the PR.

## Authoring guidelines

* Tests describe behavior, not implementation. Avoid asserting on internal class names or rendered shadcn primitives' internals.
* Mock Supabase via the helpers under `src/test/setup.ts`.
* Playwright specs should be resilient to small UI changes — prefer `getByRole` / `getByLabel` over CSS selectors.
* Reset state between Playwright tests; do not depend on test ordering.
* Selenium tests cover the smoke path only — do not duplicate Playwright coverage there.

## Forbidden

* Skipping tests because they are flaky — fix the flake or quarantine with a tracked issue.
* Bypassing RLS or auth in tests without a documented reason.
* Committing tests that hit the Live database or real Stripe.
* Removing tests to make a refactor compile.
