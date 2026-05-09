# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: api/repo-issue-label-flow.spec.js >> GitHub REST API: repo to issue to label and then to cleanup >> creates a repository, adds an issue with a label, and cleans up
- Location: tests/api/repo-issue-label-flow.spec.js:16:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 404
Received: 200
```

# Test source

```ts
  1  | const { test, expect } = require('../../fixtures/github-api');
  2  | const { allure } = require('allure-playwright');
  3  | const apiClient = require('../../utils/api-client');
  4  | const { uniqueIssue, uniqueLabel } = require('../../fixtures/test-data');
  5  | 
  6  | test.describe('GitHub REST API: repo to issue to label and then to cleanup', () => {
  7  |   test.beforeEach(async () => {
  8  |     allure.epic('GitHub Integration');
  9  |     allure.feature('Repository Lifecycle');
  10 |     allure.story('Create repo, file an issue with a label, then clean up');
  11 |     allure.severity('critical');
  12 |     allure.tag('api');
  13 |     allure.tag('happy-path');
  14 |   });
  15 | 
  16 |   test('creates a repository, adds an issue with a label, and cleans up', async ({
  17 |     request,
  18 |     githubRepo,
  19 |   }) => {
  20 |     const { owner, repoName, repoFullName } = githubRepo;
  21 |     const labelPayload = uniqueLabel('flow');
  22 |     let issueNumber = 0;
  23 | 
  24 |     await test.step('Step 1: repo exists and is initialized', async () => {
  25 |       const { response, body } = await apiClient.getRepo(request, owner, repoName);
  26 |       await allure.attachment(
  27 |         'GET /repos/{owner}/{repo}',
  28 |         JSON.stringify({ status: response.status(), body }, null, 2),
  29 |         'application/json',
  30 |       );
  31 |       expect(response.status()).toBe(200);
  32 |       expect(body.name).toBe(repoName);
  33 |       expect(body.full_name).toBe(repoFullName);
  34 |       expect(body.private).toBe(false);
  35 |       expect(body.default_branch).toBeTruthy();
  36 |       expect(body.size).toBeGreaterThanOrEqual(0);
  37 |     });
  38 | 
  39 |     await test.step('Step 2: create an issue and read it back', async () => {
  40 |       const payload = uniqueIssue('flow');
  41 | 
  42 |       const create = await apiClient.createIssue(request, owner, repoName, payload);
  43 |       await allure.attachment(
  44 |         'POST /repos/{owner}/{repo}/issues',
  45 |         JSON.stringify({ status: create.response.status(), body: create.body }, null, 2),
  46 |         'application/json',
  47 |       );
  48 |       expect(create.response.status()).toBe(201);
  49 |       expect(create.body.title).toBe(payload.title);
  50 |       issueNumber = create.body.number;
  51 |       expect(typeof issueNumber).toBe('number');
  52 | 
  53 |       const fetched = await apiClient.getIssue(request, owner, repoName, issueNumber);
  54 |       expect(fetched.response.status()).toBe(200);
  55 |       expect(fetched.body.title).toBe(payload.title);
  56 |       expect(fetched.body.body).toBe(payload.body);
  57 |       expect(fetched.body.state).toBe('open');
  58 |     });
  59 | 
  60 |     await test.step('Step 3: create a label, attach it, and verify on the issue', async () => {
  61 |       const labelCreate = await apiClient.createLabel(request, owner, repoName, labelPayload);
  62 |       await allure.attachment(
  63 |         'POST /repos/{owner}/{repo}/labels',
  64 |         JSON.stringify({ status: labelCreate.response.status(), body: labelCreate.body }, null, 2),
  65 |         'application/json',
  66 |       );
  67 |       expect(labelCreate.response.status()).toBe(201);
  68 |       expect(labelCreate.body.name).toBe(labelPayload.name);
  69 |       expect(labelCreate.body.color).toBe(labelPayload.color);
  70 | 
  71 |       const attach = await apiClient.addLabelsToIssue(
  72 |         request, owner, repoName, issueNumber, [labelPayload.name],
  73 |       );
  74 |       expect(attach.response.status()).toBe(200);
  75 |       expect(Array.isArray(attach.body)).toBe(true);
  76 |       expect(attach.body.some((l) => l.name === labelPayload.name)).toBe(true);
  77 | 
  78 |       const labels = await apiClient.getIssueLabels(request, owner, repoName, issueNumber);
  79 |       expect(labels.response.status()).toBe(200);
  80 |       expect(labels.body.map((l) => l.name)).toContain(labelPayload.name);
  81 |     });
  82 | 
  83 |     await test.step('Step 4: explicit delete and 404 read-back', async () => {
  84 |       const del = await apiClient.deleteRepo(request, owner, repoName);
  85 |       expect(del.response.status()).toBe(204);
  86 | 
  87 |       const after = await apiClient.getRepo(request, owner, repoName);
> 88 |       expect(after.response.status()).toBe(404);
     |                                       ^ Error: expect(received).toBe(expected) // Object.is equality
  89 |     });
  90 |   });
  91 | });
  92 | 
```