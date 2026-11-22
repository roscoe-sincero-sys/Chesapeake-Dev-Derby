import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from '../public/js/sim.js';
import {
  MIN_CLAW_PLAYERS,
  MAX_CLAW_PLAYERS,
  CLAW_DURATIONS,
  DEFAULT_CLAW_DURATION,
  CLAW_EXCUSES,
  CABINET_MARQUEES,
  normalizeClawDuration,
  clawVariant,
  planClawMatch,
} from '../public/js/claw-sim.js';

const TEAM = ['Ada', 'Grace', 'Linus', 'Hedy', 'Barbara', 'Ken', 'Alan', 'Margaret'];

test('duration normalization and variant mapping follow the 10s-120s spec', () => {
  assert.deepEqual(CLAW_DURATIONS.map((d) => d.seconds), [120, 60, 30, 15, 10]);
  assert.equal(normalizeClawDuration(12), 10);
  assert.equal(normalizeClawDuration(20), 15);
  assert.equal(normalizeClawDuration(40), 30);
  assert.equal(normalizeClawDuration(95), 120);
  assert.equal(normalizeClawDuration('bad'), DEFAULT_CLAW_DURATION);

  assert.equal(clawVariant(10), 'quick');
  assert.equal(clawVariant(15), 'quick');
  assert.equal(clawVariant(30), 'rigged');
  assert.equal(clawVariant(60), 'elimination');
  assert.equal(clawVariant(120), 'elimination');
});

test('Quick Grab (15s), Rigged Arcade (30s), and Elimination Pit (60s/120s) scale attempts and excuses', () => {
  const quick = planClawMatch(TEAM, { duration: 15, rng: mulberry32(1) });
  assert.equal(quick.variant, 'quick');
  assert.equal(quick.attempts.length, 1);
  assert.ok(CABINET_MARQUEES.includes(quick.marquee));
  assert.equal(quick.attempts[0].targetId, quick.winnerId);
  assert.ok(quick.attempts[0].decoys.length >= 1 && quick.attempts[0].decoys.length <= 3);

  const rigged = planClawMatch(TEAM, { duration: 30, rng: mulberry32(2) });
  assert.equal(rigged.variant, 'rigged');
  assert.equal(rigged.attempts.length, 2);
  assert.equal(rigged.attempts[0].isFinal, false);
  assert.equal(rigged.attempts[0].failRelease.excuse, CLAW_EXCUSES.weakGrip);
  assert.equal(rigged.attempts[1].isFinal, true);
  assert.equal(rigged.attempts[1].targetId, rigged.winnerId);

  const elim60 = planClawMatch(TEAM, { duration: 60, rng: mulberry32(3) });
  assert.equal(elim60.variant, 'elimination');
  assert.equal(elim60.attempts.length, 3);
  assert.equal(elim60.attempts.at(-1).targetId, elim60.winnerId);

  const elim120 = planClawMatch(TEAM, { duration: 120, rng: mulberry32(4) });
  assert.equal(elim120.attempts.length, 5);
  assert.equal(elim120.attempts.at(-1).targetId, elim120.winnerId);
});

test('planClawMatch enforces 2..30 player bounds', () => {
  assert.equal(MIN_CLAW_PLAYERS, 2);
  assert.equal(MAX_CLAW_PLAYERS, 30);
  assert.throws(() => planClawMatch(['Solo']));
  assert.throws(() => planClawMatch(Array.from({ length: 31 }, (_, i) => `Dev ${i}`)));
});
