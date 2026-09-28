const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('Pulio configures offscreen gallery images before assigning their source', () => {
  const requests = [];
  const containers = { '#da-gallery': { appendChild() {} }, '#jp-gallery': { appendChild() {} } };
  class Image {
    set src(value) { requests.push({ src: value, loading: this.loading, decoding: this.decoding }); }
  }
  const assets = require('../pulio-assets.js');
  const context = {
    Image,
    window: { PulioAssets: assets, PulioCore: { ...require('../pulio-core.js'), bindClickToPlay() {} } },
    document: { querySelector: s => containers[s], createElement: () => ({ appendChild() {} }), querySelectorAll: () => [], addEventListener() {}, documentElement: { lang: 'ko' } },
  };
  if (fs.existsSync('media-loader.js')) vm.runInNewContext(fs.readFileSync('media-loader.js', 'utf8'), context);
  vm.runInNewContext(fs.readFileSync('pulio.js', 'utf8'), context);
  assert.equal(requests.length, 67);
  assert(requests.every(image => image.loading === 'lazy'), 'offscreen images must not start eager requests');
  assert(requests.every(image => image.decoding === 'async'));
});

test('every Pulio video waits for playback instead of preloading media', () => {
  const html = fs.readFileSync('pulio.html', 'utf8');
  const videos = [...html.matchAll(/<video\b[^>]*>/g)];
  assert.equal(videos.length, 4);
  for (const [tag] of videos) assert.match(tag, /preload="none"/);
});

test('media loader selects the smaller asset and reserves image geometry before loading', () => {
  const context = { window: { PortfolioMediaAssets: { 'original.png': { src: 'small.webp', width: 320, height: 640 } } } };
  const script = fs.existsSync('media-loader.js') ? fs.readFileSync('media-loader.js', 'utf8') : '';
  vm.runInNewContext(script, context);
  assert.equal(typeof context.window.PortfolioMedia?.image, 'function');
  let requested;
  const image = { set src(value) { requested = { value, width: this.width, height: this.height, loading: this.loading }; } };
  context.window.PortfolioMedia.image(image, 'original.png');
  assert.deepEqual(requested, { value: 'small.webp', width: 320, height: 640, loading: 'lazy' });
  context.window.PortfolioMedia.image(image, 'new-image.png', false);
  assert.equal(requested.value, 'new-image.png');
  assert.equal(requested.loading, 'eager');
});

test('offscreen video posters do not download until their own video approaches the viewport', () => {
  let callback;
  const watched = [];
  const context = { window: { IntersectionObserver: class {
    constructor(fn) { callback = fn; }
    observe(element) { watched.push(element); }
    unobserve(element) { watched.splice(watched.indexOf(element), 1); }
  } } };
  vm.runInNewContext(fs.existsSync('media-loader.js') ? fs.readFileSync('media-loader.js', 'utf8') : '', context);
  assert.equal(typeof context.window.PortfolioMedia?.poster, 'function');
  const first = {}, second = {};
  context.window.PortfolioMedia.poster(first, 'first.png');
  context.window.PortfolioMedia.poster(second, 'second.png');
  assert.equal(first.poster, undefined);
  assert.equal(second.poster, undefined);
  callback([{ target: first, isIntersecting: true }]);
  assert.equal(first.poster, 'first.png');
  assert.equal(second.poster, undefined);
  assert.deepEqual(watched, [second]);
});

test('home preview waits until visible and never downloads hidden mobile previews', () => {
  for (const mobile of [false, true]) {
    const requested = [];
    const observers = [];
    const events = {};
    const motion = { matches: false, addEventListener(name, fn) { this.changed = fn; } };
    const track = { style: {}, children: [], replaceChildren() { this.children = []; }, appendChild(image) { this.children.push(image); }, addEventListener(name, fn) { events[name] = fn; } };
    const reel = { querySelector: () => track, classList: { add() {}, remove() {} } };
    const context = {
      requestAnimationFrame() {},
      document: { hidden: false, querySelector: () => reel, querySelectorAll: () => [], createElement: () => ({}), addEventListener() {} },
      window: {
        HomeReelCore: require('../home-reel-core.js'),
        PortfolioMedia: { image: (image, src) => requested.push(src) },
        matchMedia: query => query.includes('reduced-motion') ? motion : ({ matches: mobile, addEventListener() {} }),
      },
      IntersectionObserver: class { constructor(fn) { observers.push(fn); } observe() {} },
    };
    context.window.IntersectionObserver = context.IntersectionObserver;
    const source = fs.readFileSync('script.js', 'utf8');
    vm.runInNewContext(source.slice(source.indexOf('\n(() => {'), source.indexOf('const infoSections')), context);
    assert.equal(requested.length, 0, 'home entry should not fetch the lower-page preview');
    for (const callback of observers) callback([{ isIntersecting: true }]);
    assert.equal(requested.length, mobile ? 0 : 4);
    track.style.transition = 'transform 2500ms linear';
    motion.matches = true;
    motion.changed?.();
    assert.equal(track.style.transition, 'none', 'live reduced motion must stop the active transition');
    for (const callback of observers) callback([{ isIntersecting: false }]);
    events.transitionend?.({ propertyName: 'transform' });
    assert.equal(requested.length, mobile ? 0 : 4, 'offscreen animation must stop fetching more images');
  }
});
