import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NokabeSim,
  runNokabeHeadless,
  MIN_NOKABE_PLAYERS,
  MAX_NOKABE_PLAYERS,
  NOKABE_DURATIONS,
  DEFAULT_NOKABE_DURATION,
  DEFAULT_NOKABE_RULE,
  normalizeNokabeDuration,
  nokabeVariant,
  NOKABE_POPUPS,
} from '../public/js/nokabe-sim.js';

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

test('Nōkabe Wall Crunch durations and variants normalize cleanly', () => {
  assert.deepEqual(NOKABE_DURATIONS.map((d) => d.seconds), [120, 60, 30, 15, 10]);
  assert.equal(DEFAULT_NOKABE_DURATION, 15);
  assert.equal(DEFAULT_NOKABE_RULE, 'dry');
  assert.equal(normalizeNokabeDuration(15), 15);
  assert.equal(normalizeNokabeDuration(28), 30);
  assert.equal(normalizeNokabeDuration('bad'), 15);
  assert.equal(nokabeVariant(10).walls, 3);
  assert.equal(nokabeVariant(30).walls, 6);
  assert.equal(nokabeVariant(120).walls, 9);
  assert.ok(Object.keys(NOKABE_POPUPS).length >= 5);
});

test('NokabeSim enforces player bounds and completes cleanly in Dry Champion and Canary rules', () => {
  assert.throws(() => new NokabeSim({ names: ['Solo'] }));
  const tooMany = Array.from({ length: MAX_NOKABE_PLAYERS + 1 }, (_, i) => `P${i + 1}`);
  assert.throws(() => new NokabeSim({ names: tooMany }));

  const names = ['Ada', 'Grace', 'Linus', 'Hedy', 'Alan', 'Margaret'];
  for (const rule of ['dry', 'canary']) {
    for (const duration of [10, 15, 30]) {
      const sim = runNokabeHeadless(names, { duration, rule, rng: seeded(2026 + duration) });
      assert.equal(sim.done, true, `rule=${rule} duration=${duration} finishes`);
      assert.ok(sim.winner, `rule=${rule} duration=${duration} has winner`);
      assert.ok(names.includes(sim.winner.name));
      assert.equal(sim.devs.length, names.length);
      for (const d of sim.devs) {
        assert.ok(Number.isFinite(d.x) && Number.isFinite(d.y) && Number.isFinite(d.z), 'finite dev coords');
      }
      assert.equal(sim.standings().length, names.length);
    }
  }
  assert.equal(MIN_NOKABE_PLAYERS, 2);
});
