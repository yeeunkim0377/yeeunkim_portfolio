const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

const workspace = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(workspace, 'data-center.html'), 'utf8');
const css = fs.readFileSync(path.join(workspace, 'data-center.css'), 'utf8');
const js = fs.readFileSync(path.join(workspace, 'data-center.js'), 'utf8');
const core = require(path.join(workspace, 'data-center-core.js'));

test('every physical-model image can toggle selection while unknown targets are ignored', () => {
  const selectableIds = ['model-01', 'model-02', 'model-03', 'model-04', 'model-05'];
  assert.equal(core.togglePhysicalModelSelection(null, 'model-03', selectableIds), 'model-03');
  assert.equal(core.togglePhysicalModelSelection('model-03', 'model-03', selectableIds), null);
  assert.equal(core.togglePhysicalModelSelection('model-02', 'unknown', selectableIds), 'model-02');
});

test('physical-model images resolve to the requested Figma description order', () => {
  assert.deepEqual(
    ['model-01', 'model-02', 'model-03', 'model-04', 'model-05'].map(core.physicalModelDescriptionId),
    ['description-03', 'description-01', 'description-02', 'description-04', 'description-05'],
  );
});

test('physical-model descriptions preserve spacing around expanded right and lower images', () => {
  assert.equal(core.physicalModelDescriptionShiftX('model-05', 294.736, 1.15), 22.1052);
  assert.equal(core.physicalModelDescriptionShiftX('model-04', 262.611, 1.15), 22.1052);
  assert.equal(core.physicalModelDescriptionShiftX('model-03', 223.328, 1.15), -16.7496);
  assert.equal(core.physicalModelDescriptionShiftY('model-03', 334.993, 1.15), 25.1245);
  assert.equal(core.physicalModelDescriptionShiftX('model-02', 294.736, 1.15), 0);
  assert.equal(core.physicalModelDescriptionShiftY('model-02', 336.72, 1.15), 0);
});

test('the center-top image click reaches the physical-model selection core', () => {
  const listeners = {};
  const classList = { toggle() {} };
  const selectable = {
    offsetLeft: 0, offsetTop: 0, offsetWidth: 100, offsetHeight: 100,
    dataset: { modelSelectable: 'model-02' }, classList, style: { setProperty() {} },
    addEventListener(type, handler) { listeners[type] = handler; },
    setAttribute() {},
  };
  const description = { setAttribute() {} };
  const model = {
    classList,
    querySelector(selector) { return selector === '[data-model-selectable]' ? selectable : description; },
    querySelectorAll() { return [selectable]; },
    addEventListener() {},
  };
  let ready;
  const document = {
    readyState: 'loading',
    querySelector(selector) { return selector === '[data-physical-model]' ? model : null; },
    addEventListener(type, handler) { if (type === 'DOMContentLoaded') ready = handler; },
  };
  vm.runInNewContext(js, { window: { DataCenterCore: core }, document });
  ready();
  assert.doesNotThrow(() => listeners.click({ stopPropagation() {} }));
  assert.equal(selectable.dataset.modelSelectable, 'model-02');
});

test('floor guide and physical model sections follow the existing carousel', () => {
  const carousel = html.indexOf('class="data-center-carousel"');
  const floorGuide = html.indexOf('data-floor-guide');
  const physicalModel = html.indexOf('data-physical-model');
  const mainEnd = html.indexOf('</main>');

  assert.notEqual(floorGuide, -1, 'floor guide section is missing');
  assert.notEqual(physicalModel, -1, 'physical model section is missing');
  assert.ok(carousel < floorGuide, 'floor guide must follow the existing carousel');
  assert.ok(floorGuide < physicalModel, 'floor guide must precede physical model');
  assert.ok(physicalModel < mainEnd, 'both sections must stay inside main');
});

