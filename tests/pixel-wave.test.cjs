const test = require('node:test');
const assert = require('node:assert/strict');

const { createAutoImpactScheduler } = require('../pixel-wave.js');

test('automatic impacts repeat at varied half-second intervals until stopped', () => {
  const scheduled = [];
  const cancelled = [];
  const impacts = [];
  const randomValues = [0.25, 0.75, 0.5, 0.1, 0.9, 0.4];
  const scheduler = createAutoImpactScheduler({
    random: () => randomValues.shift(),
    schedule(callback, delay) {
      scheduled.push({ callback, delay, id: scheduled.length + 1 });
      return scheduled.length;
    },
    cancel: (id) => cancelled.push(id),
    impact: (point) => impacts.push(point),
  });

  scheduler.start();
  assert.equal(scheduled[0].delay, 500);
  scheduled[0].callback();
  assert.deepEqual(impacts[0], { x: 0.75, y: 0.5 });
  assert.equal(scheduled[1].delay, 440);

  scheduler.stop();
  assert.deepEqual(cancelled, [2]);
  scheduled[1].callback();
  assert.equal(impacts.length, 1);
});
