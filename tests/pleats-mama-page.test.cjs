const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

const workspace = path.resolve(__dirname, '..');

function read(file) {
  const target = path.join(workspace, file);
  assert.ok(fs.existsSync(target), `${file} must exist`);
  return fs.readFileSync(target, 'utf8');
}

function loadPleatsData() {
  const context = {};
  vm.runInNewContext(read('pleats-mama-data.js'), context);
  return context.PleatsMamaFigma;
}

function findLayer(layers, id) {
  for (const layer of layers) {
    if (layer.id === id) return layer;
    const nested = findLayer(layer.children ?? [], id);
    if (nested) return nested;
  }
  return null;
}

test('Pleats concept quote has exactly one pair of quotation marks', () => {
  const source = read('pleats-mama-data.js');

  assert.match(source, /“일과 일상 사이, 나다움을 발견하는 공간”/);
  assert.doesNotMatch(source, /“\s*“일과 일상 사이, 나다움을 발견하는 공간”\s*“/);
});

test('Pleats uses the fixed 1440 by 3600 clipped canvas', () => {
  const html = read('pleats-mama.html');
  const css = read('pleats-mama.css');

  assert.match(html, /<main class="pleats-canvas"/);
  assert.match(css, /\.pleats-canvas\{[^}]*width:1440px;[^}]*height:3600px;[^}]*overflow:hidden;/);
});

test('Pleats retains the Figma hero image and gradient geometry', () => {
  const html = read('pleats-mama.html');
  const css = read('pleats-mama.css');

  assert.match(html, /class="pleats-hero-image"[^>]*data-figma-id="24:7"/);
  assert.match(css, /\.pleats-hero-image\{[^}]*left:0;[^}]*top:318\.0805px;[^}]*width:1440px;[^}]*height:806\.5742px;/);
  assert.match(html, /class="pleats-hero-gradient"[^>]*data-figma-id="24:8"/);
  assert.match(css, /\.pleats-hero-gradient\{[^}]*left:0;[^}]*top:305\.5805px;[^}]*width:1440px;[^}]*height:194\.1272px;/);
  assert.match(css, /linear-gradient\(180deg,#fffaf9 0%,rgba\(255,250,249,0\) 100%\)/);
});

test('Pleats keeps the Perspective viewport on the four Figma image bounds', () => {
  const html = read('pleats-mama.html');
  const css = read('pleats-mama.css');
  const js = read('pleats-mama.js');

  assert.match(html, /class="pleats-perspective"[^>]*data-figma-id="24:130"/);
  assert.match(css, /\.pleats-perspective-viewport\{[^}]*left:149\.6317px;[^}]*top:3035\.7412px;[^}]*width:814\.8912px;[^}]*height:461\.545px;/);
  assert.match(css, /\.pleats-perspective\{[^}]*position:absolute;[^}]*border-radius:10px;/);
  assert.doesNotMatch(css, /\.pleats-perspective[^}]*transition:/);
  assert.doesNotMatch(js, /requestAnimationFrame|addEventListener\(['"]scroll/);
});

test('Perspective exposes all four Figma states and a clipped next control', () => {
  const html = read('pleats-mama.html');
  const css = read('pleats-mama.css');
  const js = read('pleats-mama.js');
  const data = loadPleatsData();

  assert.deepEqual(Array.from(data.perspectives, (slide) => slide.floorLabel), [
    '1F. Floor plan',
    '2F. Floor plan',
    '2F. Floor plan',
    '1F. Floor plan',
  ]);
  assert.equal(data.perspectives.length, 4);
  for (const slide of data.perspectives) {
    assert.ok(fs.existsSync(path.join(workspace, slide.main.src)), `${slide.main.src} must exist`);
    assert.ok(fs.existsSync(path.join(workspace, slide.plan.src)), `${slide.plan.src} must exist`);
    assert.ok(slide.description.trim().length > 0);
  }

  assert.match(html, /class="pleats-perspective-viewport"[^>]*data-pleats-perspective/);
  assert.match(html, /<button[^>]*data-pleats-next[^>]*aria-label="다음 공간 이미지 보기"/);
  assert.match(css, /\.pleats-perspective-viewport\{[^}]*overflow:hidden;/);
  assert.match(js, /\.animate\(/);
});

test('each Perspective floor plan and pink marker use their matching Figma geometry', () => {
  const data = loadPleatsData();
  const js = read('pleats-mama.js');

  assert.deepEqual(Array.from(data.perspectives, (slide) => ({
    planId: slide.plan.id,
    planX: slide.plan.transform.m02,
    planY: slide.plan.transform.m12,
    markerX: slide.marker.transform.m02,
    markerY: slide.marker.transform.m12,
  })), [
    { planId: '24:6', planX: 901.216796875, planY: 3407.498046875, markerX: 1119.4678707199944, markerY: 3124.6249308352362 },
    { planId: '24:138', planX: 897.2119140625, planY: 3420.69384765625, markerX: 1016.7734399066318, markerY: 3125.410835828898 },
    { planId: '24:268', planX: 897.2119140625, planY: 3420.69384765625, markerX: 1128.1658029639, markerY: 3124.8639776970094 },
    { planId: '24:399', planX: 901.2767333984375, planY: 3407.498046875, markerX: 1211.2907819183863, markerY: 3125.165642932852 },
  ]);
  for (const slide of data.perspectives) assert.ok(slide.plan.fillTransform);
  assert.equal(data.perspectives[1].marker.size.x, 73.34452540457825);
  assert.equal(data.perspectives[1].marker.size.y, 141.68487689129313);

  assert.match(js, /planFrame\.style\.transform = matrix\(slide\.plan\.transform\)/);
  assert.match(js, /core\.imageFillBounds\(slide\.plan\.size, slide\.plan\.fillTransform\)/);
});

test('Perspective uses the user-supplied first and second floor plans', () => {
  const data = loadPleatsData();
  const sources = Array.from(data.perspectives, (slide) => slide.plan.src);

  assert.deepEqual(sources, [
    'assets/pleats-mama/floorplan-1f-custom.png',
    'assets/pleats-mama/floorplan-2f-custom.png',
    'assets/pleats-mama/floorplan-2f-custom.png',
    'assets/pleats-mama/floorplan-1f-custom.png',
  ]);

  const dimensions = new Map([
    ['assets/pleats-mama/floorplan-1f-custom.png', [1220, 1596]],
    ['assets/pleats-mama/floorplan-2f-custom.png', [1239, 1629]],
  ]);
  for (const [source, [width, height]] of dimensions) {
    const buffer = fs.readFileSync(path.join(workspace, source));
    assert.equal(buffer.readUInt32BE(16), width);
    assert.equal(buffer.readUInt32BE(20), height);
  }
});

test('Perspective exposes a 160 pixel offset cursor-following 200 percent magnifier', () => {
  const css = read('pleats-mama.css');
  const js = read('pleats-mama.js');

  assert.match(css, /\.pleats-plan-magnifier\{[^}]*width:160px;[^}]*height:160px;[^}]*overflow:hidden/);
  assert.match(css, /\[data-figma-id="24:6"\]\{[^}]*cursor:zoom-in/);
  assert.match(js, /core\.magnifierFrame\([^)]*,[^)]*,\s*160,\s*10,\s*10\)/);
  assert.match(js, /core\.magnifierTransform\([^)]*,[^)]*,\s*2\)/);
  assert.match(js, /pointerenter/);
  assert.match(js, /pointermove/);
  assert.match(js, /pointerleave/);
});

