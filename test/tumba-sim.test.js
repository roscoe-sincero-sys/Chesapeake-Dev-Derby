import test from 'node:test';
import assert from 'node:assert/strict';
import {
  planTumbaMatch,
  sampleSlipperState,
  sampleCanState,
  samplePlayerState,
  sampleBantayState,
  solveSlipperVelocity,
  normalizeTumbaDuration,
  tumbaVariant,
  TUMBA_DURATIONS,
  TUMBA_POPUPS,
  MIN_TUMBA_PLAYERS,
  MAX_TUMBA_PLAYERS,
} from '../public/js/tumba-sim.js';

function seededRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

test('Tumba Lata duration variants scale volley counts across 10s–120s', () => {
  assert.deepEqual(TUMBA_DURATIONS.map((d) => d.seconds), [120, 60, 30, 15, 10]);
  assert.equal(normalizeTumbaDuration(12), 10);
  assert.equal(normalizeTumbaDuration(28), 30);
  assert.equal(normalizeTumbaDuration('bad'), 15);
  assert.equal(tumbaVariant(15).volleys, 1);
  assert.equal(tumbaVariant(30).volleys, 2);
  assert.equal(tumbaVariant(120).volleys, 3);
});

test('planTumbaMatch enforces player bounds and produces finite kinematics across every phase', () => {
  assert.throws(() => planTumbaMatch(['Solo']));
  assert.throws(() => planTumbaMatch(Array.from({ length: MAX_TUMBA_PLAYERS + 1 }, (_, i) => `D${i}`)));
  assert.equal(MIN_TUMBA_PLAYERS, 2);

  for (const duration of [10, 15, 30, 60]) {
    const names = ['Ada', 'Grace', 'Linus', 'Hedy', 'Alan', 'Margaret'];
    const plan = planTumbaMatch(names, { duration, rng: seededRng(400 + duration) });
    assert.ok(names.includes(plan.winner.name));
    assert.equal(plan.volleys.length, tumbaVariant(duration).volleys);

    const last = plan.volleys.at(-1);
    assert.equal(last.isFinal, true);
    assert.ok(last.throwAt < last.hitAt && last.hitAt < last.restoreAt && last.restoreAt < last.tagAt);

    // Sample slippers, players, Bantay, and tin can across all phases to guarantee zero NaNs
    for (const t of [0.5, last.throwAt + 0.3, last.hitAt + 0.2, last.restoreAt + 0.2, last.tagAt]) {
      const winnerIdx = plan.winnerId;
      const wp = samplePlayerState(plan.players[winnerIdx], last.throws[winnerIdx], last, t);
      const bs = sampleBantayState(last, wp, t);
      const cs = sampleCanState(last, bs, t);
      assert.ok(Number.isFinite(wp.x) && Number.isFinite(wp.z));
      assert.ok(Number.isFinite(bs.x) && Number.isFinite(bs.z));
      assert.ok(Number.isFinite(cs.x) && Number.isFinite(cs.y) && Number.isFinite(cs.z));
      for (let i = 0; i < plan.players.length; i++) {
        const ps = samplePlayerState(plan.players[i], last.throws[i], last, t);
        const ss = sampleSlipperState(last.throws[i], last, ps, t);
        assert.ok(Number.isFinite(ss.x) && Number.isFinite(ss.y) && Number.isFinite(ss.z));
      }
    }
  }
});

test('solveSlipperVelocity hits target coordinates cleanly', () => {
  const p0 = { x: 2, y: 1.25, z: 10 };
  const pL = { x: -1, y: 0.12, z: -4 };
  const T = 1.0;
  const v0 = solveSlipperVelocity(p0, pL, T);
  assert.ok(Math.abs(p0.x + v0.vx * T - pL.x) < 1e-6);
  assert.ok(Math.abs(p0.z + v0.vz * T - pL.z) < 1e-6);
});

test('Tumba Lata catalog includes all spec dev-humor popups', () => {
  assert.ok(TUMBA_POPUPS.hit.includes('SMTP Relay Server is down — SIBAT!'));
  assert.ok(TUMBA_POPUPS.whiff.includes('Blocked by bahaw software license'));
  assert.ok(TUMBA_POPUPS.scramble.includes("Grabbed someone else's branch!"));
});
