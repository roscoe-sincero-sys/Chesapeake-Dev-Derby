import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from '../public/js/sim.js';
import {
  MIN_FREEZE_PLAYERS,
  MAX_FREEZE_PLAYERS,
  FREEZE_DURATIONS,
  DEFAULT_FREEZE_DURATION,
  FREEZE_EXCUSES,
  normalizeFreezeDuration,
  freezeVariant,
  buildFreezeCourse,
  FreezeSim,
  runFreezeHeadless,
} from '../public/js/freeze-sim.js';

test('duration variants scale runway length, checkpoints, and Tech Debt Ice patches', () => {
  assert.deepEqual(FREEZE_DURATIONS.map((d) => d.seconds), [120, 60, 30, 15, 10]);
  assert.equal(normalizeFreezeDuration('bad'), DEFAULT_FREEZE_DURATION);
  assert.equal(freezeVariant(10), 'hotfix');
  assert.equal(freezeVariant(30), 'standard');
  assert.equal(freezeVariant(120), 'enterprise');

  const hotfix = buildFreezeCourse(15);
  assert.equal(hotfix.checkpoints.length, 0);
  assert.equal(hotfix.iceZones.length, 0);

  const enterprise = buildFreezeCourse(120);
  assert.equal(enterprise.checkpoints.length, 2);
  assert.ok(enterprise.iceZones.length >= 2);
  assert.equal(FREEZE_EXCUSES.length, 6);
  assert.ok(FREEZE_EXCUSES.includes('Voted off the team!'));
});

test('Code Freeze simulation completes cleanly for 2, 10, and 30 players across variants', () => {
  for (const [count, duration, seed] of [[2, 10, 7], [10, 30, 14], [30, 15, 21]]) {
    const names = Array.from({ length: count }, (_, i) => `Dev ${i + 1}`);
    const sim = runFreezeHeadless(names, { duration, rng: mulberry32(seed) });
    assert.equal(sim.done, true, `${count} players (${duration}s) finishes cleanly`);
    assert.ok(sim.winner && names.includes(sim.winner.name));
    assert.ok(['finish', 'survivor'].includes(sim.winReason));
  }
});

test('FreezeSim enforces 2..30 player bounds', () => {
  assert.equal(MIN_FREEZE_PLAYERS, 2);
  assert.equal(MAX_FREEZE_PLAYERS, 30);
  assert.throws(() => new FreezeSim({ names: ['Solo'] }));
  assert.throws(() => new FreezeSim({ names: Array.from({ length: 31 }, (_, i) => `Dev ${i}`) }));
});
