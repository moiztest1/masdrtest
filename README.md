# masdrtest

End-to-end tests for the GitHub REST API and the github.com web UI. Built with Playwright (JavaScript) and reported with Allure. Runs on every push and publishes the report to GitHub Pages.

**Live report:** https://moiztest1.github.io/masdrtest/

## What it does

Each run:

1. Creates a real throwaway repo on GitHub through the REST API.
2. Adds an issue, creates a label, attaches the label.
3. Reads everything back through the API to confirm it stuck.
4. Opens the same repo in Chromium and checks the UI shows what the API just wrote.
5. Deletes the repo. Even if a test fails partway through.

Plus a handful of edge-case API tests (duplicate names, missing repos, no auth, etc.).

## What you need

- Node.js 20
- A GitHub Personal Access Token with `repo` and `delete_repo` scopes
- Java 17 — only if you want to view the Allure report on your own machine

## Get a token

1. Open https://github.com/settings/tokens.
2. Click **Generate new token (classic)**.
3. Tick `repo` and `delete_repo`. Nothing else.
4. Generate, copy the value (starts with `ghp_`). You won't see it again.

## Install

```
npm install
npx playwright install chromium
cp .env.example .env
```

Open `.env` and fill it in:

```
GH_TOKEN=ghp_paste_your_token_here
GH_OWNER=your_github_username
```

## Run the tests

```
npm test            # everything
npm run test:api    # API tests only
npm run test:gui    # browser tests only
npm run test:headed # browser tests, watch them happen
```

## See the report locally

After a test run, generate and open the Allure report:

```
npm run report:generate
npm run report:open
```

This needs Java 17 installed. If you don't have it, just look at the live report URL above — CI builds the same thing.

## Set up CI on a fresh repo

If you forked this or cloned it into a new repo, do these once:

1. Push your code to GitHub.
2. **Settings → Secrets and variables → Actions** — add two secrets:
   - `GH_PAT` — your token
   - `GH_OWNER` — your GitHub username
3. **Settings → Actions → General** — scroll to **Workflow permissions** and switch to **Read and write permissions**. Save.
4. Push any commit. The workflow runs and creates a `gh-pages` branch.
5. **Settings → Pages** — set source to **Deploy from a branch**, branch `gh-pages`, folder `/ (root)`. Save.
6. Wait ~30 seconds. The report is live at `https://<your-username>.github.io/<repo-name>/`.

Trend history shows up from the second run onward.

## How CI works

The workflow in `.github/workflows/e2e-tests.yml` runs on every push and pull request. On `main` it also publishes the Allure report to GitHub Pages, carrying forward the history from previous runs so the trend graph keeps growing.

PRs from forks are skipped automatically — secrets aren't shared with forks, so the tests would only fail.

## Project layout

```
tests/api/         REST API tests
tests/gui/         Browser tests
fixtures/          Shared setup (creates and cleans up test repos)
utils/             Small helpers
.github/workflows/ CI config
playwright.config.js
.env.example
```

## When something breaks

| Problem | Fix |
|---|---|
| Tests fail with `401` | Token missing or expired. Update `.env` locally or the `GH_PAT` secret in CI. |
| `DELETE` returns `403` | Token doesn't have `delete_repo` scope. Make a new one. |
| `gh-pages` deploy fails | Workflow permissions are read-only. Flip them to "Read and write" in Settings. |
| Pages URL shows 404 | First publish hasn't finished. Give it a minute and refresh. |
| `allure: command not found` | Allure needs Java 17. Install OpenJDK 17 and `npm i -g allure-commandline`. |
| `Repo creation failed: 422 name already exists` | Rare. A previous run leaked one — delete it manually with `gh repo delete <owner>/<name> --yes`. |
| Hitting GitHub rate limits locally | The CI config caps API tests at 1 worker. Locally, lower workers or wait an hour. |
