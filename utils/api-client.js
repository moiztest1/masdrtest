const logger = require('./logger');

async function safeJson(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function createRepo(request, owner, payload) {
  logger.debug(`POST /user/repos owner=${owner} name=${payload.name}`);
  const response = await request.post('/user/repos', { data: payload });
  return { response, body: await safeJson(response) };
}

async function getRepo(request, owner, repo) {
  const response = await request.get(`/repos/${owner}/${repo}`);
  return { response, body: await safeJson(response) };
}

async function deleteRepo(request, owner, repo) {
  logger.debug(`DELETE /repos/${owner}/${repo}`);
  const response = await request.delete(`/repos/${owner}/${repo}`);
  return { response, body: await safeJson(response) };
}

async function createIssue(request, owner, repo, payload) {
  const response = await request.post(`/repos/${owner}/${repo}/issues`, { data: payload });
  return { response, body: await safeJson(response) };
}

async function getIssue(request, owner, repo, issueNumber) {
  const response = await request.get(`/repos/${owner}/${repo}/issues/${issueNumber}`);
  return { response, body: await safeJson(response) };
}

async function createLabel(request, owner, repo, payload) {
  const response = await request.post(`/repos/${owner}/${repo}/labels`, { data: payload });
  return { response, body: await safeJson(response) };
}

async function addLabelsToIssue(request, owner, repo, issueNumber, labels) {
  const response = await request.post(
    `/repos/${owner}/${repo}/issues/${issueNumber}/labels`,
    { data: { labels } },
  );
  return { response, body: await safeJson(response) };
}

async function getIssueLabels(request, owner, repo, issueNumber) {
  const response = await request.get(`/repos/${owner}/${repo}/issues/${issueNumber}/labels`);
  return { response, body: await safeJson(response) };
}

module.exports = {
  safeJson,
  createRepo,
  getRepo,
  deleteRepo,
  createIssue,
  getIssue,
  createLabel,
  addLabelsToIssue,
  getIssueLabels,
};
