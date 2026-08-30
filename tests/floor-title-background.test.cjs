const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'data-center.js'), 'utf8');

test('floor title text gets a black-on-white label box aligned to the zone start', () => {
  assert.match(source, /dc-floor-title/);
  assert.match(source, /backgroundColor = '#ffffff'/);
  assert.match(source, /color = '#000000'/);
});
