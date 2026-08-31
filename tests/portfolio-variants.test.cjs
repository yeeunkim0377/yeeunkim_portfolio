const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const workspace = path.resolve(__dirname, '..');

test('the original portfolio remains the UX/UI Designer version', () => {
  const html = fs.readFileSync(path.join(workspace, 'index.html'), 'utf8');

  assert.match(html, /<title>김예은 — UX\/UI Designer<\/title>/);
  assert.match(html, /<p>UX\/UI Designer 김예은<\/p>/);
});

test('the spatial portfolio has its own page and designer identity', () => {
  const html = fs.readFileSync(path.join(workspace, 'spatial.html'), 'utf8');

  assert.match(html, /<title>김예은 — Spatial Designer<\/title>/);
  assert.match(html, /<p>Spatial Designer 김예은<\/p>/);
  assert.doesNotMatch(html, /UX\/UI Designer/);
});
