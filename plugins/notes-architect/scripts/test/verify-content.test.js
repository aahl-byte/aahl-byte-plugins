const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { verifyContent } = require('../verify-content.js');

const FIX = path.join(__dirname, 'fixtures', 'sample-notes');

test('clean fixture passes with no errors', () => {
  const { errors } = verifyContent(FIX);
  assert.deepEqual(errors, []);
});

test('flags a manifest page whose file is missing', () => {
  const { errors } = verifyContent(FIX, {
    overridePages: [{ slug: 'ghost', title: 'ghost', path: 'global-foundation/ghost.md', domain: 'd', phase: 'p' }],
  });
  assert.ok(errors.some(e => /ghost\.md/.test(e) && /missing/.test(e)));
});
