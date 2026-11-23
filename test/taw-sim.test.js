import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TawSim,
  runTawHeadless,
  MIN_TAW_PLAYERS,
  MAX_TAW_PLAYERS,
  TAW_DURATIONS,
  DEFAULT_TAW_DURATION,
  DEFAULT_TAW_RULE,
  normalizeTawDuration,
  tawVariant,
  TAW_POPUPS,
} from '../public/js/taw-sim.js';

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

test('Taw Knockout durations and variants normalize cleanly', () => {
  assert.deepEqual(TAW_DURATIONS.map((d) => d.seconds), [120, 60, 30, 15, 10]);
  assert.equal(DEFAULT_TAW_DURATION, 15);
  assert.equal(DEFAULT_TAW_RULE, 'champion');
  assert.equal(normalizeTawDuration(15), 15);
  assert.equal(normalizeTawDuration(28), 30);
  assert.equal(normalizeTawDuration('bad'), 15);
  assert.equal(tawVariant(10).volleys, 3);
  assert.equal(tawVariant(30).volleys, 5);
  assert.equal(tawVariant(120).volleys, 7);
  assert.ok(Object.keys(TAW_POPUPS).length >= 5);
});

test('TawSim enforces player bounds and completes cleanly in Champion and Keepsies rules', () => {
  assert.throws(() => new TawSim({ names: ['Solo'] }));
  const tooMany = Array.from({ length: MAX_TAW_PLAYERS + 1 }, (_, i) => `P${i + 1}`);
  assert.throws(() => new TawSim({ names: tooMany }));

  const names = ['Ada', 'Grace', 'Linus', 'Hedy', 'Alan', 'Margaret'];
  for (const rule of ['champion', 'keepsies']) {
    for (const duration of [10, 15, 30]) {
      const sim = runTawHeadless(names, { duration, rule, rng: seeded(2026 + duration) });
      assert.equal(sim.done, true, `rule=${rule} duration=${duration} finishes`);
      assert.ok(sim.winner, `rule=${rule} duration=${duration} has winner`);
      assert.ok(names.includes(sim.winner.name));
      assert.equal(sim.marbles.length, names.length);
      for (const m of sim.marbles) {
        assert.ok(Number.isFinite(m.x) && Number.isFinite(m.z), 'finite marble coords');
      }
      assert.ok(sim.ringRadius > 0 && sim.ringRadius <= sim.baseRadius);
      assert.equal(sim.standings().length, names.length);
    }
  }
  assert.equal(MIN_TAW_PLAYERS, 2);
});
