import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ChauparSim,
  runChauparHeadless,
  MIN_CHAUPAR_PLAYERS,
  MAX_CHAUPAR_PLAYERS,
  CHAUPAR_DURATIONS,
  DEFAULT_CHAUPAR_DURATION,
  DEFAULT_CHAUPAR_RULE,
  normalizeChauparDuration,
  chauparVariant,
  CHAUPAR_POPUPS,
  armTilePos,
} from '../public/js/chaupar-sim.js';

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

test('Chaupar Cowrie-Clash durations, variants and cross-board coordinates normalize cleanly', () => {
  assert.deepEqual(CHAUPAR_DURATIONS.map((d) => d.seconds), [120, 60, 30, 15, 10]);
  assert.equal(DEFAULT_CHAUPAR_DURATION, 15);
  assert.equal(DEFAULT_CHAUPAR_RULE, 'throne');
  assert.equal(normalizeChauparDuration(15), 15);
  assert.equal(normalizeChauparDuration(28), 30);
  assert.equal(normalizeChauparDuration('bad'), 15);
  assert.equal(chauparVariant(10).armTiles, 6);
  assert.equal(chauparVariant(30).armTiles, 8);
  assert.equal(chauparVariant(120).armTiles, 8);
  assert.deepEqual(armTilePos(0, 13, 6), { x: 0, z: 0 });
  assert.ok(Object.keys(CHAUPAR_POPUPS).length >= 5);
});

test('ChauparSim enforces player bounds and completes cleanly in Throne and First Cut rules', () => {
  assert.throws(() => new ChauparSim({ names: ['Solo'] }));
  const tooMany = Array.from({ length: MAX_CHAUPAR_PLAYERS + 1 }, (_, i) => `P${i + 1}`);
  assert.throws(() => new ChauparSim({ names: tooMany }));

  const names = ['Ada', 'Grace', 'Linus', 'Hedy', 'Alan', 'Margaret'];
  for (const rule of ['throne', 'firstcut']) {
    for (const duration of [10, 15, 30]) {
      const sim = runChauparHeadless(names, { duration, rule, rng: seeded(2026 + duration) });
      assert.equal(sim.done, true, `rule=${rule} duration=${duration} finishes`);
      assert.ok(sim.winner, `rule=${rule} duration=${duration} has winner`);
      assert.ok(names.includes(sim.winner.name));
      assert.equal(sim.pawns.length, names.length);
      for (const p of sim.pawns) {
        assert.ok(Number.isFinite(p.x) && Number.isFinite(p.z), 'finite pawn coords');
      }
      assert.equal(sim.standings().length, names.length);
    }
  }
  assert.equal(MIN_CHAUPAR_PLAYERS, 2);
});