test('Pleats generated data comes from the approved frame and resolves local image assets', () => {
  const data = read('pleats-mama-data.js');

  assert.match(data, /rootId:\s*['"]24:5['"]/);
  assert.match(data, /sourceWidth:\s*1440/);
  assert.match(data, /sourceHeight:\s*4097/);
  assert.match(data, /id:\s*['"]24:130['"]/);
  assert.doesNotMatch(data, /ref\.figma/);

  const sources = [...data.matchAll(/src:\s*['"]([^'"]+)['"]/g)].map((match) => match[1]);
  assert.ok(sources.length > 0, 'at least one Figma image asset must be generated');
  for (const source of sources) {
    assert.ok(fs.existsSync(path.join(workspace, source)), `${source} must exist`);
  }
});

test('both portfolio variants link Pleats to its detail page', () => {
  for (const file of ['index.html', 'spatial.html']) {
    assert.match(
      read(file),
      /href="pleats-mama\.html"[^>]*><strong>PLEATS MAMA STORE<\/strong><span class="details"><span>first offline store<\/span>/,
    );
  }
});

test('Pleats navigation keeps a fixed paper-to-transparent gradient behind its links', () => {
  const css = read('pleats-mama.css');

  assert.match(css, /\.pleats-header::before\{[^}]*position:absolute;[^}]*height:120px;[^}]*pointer-events:none/);
  assert.match(css, /background:linear-gradient\(180deg,#fffaf9 0%,rgba\(255,250,249,\.94\) 48%,rgba\(255,250,249,0\) 100%\)/);
  assert.match(css, /\.pleats-header nav\{[^}]*position:relative;[^}]*z-index:1;/);
});

test('Pleats labels Store Spatial Design with the shared project bullet', () => {
  const css = read('pleats-mama.css');
  assert.match(css, /\[data-figma-id="24:21"\]::before\{[^}]*content:"▪";/);
});

test('User Experience retains the original Figma L-shaped dotted customer route', () => {
  const data = loadPleatsData();
  const route = findLayer(data.layers, '24:38');

  assert.ok(route, 'Figma layer 24:38 must be rendered');
  assert.equal(route.name, 'Vector 4704');
  assert.deepEqual({ ...route.size }, { x: 1051.0992431640625, y: 715.0919799804688 });
  assert.deepEqual([...route.dash], [4, 4]);
  assert.equal(route.paths.length, 1);
});

test('User Experience uses stationary opacity-only reveals', () => {
  const css = read('pleats-mama.css');
  const js = read('pleats-mama.js');

  assert.match(css, /\.pleats-ux-step\{[^}]*opacity:0;[^}]*transition:opacity/);
  assert.match(css, /\.pleats-ux-scene\.is-visible \.pleats-ux-step\{[^}]*opacity:var\(--ux-final-opacity\);/);
  assert.doesNotMatch(css, /\.pleats-ux-step\{[^}]*(?:translate|transform):/);
  assert.doesNotMatch(css, /\.pleats-ux-connector\{[^}]*clip-path:/);
  assert.match(js, /style\.removeProperty\(['"]opacity['"]\)/);
  assert.match(js, /IntersectionObserver/);
});

test('the L-shaped route mask completes its vertical reveal before starting horizontally', () => {
  const css = read('pleats-mama.css');
  const js = read('pleats-mama.js');

  assert.match(js, /Object\.entries\(\{ vertical: reveal\.vertical, horizontal: reveal\.horizontal \}\)/);
  assert.match(js, /`pleats-ux-route-mask--\$\{direction\}`/);
  assert.match(css, /\.pleats-ux-route-mask--vertical\{[^}]*scaleY\(0\)/);
  assert.match(css, /\.pleats-ux-route-mask--horizontal\{[^}]*scaleX\(0\)/);
  assert.match(css, /\.pleats-ux-route-mask--horizontal\{[^}]*transition-delay:calc\(var\(--ux-delay\) \+ var\(--ux-route-duration\)\)/);
});
