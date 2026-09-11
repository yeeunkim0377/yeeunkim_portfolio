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

test('Pulio keeps the original workflow artwork and translates only its text nodes', () => {
  assert.match(html, /data="assets\/pulio\/workflow\/workflow-before\.svg"[^>]*data-workflow/);
  assert.match(html, /data="assets\/pulio\/workflow\/workflow-after\.svg"[^>]*data-workflow/);
  assert.doesNotMatch(html, /workflow-(?:before|after)-en\.svg/);
  assert.doesNotMatch(html, /pulio-workflow-translation/);
});

test('workflow translation changes copy without touching SVG typography attributes', () => {
  const { translateWorkflowDocument } = require('../pulio-core.js');
  const node = { textContent: '기획안 전달', attributes: { 'font-family': 'Gothic A1', 'font-weight': '500' } };
  const svg = { querySelectorAll: () => [node] };

  translateWorkflowDocument(svg, 'en');
  assert.equal(node.textContent, 'Brief Handoff');
  assert.deepEqual(node.attributes, { 'font-family': 'Gothic A1', 'font-weight': '500' });
  translateWorkflowDocument(svg, 'ko');
  assert.equal(node.textContent, '기획안 전달');
});
