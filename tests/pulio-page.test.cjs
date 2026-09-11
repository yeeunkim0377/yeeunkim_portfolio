const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const workspace = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(workspace, 'pulio.html'), 'utf8');
const css = fs.readFileSync(path.join(workspace, 'pulio.css'), 'utf8');

test('Pulio places its design contribution between the date and categories', () => {
  const date = html.indexOf('2026.05~PRESENT');
  const contribution = html.indexOf('class="pulio-contribution"');
  const categories = html.indexOf('class="pulio-categories"');

  assert.ok(date < contribution, 'contribution must follow the project date');
  assert.ok(contribution < categories, 'contribution must precede the project categories');
  assert.match(html, /CONTRIBUTION \| 기획안 기반 콘텐츠 디자인 100%/);
});

test('Pulio names design automation without the intro typo', () => {
  assert.match(html, />design automation<\/span>/);
  assert.doesNotMatch(html, /design autmomation/);
});

test('Pulio contribution matches the Data Center typography and spacing', () => {
  assert.match(html, /Gothic\+A1:wght@100;200;300;400;500;600;700/);
  assert.match(
    css,
    /\.pulio-contribution\{[^}]*top:84\.033px;[^}]*font-size:15px;[^}]*line-height:19px;[^}]*font-weight:600(?:;|})/,
  );
  assert.match(css, /\.pulio-categories\{[^}]*top:123\.033px;/);
});

test('Pulio swaps both workflow diagrams for translated English artwork', () => {
  const translations = fs.readFileSync(path.join(workspace, 'i18n-translations.js'), 'utf8');
  const beforeEnglish = path.join(workspace, 'assets/pulio/workflow/workflow-before-en.svg');
  const afterEnglish = path.join(workspace, 'assets/pulio/workflow/workflow-after-en.svg');

  assert.match(html, /data-i18n="pulio\.workflowBefore" data-i18n-attr="src"/);
  assert.match(html, /data-i18n="pulio\.workflowAfter" data-i18n-attr="src"/);
  assert.match(translations, /'pulio\.workflowBefore': 'assets\/pulio\/workflow\/workflow-before-en\.svg'/);
  assert.match(translations, /'pulio\.workflowAfter': 'assets\/pulio\/workflow\/workflow-after-en\.svg'/);
  assert.ok(fs.existsSync(beforeEnglish));
  assert.ok(fs.existsSync(afterEnglish));
  assert.match(fs.readFileSync(beforeEnglish, 'utf8'), /Brief Handoff/);
  assert.match(fs.readFileSync(afterEnglish, 'utf8'), /AI-Assisted Component Placement/);
});
