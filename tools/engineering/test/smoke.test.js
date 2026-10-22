'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const newline = String.fromCharCode(10);
const tools = ['tools/engineering/check-git-state.js', 'tools/engineering/validate-module.js',
  'tools/engineering/collect-ci-evidence.js'];
for (const tool of tools) {
  test(tool + ' exposes help without side effects', () => {
    const result = spawnSync(process.execPath, [tool, '--help'], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Usage:/);
  });
}
test('validate-module rejects unsupported actions', () => {
  const result = spawnSync(process.execPath, ['tools/engineering/validate-module.js', 'api', 'deploy'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Unsupported action/);
});
test('collect-ci-evidence rejects malformed commit IDs before invoking gh', () => {
  const result = spawnSync(process.execPath, ['tools/engineering/collect-ci-evidence.js', 'not-a-sha'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /hexadecimal Git SHA/);
});

const agentContracts = [
  {
    file: '.claude/agents/architect.md',
    name: 'architect',
    required: ['## Mission', '## Required workflow', '## Constraints', '## Output', 'AS-IS', 'TO-BE']
  },
  {
    file: '.claude/agents/ci-recovery.md',
    name: 'ci-recovery',
    required: ['## Mission', '## Required workflow', '## Constraints', '## Output', 'root cause', 'BLOCKED']
  },
  {
    file: '.claude/agents/independent-reviewer.md',
    name: 'independent-reviewer',
    required: ['## Mission', '## Required workflow', '## Constraints', '## Verdict', '## Output', 'read-only']
  }
];
for (const contract of agentContracts) {
  test('agent contract is present and has required guardrails: ' + contract.name, () => {
    const fullPath = path.join(root, contract.file);
    assert.ok(fs.existsSync(fullPath), 'Missing agent file: ' + contract.file);
    const content = fs.readFileSync(fullPath, 'utf8');
    assert.match(content, new RegExp('^---\\s*\\nname: ' + contract.name + '\\s*\\n'));
    assert.ok(content.includes(newline + '---' + newline), contract.file + ' has no closing frontmatter delimiter');
    for (const marker of contract.required) {
      assert.ok(content.toLowerCase().includes(marker.toLowerCase()), contract.file + ' is missing required marker: ' + marker);
    }
  });
}

const skillContracts = [
  { file: '.claude/skills/ci-failure-triage/SKILL.md', name: 'ci-failure-triage', required: ['## Goal', '## Procedure', '## Required report', 'Completion rule'] },
  { file: '.claude/skills/sdd-workflow/SKILL.md', name: 'sdd-workflow', required: ['## Goal', '## Phase 0', '## Phase 4', '## Definition of done'] },
  { file: '.claude/skills/tenant-isolation-audit/SKILL.md', name: 'tenant-isolation-audit', required: ['## Goal', '## Procedure', '## Severity guidance', '## Required report'] },
  { file: '.claude/skills/api-contract-audit/SKILL.md', name: 'api-contract-audit', required: ['## Goal', '## Procedure', '## Required report', 'request/response contract'] }
];
for (const contract of skillContracts) {
  test('skill contract is present and has required procedure: ' + contract.name, () => {
    const fullPath = path.join(root, contract.file);
    assert.ok(fs.existsSync(fullPath), 'Missing skill file: ' + contract.file);
    const content = fs.readFileSync(fullPath, 'utf8');
    assert.match(content, new RegExp('^---\\s*\\nname: ' + contract.name + '\\s*\\n'));
    assert.ok(content.includes(newline + '---' + newline), contract.file + ' has no closing frontmatter delimiter');
    for (const marker of contract.required) {
      assert.ok(content.toLowerCase().includes(marker.toLowerCase()), contract.file + ' is missing required marker: ' + marker);
    }
  });
}
