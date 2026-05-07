# GitHub API + GUI E2E Test Suite

End-to-end tests for the GitHub REST API and the github.com web UI, written with
[Playwright](https://playwright.dev/) (JavaScript) and reported with
[Allure](https://allurereport.org/). Runs on every push and pull request via
GitHub Actions, and the latest report is published to GitHub Pages with full
trend history.

> **Live Allure report:** `https://<your-github-username>.github.io/<this-repo>/`
> _(replace once GitHub Pages is enabled — see [Make it live](#make-it-live))_

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       Playwright test runner                    │
│                                                                 │
│  ┌─────────────────────────┐     ┌────────────────────────────┐ │
│  │  api project            │     │  gui project (Chromium)    │ │
│  │  baseURL: api.github... │     │  baseURL: github.com       │ │
│  │  trace: off (no token)  │     │  trace: on-first-retry     │ │
│  └────────────┬────────────┘     └────────────┬───────────────┘ │
│               │                               │                 │
│               └───── shared fixture ──────────┘                 │
│                 fixtures/github-api.js                          │
│                 (creates repo, yields ctx, deletes in finally)  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
       api.github.com               github.com
       (REST API: repos,            (Browser: validates
       issues, labels)               state created via API)

              │
              ▼
   GitHub Actions workflow ──► Allure HTML report ──► gh-pages branch
                                                      └► GitHub Pages
```

Two Playwright projects share one fixture. The fixture creates a fresh,
auto-initialised repo per test, yields its identifiers, and **always** deletes
it in a `finally` block — even when the test under it fails.

---

## What's tested

### API (`tests/api/`)

| Spec | Coverage |
| --- | --- |
| `repo-issue-label-flow.spec.js` | Happy path: create repo → create issue → create label → attach → delete repo. Every write is followed by a read-back assertion. |
| `api-edge-cases.spec.js` | Duplicate repo name (422), issue on non-existent repo (404), double-delete (404), empty label name (422), unauthenticated POST (401). |

### GUI (`tests/gui/`)

| Spec | Coverage |
| --- | --- |
| `github-ui-validation.spec.js` | After API setup: repo header renders, issue title appears in the issues tab, label badge is visible, deleted repo URL serves the GitHub 404 page. |

Selectors only use `getByRole` / `getByText` / `getByLabel`. No CSS class
selectors, no XPath, no `waitForTimeout`.

---

## Prerequisites

- **Node.js 20.x** — `node --version` should print `v20.…`
- **Java 17** — required only for running the Allure CLI locally to view reports
- **A GitHub Personal Access Token** with the right scopes (see below)

---

## Create the Personal Access Token (PAT)

The default `GITHUB_TOKEN` in GitHub Actions cannot delete repositories — every
test would leak a repo. You need a classic PAT.

1. Go to **<https://github.com/settings/tokens>** → **Generate new token (classic)**.
2. **Note** field: `masdrtest E2E suite` (anything memorable).
3. **Expiration**: 90 days is a good default.
4. **Select scopes** — tick exactly these:
   - `repo` (full control — needed to create repos, issues, labels)
   - `delete_repo` (lets cleanup actually clean up)
5. Click **Generate token** and copy the value (`ghp_…`). You will not see it again.

> **Why a classic PAT and not a fine-grained one?** A fine-grained token is fine
> functionally, but the `delete_repo` scope on classic PATs is the simplest path
> with the fewest org-policy edge cases. If your org disallows classic PATs,
> create a fine-grained token with **Administration: read & write** on the
> account that will own the test repos.

---

## Local setup

```bash
git clone <this-repo>
cd masdrtest

cp .env.example .env
# edit .env — fill in GH_TOKEN (the PAT) and GH_OWNER (your username)

npm ci
npx playwright install --with-deps chromium
```

> Java is only needed for the Allure CLI. Install with Homebrew (`brew install
> openjdk@17`), the
> [Adoptium installers](https://adoptium.net/), or your distro's package
> manager. If you only want the JSON report and the Playwright HTML report you
> can skip Java entirely — the `allure-results/` folder is generated regardless
> and the workflow renders the report for you.

---

## Run the tests

```bash
npm test                # all projects, both api and gui
npm run test:api        # api project only
npm run test:gui        # gui project only
npm run test:headed     # gui with a visible browser

DEBUG=1 npm test        # extra debug logging from utils/logger.js
```

---

## View the Allure report locally

```bash
# After a test run produces ./allure-results
npm run report:generate     # builds ./allure-report
npm run report:open         # opens the HTML report in your browser
# or:
npm run report:serve        # one-shot serve from raw results
```

The first time you run `report:open` Allure may launch a small Java web server.

---

## CI/CD

`.github/workflows/e2e-tests.yml`:

1. Triggers on every push and PR.
2. Skips on **fork** PRs (secrets are unavailable to forked workflows).
3. Runs `npm ci`, installs Chromium, and runs the suite.
4. **Pulls the previous Allure history** from the `gh-pages` branch into
   `allure-results/history/` before generating, which is what gives the report
   its trend graph.
5. Uploads the rendered `allure-report` as a workflow artifact (30-day
   retention) so you can download it from any run.
6. On `push` to `main`, deploys the report to the `gh-pages` branch via
   `peaceiris/actions-gh-pages`.
7. Fails the workflow if any tests failed (the test step uses
   `continue-on-error: true` so reporting still runs, then the final step
   re-asserts the failure).

---

## Make it live

1. **Add the secrets** to your repo (Settings → Secrets and variables → Actions
   → New repository secret):
   - `GH_PAT` — the PAT you generated above.
   - `GH_OWNER` — your GitHub username (or org name) that will own the test
     repos.
2. **Push to `main`**. The workflow runs.
3. After the first run that includes the `Deploy report to GitHub Pages` step,
   GitHub creates a `gh-pages` branch.
4. Go to **Settings → Pages**.
   - Source: **Deploy from a branch**.
   - Branch: **`gh-pages`** / **`/ (root)`** → Save.
5. Wait ~30 seconds for the first publish. The URL will be:

   ```
   https://<owner>.github.io/<repo-name>/
   ```

Subsequent pushes update the report in place; trend history is preserved.

---

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| **204 expected, got 403 on DELETE** | The token lacks `delete_repo` scope. Re-issue the PAT and tick that box. |
| **All tests fail with 401** | `GH_TOKEN` is unset or expired. Check `.env` locally or the `GH_PAT` secret in CI. |
| **Workflow runs but skips all tests** | This is a fork PR. Secrets are not exposed to forks; clone and run locally instead. |
| **`gh-pages` deploy fails: 403** | Settings → Actions → General → Workflow permissions → set to **Read and write**. The workflow already declares `contents: write`. |
| **GitHub Pages shows 404** | First publish hasn't completed, or Pages source isn't set to the `gh-pages` branch. See [Make it live](#make-it-live). |
| **`allure: command not found` locally** | Allure CLI needs Java 17. Install OpenJDK 17, then `npm i -g allure-commandline`. CI installs it for you. |
| **`Repo creation failed: 422 name already exists`** | A previous run leaked a repo. Delete it manually (`gh repo delete <owner>/<name> --yes`) — the unique-name generator avoids collisions on retries within the same run. |
| **`This repository is empty` in UI tests** | `auto_init` was missing. The fixture sets `auto_init: true`; if you write a new test that creates repos directly, do the same. |
| **Trend graph never appears in Allure** | The `Fetch previous Allure history` step couldn't find a `gh-pages` branch. It will appear from the second successful deploy onwards. |
| **Rate limited (403 with `X-RateLimit-Remaining: 0`)** | The api project runs with `workers: 1` in CI to avoid this. If you keep hitting it locally, lower workers or wait an hour. |

---

## Architecture decisions

- **Why the `request` fixture and not Axios/node-fetch?** Playwright's
  `APIRequestContext` shares the test runner's logging, retries, and tracing
  primitives, and adding a third-party HTTP client doubles the code paths for
  no benefit. A single `extraHTTPHeaders` block in `playwright.config.js`
  authenticates every API call in the api project; the fixture builds an
  equivalent context via `request.newContext()` so it can also serve the
  gui project.

- **Why `auto_init: true`?** A freshly created GitHub repo with no commits
  shows the empty-repo onboarding page, not the regular repo header. UI
  selectors like the issues tab don't exist yet. Initialising with a README
  on creation gives us the standard repo layout immediately.

- **Why `trace: off` for the api project?** Playwright traces capture request
  headers including `Authorization: Bearer <token>`. Disabling traces for the
  api project keeps PATs out of artefacts shared with reviewers.

- **Why `peaceiris/actions-gh-pages` instead of the official Pages action?**
  The official action requires a separate deploy job and Pages environment.
  `peaceiris/actions-gh-pages` is a single step, supports `keep_files` for
  history merging strategies, and works with the standard `GITHUB_TOKEN`.

- **Why pull Allure history before generating?** Without
  `allure-results/history/` populated from the previous run, every report shows
  "first run" — no trend graph, no flaky-test history. The workflow checks out
  `gh-pages` into a side directory and copies the history folder forward.

- **Why fail the workflow if tests failed, given `continue-on-error: true`?**
  We want the report to publish even on failure (that's where it's most
  useful), but we still need CI status to reflect reality so PRs can be
  blocked on red builds.

---

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for development workflow.
