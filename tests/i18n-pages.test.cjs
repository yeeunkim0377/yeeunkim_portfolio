const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const pages = ['index.html', 'spatial.html', 'pulio.html', 'hyundai.html', 'pleats-mama.html', 'data-center.html'];

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

test('every portfolio page exposes the persistent KR and EN switcher', () => {
  for (const page of pages) {
    const html = read(page);
    assert.match(html, /class="language-switcher"/, page);
    assert.match(html, /data-language="ko"/, page);
    assert.match(html, /data-language="en"/, page);
    assert.match(html, /i18n-translations\.js/, page);
    assert.match(html, /i18n-core\.js/, page);
  }
});

test('home variants key their visible Korean portfolio copy', () => {
  for (const page of ['index.html', 'spatial.html']) {
    const html = read(page);
    assert.match(html, /data-i18n="home\.hero\.tagline"/, page);
    assert.match(read('i18n-translations.js'), /'home\.award'/, page);
    assert.match(html, /data-i18n="home\.education\.highSchool"/, page);
    assert.match(html, /data-i18n="home\.education\.university"/, page);
  }
});

test('switcher styling inherits navigation typography and marks the active segment black', () => {
  const css = read('styles.css');
  assert.match(css, /\.language-switcher\{[^}]*font:inherit/);
  assert.match(css, /border-radius:5px/);
  assert.match(css, /button\[aria-pressed="true"\]\{[^}]*background:#000/);
});

test('the language core avoids a global mutation observer and refreshes after interaction', () => {
  const core = read('i18n-core.js');
  assert.doesNotMatch(core, /new browser\.MutationObserver/);
  assert.match(core, /addEventListener\('click',[\s\S]*queueMicrotask/);
});

test('translation application does not rewrite unchanged HTML and retrigger its observer', () => {
  const core = read('i18n-core.js');
  assert.match(core, /if \(node\.innerHTML !== translated\) node\.innerHTML = translated/);
});
