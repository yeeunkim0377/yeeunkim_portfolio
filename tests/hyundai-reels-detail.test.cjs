const fs = require('node:fs');
const assert = require('node:assert/strict');
const test = require('node:test');
const html = () => fs.readFileSync('hyundai.html', 'utf8');

test('all three supplied reel cases keep their playable video and source frame identity', () => {
  const page = html();
  for (const id of ['5:318', '5:421', '5:519']) assert.ok(page.includes(`data-reel-case="${id}"`));
  assert.equal((page.match(/class="hyundai-reel"/g) || []).length, 3);
  for (const [tag] of page.matchAll(/<video\b[^>]+>/g)) assert.match(tag, /preload="none"/);
});

test('the source interview connectors and four editing-stage labels are retained', () => {
  const page = html();
  for (const id of ['5:611', '5:612', '5:413', '5:415', '5:417', '5:419']) assert.ok(page.includes(`data-figma-id="${id}"`), id);
  for (const [_, source] of page.matchAll(/(?:src|data-poster)="(assets\/[^\"]+)"/g)) assert.ok(fs.existsSync(source), source);
});
