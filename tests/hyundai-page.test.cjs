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

test('Reels section title matches the unnumbered Figma text layer', () => {
  const html = read('hyundai.html');
  const css = read('hyundai.css');
  assert.match(html, /<h2 class="hyundai-reels-title" id="reels-video">Reels Video Editing<\/h2>/);
  assert.doesNotMatch(html, /2025\.07\.28|hyundai-reels-date/);
  assert.match(css, /\.hyundai-reels-title\{[^}]*left:135\.92px[^}]*top:1125\.043px[^}]*font-size:30px[^}]*line-height:38px[^}]*font-weight:600/);
});

test('Reels result numbers use the Google Sans Flex Medium Figma style', () => {
  const html = read('hyundai.html');
  const css = read('hyundai.css');
  assert.doesNotMatch(html, /Roboto\+Flex/);
  assert.doesNotMatch(html, /hyundai-result-marker/);
  assert.doesNotMatch(css, /\.hyundai-result-marker/);
  assert.equal((html.match(/class="hyundai-view-icon"/g) ?? []).length, 3);
  assert.equal((html.match(/src="assets\/hyundai\/view\.png"/g) ?? []).length, 3);
  assert.deepEqual([...html.matchAll(/data-count="(\d+)"/g)].map((match) => match[1]), ['1048', '874', '474']);
  assert.match(html, /family=Google\+Sans\+Flex:wght@500/);
  assert.match(css, /\.hyundai-stat strong\{[^}]*font-family:'Google Sans Flex','Gothic A1',sans-serif[^}]*font-size:50px[^}]*line-height:63px[^}]*font-weight:500/);
  assert.match(css, /\.hyundai-view-icon\{[^}]*left:0[^}]*top:22\.714px[^}]*width:30\.527px[^}]*height:17\.572px/);
  assert.match(css, /\.hyundai-stat--one strong\{left:47\.579px/);
  assert.match(css, /\.hyundai-stat--two strong\{left:40\.696px/);
  assert.match(css, /\.hyundai-stat--three strong\{left:39\.737px/);
});

test('every Hyundai media reference resolves to an extracted Figma asset', () => {
  const html = read('hyundai.html');
  const sources = [...html.matchAll(/(?:src|poster)="(assets\/hyundai\/[^"]+)"/g)].map((match) => match[1]);
  assert.equal(sources.length, 21, 'all 12 cards, 3 videos, 3 posters, and 3 view icons must be referenced');
  assert.equal(new Set(sources).size, 19, 'the three view icons reuse one supplied asset');
  for (const source of sources) assert.ok(fs.existsSync(path.join(workspace, source)), `missing asset: ${source}`);
});

test('Hyundai media defers expensive loading and decoding work', () => {
  const html = read('hyundai.html');
  assert.equal((html.match(/class="hyundai-card-image"[^>]*loading="lazy"[^>]*decoding="async"/g) ?? []).length, 12);
  assert.equal((html.match(/class="hyundai-reel"[^>]*data-poster="assets\/hyundai\/[^\"]+"[^>]*preload="none"/g) ?? []).length, 3);
  assert.equal((html.match(/class="hyundai-view-icon"[^>]*decoding="async"/g) ?? []).length, 3);
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
