const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const workspace = path.resolve(__dirname, '..');
const core = require('../home-reel-core.js');
const read = (filename) => fs.readFileSync(path.join(workspace, filename), 'utf8');

test('Pulio reel chooses ten unique DA images while avoiding recent repeats', () => {
  const deck = core.createDeck(47, 10, () => 0.25, [1, 2, 3]);
  assert.equal(deck.length, 10);
  assert.equal(new Set(deck).size, 10);
  assert.ok(deck.every((number) => number >= 1 && number <= 47));
  assert.ok(deck.every((number) => ![1, 2, 3].includes(number)));
});

test('both portfolio pages expose the Pulio three-image vertical reel', () => {
  for (const filename of ['index.html', 'spatial.html']) {
    const html = read(filename);
    assert.match(html, /class="pulio-da-reel" data-pulio-da-reel/);
    assert.match(html, /class="pulio-da-track"/);
    assert.match(html, /home-reel-core\.js/);
  }
});

test('Pulio reel uses rounded images and opposite edge fades', () => {
  const css = read('styles.css');
  const js = read('script.js');

  assert.match(css, /\.pulio-da-reel\{[^}]*width:590px;[^}]*height:720px;[^}]*overflow:hidden/);
  assert.match(css, /mask-image:linear-gradient\(to bottom,transparent 0,#000 18%,#000 82%,transparent 100%\)/);
  assert.match(css, /\.pulio-da-track\{[^}]*left:25px;[^}]*width:350px;[^}]*gap:20px/);
  assert.match(css, /\.pulio-da-track img\{[^}]*width:350px;[^}]*height:350px;[^}]*border-radius:10px/);
  assert.match(js, /assets\/pulio\/da\/da-/);
  assert.match(js, /createDeck\(47,\s*10/);
  assert.match(js, /getBoundingClientRect\(\)\.height \+ 20/);
  assert.match(js, /prefers-reduced-motion/);
});

test('Data Center reel includes all nine curated images in a fixed infinite sequence', () => {
  const js = read('script.js');
  const filenames = [
    '07b224d1a42de03d5813255aaad61ddeef3c223a.png',
    '1fa4582d43b7ce79a1bdb6368ddfd9f975e32b30.png',
    '5ff1329122835b6573924f4433a16d9ff3dde325.png',
    '6d748280a7354fbba2fb3087f7808cb798181ab2.png',
    '7304c4477e0fc69b94af869a87a8fda9c580b753.jpg',
    '87b2a8f8525f9c25fef3e576adc1902aa94fc8f7.png',
    'b5a8cadfbc4ea3197df827410380bcaa4ac55de8.png',
    'c95348b5292a7793cb148cf4d3b95338b9f0ae9d.png',
    'e85427fb4450391ca08f19826c60cff6539b5f50.png',
  ];

  filenames.forEach((filename) => assert.match(js, new RegExp(filename.replace('.', '\\.'))));
  assert.match(js, /data-project="DATA CENTER"/);
  assert.match(js, /appendChild\(firstImage\)/);
});

test('Data Center uses pre-cropped images at a 450px content width without runtime clipping', () => {
  const css = read('styles.css');
  const js = read('script.js');

  assert.match(css, /--reel-image-width:450px/);
  assert.match(js, /assets\/data-center\/scroll\//);
  assert.doesNotMatch(js, /visibleWidth|visibleHeight|450\s*\/\s*item/);
  assert.match(css, /\.data-center-reel-image\{[^}]*width:450px;[^}]*height:auto;[^}]*border-radius:10px/);
  assert.match(css, /\.data-center-reel-image img\{[^}]*width:100%;[^}]*height:auto;[^}]*border-radius:10px/);

  for (const filename of [
    '07b224d1a42de03d5813255aaad61ddeef3c223a.png',
    '1fa4582d43b7ce79a1bdb6368ddfd9f975e32b30.png',
    '5ff1329122835b6573924f4433a16d9ff3dde325.png',
    '6d748280a7354fbba2fb3087f7808cb798181ab2.png',
    '7304c4477e0fc69b94af869a87a8fda9c580b753.jpg',
    '87b2a8f8525f9c25fef3e576adc1902aa94fc8f7.png',
    'b5a8cadfbc4ea3197df827410380bcaa4ac55de8.png',
    'c95348b5292a7793cb148cf4d3b95338b9f0ae9d.png',
    'e85427fb4450391ca08f19826c60cff6539b5f50.png',
  ]) assert.ok(fs.existsSync(path.join(workspace, 'assets', 'data-center', 'scroll', filename)));
});

test('Hyundai reel loops the available 4-to-11 images in numeric order at the requested size', () => {
  const js = read('script.js');
  const css = read('styles.css');
  const ordered = ['4.jpg', '6.jpg', '10.jpg', '11.jpg'];
  const positions = ordered.map((filename) => js.indexOf(`file: '${filename}'`));

  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  assert.match(js, /hyundai-project-link/);
  assert.match(css, /\.hyundai-reel-image\{[^}]*width:540px;[^}]*height:263\.83px/);
});

test('the last selected project reel remains active after pointer and focus leave', () => {
  const js = read('script.js');

  assert.doesNotMatch(js, /addEventListener\(['"]mouseleave['"]/);
  assert.doesNotMatch(js, /addEventListener\(['"]blur['"]/);
  assert.match(js, /data-project="PULIO JAPAN TEAM"[\s\S]*?mouseenter['"],\s*fillPulio/);
  assert.match(js, /mouseenter['"],\s*fillDataCenter/);
  assert.match(js, /mouseenter['"],\s*fillHyundai/);
});

test('Pleats Mama reel starts with 1.png and loops every supplied scroll image', () => {
  const js = read('script.js');
  const ordered = [
    '1.png',
    '59ef942f17f13c16104725ddd7c4a34137a5565c.png',
    '7b287e9f512745548fa3ab8f01370e9f1426bfe7.png',
    'd0f87fb0bf2c4d1c28c6b833f9fd0b5a1ddf6e25.png',
    'fe190d8412f370a5b6578b479b5d742dff61d38c.png',
  ];
  const positions = ordered.map((filename) => js.indexOf(`file: '${filename}'`));

  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  assert.match(js, /assets\/pleats-mama\/scroll\//);
  assert.match(js, /pleats-project-link[\s\S]*?mouseenter['"],\s*fillPleats/);
});

test('Pleats Mama reel preserves image proportions at 450px with rounded corners', () => {
  const css = read('styles.css');

  assert.match(css, /\.pleats-reel-image\{[^}]*width:450px;[^}]*height:auto;[^}]*border-radius:10px;[^}]*object-fit:contain/);
});
