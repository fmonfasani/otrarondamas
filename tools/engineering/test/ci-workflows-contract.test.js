'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const workflow = (name) => fs.readFileSync(path.join(root, '.github/workflows', name), 'utf8');

test('B4 retains build, complete unit suite, and required tenant regression coverage', () => {
  const content = workflow('b4-verification.yml');
  assert.match(content, /npm run build --workspace=@otrarondamas\/api/);
  assert.match(content, /npm test --workspace=@otrarondamas\/api -- --runInBand/);
  assert.match(content, /tenant-isolation\.integration-spec\.ts/);
  assert.match(content, /s-v1-\*\.integration-spec\.ts/);
  assert.match(content, /fs-1a-\*\.integration-spec\.ts/);
  assert.match(content, /messaging-http\*\.integration-spec\.ts/);
  assert.match(content, /if \[ "\$\{#discovered_test_files\[@\]\}" -eq 0 \]/);
});

test('B3 retains the explicit tenant and relation candidate suites', () => {
  const content = workflow('b3-tenant-isolation-candidate.yml');
  assert.match(content, /b3-tenant-isolation\.integration-spec\.ts/);
  assert.match(content, /b3-producto-familia\.integration-spec\.ts/);
  assert.match(content, /b3-producto-proveedor\.integration-spec\.ts/);
  assert.match(content, /b3-movimientostock-producto\.integration-spec\.ts/);
  assert.match(content, /npm run test:integration --workspace=@otrarondamas\/api/);
});

test('post-merge gate retains unit, tenant, B3, S-V1 and FS-1a verification', () => {
  const content = workflow('post-merge-verification.yml');
  assert.match(content, /npm test --workspace=@otrarondamas\/api -- --(?:runInBand|maxWorkers=50%)/);
  assert.match(content, /test\/integration\/tenant-isolation\.integration-spec\.ts/);
  assert.match(content, /test\/integration\/b3-tenant-isolation\.integration-spec\.ts/);
  assert.match(content, /s-v1-\*\.integration-spec\.ts/);
  assert.match(content, /fs-1a-\*\.integration-spec\.ts/);
  assert.match(content, /if \[ "\$\{#test_files\[@\]\}" -eq 0 \]/);
});
