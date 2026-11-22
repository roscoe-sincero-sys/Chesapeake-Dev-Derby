import test from 'node:test';
import assert from 'node:assert/strict';
import {
  planKarangMatch,
  sampleKarangRunner,
  normalizeKarangDuration,
  karangVariant,
  KARANG_DURATIONS,
  KARANG_POPUPS,
  MIN_KARANG_PLAYERS,
  MAX_KARANG_PLAYERS,
} from '../public/js/karang-sim.js';

function seededRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

test('Karang Derby duration variants scale boulevard length and recovery rules', () => {
  assert.deepEqual(KARANG_DURATIONS.map((d) => d.seconds), [120, 60, 30, 15, 10]);
  assert.equal(normalizeKarangDuration(12), 10);
  assert.equal(normalizeKarangDuration(28), 30);
  assert.equal(normalizeKarangDuration('bad'), 15);
  assert.equal(karangVariant(15).allowRecovery, false);
  assert.equal(karangVariant(30).allowRecovery, true);
  assert.ok(karangVariant(15).length < karangVariant(30).length);
  assert.ok(karangVariant(30).length < karangVariant(120).length);
});

test('planKarangMatch enforces player bounds and produces finite wobble kinematics', () => {
  assert.throws(() => planKarangMatch(['Solo']));
  assert.throws(() => planKarangMatch(Array.from({ length: MAX_KARANG_PLAYERS + 1 }, (_, i) => `D${i}`)));
  assert.equal(MIN_KARANG_PLAYERS, 2);

  for (const stilts of ['bamboo', 'bagol']) {
    for (const duration of [10, 15, 30, 60]) {
      const names = ['Ada', 'Grace', 'Linus', 'Hedy', 'Alan', 'Margaret'];
      const plan = planKarangMatch(names, { duration, stilts, rng: seededRng(700 + duration) });
      assert.equal(plan.stilts, stilts);
      assert.ok(names.includes(plan.winner.name));

      for (const t of [0.5, plan.startAt + 0.5, plan.windAt + 0.5, plan.finishAt]) {
        for (const r of plan.runners) {
          const st = sampleKarangRunner(r, plan, t);
          assert.ok(Number.isFinite(st.x) && Number.isFinite(st.z) && Number.isFinite(st.leanZ));
          assert.ok(st.balanceDanger >= 0 && st.balanceDanger <= 1);
        }
      }
      const winEnd = sampleKarangRunner(plan.winner, plan, plan.finishAt);
      assert.equal(winEnd.fallen, false);
      assert.equal(winEnd.finished, true);
    }
  }
});

test('Karang Derby catalog contains all spec dev-humor popups', () => {
  assert.ok(KARANG_POPUPS.snap.includes('Leaned on do-not-touch-utils-safe-to-delete'));
  assert.ok(KARANG_POPUPS.snag.includes('Clotheslined by common sense'));
  assert.ok(KARANG_POPUPS.tangle.includes("Tumba'd the user table!"));
  assert.ok(KARANG_POPUPS.wind.includes('PanganodSilab 500 Crosswind'));
  assert.ok(KARANG_POPUPS.slick.includes('IYAHAY NA!'));
});
