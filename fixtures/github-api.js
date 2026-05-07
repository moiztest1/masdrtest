const { test: base, expect, request: requestApi } = require('@playwright/test');
const apiClient = require('../utils/api-client');
const { uniqueRepoName } = require('./test-data');
const logger = require('../utils/logger');

function requireOwner() {
  const owner = process.env.GH_OWNER;
  if (!owner) {
    throw new Error('GH_OWNER is not set. See .env.example.');
  }
  return owner;
}

async function buildGhRequest() {
  const token = process.env.GH_TOKEN;
  if (!token) {
    throw new Error('GH_TOKEN is not set. See .env.example.');
  }
  return requestApi.newContext({
    baseURL: 'https://api.github.com',
    extraHTTPHeaders: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'masdrtest-playwright-e2e',
    },
  });
}

const test = base.extend({
  // Authenticated request context — the gui project has no extraHTTPHeaders, so tests reach for this.
  ghRequest: async ({}, use) => {
    const ctx = await buildGhRequest();
    try {
      await use(ctx);
    } finally {
      await ctx.dispose();
    }
  },

  githubRepo: async ({ ghRequest }, use, testInfo) => {
    const owner = requireOwner();
    const repoName = uniqueRepoName();
    const repoFullName = `${owner}/${repoName}`;
    const htmlUrl = `https://github.com/${repoFullName}`;

    let created = false;
    try {
      const { response, body } = await apiClient.createRepo(ghRequest, owner, {
        name: repoName,
        description: `Created by masdrtest E2E run "${testInfo.title}"`,
        private: false,
        auto_init: true,
      });

      if (response.status() !== 201) {
        throw new Error(
          `Failed to create test repo ${repoFullName}: ${response.status()} ${response.statusText()} — ${JSON.stringify(body)}`,
        );
      }
      created = true;
      logger.info(`Created repo ${repoFullName}`);

      await use({ owner, repoName, repoFullName, htmlUrl });
    } finally {
      if (created) {
        try {
          const { response } = await apiClient.deleteRepo(ghRequest, owner, repoName);
          const status = response.status();
          if (status === 204) {
            logger.info(`Deleted repo ${repoFullName}`);
          } else if (status === 404) {
            // Test already removed it as part of its own assertions.
            logger.info(`Repo ${repoFullName} already gone at teardown (404)`);
          } else {
            logger.warn(`Unexpected status when deleting ${repoFullName}: ${status}`);
          }
        } catch (err) {
          logger.warn(`Teardown delete failed for ${repoFullName}: ${err && err.message}`);
        }
      }
    }
  },
});

module.exports = { test, expect };