test('the lower page exposes every fixed-Figma image and floor-guide label', () => {
  const imageSources = [...html.matchAll(/<img class="dc-figma-image" src="([^"]+)"/g)]
    .map((match) => match[1]);
  const labels = [
    'Collection zone',
    'Infrastructure zone',
    'Exchange zone',
    'Plant zone',
    'Public zone',
    'PROPOSAL DOWNLOAD',
  ];

  assert.equal(imageSources.length, 22, 'all 22 fixed-Figma image layers must be rendered');
  for (const source of imageSources) {
    assert.ok(fs.existsSync(path.join(workspace, source)), `missing image asset: ${source}`);
  }
  for (const label of labels) {
    assert.ok(html.includes(label), `missing Figma label: ${label}`);
  }
});

test('the complete ninth floor renders above the complete eighth floor', () => {
  const sourceIndex = (source) => html.indexOf(`src="${source}"`);
  const topOf = (source) => {
    const shot = html.match(new RegExp(`<span class="dc-floor-shot" style="[^"]*--y:([\\d.]+)px[^"]*"><img class="dc-figma-image" src="${source}"`));
    if (!shot) return Number.POSITIVE_INFINITY;

    const group = [...html.matchAll(/<button class="dc-floor-group" style="[^\"]*--gy:([\d.]+)px[^\"]*"[^>]*>([\s\S]*?)<\/button>/g)]
      .find((match) => match[2].includes(`src="${source}"`));
    return Number(shot[1]) + (group ? Number(group[1]) : 0);
  };

  assert.notEqual(sourceIndex('assets/data-center/floor-8-left.png'), -1, 'the fixed eighth-floor left image is missing');
  assert.ok(
    sourceIndex('assets/data-center/floor-9-right.png') < sourceIndex('assets/data-center/floor-8-left.png'),
    'the ninth-floor pair must precede the eighth-floor pair',
  );
  assert.ok(
    topOf('assets/data-center/floor-9-right.png') < topOf('assets/data-center/floor-8-right.png'),
    'the ninth floor must render above the eighth floor',
  );
});

test('the sixth-floor right image keeps its Figma horizontal offset', () => {
  const xOf = (source) => {
    const shot = html.match(new RegExp(`<span class="dc-floor-shot" style="[^\"]*--x:([\\d.]+)px[^\"]*"><img class="dc-figma-image" src="${source}"`));
    if (!shot) return Number.NaN;

    const group = [...html.matchAll(/<button class="dc-floor-group" style="[^\"]*--gx:([\d.]+)px[^\"]*"[^>]*>([\s\S]*?)<\/button>/g)]
      .find((match) => match[2].includes(`src="${source}"`));
    return Number(shot[1]) + (group ? Number(group[1]) : 0);
  };

  assert.equal(xOf('assets/data-center/floor-6-left.png'), 260.393);
  assert.equal(xOf('assets/data-center/floor-6-right.png'), 402.674);
});

test('only the six representative floors behave as unified interaction targets', () => {
  const groups = [...html.matchAll(/<button class="dc-floor-group"[^>]*data-floor="([^"]+)"[^>]*>([\s\S]*?)<\/button>/g)];
  const expectedSources = new Map([
    ['floor-8', ['assets/data-center/floor-8-left.png', 'assets/data-center/floor-8-right.png']],
    ['floor-6', ['assets/data-center/floor-6-left.png', 'assets/data-center/floor-6-right.png']],
    ['floor-5', ['assets/data-center/floor-5-left.png', 'assets/data-center/floor-5-right.png']],
    ['floor-3', ['assets/data-center/floor-3-left.png', 'assets/data-center/floor-3-right.png']],
    ['floor-12', ['assets/data-center/floor-12-left.png', 'assets/data-center/floor-12-right.png']],
    ['b1', ['assets/data-center/floor-b1.png']],
  ]);

  assert.deepEqual(groups.map((match) => match[1]).sort(), [...expectedSources.keys()].sort());
  for (const [, floor, contents] of groups) {
    const sources = [...contents.matchAll(/src="([^"]+)"/g)].map((match) => match[1]).sort();
    assert.deepEqual(sources, expectedSources.get(floor).sort(), `${floor} must animate as one complete floor`);
  }
});

