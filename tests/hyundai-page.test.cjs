const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const workspace = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(workspace, file), 'utf8');

test('Hyundai places its production contribution between the date and categories', () => {
  const html = read('hyundai.html');
  const date = html.indexOf('2025.03~ 2025.11');
  const contribution = html.indexOf('class="hyundai-contribution"');
  const categories = html.indexOf('class="hyundai-categories"');

  assert.ok(date < contribution, 'contribution must follow the project date');
  assert.ok(contribution < categories, 'contribution must precede the project categories');
  assert.match(html, /CONTRIBUTION \| 카드뉴스 디자인 · 릴스 기획·촬영·편집/);
});

test('Hyundai contribution matches the shared typography and category spacing', () => {
  const css = read('hyundai.css');
  assert.match(
    css,
    /\.hyundai-contribution\{[^}]*font-size:15px;[^}]*line-height:19px;[^}]*font-weight:600(?:;|})/,
  );
  assert.match(css, /\.hyundai-categories\{[^}]*margin-top:20px;/);
});

test('Hyundai omits the stray rule above the card-news grid', () => {
  const html = read('hyundai.html');
  const css = read('hyundai.css');
  assert.doesNotMatch(html, /hyundai-section-rule/);
  assert.doesNotMatch(css, /\.hyundai-section-rule/);
});

test('HYUNDAI E&C work entry links to its detail page', () => {
  const html = read('index.html');
  assert.match(html, /<a class="project hyundai-project-link" href="hyundai\.html"[^>]*><strong>HYUNDAI E&amp;C<\/strong>/);
  assert.doesNotMatch(html, /data-project="HYUNDAI E&amp;C"[^>]*aria-expanded/);
});

test('Hyundai intro exposes the two Figma labels with decorative bullets', () => {
  const html = read('hyundai.html');
  const categories = html.match(/<div class="hyundai-categories"[\s\S]*?<\/div>/)?.[0] ?? '';
  const visibleText = categories.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  assert.doesNotMatch(categories, /<a\b|href=/);
  assert.match(html, /<span class="hyundai-tag-bullet" aria-hidden="true">▪<\/span>sns card news/);
  assert.match(html, /<span class="hyundai-tag-bullet" aria-hidden="true">▪<\/span>reels video editing/);
  assert.doesNotMatch(visibleText, /①|②/);
  assert.equal((html.match(/class="hyundai-card-news\b/g) ?? []).length, 4);
  assert.equal((html.match(/class="hyundai-card-image"/g) ?? []).length, 12);
  assert.equal((html.match(/class="hyundai-reel"/g) ?? []).length, 3);
});

test('Hyundai intro typography and category positions match the Figma frame', () => {
  const css = read('hyundai.css');
  assert.match(css, /\.hyundai-categories\{[^}]*font-family:'Gothic A1',sans-serif[^}]*font-size:20px[^}]*line-height:25px[^}]*font-weight:500/);
  assert.match(css, /\.hyundai-category\{[^}]*position:absolute/);
  assert.match(css, /\.hyundai-category:nth-child\(1\)\{left:0/);
  assert.match(css, /\.hyundai-category:nth-child\(2\)\{left:190px/);
});

test('Reels cases retain the first heading without reel dates', () => {
  const html = read('hyundai.html');
  assert.equal((html.match(/>Reels Video Editing<\/h2>/g) || []).length, 1);
  assert.doesNotMatch(html, /2025\.07\.28/);
  assert.doesNotMatch(html, /2025\.08\.23/);
});

test('Reels view counts follow the updated values and retain eye icons', () => {
  const html = read('hyundai.html');
  assert.deepEqual([...html.matchAll(/>(1,050|874|474)<\/p>/g)].map(m => m[1]), ['1,050','874','474']);
  assert.equal((html.match(/class="hyundai-view-icon"/g) || []).length, 3);
  assert.match(html, /family=Google\+Sans\+Flex:wght@500/);
});

test('every Hyundai media reference resolves to an extracted Figma asset', () => {
  const html = read('hyundai.html');
  const sources = [...html.matchAll(/(?:src|poster)="(assets\/hyundai\/[^"]+)"/g)].map((match) => match[1]);
  assert.equal(sources.length, 47, '12 cards, 3 videos, 3 posters, 26 detail images, and 3 eye icons');
  assert.equal(new Set(sources).size, 45);
  for (const source of sources) assert.ok(fs.existsSync(path.join(workspace, source)), `missing asset: ${source}`);
});

test('Hyundai media defers expensive loading and decoding work', () => {
  const html = read('hyundai.html');
  assert.equal((html.match(/class="hyundai-card-image"[^>]*loading="lazy"[^>]*decoding="async"/g) ?? []).length, 12);
  assert.equal((html.match(/class="hyundai-reel"[^>]*data-poster="assets\/hyundai\/[^\"]+"[^>]*preload="none"/g) ?? []).length, 3);
  assert.equal((html.match(/src="assets\/hyundai\/reels-detail\/[^"]+" loading="lazy" decoding="async"/g) ?? []).length, 26);
});

test('card-news groups retain the Figma border and drop shadow', () => {
  const css = read('hyundai.css');
  assert.match(css, /\.hyundai-card-news\{[^}]*border:1px solid #d9d9d9/);
  assert.match(css, /\.hyundai-card-news\{[^}]*box-shadow:0 1px 3\.6px rgba\(0,0,0,\.25\)/);
});

test('Hyundai typography tokens preserve the Figma weights and colors', () => {
  const css = read('hyundai.css');
  assert.match(css, /--hyundai-date:#c3c3c3/);
  assert.match(css, /--hyundai-muted:#757575/);
  assert.match(css, /\.hyundai-title\{[^}]*font-size:50px[^}]*font-weight:500/);
  assert.match(css, /\.hyundai-date\{[^}]*font-size:15px[^}]*font-weight:700[^}]*color:var\(--hyundai-date\)/);
  assert.match(css, /\.hyundai-reels-title\{[^}]*font-size:30px[^}]*font-weight:600/);
  assert.match(css, /\.hyundai-description-copy\{[^}]*font-size:15px[^}]*font-weight:400[^}]*color:#1e1e1e/);
});
