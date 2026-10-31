# GitHub Actions CI for Playwright API Regression Testing

## Intent & Why

To prevent regression bugs from entering the main codebase, we need an automated CI workflow that runs Playwright regression tests whenever:
1. A Pull Request targeting `main` is created or updated (pre-merge check).
2. A branch is merged into `main` (post-merge verification).

## Triggers

- `pull_request` on `branches: [main]`
- `push` on `branches: [main]`

## Approaches Considered

- **Approach 1 (Selected):** Single-job pipeline executing clean dependencies install, running regression test suite (`npm run test:regression`), and archiving Playwright HTML test report. Fast, cost-effective, and straightforward.
- **Approach 2:** Multi-job pipeline splitting lint/type-check and tests. Rejected as user requested skipping type-check on CI and keeping CI lean.

## Workflow Structure

- File: `.github/workflows/regression-ci.yml`
- Runner: `ubuntu-latest`
- Steps:
  1. Checkout repository (`actions/checkout@v4`)
  2. Setup Node.js 20 with npm caching (`actions/setup-node@v4`)
  3. Clean install dependencies (`npm ci`)
  4. Run regression tests with injected GitHub Secrets (`npm run test:regression`)
  5. Upload Playwright report artifact (`actions/upload-artifact@v4`) with `if: always()`

## Required Secrets in GitHub

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `DATABASE_URL`
