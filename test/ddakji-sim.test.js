import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DdakjiSim,
  runDdakjiHeadless,
  MIN_DDAKJI_PLAYERS,
  MAX_DDAKJI_PLAYERS,
  DDAKJI_DURATIONS,
  DEFAULT_DDAKJI_DURATION,
  DEFAULT_DDAKJI_RULE,
  normalizeDdakjiDuration,
  ddakjiVariant,
  DDAKJI_POPUPS,
} from '../public/js/ddakji-sim.js';

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

test('Ddakji Flip-Out durations and variants normalize cleanly', () => {
  assert.deepEqual(DDAKJI_DURATIONS.map((d) => d.seconds), [120, 60, 30, 15, 10]);
  assert.equal(DEFAULT_DDAKJI_DURATION, 15);
  assert.equal(DEFAULT_DDAKJI_RULE, 'champion');
  assert.equal(normalizeDdakjiDuration(15), 15);
  assert.equal(normalizeDdakjiDuration(28), 30);
  assert.equal(normalizeDdakjiDuration('bad'), 15);
  assert.equal(ddakjiVariant(10).volleys, 3);
  assert.equal(ddakjiVariant(30).volleys, 5);
  assert.equal(ddakjiVariant(120).volleys, 7);
  assert.ok(Object.keys(DDAKJI_POPUPS).length >= 5);
});

test('DdakjiSim enforces player bounds and completes cleanly in Champion and Recruiter rules', () => {
  assert.throws(() => new DdakjiSim({ names: ['Solo'] }));
  const tooMany = Array.from({ length: MAX_DDAKJI_PLAYERS + 1 }, (_, i) => `P${i + 1}`);
  assert.throws(() => new DdakjiSim({ names: tooMany }));

  const names = ['Ada', 'Grace', 'Linus', 'Hedy', 'Alan', 'Margaret'];
  for (const rule of ['champion', 'recruiter']) {
    for (const duration of [10, 15, 30]) {
      const sim = runDdakjiHeadless(names, { duration, rule, rng: seeded(2026 + duration) });
      assert.equal(sim.done, true, `rule=${rule} duration=${duration} finishes`);
      assert.ok(sim.winner, `rule=${rule} duration=${duration} has winner`);
      assert.ok(names.includes(sim.winner.name));
      assert.equal(sim.tiles.length, names.length);
      for (const tile of sim.tiles) {
        assert.ok(Number.isFinite(tile.x) && Number.isFinite(tile.z) && Number.isFinite(tile.theta), 'finite tile coords');
        assert.ok(tile.theta >= 0 && tile.theta <= Math.PI, 'valid flip angle');
      }
      assert.equal(sim.standings().length, names.length);
    }
  }
  assert.equal(MIN_DDAKJI_PLAYERS, 2);
});
