const test = require('node:test');
const assert = require('node:assert/strict');

const core = require('../i18n-core.js');

test('explicit URL language overrides a saved preference', () => {
  assert.equal(core.resolveLanguage({ search: '?lang=en', stored: 'ko' }), 'en');
  assert.equal(core.resolveLanguage({ search: '?lang=ko', stored: 'en' }), 'ko');
});

test('saved English is restored and invalid state falls back to Korean', () => {
  assert.equal(core.resolveLanguage({ search: '', stored: 'en' }), 'en');
  assert.equal(core.resolveLanguage({ search: '?lang=xx', stored: 'xx' }), 'ko');
});

test('English URLs retain other query values and hashes', () => {
  assert.equal(
    core.localizeUrl('pulio.html?view=grid#work', 'en'),
    'pulio.html?view=grid&lang=en#work'
  );
});

test('Korean URLs remove only the language query value', () => {
  assert.equal(
    core.localizeUrl('pulio.html?view=grid&lang=en#work', 'ko'),
    'pulio.html?view=grid#work'
  );
});

test('literal copy translation tolerates layout whitespace and keeps unknown text', () => {
  core.register({
    ko: { 'sample.copy': '첫 문장 두 번째 문장' },
    en: { 'sample.copy': 'First sentence. Second sentence.' }
  });
  assert.equal(core.translateLiteral('  첫 문장\n두 번째 문장  ', 'en'), 'First sentence. Second sentence.');
  assert.equal(core.translateLiteral('등록되지 않은 문장', 'en'), '등록되지 않은 문장');
});
