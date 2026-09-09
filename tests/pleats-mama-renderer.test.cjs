const test = require('node:test');
const assert = require('node:assert/strict');

const core = require('../pleats-mama-core.js');

test('an image-filled vector renders as an image instead of a fallback vector box', () => {
  assert.equal(core.layerKind({ src: 'zoning.png', paths: [{ d: 'M0 0H480V628H0Z' }] }), 'image');
});

test('Figma stretch transforms retain the intended crop inside an image frame', () => {
  const bounds = core.imageFillBounds(
    { x: 111.9521484375, y: 118.35498046875 },
    { m00: 0.3972068428993225, m02: 0.3025436997413635, m11: 0.31502005457878113, m12: 0.33979958295822144 },
  );

  assert.ok(Math.abs(bounds.x - -85.27148458734) < 0.001);
  assert.ok(Math.abs(bounds.y - -127.6648023507) < 0.001);
  assert.ok(Math.abs(bounds.w - 281.8484888637) < 0.001);
  assert.ok(Math.abs(bounds.h - 375.7061772686) < 0.001);
});

test('text fill colors glyphs without painting a solid box behind the text', () => {
  assert.equal(core.layerBackground({ text: 'PLEATS MAMA.', fill: 'rgba(0,0,0,1)', src: null, paths: [] }), null);
  assert.equal(core.layerBackground({ text: null, fill: 'rgba(255,255,255,1)', src: null, paths: [] }), 'rgba(255,255,255,1)');
});

test('an SVG route paints only its path and never a rectangular element border', () => {
  const route = {
    paths: [{ d: 'M0 0V715H1051', kind: 'stroke', color: '#000' }],
    stroke: '#000',
    strokeWidth: 1,
    dash: [4, 4],
    text: null,
  };

  assert.equal(core.layerBorder(route), null);
  assert.deepEqual(
    core.layerBorder({ paths: [], stroke: '#000', strokeWidth: 1, dash: [4, 4], text: null }),
    { width: 1, color: '#000', style: 'dashed' },
  );
});

test('each space fades with the dotted route as it reaches that space', () => {
  const guide = core.uxPresentation('24:57');
  const customerRoute = core.uxPresentation('24:38');
  const experience = core.uxPresentation('24:67');
  const expression = core.uxPresentation('24:75');
  const record = core.uxPresentation('24:114');
  const experienceConnector = core.uxPresentation('24:108');
  const recordConnector = core.uxPresentation('24:111');

  assert.deepEqual(customerRoute, { step: 0, route: 'down-right', connector: true, delay: 0, duration: 0.72 });
  assert.deepEqual(guide, { step: 1, route: 'down', connector: false, delay: 0, duration: 0.72 });
  assert.deepEqual(experience, { step: 2, route: 'down', connector: false, delay: 0.36, duration: 0.72 });
  assert.deepEqual(expression, { step: 3, route: 'right', connector: false, delay: 0.72, duration: 0.72 });
  assert.deepEqual(record, { step: 4, route: 'right', connector: false, delay: 1.08, duration: 0.72 });
  assert.deepEqual(experienceConnector, { step: 2, route: 'down', connector: true, delay: 0.36, duration: 0.72 });
  assert.deepEqual(recordConnector, { step: 4, route: 'right', connector: true, delay: 1.08, duration: 0.72 });

  for (const id of ['24:39', '24:57', '24:63', '24:64', '24:65', '24:66', '24:88']) {
    assert.equal(core.uxPresentation(id).delay, 0, `${id} must fade with GUIDE SPACE`);
  }
  for (const id of ['24:67', '24:83', '24:108', '24:109']) {
    assert.equal(core.uxPresentation(id).delay, 0.36, `${id} must fade with EXPERIENCE SPACE`);
  }
  for (const id of ['24:74', '24:75', '24:82', '24:110']) {
    assert.equal(core.uxPresentation(id).delay, 0.72, `${id} must fade with EXPRESSION SPACE`);
  }
  for (const id of ['24:112', '24:113', '24:114', '24:111']) {
    assert.equal(core.uxPresentation(id).delay, 1.08, `${id} must fade with RECORD SPACE`);
  }
});

test('animated layers leave opacity control to CSS instead of an overriding inline opacity', () => {
  assert.deepEqual(core.opacityPlan(0.65, true), { inlineOpacity: null, finalOpacity: 0.65 });
  assert.deepEqual(core.opacityPlan(0.65, false), { inlineOpacity: 0.65, finalOpacity: null });
});

test('the main customer route reveals vertically before revealing horizontally', () => {
  assert.deepEqual(
    core.routeRevealPlan({ id: '24:38', size: { x: 1051.0992431640625, y: 715.0919799804688 } }),
    {
      duration: 0.72,
      vertical: { x: 0, y: 0, width: 2, height: 715.0919799804688 },
      horizontal: { x: 0, y: 713.0919799804688, width: 1051.0992431640625, height: 2 },
    },
  );
  assert.equal(core.routeRevealPlan({ id: '24:88', size: { x: 1, y: 200 } }), null);
});

test('Perspective advances through four states and loops without overshoot', () => {
  assert.equal(core.nextPerspectiveIndex(0, 4), 1);
  assert.equal(core.nextPerspectiveIndex(3, 4), 0);
  assert.deepEqual(core.perspectiveMotion(), {
    duration: 600,
    easing: 'cubic-bezier(.22,1,.36,1)',
    outgoing: [{ transform: 'translateX(0%)' }, { transform: 'translateX(-100%)' }],
    incoming: [{ transform: 'translateX(100%)' }, { transform: 'translateX(0%)' }],
  });
});

test('the floor-plan magnifier stays left of the pointer and tracks at 200 percent', () => {
  assert.deepEqual(
    core.magnifierFrame({ x: 920, y: 3060 }, { left: 900, top: 3000, right: 1432, bottom: 3407 }, 160, 10, 10),
    { left: 750, top: 3000, focusX: 80, focusY: 80 },
  );
  assert.deepEqual(
    core.magnifierFrame({ x: 1400, y: 3380 }, { left: 900, top: 3000, right: 1432, bottom: 3407 }, 160, 10, 10),
    { left: 1230, top: 3230, focusX: 80, focusY: 80 },
  );
  assert.equal(core.magnifierTransform({ x: 920, y: 3060 }, { focusX: 80, focusY: 80 }, 2), 'translate(-1760px, -6040px) scale(2)');
});
