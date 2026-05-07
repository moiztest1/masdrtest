const crypto = require('crypto');

function randomHex(bytes = 6) {
  return crypto.randomBytes(bytes).toString('hex');
}

function uniqueRepoName(prefix = 'e2e-test') {
  return `${prefix}-${Date.now()}-${randomHex(6)}`;
}

function uniqueIssue(tag = 'auto') {
  return {
    title: `[${tag}] Smoke test issue ${randomHex(3)}`,
    body: 'Issue created by the masdrtest E2E suite. This repo will be deleted automatically.',
  };
}

function uniqueLabel(tag = 'auto') {
  return {
    name: `e2e-label-${tag}-${randomHex(3)}`,
    color: 'ededed',
    description: 'Label applied by the masdrtest E2E suite.',
  };
}

module.exports = {
  randomHex,
  uniqueRepoName,
  uniqueIssue,
  uniqueLabel,
};
