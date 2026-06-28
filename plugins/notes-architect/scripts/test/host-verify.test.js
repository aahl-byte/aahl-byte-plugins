'use strict';
const test = require('node:test');
const assert = require('node:assert');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { buildNav } = require('../../host/docsify/build.js');
const { verifyHost } = require('../../host/docsify/verify-host.js');

const PLUGIN_ROOT = path.resolve(__dirname, '..', '..');           // P
const INIT = path.join(PLUGIN_ROOT, 'host', 'docsify', 'init.sh');

function hostedSite() {
  const root = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hv-')), 'notes');
  fs.mkdirSync(root, { recursive: true });
  fs.cpSync(path.join(__dirname, 'fixtures', 'sample-notes'), root, { recursive: true });
  execFileSync('bash', [INIT, root], { env: { ...process.env, CLAUDE_PLUGIN_ROOT: PLUGIN_ROOT } });
  buildNav(root);
  return root;
}

test('a freshly built docsify site verifies clean', () => {
  const root = hostedSite();
  const { errors } = verifyHost(root);
  assert.deepEqual(errors, []);
});

test('flags a missing _notes-map.json', () => {
  const root = hostedSite();
  fs.rmSync(path.join(root, '_notes-map.json'));
  const { errors } = verifyHost(root);
  assert.ok(errors.some(e => /_notes-map\.json/.test(e)));
});
