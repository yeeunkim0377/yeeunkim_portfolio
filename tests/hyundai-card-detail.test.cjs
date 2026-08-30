const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');

const workspace = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(workspace, file), 'utf8');
const html = read('hyundai.html');
const css = read('hyundai.css');
const js = read('hyundai.js');
const dataContext = {};
vm.runInNewContext(read('hyundai-card-detail-data.js'), dataContext);
const frames = dataContext.HyundaiCardDetailData;

test('Figma card-detail frames map top-to-bottom to November, June, October, and April', () => {
  assert.deepEqual(Array.from(frames, (frame) => frame.id), ['november', 'june', 'october', 'april']);
  assert.deepEqual(Array.from(frames, (frame) => frame.images.length), [16, 12, 12, 10]);
  assert.deepEqual(Array.from(frames, (frame) => frame.texts.length), [6, 6, 6, 6]);
});

test('each existing Hyundai card opens its corresponding in-page detail overlay', () => {
  for (const id of ['april', 'june', 'october', 'november']) {
    assert.match(html, new RegExp(`class="hyundai-card-news[^\"]*"[^>]*data-card-detail="${id}"`));
  }
  assert.match(html, /data-hyundai-card-detail hidden/);
  assert.ok(html.indexOf('data-hyundai-card-detail hidden') > html.indexOf('</main>'), 'overlay must sit outside the clipped main canvas');
  assert.match(html, /class="hyundai-card-detail-close"[^>]*data-hyundai-card-detail-close[^>]*>×<\/button>/);
  assert.ok(html.indexOf('hyundai-card-detail-data.js') < html.indexOf('hyundai.js'), 'Figma data must load before overlay behavior');
});

test('overlay shell and close control match the Data Center placement method', () => {
  assert.match(css, /\.hyundai-card-detail\{[^}]*position:fixed[^}]*width:100vw[^}]*height:100dvh[^}]*background:rgba\(173,173,173,\.56\)[^}]*backdrop-filter:blur\(20px\)/);
  assert.match(css, /\.hyundai-card-detail-canvas\{[^}]*left:50%[^}]*top:calc\(50% - 50px\)[^}]*width:1440px[^}]*height:1048px[^}]*scale\(var\(--hyundai-card-detail-scale\)\)/);
  assert.match(css, /\.hyundai-card-detail-close\{[^}]*left:1562px[^}]*top:151\.169921875px[^}]*width:60px[^}]*height:60px[^}]*font-family:Inter,sans-serif[^}]*font-size:30px/);
});

test('Figma panels and typography retain their exact content and positions', () => {
  const november = frames[0];
  const june = frames[1];
  const october = frames[2];
  const april = frames[3];
  assert.equal(november.panel.x, 920.896484375);
  assert.equal(november.panel.opacity, 0.5);
  assert.equal(june.texts.find((item) => item.text === 'DESCRIPTION').x, 972.875);
  assert.equal(october.texts.find((item) => item.text.startsWith('10월 추석')).y, 530);
  assert.equal(april.texts.find((item) => item.text.startsWith('멘토링 활동')).h, 57);
  for (const frame of frames) {
    assert.ok(frame.texts.some((item) => item.text === 'CHANNEL' && item.weight === 500 && item.color === '#757575'));
    assert.ok(frame.texts.some((item) => item.text === 'Instagram' && item.weight === 400 && item.color === '#1e1e1e'));
  }
});

test('all extracted Figma card-detail assets exist', () => {
  let totalBytes = 0;
  for (const frame of frames) {
    for (const image of frame.images) {
      const asset = path.join(workspace, image.src);
      assert.ok(fs.existsSync(asset), `missing ${image.src}`);
      totalBytes += fs.statSync(asset).size;
    }
  }
  assert.ok(totalBytes < 30 * 1024 * 1024, `detail assets should stay below 30MB, received ${(totalBytes / 1024 / 1024).toFixed(1)}MB`);
});

test('overlay interaction closes by button or Escape and restores trigger focus', () => {
  assert.match(js, /closeButton\.addEventListener\('click', closeDetail\)/);
  assert.match(js, /event\.key === 'Escape'/);
  assert.match(js, /lastTrigger\.focus\(\{ preventScroll: true \}\)/);
  assert.match(js, /document\.body\.classList\.add\('is-card-detail-open'\)/);
  assert.match(js, /document\.body\.classList\.remove\('is-card-detail-open'\)/);
});
