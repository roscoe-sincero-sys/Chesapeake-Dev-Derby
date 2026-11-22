import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from '../public/js/sim.js';
import {
  MIN_PLINKO_PLAYERS,
  MAX_PLINKO_PLAYERS,
  PLINKO_DURATIONS,
  DEFAULT_PLINKO_DURATION,
  normalizePlinkoDuration,
  plinkoVariant,
  buildPlinkoBoard,
  zoneNameForY,
  PlinkoSim,
  runPlinkoHeadless,
} from '../public/js/plinko-sim.js';

const TEAM = ['Ada', 'Grace', 'Linus', 'Hedy', 'Barbara', 'Ken', 'Alan', 'Margaret'];

test('duration variants scale board geometry, warp pipes, and Release Train laps', () => {
  assert.deepEqual(PLINKO_DURATIONS.map((d) => d.seconds), [120, 60, 30, 15, 10]);
  assert.equal(normalizePlinkoDuration('bad'), DEFAULT_PLINKO_DURATION);
  assert.equal(plinkoVariant(10), 'hotfix');
  assert.equal(plinkoVariant(30), 'standard');
  assert.equal(plinkoVariant(120), 'marathon');

  const hotfix = buildPlinkoBoard(15);
  assert.equal(hotfix.warpPipes.length, 0, 'Hotfix Drop has no warp pipes');
  assert.equal(hotfix.lapsRequired, 1);

  const standard = buildPlinkoBoard(30);
  assert.equal(standard.warpPipes.length, 2, 'Standard Sprint has 1 pair of warp pipes');
  assert.ok(standard.spinners.length >= 2);
  assert.ok(standard.stickyPads.length >= 2);
  assert.equal(standard.flippers.length, 2);

  const marathon = buildPlinkoBoard(120);
  assert.equal(marathon.lapsRequired, 3);
  assert.ok(marathon.height > standard.height);
  assert.equal(zoneNameForY(marathon.hopperY + 1, marathon), 'In Backlog');
  assert.equal(zoneNameForY(2, marathon), 'Deploying!');
});

test('2.5D physics simulation completes cleanly for 2, 8, and 30 players across variants', () => {
  for (const [count, duration, seed] of [[2, 10, 11], [8, 30, 22], [30, 15, 33]]) {
    const names = Array.from({ length: count }, (_, i) => `Dev ${i + 1}`);
    const sim = runPlinkoHeadless(names, { duration, rng: mulberry32(seed) });
    assert.equal(sim.done, true, `${count} players (${duration}s) must finish cleanly`);
    assert.ok(sim.winner, 'winner is set');
    assert.ok(names.includes(sim.winner.name));
  }
});

test('PlinkoSim enforces 2..30 player bounds', () => {
  assert.equal(MIN_PLINKO_PLAYERS, 2);
  assert.equal(MAX_PLINKO_PLAYERS, 30);
  assert.throws(() => new PlinkoSim({ names: ['Solo'] }));
  assert.throws(() => new PlinkoSim({ names: Array.from({ length: 31 }, (_, i) => `Dev ${i}`) }));
});
