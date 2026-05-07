const { test, expect } = require('../../fixtures/github-api');
const { test: baseTest, request: requestApi } = require('@playwright/test');
const { allure } = require('allure-playwright');
const apiClient = require('../../utils/api-client');
const { uniqueRepoName, uniqueIssue } = require('../../fixtures/test-data');

test.describe('GitHub REST API edge cases', () => {
  test.beforeEach(async () => {
    allure.epic('GitHub Integration');
    allure.feature('API Edge Cases');
    allure.severity('normal');
    allure.tag('api');
    allure.tag('negative');
  });

  test('creating a repo with a duplicate name returns 422', async ({ request, githubRepo }) => {
    allure.story('Duplicate repository name is rejected');

    const dup = await apiClient.createRepo(request, githubRepo.owner, {
      name: githubRepo.repoName,
      auto_init: true,
    });
    await allure.attachment(
      'duplicate-create response',
      JSON.stringify({ status: dup.response.status(), body: dup.body }, null, 2),
      'application/json',
    );
    expect(dup.response.status()).toBe(422);
  });

  test('creating an issue on a non-existent repo returns 404', async ({ request }) => {
    allure.story('Non-existent repository');

    const owner = process.env.GH_OWNER || 'masdrtest-bogus-owner';
    const ghost = uniqueRepoName('ghost');
    const res = await apiClient.createIssue(request, owner, ghost, uniqueIssue('ghost'));
    expect(res.response.status()).toBe(404);
  });

  test('deleting an already-deleted repo returns 404', async ({ request }) => {
    allure.story('Idempotent delete');

    const owner = process.env.GH_OWNER;
    expect(owner).toBeTruthy();
    const name = uniqueRepoName('twice-del');

    const create = await apiClient.createRepo(request, owner, { name, auto_init: true });
    expect(create.response.status()).toBe(201);

    const first = await apiClient.deleteRepo(request, owner, name);
    expect(first.response.status()).toBe(204);

    const second = await apiClient.deleteRepo(request, owner, name);
    expect(second.response.status()).toBe(404);
  });

  test('creating a label with an empty name returns 422', async ({ request, githubRepo }) => {
    allure.story('Invalid label name');

    const res = await apiClient.createLabel(request, githubRepo.owner, githubRepo.repoName, {
      name: '',
      color: 'ededed',
    });
    await allure.attachment(
      'empty-label response',
      JSON.stringify({ status: res.response.status(), body: res.body }, null, 2),
      'application/json',
    );
    expect(res.response.status()).toBe(422);
  });

  // baseTest avoids spinning up the githubRepo fixture for an unauth-only case.
  baseTest.describe('without auth headers', () => {
    baseTest('unauthenticated /user/repos POST returns 401', async () => {
      allure.story('No credentials');

      const ctx = await requestApi.newContext({
        baseURL: 'https://api.github.com',
        extraHTTPHeaders: {
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'masdrtest-playwright-e2e',
        },
      });
      try {
        const res = await ctx.post('/user/repos', {
          data: { name: uniqueRepoName('noauth'), auto_init: true },
        });
        expect(res.status()).toBe(401);
      } finally {
        await ctx.dispose();
      }
    });
  });

  // Needs a second PAT without `repo` scope; out of scope for this suite.
  test.skip(
    'missing scope on add-label is covered by a scoped token (out of scope for this suite)',
    async () => {
      allure.story('Insufficient PAT scope');
    },
  );
});
