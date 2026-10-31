# api-automation-playwright

End-to-End API test automation framework using Playwright & TypeScript, featuring direct PostgreSQL/Supabase database verification and CI/CD integration.

---

## 🚀 CI/CD Pipeline (GitHub Actions)

This repository includes a continuous integration (CI) pipeline configured at [`.github/workflows/regression-ci.yml`](.github/workflows/regression-ci.yml).

### 1. Trigger Conditions

The workflow runs automatically under two conditions:
- **Pull Request Targeting `main` (`pull_request`):** Verifies regression tests before code is merged into `main`.
- **Merge or Push to `main` (`push`):** Runs tests whenever a new branch is merged into `main` (or pushed to `main`) to ensure main branch health.

### 2. Workflow Steps

1. **Checkout Code:** Uses `actions/checkout@v4` to pull the latest repository changes.
2. **Setup Node.js:** Uses `actions/setup-node@v4` pinned to Node.js 20 with `cache: 'npm'` for fast dependency resolution.
3. **Install Dependencies:** Executes `npm ci` for clean, deterministic package installation from `package-lock.json`.
4. **Run Regression Tests:** Executes `npm run test:regression` with injected secrets from GitHub Secrets (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `DATABASE_URL`).
5. **Upload Test Reports:** Saves the `playwright-report/` directory as an artifact via `actions/upload-artifact@v4` (always runs even if tests fail, retained for 30 days).

### 3. Required GitHub Secrets Setup

To enable the CI pipeline to connect to the test database and API, add the following secrets in GitHub:

1. Navigate to your repository on GitHub: **Settings > Secrets and variables > Actions**.
2. Click **New repository secret**.
3. Add the following secrets:
   - `SUPABASE_URL`: Your Supabase API base URL (e.g. `https://<project-ref>.supabase.co`).
   - `SUPABASE_ANON_KEY`: Supabase anonymous API key.
   - `DATABASE_URL`: PostgreSQL connection string (e.g. `postgresql://postgres:<password>@<host>:5432/postgres`).

### 4. Viewing Playwright Reports on GitHub Actions

1. Go to the **Actions** tab on your GitHub repository.
2. Click on the latest workflow run.
3. Under the **Artifacts** section at the bottom, download `playwright-report.zip`.
4. Unzip and open `index.html` in any web browser to view detailed test results, traces, and execution timings.

---

## 🛠️ Local Test Execution

```bash
# Run all tests
npm test

# Run regression tests only
npm run test:regression

# Run validation tests only
npm run test:validation

# Run security tests only
npm run test:security

# Run E2E lifecycle tests only
npm run test:e2e

# Code formatting & linting (Biome)
npm run check
npm run lint

# TypeScript Type Check
npm run type-check
```
