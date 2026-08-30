const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');

const script = fs.readFileSync(path.resolve(__dirname, '..', 'hyundai.js'), 'utf8');

function runCountUp({ reducedMotion = false } = {}) {
  const counters = [
    { dataset: { count: '1048' }, textContent: '1,048' },
    { dataset: { count: '874' }, textContent: '874' },
    { dataset: { count: '474' }, textContent: '474' },
  ];
  const results = {};
  const frames = [];
  const observers = [];

  class IntersectionObserverMock {
    constructor(callback) {
      this.callback = callback;
      this.disconnected = false;
      observers.push(this);
    }
    observe(target) { this.target = target; }
    disconnect() { this.disconnected = true; }
  }

  vm.runInNewContext(script, {
    document: {
      querySelectorAll(selector) {
        if (selector === '.hyundai-reel') return [];
        if (selector === '.hyundai-stat strong[data-count]') return counters;
        return [];
      },
      querySelector(selector) {
        return selector === '.hyundai-results' ? results : null;
      },
    },
    window: { matchMedia: () => ({ matches: reducedMotion }) },
    IntersectionObserver: IntersectionObserverMock,
    requestAnimationFrame: (callback) => frames.push(callback),
  });

  return { counters, results, frames, observers };
}

test('all three view counts animate together to their formatted targets', () => {
  const state = runCountUp();
  assert.deepEqual(state.counters.map((counter) => counter.textContent), ['0', '0', '0']);
  assert.equal(state.observers.length, 1);

  const observer = state.observers[0];
  observer.callback([{ isIntersecting: true }], observer);
  assert.equal(state.frames.length, 1, 'all counters should share one animation frame loop');
  for (const timestamp of [100, 800, 1500]) {
    const callbacks = state.frames.splice(0);
    callbacks.forEach((callback) => callback(timestamp));
  }

  assert.deepEqual(state.counters.map((counter) => counter.textContent), ['1,048', '874', '474']);
  assert.equal(observer.disconnected, true);
});

test('count-up uses the faster 900ms duration', () => {
  assert.match(script, /const duration = 900;/);
});

test('reduced-motion users see final view counts without animation', () => {
  const state = runCountUp({ reducedMotion: true });
  assert.deepEqual(state.counters.map((counter) => counter.textContent), ['1,048', '874', '474']);
  assert.equal(state.observers.length, 0);
  assert.equal(state.frames.length, 0);
});
