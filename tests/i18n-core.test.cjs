const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

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

test('a saved language is applied after translations and page rendering finish', () => {
  const copy = { dataset: { i18n: 'sample.copy' }, innerHTML: '한글 본문' };
  const copies = [copy];
  const windowListeners = {};
  const button = (language) => ({
    dataset: { language },
    addEventListener() {},
    setAttribute() {},
  });
  const document = {
    readyState: 'interactive',
    documentElement: { lang: 'ko', addEventListener() {} },
    body: { dataset: {} },
    title: '',
    querySelectorAll(selector) {
      if (selector === '[data-i18n]') return copies;
      if (selector === '[data-language]') return [button('ko'), button('en')];
      return [];
    },
    createTreeWalker: () => ({ nextNode: () => null }),
    addEventListener() {},
    dispatchEvent() {},
  };
  const window = {
    document,
    NodeFilter: { SHOW_TEXT: 4 },
    localStorage: { getItem: () => 'en', setItem() {} },
    location: { pathname: '/pulio.html', search: '', hash: '' },
    history: { state: null, replaceState() {} },
    CustomEvent: class CustomEvent {},
    addEventListener: (type, listener) => { windowListeners[type] = listener; },
  };
  const source = fs.readFileSync(path.join(__dirname, '..', 'i18n-core.js'), 'utf8');
  vm.runInNewContext(source, { window, URLSearchParams, globalThis: window });

  window.PortfolioI18n.register({
    ko: { 'sample.copy': '한글 본문' },
    en: { 'sample.copy': 'English copy' },
  });

  assert.equal(document.documentElement.lang, 'en');
  assert.equal(copy.innerHTML, 'English copy');

  const lateCopy = { dataset: { i18n: 'sample.copy' }, innerHTML: '한글 본문' };
  copies.push(lateCopy);
  windowListeners.load();
  assert.equal(lateCopy.innerHTML, 'English copy');
});
