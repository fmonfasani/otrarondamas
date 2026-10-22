'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
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
