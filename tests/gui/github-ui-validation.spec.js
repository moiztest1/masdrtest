const { test, expect } = require('../../fixtures/github-api');
const { allure } = require('allure-playwright');
const apiClient = require('../../utils/api-client');
const { uniqueIssue, uniqueLabel } = require('../../fixtures/test-data');

test.describe('GitHub UI: validates state created via the REST API', () => {
  test.beforeEach(async () => {
    allure.epic('GitHub Integration');
    allure.feature('UI parity with API state');
    allure.severity('critical');
    allure.tag('gui');
  });

  test('repo, issue, and label are visible in the browser', async ({
    ghRequest,
    githubRepo,
    page,
  }) => {
    allure.story('Repo header, issue title, and label badge render');

    const { owner, repoName, repoFullName } = githubRepo;
    const issuePayload = uniqueIssue('ui');
    const labelPayload = uniqueLabel('ui');
    let issueNumber = 0;

    await test.step('seed an issue and a label via the API', async () => {
      const issue = await apiClient.createIssue(ghRequest, owner, repoName, issuePayload);
      expect(issue.response.status()).toBe(201);
      issueNumber = issue.body.number;

      const label = await apiClient.createLabel(ghRequest, owner, repoName, labelPayload);
      expect(label.response.status()).toBe(201);

      const attach = await apiClient.addLabelsToIssue(
        ghRequest, owner, repoName, issueNumber, [labelPayload.name],
      );
      expect(attach.response.status()).toBe(200);
    });

    await test.step('repo page renders the repository header', async () => {
      await page.goto(`/${repoFullName}`);

      await expect(page.getByRole('link', { name: repoName, exact: true }).first())
        .toBeVisible({ timeout: 15_000 });

      await expect(page.getByRole('link', { name: /issues/i }).first())
        .toBeVisible({ timeout: 15_000 });
    });

    await test.step('issue page shows the title and the attached label', async () => {
      // Direct issue URL avoids the issues-list virtualization and ambiguous link names.
      await page.goto(`/${repoFullName}/issues/${issueNumber}`);

      // GitHub renders the title and label in multiple places (sidebar badge, hidden picker rows).
      // filter({ visible: true }) picks the on-screen occurrence and ignores the hidden ones.
      await expect(page.getByText(issuePayload.title).filter({ visible: true }).first())
        .toBeVisible({ timeout: 15_000 });

      await expect(page.getByText(labelPayload.name).filter({ visible: true }).first())
        .toBeVisible({ timeout: 15_000 });
    });
  });

  test('deleted repository surfaces the GitHub 404 page', async ({
    ghRequest,
    githubRepo,
    page,
  }) => {
    allure.story('404 after delete');
    allure.severity('normal');

    const { owner, repoName, repoFullName } = githubRepo;

    await test.step('delete the repo through the API', async () => {
      const del = await apiClient.deleteRepo(ghRequest, owner, repoName);
      expect(del.response.status()).toBe(204);
    });

    await test.step('browser sees a 404 page at the repo URL', async () => {
      const response = await page.goto(`/${repoFullName}`);
      expect(response?.status()).toBe(404);
      await expect(page).toHaveTitle(/page not found/i, { timeout: 10_000 });
    });
  });
});
