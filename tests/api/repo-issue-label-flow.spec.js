const { test, expect } = require('../../fixtures/github-api');
const { allure } = require('allure-playwright');
const apiClient = require('../../utils/api-client');
const { uniqueIssue, uniqueLabel } = require('../../fixtures/test-data');

test.describe('GitHub REST API: repo to issue to label and then to cleanup', () => {
  test.beforeEach(async () => {
    allure.epic('GitHub Integration');
    allure.feature('Repository Lifecycle');
    allure.story('Create repo, file an issue with a label, then clean up');
    allure.severity('critical');
    allure.tag('api');
    allure.tag('happy-path');
  });

  test('creates a repository, adds an issue with a label, and cleans up', async ({
    request,
    githubRepo,
  }) => {
    const { owner, repoName, repoFullName } = githubRepo;
    const labelPayload = uniqueLabel('flow');
    let issueNumber = 0;

    await test.step('Step 1: repo exists and is initialized', async () => {
      const { response, body } = await apiClient.getRepo(request, owner, repoName);
      await allure.attachment(
        'GET /repos/{owner}/{repo}',
        JSON.stringify({ status: response.status(), body }, null, 2),
        'application/json',
      );
      expect(response.status()).toBe(200);
      expect(body.name).toBe(repoName);
      expect(body.full_name).toBe(repoFullName);
      expect(body.private).toBe(false);
      expect(body.default_branch).toBeTruthy();
      expect(body.size).toBeGreaterThanOrEqual(0);
    });

    await test.step('Step 2: create an issue and read it back', async () => {
      const payload = uniqueIssue('flow');

      const create = await apiClient.createIssue(request, owner, repoName, payload);
      await allure.attachment(
        'POST /repos/{owner}/{repo}/issues',
        JSON.stringify({ status: create.response.status(), body: create.body }, null, 2),
        'application/json',
      );
      expect(create.response.status()).toBe(201);
      expect(create.body.title).toBe(payload.title);
      issueNumber = create.body.number;
      expect(typeof issueNumber).toBe('number');

      const fetched = await apiClient.getIssue(request, owner, repoName, issueNumber);
      expect(fetched.response.status()).toBe(200);
      expect(fetched.body.title).toBe(payload.title);
      expect(fetched.body.body).toBe(payload.body);
      expect(fetched.body.state).toBe('open');
    });

    await test.step('Step 3: create a label, attach it, and verify on the issue', async () => {
      const labelCreate = await apiClient.createLabel(request, owner, repoName, labelPayload);
      await allure.attachment(
        'POST /repos/{owner}/{repo}/labels',
        JSON.stringify({ status: labelCreate.response.status(), body: labelCreate.body }, null, 2),
        'application/json',
      );
      expect(labelCreate.response.status()).toBe(201);
      expect(labelCreate.body.name).toBe(labelPayload.name);
      expect(labelCreate.body.color).toBe(labelPayload.color);

      const attach = await apiClient.addLabelsToIssue(
        request, owner, repoName, issueNumber, [labelPayload.name],
      );
      expect(attach.response.status()).toBe(200);
      expect(Array.isArray(attach.body)).toBe(true);
      expect(attach.body.some((l) => l.name === labelPayload.name)).toBe(true);

      const labels = await apiClient.getIssueLabels(request, owner, repoName, issueNumber);
      expect(labels.response.status()).toBe(200);
      expect(labels.body.map((l) => l.name)).toContain(labelPayload.name);
    });

    await test.step('Step 4: explicit delete and 404 read-back', async () => {
      const del = await apiClient.deleteRepo(request, owner, repoName);
      expect(del.response.status()).toBe(204);

      const after = await apiClient.getRepo(request, owner, repoName);
      expect(after.response.status()).toBe(404);
    });
  });
});
