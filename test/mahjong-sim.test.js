import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MahjongSim,
  runMahjongHeadless,
  MIN_MAHJONG_PLAYERS,
  MAX_MAHJONG_PLAYERS,
  MAHJONG_DURATIONS,
  DEFAULT_MAHJONG_DURATION,
  DEFAULT_MAHJONG_RULE,
  normalizeMahjongDuration,
  mahjongVariant,
  MAHJONG_POPUPS,
  TILE_COUNT,
} from '../public/js/mahjong-sim.js';

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

test('Mahjong Tile Wash durations and variants normalize cleanly', () => {
  assert.deepEqual(MAHJONG_DURATIONS.map((d) => d.seconds), [120, 60, 30, 15, 10]);
  assert.equal(DEFAULT_MAHJONG_DURATION, 15);
  assert.equal(DEFAULT_MAHJONG_RULE, 'hu');
  assert.equal(normalizeMahjongDuration(15), 15);
  assert.equal(normalizeMahjongDuration(28), 30);
  assert.equal(normalizeMahjongDuration('bad'), 15);
  assert.equal(mahjongVariant(10).reversals, 1);
  assert.equal(mahjongVariant(30).reversals, 3);
  assert.equal(mahjongVariant(120).reversals, 5);
  assert.equal(TILE_COUNT, 144);
  assert.ok(Object.keys(MAHJONG_POPUPS).length >= 5);
});

test('MahjongSim enforces player bounds and completes cleanly in Hú! and Fàngpào rules', () => {
  assert.throws(() => new MahjongSim({ names: ['Solo'] }));
  const tooMany = Array.from({ length: MAX_MAHJONG_PLAYERS + 1 }, (_, i) => `P${i + 1}`);
  assert.throws(() => new MahjongSim({ names: tooMany }));

  const names = ['Ada', 'Grace', 'Linus', 'Hedy', 'Alan', 'Margaret'];
  for (const rule of ['hu', 'fangpao']) {
    for (const duration of [10, 15, 30]) {
      const sim = runMahjongHeadless(names, { duration, rule, rng: seeded(2026 + duration) });
      assert.equal(sim.done, true, `rule=${rule} duration=${duration} finishes`);
      assert.ok(sim.winner, `rule=${rule} duration=${duration} has winner`);
      assert.ok(names.includes(sim.winner.name));
      assert.equal(sim.tiles.length, 144);
      assert.equal(sim.devs.length, names.length);
      for (const d of sim.devs) {
        assert.ok(Number.isFinite(d.x) && Number.isFinite(d.y) && Number.isFinite(d.z), 'finite dev coords');
      }
      assert.equal(sim.standings().length, names.length);
    }
  }
  assert.equal(MIN_MAHJONG_PLAYERS, 2);
});