test('representative floors share the approved hover and keyboard motion', () => {
  assert.match(html, /family=Gothic\+A1:wght@400;500;600;700/, 'the exact 600 weight used by detail labels must be loaded');
  assert.match(css, /\.dc-floor-group\{[^}]*pointer-events:auto/, 'the complete grouped floor hit area must be clickable');
  assert.match(css, /\.dc-floor-group\{[^}]*transform-origin:center[^}]*transition:transform 280ms cubic-bezier\(\.22,1,\.36,1\),filter 280ms cubic-bezier\(\.22,1,\.36,1\)/);
  assert.match(css, /\.dc-floor-group:is\(:hover,:focus-visible\)\{[^}]*transform:scale\(1\.15\)[^}]*filter:drop-shadow\(0 0 4px rgba\(0,0,0,\.25\)\)/);
  const reducedMotion = css.match(/@media\(prefers-reduced-motion:reduce\)\{([\s\S]*)\}\s*$/)?.[1] ?? '';
  assert.match(reducedMotion, /\.dc-floor-group\{transition:none\}/, 'floor transitions must be disabled');
  assert.match(reducedMotion, /\.dc-floor-group:is\(:hover,:focus-visible\)\{transform:none\}/, 'floor scaling must be disabled');
});

test('floor details use a fixed full-viewport canvas instead of a section overlay', () => {
  assert.ok(html.indexOf('data-floor-detail hidden') > html.indexOf('</main>'), 'the full-screen detail must not be clipped by the floor-guide section');
  assert.match(css, /\.dc-floor-detail\{[^}]*position:fixed[^}]*width:100vw[^}]*height:100dvh/);
  assert.match(css, /\.dc-floor-detail-canvas\{[^}]*width:1440px[^}]*height:1048px[^}]*scale\(var\(--dc-detail-scale\)\)/);
  assert.match(css, /\.data-center-body\.is-floor-detail-open\{[^}]*overflow:hidden/);
});

test('the complete floor-detail canvas sits fifty pixels above viewport center', () => {
  assert.match(css, /\.dc-floor-detail-canvas\{[^}]*top:calc\(50% - 50px\)/);
});

test('moved detail images are not cropped by the fixed 1440px canvas boundary', () => {
  assert.match(css, /\.dc-floor-detail-canvas\{[^}]*overflow:visible/);
  assert.match(css, /\.dc-floor-detail-stage\{[^}]*overflow:visible/);
});

test('all upward navigation icons use a centered 90% equilateral triangle', () => {
  assert.match(css, /\.dc-floor-detail-next\{[^}]*display:grid[^}]*place-items:center/);
  assert.match(css, /\.dc-floor-detail-next span\{[^}]*width:90%[^}]*height:auto[^}]*aspect-ratio:2\/1\.732050808/);
  assert.match(css, /\.dc-floor-detail-next\[hidden\]\{display:none\}/);
  assert.match(js, /nextButton\.hidden\s*=\s*atTop/);
});

test('detail pages expose a matching downward navigation button', () => {
  assert.match(html, /class="dc-floor-detail-previous"[^>]*data-floor-detail-previous/);
  assert.match(css, /\.dc-floor-detail-previous\{[^}]*top:680px[^}]*display:grid[^}]*place-items:center/);
  assert.match(css, /\.dc-floor-detail-previous span\{[^}]*width:90%[^}]*aspect-ratio:2\/1\.732050808[^}]*polygon\(0 0,100% 0,50% 100%\)/);
});

test('downward floor navigation uses the reverse vertical transition', () => {
  const js = fs.readFileSync(path.join(workspace, 'data-center.js'), 'utf8');
  assert.match(js, /previousFloorIndex\(currentIndex, frames\.length\)/);
  assert.match(js, /showFrame\([^\n]*'down'\)/);
  assert.match(css, /\.dc-floor-detail-page\.is-entering-down\{[^}]*translate3d\(0,88px,0\)/);
  assert.match(css, /\.dc-floor-detail-page\.is-leaving-down\{[^}]*translate3d\(0,-88px,0\)/);
});

test('the downward button is hidden on B1F where no lower floor exists', () => {
  const js = fs.readFileSync(path.join(workspace, 'data-center.js'), 'utf8');
  assert.match(js, /previousButton\.hidden = atBottom/);
  assert.match(css, /\.dc-floor-detail-previous\[hidden\]\{display:none\}/);
});
