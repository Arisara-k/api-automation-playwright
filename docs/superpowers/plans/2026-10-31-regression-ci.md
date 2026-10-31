# GitHub Actions Regression CI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a GitHub Actions CI workflow that triggers Playwright API regression tests on Pull Requests targeting `main` and pushes/merges to `main`, saving HTML test reports as artifacts.

**Architecture:** A single-job GitHub Actions workflow triggered by `push` and `pull_request` on branch `main`. It checks out the repo, sets up Node.js with npm caching, installs dependencies with `npm ci`, runs `npm run test:regression` with injected secrets, and uploads the Playwright HTML report artifact on completion.

**Tech Stack:** GitHub Actions, Playwright Test, Node.js 20, TypeScript, Biome.

**Spec:** [docs/superpowers/specs/2026-10-31-regression-ci-design.md](file:///Users/arisara.k/api-automation-playwright/docs/superpowers/specs/2026-10-31-regression-ci-design.md)

## Global Constraints

- Workflow file must be valid YAML located at `.github/workflows/regression-ci.yml`.
- Triggers must strictly target branch `main` for both `pull_request` and `push` events.
- Test command must execute `npm run test:regression` (matches `package.json`).
- Environment variables `CI=true`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `DATABASE_URL` must be passed via GitHub Secrets.
- Playwright report upload must run unconditionally (`if: always()`).

## Review Focus

- Merges into `main` don't trigger if event is only `pull_request` -> Add both `push` and `pull_request` events on `branches: [main]`.
- Report upload step skipped when tests fail -> Use `if: always()` on the artifact upload step.
- Secrets missing causing runtime crash -> Ensure fallback handling and document GitHub Secrets setup clearly.
- Incompatible Node.js runner version -> Pin to LTS Node.js 20.x with npm cache enabled.
- Invalid YAML indentation -> Validate YAML parsing before committing.

---

### Task 1: Create GitHub Actions Workflow File

**Files:**
- Create: `.github/workflows/regression-ci.yml`

**Interfaces:**
- Consumes: `npm run test:regression` from `package.json`
- Produces: `.github/workflows/regression-ci.yml` workflow definition

- [ ] **Step 1: Create directory `.github/workflows` if not exists**
- [ ] **Step 2: Create `.github/workflows/regression-ci.yml`**
  Implement the workflow with:
  - Name: `Playwright API Regression CI`
  - `on.push.branches: [main]`
  - `on.pull_request.branches: [main]`
  - Job `regression-tests` on `ubuntu-latest`
  - Node version: 20
  - Dependency caching: `cache: 'npm'`
  - Step `npm ci`
  - Step `npm run test:regression` with `env: CI: true`, `SUPABASE_URL: ${{ secrets.SUPABASE_URL }}`, `SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}`, `DATABASE_URL: ${{ secrets.DATABASE_URL }}`
  - Step `actions/upload-artifact@v4` pointing to `playwright-report/` with `if: always()` and `retention-days: 30`
- [ ] **Step 3: Validate YAML syntax using Node script**
  Run: `node -e "const fs = require('fs'); const yaml = fs.readFileSync('.github/workflows/regression-ci.yml', 'utf8'); console.log('File length:', yaml.length);"`
  Expected: Valid read without unexpected error
- [ ] **Step 4: Commit workflow file**

  ```bash
  git add .github/workflows/regression-ci.yml
  git commit -m "ci: add github actions workflow for regression tests on main"
  ```

---

### Task 2: Update Documentation and Detailed Explanation

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: `.github/workflows/regression-ci.yml`
- Produces: Updated `README.md` with CI/CD section and GitHub Secrets setup instructions

- [ ] **Step 1: Add CI/CD section to `README.md`**
  Document:
  - Workflow triggers (PR to main & Push to main)
  - Required GitHub Secrets (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `DATABASE_URL`)
  - How to view and download Playwright HTML report artifacts
- [ ] **Step 2: Commit README updates**

  ```bash
  git add README.md
  git commit -m "docs: add CI workflow explanation and GitHub Secrets guide"
  ```
