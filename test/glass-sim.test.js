import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GlassSim,
  runGlassHeadless,
  MIN_GLASS_PLAYERS,
  MAX_GLASS_PLAYERS,
  GLASS_DURATIONS,
  DEFAULT_GLASS_DURATION,
  DEFAULT_GLASS_RULE,
  normalizeGlassDuration,
  glassVariant,
  GLASS_POPUPS,
} from '../public/js/glass-sim.js';

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

test('Glass Bridge Deploy durations and variants normalize cleanly', () => {
  assert.deepEqual(GLASS_DURATIONS.map((d) => d.seconds), [120, 60, 30, 15, 10]);
  assert.equal(DEFAULT_GLASS_DURATION, 15);
  assert.equal(DEFAULT_GLASS_RULE, 'survivor');
  assert.equal(normalizeGlassDuration(15), 15);
  assert.equal(normalizeGlassDuration(28), 30);
  assert.equal(normalizeGlassDuration('bad'), 15);
  assert.equal(glassVariant(10).pairs, 6);
  assert.equal(glassVariant(30).pairs, 12);
  assert.equal(glassVariant(120).pairs, 14);
  assert.ok(Object.keys(GLASS_POPUPS).length >= 5);
});

test('GlassSim enforces player bounds and completes cleanly in Prod Survivor and Canary Deploy rules', () => {
  assert.throws(() => new GlassSim({ names: ['Solo'] }));
  const tooMany = Array.from({ length: MAX_GLASS_PLAYERS + 1 }, (_, i) => `P${i + 1}`);
  assert.throws(() => new GlassSim({ names: tooMany }));

  const names = ['Ada', 'Grace', 'Linus', 'Hedy', 'Alan', 'Margaret'];
  for (const rule of ['survivor', 'canary']) {
    for (const duration of [10, 15, 30]) {
      const sim = runGlassHeadless(names, { duration, rule, rng: seeded(2026 + duration) });
      assert.equal(sim.done, true, `rule=${rule} duration=${duration} finishes`);
      assert.ok(sim.winner, `rule=${rule} duration=${duration} has winner`);
      assert.ok(names.includes(sim.winner.name));
      assert.equal(sim.players.length, names.length);
      for (const p of sim.players) {
        assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z), 'finite coords');
      }
      assert.equal(sim.standings().length, names.length);
    }
  }
  assert.equal(MIN_GLASS_PLAYERS, 2);
});
