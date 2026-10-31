# API Automation Framework with Playwright & TypeScript

[![CI - Playwright API Regression](https://github.com/Arisara-k/api-automation-playwright/actions/workflows/regression-ci.yml/badge.svg)](https://github.com/Arisara-k/api-automation-playwright/actions/workflows/regression-ci.yml)
[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org/)
[![Playwright](https://img.shields.io/badge/Playwright-v1.64+-blue.svg)](https://playwright.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-v7+-blue.svg)](https://www.typescriptlang.org/)
[![Biome](https://img.shields.io/badge/Linter-Biome-orange.svg)](https://biomejs.dev/)

An enterprise-grade, end-to-end API test automation framework built with **Playwright**, **TypeScript**, and **PostgreSQL (Supabase)**. Features **Two-Layer Verification** (Zod runtime contract schema validation + direct database state assertion), Service/Model architecture, data-driven test fixtures, and automated CI/CD pipelines via GitHub Actions.

---

## 📑 Table of Contents

- [Key Architecture & Features](#-key-architecture--features)
- [Project Directory Structure](#-project-directory-structure)
- [Prerequisites & Environment Setup](#-prerequisites--environment-setup)
- [Installation](#-installation)
- [Test Execution Commands](#-test-execution-commands)
- [Test Tagging Strategy](#-test-tagging-strategy)
- [Reporting & Artifacts](#-reporting--artifacts)
- [Code Quality & Linting](#-code-quality--linting)
- [CI/CD Pipeline (GitHub Actions)](#-cicd-pipeline-github-actions)

---

## 🌟 Key Architecture & Features

1. **Lightweight & Fast API Testing**:
   - Uses Playwright's native `APIRequestContext` for high-throughput, concurrent HTTP execution without overhead from browser engines.
2. **Two-Layer Verification Pattern**:
   - **Layer 1 (Contract & Schema):** Validates HTTP status, headers, and payload structures at runtime using **Zod** schemas.
   - **Layer 2 (Persistent Database State):** Direct database verification using **node-postgres (`pg`)** connection pooling to assert that DB rows match API operations (e.g. stock decrements, order creation).
3. **Service & Model Object Design**:
   - **Services (`supports/services/`):** Encapsulates API requests, endpoints, and authentication headers.
   - **Models (`supports/models/`):** Encapsulates database queries, row mapping, and DB state assertions.
4. **Data-Driven Testing (DDT)**:
   - Externalized test scenarios, payloads, and expected responses in JSON fixtures (`resources/dataTest/` and `resources/expectedResults/`).
5. **Financial Accuracy**:
   - Uses **`decimal.js`** to prevent floating-point calculation errors during price and quantity assertions.
6. **Strict Code Quality**:
   - Configured with **Biome** for fast formatting and linting, and strict **TypeScript** compiler settings.

---

## 📁 Project Directory Structure

```plaintext
api-automation-playwright/
├── .github/
│   └── workflows/
│       └── regression-ci.yml       # GitHub Actions CI workflow configuration
├── configs/
│   ├── .env                       # Local secrets & credentials (git-ignored)
│   └── .env.defaults              # Default / template environment variables
├── plugins/
│   ├── globalSetup.ts             # Global test setup (loads environment variables)
│   ├── globalTeardown.ts          # Global teardown (closes DB connection pools)
│   └── postGreSQLConnection.ts    # PostgreSQL connection pool manager & query helper
├── resources/
│   ├── dataTest/                  # Input test data fixtures (JSON)
│   └── expectedResults/           # Expected API response fixtures (JSON)
├── supports/
│   ├── models/                    # DB table models & state assertion methods
│   ├── services/                  # API client services & Zod schemas
│   └── utils/                     # Shared utilities & response comparison helpers
├── testCases/
│   ├── api/                       # API spec tests (Business, Security, Validation)
│   └── E2E/                       # Multi-step lifecycle integration tests
├── biome.json                     # Biome linter and formatter settings
├── globalVariables.ts             # Centralized environment variable exports
├── package.json                   # NPM dependencies and runner scripts
├── playwright.config.ts           # Playwright Test configuration
└── tsconfig.json                  # TypeScript compiler options & path aliases
```

---

## ⚙️ Prerequisites & Environment Setup

- **Node.js**: `v20.x` or higher (LTS recommended)
- **npm**: `v10.x` or higher
- **PostgreSQL / Supabase**: Accessible instance with target database tables (`products`, `orders`)

### Configuration (`configs/.env`)

Create a `configs/.env` file with your credentials (refer to `configs/.env.defaults` for reference):

```bash
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_ANON_KEY=<your-supabase-anon-key>
DATABASE_URL=postgresql://postgres:<your-password>@<your-db-host>:5432/postgres
```

---

## 📦 Installation

Clone the repository and install all dependencies:

```bash
git clone https://github.com/Arisara-k/api-automation-playwright.git
cd api-automation-playwright
npm ci
```

---

## 🚀 Test Execution Commands

Run tests using the predefined npm scripts:

| Script                    | Command                              | Purpose                                        |
| ------------------------- | ------------------------------------ | ---------------------------------------------- |
| `npm test`                | `npx playwright test`                | Executes all test suites across the project    |
| `npm run test:regression` | `npx playwright test -g @regression` | Runs the full regression test suite            |
| `npm run test:validation` | `npx playwright test -g @functional` | Runs functional and domain validation tests    |
| `npm run test:security`   | `npx playwright test -g @security`   | Runs authentication and authorization tests    |
| `npm run test:e2e`        | `npx playwright test -g @e2e`        | Runs multi-step end-to-end lifecycle workflows |

---

## 🏷️ Test Tagging Strategy

Tests are tagged with annotations for flexible test suite filtering:

- **Suite Tags**:
  - `@regression`: Core suite for pre-merge and post-merge verification
  - `@e2e`: Complete workflows (e.g. create product -> order -> deplete stock -> check DB)
  - `@functional`: Validation and business rule logic
  - `@security`: Authentication failure, invalid tokens, and missing API keys
- **Severity Tags**:
  - `@critical`: Primary business paths (HTTP 200/201 success, stock decrements)
  - `@high`: Boundary cases (e.g. stock=0, negative values, insufficient inventory)
  - `@medium`: Header checks and authentication boundaries

---

## 📊 Reporting & Artifacts

Playwright generates detailed reports after every test execution:

```bash
# Open interactive HTML test report in browser
npx playwright show-report
```

Output directories:
- `playwright-report/`: Interactive HTML report with execution details, timestamps, and error stacks.
- `test-results/test-results.json`: Machine-readable JSON summary for CI test parsing.

---

## 🧹 Code Quality & Linting

The project uses **Biome** for lightning-fast linting and code formatting, alongside the TypeScript compiler:

```bash
# Check code style and apply automated fixes
npm run check

# Run linter only
npm run lint

# Run code formatter only
npm run format

# Run TypeScript static type checking
npm run type-check
```

---

## 🔄 CI/CD Pipeline (GitHub Actions)

Continuous Integration is automated via [`.github/workflows/regression-ci.yml`](.github/workflows/regression-ci.yml).

### Workflow Triggers

- **Pull Request Targeting `main`:** Runs regression tests as a quality gate before code is merged.
- **Merge or Push to `main`:** Automatically runs tests when changes are merged into `main` to guarantee branch health.

### GitHub Secrets Setup

Ensure the following repository secrets are configured in GitHub (**Settings > Secrets and variables > Actions**):
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `DATABASE_URL`

### Accessing CI Reports

1. Go to the **Actions** tab on GitHub.
2. Select the latest workflow run.
3. Under the **Artifacts** section, download `playwright-report.zip` to review detailed execution logs and traces.
