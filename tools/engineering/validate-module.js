#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '../..');
const ACTIONS = { test: ['test'], build: ['build'], lint: ['lint'], all: ['test', 'build', 'lint'] };
function help() {
  console.log('Usage: node tools/engineering/validate-module.js <workspace-name> [test|build|lint|all]\nRuns existing npm scripts for a declared apps/* or packages/* workspace. No scripts or dependencies are installed.');
}
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function findWorkspace(name) {
  const rootPackage = readJson(path.join(ROOT, 'package.json'));
  for (const pattern of rootPackage.workspaces || []) {
    const [parent, wildcard] = pattern.split('/');
    if (wildcard !== '*') continue;
    const parentDir = path.join(ROOT, parent);
    if (!fs.existsSync(parentDir)) continue;
    for (const entry of fs.readdirSync(parentDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const file = path.join(parentDir, entry.name, 'package.json');
      if (!fs.existsSync(file)) continue;
      const pkg = readJson(file);
      if (pkg.name === name || entry.name === name || path.join(parent, entry.name) === name)
        return { dir: path.dirname(file), pkg };
    }
  }
  throw new Error('Workspace "' + name + '" was not found under declared apps/* or packages/* workspaces.');
}
function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) return help();
  const name = process.argv[2], action = process.argv[3] || 'all';
  if (!name || name.startsWith('-')) { help(); throw new Error('A workspace name is required.'); }
  if (!Object.hasOwn(ACTIONS, action)) throw new Error('Unsupported action "' + action + '". Choose test, build, lint, or all.');
  const workspace = findWorkspace(name), scripts = workspace.pkg.scripts || {};
  const report = { tool: 'validate-module', workspace: workspace.pkg.name || name,
    path: path.relative(ROOT, workspace.dir).replace(/\\/g, '/'), action, results: [] };
  for (const script of ACTIONS[action]) {
    if (!scripts[script]) {
      report.results.push({ script, status: 'SKIPPED', reason: 'No matching script is declared in this workspace package.json.' });
      continue;
    }
    const args = ['run', script, '--workspace', workspace.pkg.name];
    const result = spawnSync('npm', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    report.results.push({ script, command: ['npm', ...args].join(' '), exitCode: result.status,
      status: result.status === 0 ? 'PASS' : 'FAIL', stdout: (result.stdout || '').slice(-12000),
      stderr: (result.stderr || '').slice(-12000), spawnError: result.error ? result.error.message : undefined });
    if (result.status !== 0) break;
  }
  report.status = report.results.some(x => x.status === 'FAIL') ? 'FAIL'
    : report.results.some(x => x.status === 'PASS') ? 'PASS' : 'BLOCKED';
  console.log(JSON.stringify(report, null, 2));
  if (report.status !== 'PASS') process.exitCode = 1;
}
try { main(); } catch (error) {
  console.error(JSON.stringify({ tool: 'validate-module', status: 'ERROR', message: error.message }, null, 2));
  process.exitCode = 2;
}
