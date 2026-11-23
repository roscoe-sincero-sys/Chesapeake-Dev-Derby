import test from 'node:test';
import assert from 'node:assert/strict';
import {
  planTubigMatch,
  sampleTubigRunner,
  sampleLineBlocker,
  samplePatotot,
  normalizeTubigDuration,
  tubigVariant,
  TUBIG_DURATIONS,
  TUBIG_POPUPS,
  MIN_TUBIG_PLAYERS,
  MAX_TUBIG_PLAYERS,
} from '../public/js/tubig-sim.js';

function seededRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

test('Tubig-Tubig duration variants scale water lines and court depth', () => {
  assert.deepEqual(TUBIG_DURATIONS.map((d) => d.seconds), [120, 60, 30, 15, 10]);
  assert.equal(normalizeTubigDuration(12), 10);
  assert.equal(normalizeTubigDuration(28), 30);
  assert.equal(normalizeTubigDuration('bad'), 15);
  assert.equal(tubigVariant(15).lineCount, 4);
  assert.equal(tubigVariant(30).lineCount, 5);
  assert.ok(tubigVariant(15).courtLen < tubigVariant(30).courtLen);
});

test('planTubigMatch enforces bounds and produces finite kinematics for Champion and Ikaw Na! rules', () => {
  assert.throws(() => planTubigMatch(['Solo']));
  assert.throws(() => planTubigMatch(Array.from({ length: MAX_TUBIG_PLAYERS + 1 }, (_, i) => `D${i}`)));
  assert.equal(MIN_TUBIG_PLAYERS, 2);

  for (const rule of ['champion', 'tag']) {
    for (const duration of [10, 15, 30, 60]) {
      const names = ['Ada', 'Grace', 'Linus', 'Hedy', 'Alan', 'Margaret'];
      const plan = planTubigMatch(names, { duration, rule, rng: seededRng(900 + duration) });
      assert.equal(plan.rule, rule);
      assert.ok(names.includes(plan.winner.name));

      for (const t of [0.5, plan.startAt + 0.5, plan.startAt + plan.raceDur * 0.5, plan.finishAt]) {
        const pat = samplePatotot(plan, t);
        assert.ok(Number.isFinite(pat.x) && Number.isFinite(pat.z));
        for (const line of plan.lines) {
          const lb = sampleLineBlocker(line, plan, t);
          assert.ok(Number.isFinite(lb.x) && Number.isFinite(lb.z));
        }
        for (const r of plan.runners) {
          const st = sampleTubigRunner(r, plan, t);
          assert.ok(Number.isFinite(st.x) && Number.isFinite(st.z));
        }
      }
      const winEnd = sampleTubigRunner(plan.winner, plan, plan.finishAt);
      if (rule === 'champion') assert.equal(winEnd.finished, true);
      else assert.equal(winEnd.splashed, true);
    }
  }
});

test('Tubig-Tubig catalog contains all spec dev-humor tag popups', () => {
  assert.ok(TUBIG_POPUPS.linter.includes('Missing semicolon — BALIK!'));
  assert.ok(TUBIG_POPUPS.review.includes('Nitpick: rename all new tables with the -x'));
  assert.ok(TUBIG_POPUPS.qa.includes('Blocked by PanganodSilab 500'));
  assert.ok(TUBIG_POPUPS.cab.includes('Ekmaatra-ji derailed by common sense again'));
  assert.ok(TUBIG_POPUPS.patotot.includes('Ekmaatra is doing a flyby — PANAGAN!'));
});
