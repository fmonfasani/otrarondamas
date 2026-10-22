#!/usr/bin/env node
'use strict';
const { spawnSync } = require('node:child_process');
function runGit(args) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error((result.stderr || result.stdout || '').trim() || 'git command failed');
  return result.stdout.trim();
}
function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log('Usage: node tools/engineering/check-git-state.js [--json]\nRead-only report of branch, HEAD, upstream, working tree, and diff summaries.');
    return;
  }
  const report = {
    tool: 'check-git-state', readOnly: true,
    repositoryRoot: runGit(['rev-parse', '--show-toplevel']),
    branch: runGit(['branch', '--show-current']) || '(detached HEAD)',
    head: runGit(['rev-parse', 'HEAD']),
    upstream: null, workingTreeClean: false, statusLines: [],
    unstagedDiffStat: runGit(['diff', '--stat']) || '(none)',
    stagedDiffStat: runGit(['diff', '--cached', '--stat']) || '(none)',
    capturedAt: new Date().toISOString()
  };
  try { report.upstream = runGit(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}']); } catch {}
  const status = runGit(['status', '--short', '--untracked-files=all']);
  report.workingTreeClean = !status;
  report.statusLines = status ? status.split('\n') : [];
  console.log(JSON.stringify(report, null, 2));
}
try { main(); } catch (error) {
  console.error(JSON.stringify({ tool: 'check-git-state', status: 'ERROR', message: error.message }, null, 2));
  process.exitCode = 2;
}
