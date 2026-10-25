#!/usr/bin/env node
'use strict';
const { spawnSync } = require('node:child_process');
function run(command, args) { return spawnSync(command, args, { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }); }
function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log('Usage: node tools/engineering/collect-ci-evidence.js [commit-sha]\nRead-only collection of GitHub Actions runs for a commit using the authenticated GitHub CLI (gh).');
    return;
  }
  const local = run('git', ['rev-parse', 'HEAD']);
  if (local.status !== 0) throw new Error((local.stderr || 'Unable to resolve local HEAD.').trim());
  const sha = process.argv[2] || local.stdout.trim();
  if (!/^[0-9a-f]{7,40}$/i.test(sha)) throw new Error('Commit must be a hexadecimal Git SHA (7-40 characters).');
  const result = run('gh', ['run', 'list', '--commit', sha, '--limit', '50',
    '--json', 'databaseId,name,workflowName,status,conclusion,url,createdAt,headSha,event']);
  if (result.error) throw new Error('GitHub CLI (gh) unavailable: ' + result.error.message);
  if (result.status !== 0) throw new Error('GitHub CLI failed (exit ' + result.status + '): ' +
    (result.stderr || result.stdout || '').trim() + '\nConfirm gh is installed, authenticated, and has access to this repository.');
  const runs = JSON.parse(result.stdout || '[]');
  const matching = runs.filter(item => item.headSha && item.headSha.toLowerCase() === sha.toLowerCase());
  console.log(JSON.stringify({ tool: 'collect-ci-evidence', readOnly: true, requestedCommit: sha,
    evidenceSource: 'GitHub Actions via gh run list', runCount: matching.length,
    runs: matching.map(item => ({ id: item.databaseId, workflow: item.workflowName || item.name,
      event: item.event, status: item.status, conclusion: item.conclusion, url: item.url,
      createdAt: item.createdAt, headSha: item.headSha })),
    interpretation: matching.length
      ? 'Only listed workflow runs are evidenced; verify required checks and latest run state before declaring a gate closed.'
      : 'No GitHub Actions run was returned for this exact commit. This is not evidence that CI passed.'
  }, null, 2));
}
try { main(); } catch (error) {
  console.error(JSON.stringify({ tool: 'collect-ci-evidence', status: 'ERROR', message: error.message }, null, 2));
  process.exitCode = 2;
}
