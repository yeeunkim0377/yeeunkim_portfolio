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

test('both portfolio variants prioritize Pulio, Data Center, then Hyundai without changing their destinations', () => {
  const script = fs.readFileSync(path.join(workspace, 'script.js'), 'utf8');

  for (const filename of ['index.html', 'spatial.html']) {
    const html = fs.readFileSync(path.join(workspace, filename), 'utf8');
    const pulio = html.indexOf('<strong>PULIO JAPAN TEAM</strong>');
    const dataCenter = html.indexOf('<strong>DATA CENTER</strong>');
    const hyundai = html.indexOf('<strong>HYUNDAI E&amp;C</strong>');

    assert.ok(pulio < dataCenter, `${filename}: Pulio must appear before Data Center`);
    assert.ok(dataCenter < hyundai, `${filename}: Data Center must appear before Hyundai`);
    assert.match(html, /data-project="PULIO JAPAN TEAM"/);
    assert.match(html, /data-project="DATA CENTER"/);
    assert.match(html, /href="hyundai\.html"[^>]*><strong>HYUNDAI E&amp;C<\/strong>/);
  }

  assert.match(script, /'PULIO JAPAN TEAM': 'pulio\.html'/);
  assert.match(script, /'DATA CENTER': 'data-center\.html'/);
});

test('both About sections show Tool, Education, then Language with no Birth gap', () => {
  const css = fs.readFileSync(path.join(workspace, 'styles.css'), 'utf8');

  for (const filename of ['index.html', 'spatial.html']) {
    const html = fs.readFileSync(path.join(workspace, filename), 'utf8');
    const headings = [...html.matchAll(/<h3>(TOOL|EDUCATION|LANGUAGE|BIRTH)\.<\/h3>/g)]
      .map((match) => match[1]);

    assert.deepEqual(headings, ['TOOL', 'EDUCATION', 'LANGUAGE'], `${filename}: unexpected About order`);
    assert.doesNotMatch(html, /birth-section|birth-details|>BIRTH\.<\/h3>/);
    assert.match(html, /aria-controls="tool-details"/);
    assert.match(html, /aria-controls="education-details"/);
    assert.match(html, /aria-controls="language-details"/);
  }

  assert.match(css, /\.profile\{[^}]*display:flex;[^}]*flex-direction:column;[^}]*gap:20px;/);
});

test('both profile images carry the centered Yeeun Kim caption below the image', () => {
  const css = fs.readFileSync(path.join(workspace, 'styles.css'), 'utf8');

  for (const filename of ['index.html', 'spatial.html']) {
    const html = fs.readFileSync(path.join(workspace, filename), 'utf8');
    assert.match(html, /<p class="portrait-name">Yeeun Kim<\/p>/);
  }

  assert.match(
    css,
    /\.portrait-name\{[^}]*position:absolute;[^}]*top:508\.5px;[^}]*width:318\.964px;[^}]*text-align:center;[^}]*font-family:'Gothic A1',sans-serif;[^}]*font-size:20px;[^}]*font-weight:400;/,
  );
});
